import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TeacherProfile, Credential, Location, UserPreferences } from '../types';
import { userRepository } from '../database/repositories/userRepository';
import { validateEmail, validatePassword, validateCredentials } from '../utils/validation';
import logger from '../utils/logger';

export interface RegisterUserRequest {
  email: string;
  password: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: Location;
  yearsExperience: number;
  credentials: Omit<Credential, 'id' | 'verificationStatus'>[];
  bio?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<TeacherProfile, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  tokenId?: string; // For refresh token rotation
  iat?: number;
  exp?: number;
}

export interface RefreshTokenData {
  tokenId: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly SALT_ROUNDS = 12;
  
  // In-memory store for refresh tokens (in production, use Redis or database)
  private refreshTokenStore = new Map<string, RefreshTokenData>();

  async registerUser(userData: RegisterUserRequest): Promise<AuthResponse> {
    try {
      // Validate input data
      this.validateRegistrationData(userData);

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Process credentials and set initial verification status
      const processedCredentials: Credential[] = userData.credentials.map((cred, index) => ({
        ...cred,
        id: `cred_${Date.now()}_${index}`,
        verificationStatus: 'pending' as const
      }));

      // Create default user preferences
      const defaultPreferences: UserPreferences = {
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          profileVisibility: 'teachers_only',
          showLocation: true,
          showExperience: true
        },
        contentFilters: {
          subjects: userData.subjects,
          gradeLevels: userData.gradeLevels,
          contentTypes: ['video', 'document', 'text', 'image']
        }
      };

      // Create user profile
      const newUser: Omit<TeacherProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        email: userData.email.toLowerCase(),
        passwordHash,
        fullName: userData.fullName,
        subjects: userData.subjects,
        gradeLevels: userData.gradeLevels,
        schoolLocation: userData.schoolLocation,
        yearsExperience: userData.yearsExperience,
        verificationStatus: 'pending',
        credentials: processedCredentials,
        preferences: defaultPreferences,
        bio: userData.bio,
        isActive: true
      };

      // Save user to database
      const savedUser = await userRepository.create(newUser);

      // Generate tokens with rotation
      const { accessToken, refreshToken } = this.generateTokensWithRotation(savedUser);

      // Log successful registration
      logger.info('User registered successfully', { 
        userId: savedUser.id, 
        email: savedUser.email,
        credentialsCount: processedCredentials.length
      });

