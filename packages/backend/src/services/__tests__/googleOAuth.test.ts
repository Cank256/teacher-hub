// Mock dependencies before importing
jest.mock('../../config/googleOAuth', () => ({
  googleOAuthService: {
    getAuthUrl: jest.fn(),
    getTokensAndUserInfo: jest.fn(),
    verifyIdToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeToken: jest.fn()
  }
}));
jest.mock('../../database/repositories/userRepository');
jest.mock('../../utils/logger');

import { authService } from '../authService';
import { googleOAuthService } from '../../config/googleOAuth';
import { userRepository } from '../../database/repositories/userRepository';
import { TeacherProfile } from '../../types';

const mockGoogleOAuthService = googleOAuthService as jest.Mocked<typeof googleOAuthService>;
const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;

describe('AuthService - Google OAuth', () => {
  const mockGoogleUserInfo = {
    id: 'google123',
    email: 'teacher@example.com',
    name: 'John Teacher',
    picture: 'https://example.com/photo.jpg',
    verified_email: true
  };

  const mockTeacherProfile: TeacherProfile = {
    id: 'user123',
    email: 'teacher@example.com',
    fullName: 'John Teacher',
    subjects: ['Mathematics'],
    gradeLevels: ['Primary'],
    schoolLocation: { district: 'Kampala', region: 'Central' },
    yearsExperience: 5,
    verificationStatus: 'pending',
    credentials: [],
    preferences: {
      language: 'en',
      notifications: { email: true, push: true, sms: false },
      privacy: { profileVisibility: 'teachers_only', showLocation: true, showExperience: true },
      contentFilters: { subjects: ['Mathematics'], gradeLevels: ['Primary'], contentTypes: ['video', 'document'] }
    },
    isActive: true,
    googleId: 'google123',
    authProvider: 'google',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate Google OAuth authorization URL', () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      mockGoogleOAuthService.getAuthUrl.mockReturnValue(mockAuthUrl);

      const result = authService.getGoogleAuthUrl('test-state');

      expect(result).toBe(mockAuthUrl);
      expect(mockGoogleOAuthService.getAuthUrl).toHaveBeenCalledWith('test-state');
    });

    it('should handle errors when generating auth URL', () => {
      mockGoogleOAuthService.getAuthUrl.mockImplementation(() => {
        throw new Error('OAuth service error');
      });

      expect(() => authService.getGoogleAuthUrl()).toThrow('OAuth service error');
    });
  });

  describe('handleGoogleCallback', () => {
    it('should authenticate existing Google OAuth user', async () => {
      const mockTokens = { access_token: 'token123', refresh_token: 'refresh123' };
      mockGoogleOAuthService.getTokensAndUserInfo.mockResolvedValue({
        tokens: mockTokens,
        userInfo: mockGoogleUserInfo
      });
      mockUserRepository.findByEmail.mockResolvedValue(mockTeacherProfile);
      mockUserRepository.updateLastLogin.mockResolvedValue();

      const result = await authService.handleGoogleCallback({ code: 'auth_code' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockGoogleUserInfo.email);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockTeacherProfile.id);
    });

    it('should throw REGISTRATION_REQUIRED for new users', async () => {
      const mockTokens = { access_token: 'token123', refresh_token: 'refresh123' };
      mockGoogleOAuthService.getTokensAndUserInfo.mockResolvedValue({
        tokens: mockTokens,
        userInfo: mockGoogleUserInfo
      });
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.handleGoogleCallback({ code: 'auth_code' }))
        .rejects.toThrow('REGISTRATION_REQUIRED');
    });

    it('should reject unverified Google email', async () => {
      const unverifiedUserInfo = { ...mockGoogleUserInfo, verified_email: false };
      mockGoogleOAuthService.getTokensAndUserInfo.mockResolvedValue({
        tokens: {},
        userInfo: unverifiedUserInfo
      });

      await expect(authService.handleGoogleCallback({ code: 'auth_code' }))
        .rejects.toThrow('Google account email is not verified');
    });

    it('should reject existing local auth user with same email', async () => {
      const localAuthUser = { ...mockTeacherProfile, authProvider: 'local' as const };
      mockGoogleOAuthService.getTokensAndUserInfo.mockResolvedValue({
        tokens: {},
        userInfo: mockGoogleUserInfo
      });
      mockUserRepository.findByEmail.mockResolvedValue(localAuthUser);

      await expect(authService.handleGoogleCallback({ code: 'auth_code' }))
        .rejects.toThrow('An account with this email already exists');
    });
  });

  describe('registerWithGoogle', () => {
    const mockRegistrationData = {
      googleUserInfo: mockGoogleUserInfo,
      subjects: ['Mathematics'],
      gradeLevels: ['Primary'],
      schoolLocation: { district: 'Kampala', region: 'Central' },
      yearsExperience: 5,
      credentials: [],
      bio: 'Experienced teacher'
    };

    it('should register new user with Google OAuth', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockTeacherProfile);

      const result = await authService.registerWithGoogle(mockRegistrationData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockGoogleUserInfo.email);
      expect(result.user.authProvider).toBe('google');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockGoogleUserInfo.email.toLowerCase(),
          fullName: mockGoogleUserInfo.name,
          googleId: mockGoogleUserInfo.id,
          authProvider: 'google'
        })
      );
    });

    it('should reject registration if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockTeacherProfile);

      await expect(authService.registerWithGoogle(mockRegistrationData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should reject unverified Google email', async () => {
      const unverifiedRegistrationData = {
        ...mockRegistrationData,
        googleUserInfo: { ...mockGoogleUserInfo, verified_email: false }
      };

      await expect(authService.registerWithGoogle(unverifiedRegistrationData))
        .rejects.toThrow('Google account email is not verified');
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to existing user', async () => {
      const localUser = { ...mockTeacherProfile, authProvider: 'local' as const, googleId: undefined };
      mockUserRepository.findById.mockResolvedValue(localUser);
      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.updateGoogleId.mockResolvedValue();

      await authService.linkGoogleAccount('user123', mockGoogleUserInfo);

      expect(mockUserRepository.updateGoogleId).toHaveBeenCalledWith('user123', mockGoogleUserInfo.id);
    });

    it('should reject linking if Google account is already linked to another user', async () => {
      const localUser = { ...mockTeacherProfile, authProvider: 'local' as const, googleId: undefined };
      const anotherUser = { ...mockTeacherProfile, id: 'user456' };
      mockUserRepository.findById.mockResolvedValue(localUser);
      mockUserRepository.findByGoogleId.mockResolvedValue(anotherUser);

      await expect(authService.linkGoogleAccount('user123', mockGoogleUserInfo))
        .rejects.toThrow('This Google account is already linked to another user');
    });

    it('should reject linking if emails do not match', async () => {
      const localUser = { ...mockTeacherProfile, email: 'different@example.com', authProvider: 'local' as const };
      mockUserRepository.findById.mockResolvedValue(localUser);
      mockUserRepository.findByGoogleId.mockResolvedValue(null);

      await expect(authService.linkGoogleAccount('user123', mockGoogleUserInfo))
        .rejects.toThrow('Google account email must match your current account email');
    });
  });

  describe('unlinkGoogleAccount', () => {
    it('should unlink Google account from user', async () => {
      const userWithPassword = { 
        ...mockTeacherProfile, 
        authProvider: 'google' as const, 
        passwordHash: 'hashed_password' 
      };
      mockUserRepository.findById.mockResolvedValue(userWithPassword);
      mockUserRepository.updateGoogleId.mockResolvedValue();

      await authService.unlinkGoogleAccount('user123');

      expect(mockUserRepository.updateGoogleId).toHaveBeenCalledWith('user123', null);
    });

    it('should reject unlinking Google-only user without password', async () => {
      const googleOnlyUser = { 
        ...mockTeacherProfile, 
        authProvider: 'google' as const, 
        passwordHash: undefined 
      };
      mockUserRepository.findById.mockResolvedValue(googleOnlyUser);

      await expect(authService.unlinkGoogleAccount('user123'))
        .rejects.toThrow('Cannot unlink Google account without setting a password first');
    });
  });

  describe('getGoogleTokensAndUserInfo', () => {
    it('should get tokens and user info from Google', async () => {
      const mockTokens = { access_token: 'token123' };
      const expectedResult = { tokens: mockTokens, userInfo: mockGoogleUserInfo };
      mockGoogleOAuthService.getTokensAndUserInfo.mockResolvedValue(expectedResult);

      const result = await authService.getGoogleTokensAndUserInfo('auth_code');

      expect(result).toEqual(expectedResult);
      expect(mockGoogleOAuthService.getTokensAndUserInfo).toHaveBeenCalledWith('auth_code');
    });

    it('should handle errors from Google OAuth service', async () => {
      mockGoogleOAuthService.getTokensAndUserInfo.mockRejectedValue(new Error('Google API error'));

      await expect(authService.getGoogleTokensAndUserInfo('auth_code'))
        .rejects.toThrow('Google API error');
    });
  });
});