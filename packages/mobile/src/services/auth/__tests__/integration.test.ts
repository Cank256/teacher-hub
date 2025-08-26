/**
 * Authentication Services Integration Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { authService, initializeAuthServices, cleanupAuthServices } from '../index'
import { secureStorage, defaultStorage } from '@/services/storage'
import { mockUser, mockLoginCredentials, mockTokens } from './setup'

// Import setup to ensure mocks are applied
import './setup'

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

describe('Authentication Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('service initialization', () => {
    it('should initialize all auth services successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await initializeAuthServices()

      expect(consoleSpy).toHaveBeenCalledWith('Initializing authentication services...')
      expect(consoleSpy).toHaveBeenCalledWith('Auth service initialized')
      expect(consoleSpy).toHaveBeenCalledWith('Google auth service initialized')
      expect(consoleSpy).toHaveBeenCalledWith('Biometric service initialized')
      expect(consoleSpy).toHaveBeenCalledWith('All authentication services initialized successfully')

      consoleSpy.mockRestore()
    })

    it('should handle initialization errors', async () => {
      // Mock auth service initialization to fail
      const originalInitialize = authService.initialize
      authService.initialize = jest.fn().mockRejectedValue(new Error('Init failed'))

      await expect(initializeAuthServices()).rejects.toThrow('Init failed')

      // Restore original method
      authService.initialize = originalInitialize
    })

    it('should cleanup all auth services successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await cleanupAuthServices()

      expect(consoleSpy).toHaveBeenCalledWith('Cleaning up authentication services...')
      expect(consoleSpy).toHaveBeenCalledWith('Authentication services cleaned up')

      consoleSpy.mockRestore()
    })
  })

  describe('complete authentication flow', () => {
    it('should complete login flow with biometric setup', async () => {
      // Mock successful login
      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      })

      // Mock biometric availability
      const { biometricService } = await import('../biometricService')
      jest.spyOn(biometricService, 'getCapabilities').mockResolvedValue({
        isAvailable: true,
        isEnrolled: true,
        supportedTypes: []
      })

      // Perform login
      const loginResult = await authService.login(mockLoginCredentials)
      expect(loginResult.success).toBe(true)

      // Enable biometrics
      const biometricResult = await authService.enableBiometrics()
      expect(biometricResult).toBe(true)

      // Verify storage calls
      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
      expect(mockDefaultStorage.setBool).toHaveBeenCalledWith('remember_me', true)
      expect(mockDefaultStorage.setBool).toHaveBeenCalledWith('biometric_enabled', true)
    })

    it('should handle complete logout flow', async () => {
      // Set up authenticated state
      ;(authService as any).currentUser = mockUser
      mockSecureStorage.getAuthTokens.mockResolvedValue(mockTokens)

      // Mock logout API call
      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockResolvedValue({ data: { success: true } })

      // Perform logout
      await authService.logout()

      // Verify all auth data is cleared
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
      expect(mockSecureStorage.removeSecureItem).toHaveBeenCalledWith('biometric_key')
      expect(mockSecureStorage.removeSecureItem).toHaveBeenCalledWith('user_credentials')
      expect(mockDefaultStorage.removeItem).toHaveBeenCalledWith('remember_me')
      expect(mockDefaultStorage.removeItem).toHaveBeenCalledWith('biometric_enabled')
    })

    it('should handle token refresh during API calls', async () => {
      // Set up expired token scenario
      mockSecureStorage.getAuthTokens.mockResolvedValue({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token'
      })

      const mockApiClient = (authService as any).apiClient

      // Mock initial request failure (401) and successful retry
      mockApiClient.post
        .mockRejectedValueOnce({
          response: { status: 401 },
          config: { _retry: undefined }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token'
            }
          }
        })
        .mockResolvedValueOnce({
          data: { data: mockUser }
        })

      // This should trigger token refresh
      const user = await authService.getCurrentUser()

      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token'
      )
    })
  })

  describe('credential verification flow', () => {
    it('should complete credential upload and verification', async () => {
      const { credentialService } = await import('../credentialService')
      
      // Mock document picking
      jest.spyOn(credentialService, 'pickDocument').mockResolvedValue({
        type: 'teaching_certificate' as const,
        fileName: 'certificate.pdf',
        fileUri: 'file://certificate.pdf',
        mimeType: 'application/pdf',
        size: 1024
      })

      // Mock successful upload
      const mockApiClient = (credentialService as any).apiClient
      mockApiClient.post.mockResolvedValue({
        data: {
          data: {
            status: 'pending',
            message: 'Documents uploaded successfully'
          }
        }
      })

      // Pick document
      const document = await credentialService.pickDocument()
      expect(document).toBeTruthy()

      // Upload credentials
      const uploadResult = await credentialService.uploadCredentials({
        documents: [document!]
      })

      expect(uploadResult.success).toBe(true)
      expect(uploadResult.status).toBe('pending')
    })
  })

  describe('Google OAuth integration', () => {
    it('should complete Google OAuth flow', async () => {
      const { googleAuthService } = await import('../googleAuthService')
      
      // Mock Google authentication
      jest.spyOn(googleAuthService, 'authenticateWithGoogle').mockResolvedValue({
        success: true,
        idToken: 'google-id-token',
        accessToken: 'google-access-token',
        user: {
          id: 'google-123',
          email: 'test@gmail.com',
          name: 'John Doe',
          givenName: 'John',
          familyName: 'Doe'
        }
      })

      // Mock backend Google auth
      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      })

      // Perform Google login
      const result = await authService.loginWithGoogle()

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(mockSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
    })
  })

  describe('error handling and recovery', () => {
    it('should handle network errors gracefully', async () => {
      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockRejectedValue({
        request: {},
        message: 'Network Error'
      })

      const result = await authService.login(mockLoginCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle storage errors gracefully', async () => {
      mockSecureStorage.setAuthTokens.mockRejectedValue(new Error('Storage error'))

      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      })

      // Login should still work even if token storage fails
      const result = await authService.login(mockLoginCredentials)
      expect(result.success).toBe(true)
    })

    it('should handle biometric errors gracefully', async () => {
      const { biometricService } = await import('../biometricService')
      
      // Mock biometric authentication failure
      jest.spyOn(biometricService, 'authenticate').mockResolvedValue({
        success: false,
        error: 'Biometric authentication failed'
      })

      const result = await authService.authenticateWithBiometrics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Biometric authentication failed')
    })
  })

  describe('state consistency', () => {
    it('should maintain consistent state across services', async () => {
      // Login user
      const mockApiClient = (authService as any).apiClient
      mockApiClient.post.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            accessToken: mockTokens.accessToken,
            refreshToken: mockTokens.refreshToken
          }
        }
      })

      await authService.login(mockLoginCredentials)

      // Check authentication state
      mockSecureStorage.getAuthTokens.mockResolvedValue(mockTokens)
      mockApiClient.post.mockResolvedValue({
        data: { data: { isValid: true } }
      })

      const isAuthenticated = await authService.isAuthenticated()
      const currentUser = await authService.getCurrentUser()

      expect(isAuthenticated).toBe(true)
      expect(currentUser).toEqual(mockUser)
    })

    it('should clear state consistently on logout', async () => {
      // Set up authenticated state
      ;(authService as any).currentUser = mockUser

      // Logout
      await authService.logout()

      // Verify state is cleared
      const currentUser = await authService.getCurrentUser()
      expect(currentUser).toBeNull()
    })
  })
})