      // Return response without password hash
      const { passwordHash: _, ...userWithoutPassword } = savedUser;
      
      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('User registration failed', { 
        email: userData.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async loginUser(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate input
      if (!validateEmail(loginData.email)) {
        throw new Error('Invalid email format');
      }

      // Find user by email
      const user = await userRepository.findByEmail(loginData.email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await userRepository.updateLastLogin(user.id);

      // Generate tokens with rotation
      const { accessToken, refreshToken } = this.generateTokensWithRotation(user);

      // Log successful login
      logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email 
      });

      // Return response without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('User login failed', { 
        email: loginData.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async verifyCredentials(userId: string, credentialId: string, status: 'verified' | 'rejected', notes?: string): Promise<void> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update credential verification status
      const updatedCredentials = user.credentials.map(cred => 
        cred.id === credentialId 
          ? { ...cred, verificationStatus: status }
          : cred
      );

      // Check if all credentials are verified to update user verification status
      const allVerified = updatedCredentials.every(cred => cred.verificationStatus === 'verified');
      const anyRejected = updatedCredentials.some(cred => cred.verificationStatus === 'rejected');
      
      let userVerificationStatus: 'pending' | 'verified' | 'rejected' = 'pending';
      if (allVerified) {
        userVerificationStatus = 'verified';
      } else if (anyRejected) {
        userVerificationStatus = 'rejected';
      }

      // Update user with new credentials and verification status
      await userRepository.updateCredentials(userId, updatedCredentials, userVerificationStatus);

      logger.info('Credential verification updated', { 
        userId, 
        credentialId, 
        status,
        userVerificationStatus 
      });

    } catch (error) {
      logger.error('Credential verification failed', { 
        userId, 
        credentialId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;
      
      // Check if refresh token exists and is not revoked
      if (decoded.tokenId) {
        const tokenData = this.refreshTokenStore.get(decoded.tokenId);
        if (!tokenData || tokenData.isRevoked || tokenData.expiresAt < new Date()) {
          throw new Error('Invalid or expired refresh token');
        }
        
        // Revoke the old refresh token (rotation)
        tokenData.isRevoked = true;
        this.refreshTokenStore.set(decoded.tokenId, tokenData);
      }
      
      // Find user
      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens with rotation
      const tokens = this.generateTokensWithRotation(user);

      logger.info('Token refreshed successfully', { userId: user.id, tokenId: decoded.tokenId });

      return tokens;

    } catch (error) {
      logger.error('Token refresh failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid refresh token');
    }
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async findUserByEmail(email: string): Promise<TeacherProfile | null> {
    try {
      return await userRepository.findByEmail(email.toLowerCase());
    } catch (error) {
      logger.error('Failed to find user by email', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async findUserById(userId: string): Promise<TeacherProfile | null> {
    try {
      return await userRepository.findById(userId);
    } catch (error) {
      logger.error('Failed to find user by ID', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private generateTokens(user: TeacherProfile): { accessToken: string; refreshToken: string } {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      verificationStatus: user.verificationStatus
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private generateTokensWithRotation(user: TeacherProfile): { accessToken: string; refreshToken: string } {
    // Generate unique token ID for refresh token rotation
    const tokenId = this.generateSecureTokenId();
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      verificationStatus: user.verificationStatus,
      tokenId
    };

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, verificationStatus: user.verificationStatus }, 
      this.JWT_SECRET, 
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    } as jwt.SignOptions);

    // Store refresh token data for rotation tracking
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.parseExpirationTime(this.JWT_REFRESH_EXPIRES_IN));
    
    this.refreshTokenStore.set(tokenId, {
      tokenId,
      userId: user.id,
      expiresAt,
      isRevoked: false,
      createdAt: new Date()
    });

    return { accessToken, refreshToken };
  }

  private generateSecureTokenId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private parseExpirationTime(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }
  }

  // Security utilities
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    const tokenData = this.refreshTokenStore.get(tokenId);
    if (tokenData) {
      tokenData.isRevoked = true;
      this.refreshTokenStore.set(tokenId, tokenData);
      logger.info('Refresh token revoked', { tokenId });
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    let revokedCount = 0;
    for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
      if (tokenData.userId === userId && !tokenData.isRevoked) {
        tokenData.isRevoked = true;
        this.refreshTokenStore.set(tokenId, tokenData);
        revokedCount++;
      }
    }
    logger.info('All user tokens revoked', { userId, revokedCount });
  }

  cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
      if (tokenData.expiresAt < now) {
        this.refreshTokenStore.delete(tokenId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Expired tokens cleaned up', { cleanedCount });
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      if (!validatePassword(newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }

      // Find user
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password in database
      await userRepository.updatePassword(userId, newPasswordHash);

      // Revoke all refresh tokens to force re-authentication on all devices
      await this.revokeAllUserTokens(userId);

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      logger.error('Password change failed', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private validateRegistrationData(userData: RegisterUserRequest): void {
    // Validate email
    if (!validateEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!validatePassword(userData.password)) {
      throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
    }

    // Validate required fields
    if (!userData.fullName || userData.fullName.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters long');
    }

    if (!userData.subjects || userData.subjects.length === 0) {
      throw new Error('At least one subject must be specified');
    }

    if (!userData.gradeLevels || userData.gradeLevels.length === 0) {
      throw new Error('At least one grade level must be specified');
    }

    if (userData.yearsExperience < 0 || userData.yearsExperience > 50) {
      throw new Error('Years of experience must be between 0 and 50');
    }

    // Validate school location
    if (!userData.schoolLocation || !userData.schoolLocation.district || !userData.schoolLocation.region) {
      throw new Error('School location with district and region is required');
    }

    // Validate credentials
    if (!userData.credentials || userData.credentials.length === 0) {
      throw new Error('At least one teaching credential is required');
    }

    userData.credentials.forEach((cred, index) => {
      if (!validateCredentials(cred)) {
        throw new Error(`Invalid credential at position ${index + 1}`);
      }
    });
  }
}

export const authService = new AuthService();