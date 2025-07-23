import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {biometricService, BiometricAuthResult} from './biometricService';
import {authPersistence, AuthTokens, UserSession} from './authPersistence';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: string;
  yearsExperience: number;
  credentials?: any[];
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  token: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      const mockUser = {
        id: '1',
        email: credentials.email,
        fullName: 'John Doe',
        verificationStatus: 'verified' as const,
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      // Store tokens and session using new persistence service
      await authPersistence.storeTokens(mockTokens, credentials.email);
      
      const session: UserSession = {
        user: mockUser,
        tokens: mockTokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: mockUser,
        token: mockTokens.accessToken,
      };
    } catch (error) {
      throw new Error('Login failed');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful registration
      const mockUser = {
        id: '1',
        email: userData.email,
        fullName: userData.fullName,
        verificationStatus: 'pending' as const,
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      // Store tokens and session using new persistence service
      await authPersistence.storeTokens(mockTokens, userData.email);
      
      const session: UserSession = {
        user: mockUser,
        tokens: mockTokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: mockUser,
        token: mockTokens.accessToken,
      };
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await authPersistence.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      return await authPersistence.isSessionValid();
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    try {
      const session = await authPersistence.getUserSession();
      return session?.user || null;
    } catch (error) {
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const tokens = await authPersistence.getTokens();
      return tokens?.accessToken || null;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const tokens = await authPersistence.getTokens();
      if (tokens?.refreshToken) {
        const newTokens = await authPersistence.refreshTokens(tokens.refreshToken);
        if (newTokens) {
          const session = await authPersistence.getUserSession();
          if (session) {
            await authPersistence.storeTokens(newTokens, session.user.email);
            return newTokens.accessToken;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Biometric Authentication Methods

  async isBiometricAvailable(): Promise<boolean> {
    const availability = await biometricService.isBiometricAvailable();
    return availability.isAvailable;
  }

  async isBiometricEnabled(): Promise<boolean> {
    return await authPersistence.isBiometricEnabled();
  }

  async enableBiometric(): Promise<{success: boolean; error?: string}> {
    return await authPersistence.enableBiometric();
  }

  async disableBiometric(): Promise<void> {
    try {
      await authPersistence.disableBiometric();
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }

  async authenticateWithBiometric(): Promise<BiometricAuthResult> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled',
        };
      }

      const result = await biometricService.authenticateWithBiometrics(
        'Authenticate to access Teacher Hub'
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async loginWithBiometric(): Promise<AuthResponse | null> {
    try {
      const session = await authPersistence.authenticateWithBiometric();
      
      if (!session) {
        throw new Error('Biometric authentication failed');
      }

      // Update last activity
      await authPersistence.updateLastActivity();

      return {
        user: session.user,
        token: session.tokens.accessToken,
      };
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();