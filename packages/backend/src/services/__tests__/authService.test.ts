// Mock dependencies
const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
  updateCredentials: jest.fn(),
  updatePassword: jest.fn()
};

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn()
};

jest.mock('../../database/repositories/userRepository', () => ({
  userRepository: mockUserRepository
}));

jest.mock('bcryptjs', () => mockBcrypt);

jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

import { authService } from '../authService';

describe('AuthService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test Teacher',
    subjects: ['Mathematics'],
    gradeLevels: ['P1', 'P2'],
    schoolLocation: {
      district: 'Kampala',
      region: 'Central'
    },
    yearsExperience: 5,
    verificationStatus: 'verified' as const,
    credentials: [],
    preferences: {
      language: 'en',
      notifications: { email: true, push: true, sms: false },
      privacy: { profileVisibility: 'teachers_only' as const, showLocation: true, showExperience: true },
      contentFilters: { subjects: ['Mathematics'], gradeLevels: ['P1'], contentTypes: ['video'] }
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the refresh token store
    (authService as any).refreshTokenStore.clear();
  });

  describe('registerUser', () => {
    const registrationData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      fullName: 'Test Teacher',
      subjects: ['Mathematics'],
      gradeLevels: ['P1', 'P2'],
      schoolLocation: {
        district: 'Kampala',
        region: 'Central'
      },
      yearsExperience: 5,
      credentials: [{
        type: 'teaching_license' as const,
        institution: 'Test University',
        issueDate: new Date('2020-01-01'),
        documentUrl: 'https://example.com/doc.pdf'
      }]
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('mock-token');

      const result = await authService.registerUser(registrationData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('TestPass123!', 12);
    });

    it('should throw error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.registerUser(registrationData)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error for invalid email', async () => {
      const invalidData = { ...registrationData, email: 'invalid-email' };

      await expect(authService.registerUser(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const invalidData = { ...registrationData, password: 'weak' };

      await expect(authService.registerUser(invalidData)).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('loginUser', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPass123!'
    };

    it('should login user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
      mockJwt.sign.mockReturnValue('mock-token');

      const result = await authService.loginUser(loginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(authService.loginUser(loginData)).rejects.toThrow('Account is deactivated');
    });

    it('should throw error for invalid email format', async () => {
      const invalidData = { ...loginData, email: 'invalid-email' };

      await expect(authService.loginUser(invalidData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('refreshToken', () => {
    const mockTokenPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      verificationStatus: 'verified' as const,
      tokenId: 'token-123'
    };

    it('should refresh token successfully', async () => {
      mockJwt.verify.mockReturnValue(mockTokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('new-token');

      // Set up refresh token in store
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('token-123', {
        tokenId: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date()
      });

      const result = await authService.refreshToken('mock-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwt.verify).toHaveBeenCalledWith('mock-refresh-token', expect.any(String));
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for revoked refresh token', async () => {
      mockJwt.verify.mockReturnValue(mockTokenPayload);

      // Set up revoked token in store
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('token-123', {
        tokenId: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
        createdAt: new Date()
      });

      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', async () => {
      mockJwt.verify.mockReturnValue(mockTokenPayload);

      // Set up expired token in store
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('token-123', {
        tokenId: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        isRevoked: false,
        createdAt: new Date()
      });

      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const mockPayload = { userId: 'user-123', email: 'test@example.com' };
      mockJwt.verify.mockReturnValue(mockPayload);

      const result = authService.verifyAccessToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should throw error for invalid access token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyAccessToken('invalid-token')).toThrow('Invalid access token');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);

      await authService.changePassword('user-123', 'oldPassword', 'NewPass123!');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldPassword', mockUser.passwordHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-123', 'new-hashed-password');
    });

    it('should throw error for incorrect current password', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.changePassword('user-123', 'wrongPassword', 'NewPass123!'))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for weak new password', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(authService.changePassword('user-123', 'oldPassword', 'weak'))
        .rejects.toThrow('New password must be at least 8 characters long');
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.changePassword('user-123', 'oldPassword', 'NewPass123!'))
        .rejects.toThrow('User not found');
    });
  });

  describe('security utilities', () => {
    it('should hash password', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-password');

      const result = await authService.hashPassword('password');

      expect(result).toBe('hashed-password');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password', 12);
    });

    it('should verify password', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await authService.verifyPassword('password', 'hash');

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', 'hash');
    });

    it('should generate secure token', () => {
      const token = authService.generateSecureToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should revoke refresh token', async () => {
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('token-123', {
        tokenId: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date()
      });

      await authService.revokeRefreshToken('token-123');

      const tokenData = refreshTokenStore.get('token-123');
      expect(tokenData?.isRevoked).toBe(true);
    });

    it('should revoke all user tokens', async () => {
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('token-1', {
        tokenId: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date()
      });
      refreshTokenStore.set('token-2', {
        tokenId: 'token-2',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date()
      });

      await authService.revokeAllUserTokens('user-123');

      expect(refreshTokenStore.get('token-1')?.isRevoked).toBe(true);
      expect(refreshTokenStore.get('token-2')?.isRevoked).toBe(true);
    });

    it('should cleanup expired tokens', () => {
      const refreshTokenStore = (authService as any).refreshTokenStore;
      refreshTokenStore.set('expired-token', {
        tokenId: 'expired-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        isRevoked: false,
        createdAt: new Date()
      });
      refreshTokenStore.set('valid-token', {
        tokenId: 'valid-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date()
      });

      authService.cleanupExpiredTokens();

      expect(refreshTokenStore.has('expired-token')).toBe(false);
      expect(refreshTokenStore.has('valid-token')).toBe(true);
    });
  });
});