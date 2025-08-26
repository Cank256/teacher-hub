/**
 * AuthService Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import axios from 'axios'
import { AuthService } from '../authService'
import { AuthConfig, AuthErrorCode } from '../types'
import { secureStorage, defaultStorage } from '@/services/storage'
import {
  mockUser,
  mockLoginCredentials,
  mockRegisterCredentials,
  mockTokens
} from './setup'

// Import setup to ensure mocks are applied
import './setup'

const mockAxios = axios as jest.Mocked<typeof axios>
const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

describe('AuthService', () => {
  let authService: AuthService
  let mockApiClient: any

  const testConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    googleClientId: 'test-google-client-id',
    tokenRefreshThreshold: 5,
    biometricPromptTitle: 'Test Auth',
    biometricPromptSubtitle: 'Test Subtitle',
    maxLoginAttempts: 5,
    lockoutDuration: 15
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock API client
    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    }

    mockAxios.create.mockReturnValue(mockApiClient)

    // Create auth service instance
    authService = new AuthService(testConfig)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully with valid tokens', async () => {
      // Mock existing valid tokens
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh-token'
      })

      // Mock token validation
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: { isValid: true, expiresAt: new Date(Date.now() + 3600000) } }
      })

      // Mock current user fetch
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockUser }
      })

      await authService.initialize()

      expect(mockSecureStorage.getAuthTokens).toHaveBeenCalled()
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/validate', { token: 'valid-token' })
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('should handle initialization with expired tokens', async () => {
      // Mock existing expired tokens
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token'
      })

      // Mock token validation (expired)
      mockApiClient.post
        .mockResolvedValueOnce({
          data: { data: { isValid: false, expiresAt: new Date(Date.now() - 3600000) } }
        })
        // Mock token refresh
        .mockResolvedValueOnce({
          data: { data: { accessToken: 'new-token', refreshToken: 'new-refresh-token' } }
        })

      // Mock current user fetch
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockUser }
      })

      await authService.initialize()

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'valid-refresh-token'
      })
      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith('new-token', 'new-refresh-token')
    })

    it('should clear auth data when refresh fails', async () => {
      // Mock existing expired tokens
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token'
      })

      // Mock token validation (expired)
      mockApiClient.post
        .mockResolvedValueOnce({
          data: { data: { isValid: false } }
        })
        // Mock token refresh failure
        .mockRejectedValueOnce(new Error('Refresh failed'))

      await authService.initialize()

      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authService.login(mockLoginCredentials)

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.accessToken).toBe(mockTokens.accessToken)
      expect(result.refreshToken).toBe(mockTokens.refreshToken)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: mockLoginCredentials.email,
        password: mockLoginCredentials.password
      })

      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
    })

    it('should handle remember me functionality', async () => {
      const mockResponse = {
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authService.login(mockLoginCredentials)

      expect(result.success).toBe(true)
      expect(mockDefaultStorage.setBool).toHaveBeenCalledWith('remember_me', true)
      expect(mockSecureStorage.setUserCredentials).toHaveBeenCalled()
    })

    it('should handle login failure with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      }

      mockApiClient.post.mockRejectedValue(mockError)

      const result = await authService.login(mockLoginCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should handle network errors during login', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      }

      mockApiClient.post.mockRejectedValue(mockError)

      const result = await authService.login(mockLoginCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('register', () => {
    it('should register successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken,
            requiresVerification: true
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authService.register(mockRegisterCredentials)

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.requiresVerification).toBe(true)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', mockRegisterCredentials)
      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
    })

    it('should handle registration failure with existing email', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { message: 'Email already exists' }
        }
      }

      mockApiClient.post.mockRejectedValue(mockError)

      const result = await authService.register(mockRegisterCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set up authenticated state
      ;(authService as any).currentUser = mockUser

      mockApiClient.post.mockResolvedValue({ data: { success: true } })

      await authService.logout()

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout')
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
      expect(mockSecureStorage.removeSecureItem).toHaveBeenCalledWith('biometric_key')
      expect(mockSecureStorage.removeSecureItem).toHaveBeenCalledWith('user_credentials')
      expect(mockDefaultStorage.removeItem).toHaveBeenCalledWith('remember_me')
    })

    it('should clear auth data even if API call fails', async () => {
      ;(authService as any).currentUser = mockUser

      mockApiClient.post.mockRejectedValue(new Error('Network error'))

      await authService.logout()

      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
    })
  })

  describe('token management', () => {
    it('should refresh token successfully', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'valid-refresh-token'
      })

      const mockResponse = {
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const newToken = await authService.refreshToken()

      expect(newToken).toBe('new-access-token')
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'valid-refresh-token'
      })
      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token'
      )
    })

    it('should handle refresh token failure', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'invalid-refresh-token'
      })

      mockApiClient.post.mockRejectedValue({
        response: { status: 401, data: { message: 'Invalid refresh token' } }
      })

      await expect(authService.refreshToken()).rejects.toThrow()
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
    })

    it('should validate token correctly', async () => {
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const mockResponse = {
        data: {
          data: {
            isValid: true,
            expiresAt: futureDate.toISOString()
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authService.validateToken('valid-token')

      expect(result.isValid).toBe(true)
      expect(result.expiresAt).toEqual(futureDate)
      expect(result.needsRefresh).toBe(false)
    })

    it('should detect when token needs refresh', async () => {
      const soonToExpire = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      const mockResponse = {
        data: {
          data: {
            isValid: true,
            expiresAt: soonToExpire.toISOString()
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authService.validateToken('valid-token')

      expect(result.isValid).toBe(true)
      expect(result.needsRefresh).toBe(true)
    })
  })

  describe('authentication state', () => {
    it('should return current user when authenticated', async () => {
      ;(authService as any).currentUser = mockUser

      const user = await authService.getCurrentUser()

      expect(user).toEqual(mockUser)
    })

    it('should fetch user when not cached but tokens exist', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh-token'
      })

      mockApiClient.get.mockResolvedValue({
        data: { data: mockUser }
      })

      const user = await authService.getCurrentUser()

      expect(user).toEqual(mockUser)
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('should return null when not authenticated', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: null,
        refreshToken: null
      })

      const user = await authService.getCurrentUser()

      expect(user).toBeNull()
    })

    it('should check authentication status correctly', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh-token'
      })

      mockApiClient.post.mockResolvedValue({
        data: { data: { isValid: true } }
      })

      const isAuthenticated = await authService.isAuthenticated()

      expect(isAuthenticated).toBe(true)
    })

    it('should return false when no tokens exist', async () => {
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: null,
        refreshToken: null
      })

      const isAuthenticated = await authService.isAuthenticated()

      expect(isAuthenticated).toBe(false)
    })
  })

  describe('password management', () => {
    it('should request password reset successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: { success: true } })

      const result = await authService.requestPasswordReset('test@example.com')

      expect(result).toBe(true)
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com'
      })
    })

    it('should reset password with token successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: { success: true } })

      const result = await authService.resetPassword('reset-token', 'newpassword123')

      expect(result).toBe(true)
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'newpassword123'
      })
    })

    it('should change password successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: { success: true } })

      const result = await authService.changePassword('oldpassword', 'newpassword123')

      expect(result).toBe(true)
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      })
    })
  })
})