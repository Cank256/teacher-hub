/**
 * GoogleAuthService Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthService } from '../googleAuthService'
import { mockGoogleUser } from './setup'

// Import setup to ensure mocks are applied
import './setup'

const mockAuthSession = AuthSession as jest.Mocked<typeof AuthSession>
const mockWebBrowser = WebBrowser as jest.Mocked<typeof WebBrowser>

// Mock fetch for Google API calls
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('GoogleAuthService', () => {
  let googleAuthService: GoogleAuthService
  let mockPromptAsync: jest.Mock

  const testConfig = {
    clientId: 'test-google-client-id',
    redirectUri: 'teacher-hub://auth/google',
    scopes: ['openid', 'profile', 'email']
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock prompt function
    mockPromptAsync = jest.fn()
    
    // Mock useAuthRequest to return our mock prompt function
    mockAuthSession.useAuthRequest.mockReturnValue([
      { clientId: testConfig.clientId }, // request
      null, // response
      mockPromptAsync // promptAsync
    ])

    googleAuthService = new GoogleAuthService(testConfig)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await googleAuthService.initialize()

      expect(mockWebBrowser.warmUpAsync).toHaveBeenCalled()
    })

    it('should handle warm up errors gracefully', async () => {
      mockWebBrowser.warmUpAsync.mockRejectedValue(new Error('Warm up failed'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await googleAuthService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to warm up browser:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('authentication', () => {
    it('should authenticate successfully', async () => {
      const mockIdToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGUtMTIzIiwiZW1haWwiOiJ0ZXN0QGdtYWlsLmNvbSIsIm5hbWUiOiJKb2huIERvZSIsImdpdmVuX25hbWUiOiJKb2huIiwiZmFtaWx5X25hbWUiOiJEb2UiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2F2YXRhci5qcGcifQ.signature'
      
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: {
          id_token: mockIdToken,
          access_token: 'google-access-token'
        }
      })

      const result = await googleAuthService.authenticateWithGoogle()

      expect(result.success).toBe(true)
      expect(result.idToken).toBe(mockIdToken)
      expect(result.accessToken).toBe('google-access-token')
      expect(result.user).toEqual(mockGoogleUser)

      expect(mockPromptAsync).toHaveBeenCalled()
    })

    it('should handle user cancellation', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'cancel'
      })

      const result = await googleAuthService.authenticateWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User cancelled Google authentication')
    })

    it('should handle authentication errors', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'error',
        error: { message: 'Authentication failed' }
      })

      const result = await googleAuthService.authenticateWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication failed')
    })

    it('should handle missing ID token', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: {
          access_token: 'google-access-token'
          // Missing id_token
        }
      })

      await expect(googleAuthService.authenticateWithGoogle()).rejects.toThrow(
        'No ID token received from Google'
      )
    })

    it('should handle request creation failure', async () => {
      // Mock useAuthRequest to return null request
      mockAuthSession.useAuthRequest.mockReturnValue([
        null, // request is null
        null, // response
        mockPromptAsync // promptAsync
      ])

      const newService = new GoogleAuthService(testConfig)

      await expect(newService.authenticateWithGoogle()).rejects.toThrow(
        'Failed to create Google auth request'
      )
    })

    it('should handle prompt async errors', async () => {
      mockPromptAsync.mockRejectedValue(new Error('Network error'))

      const result = await googleAuthService.authenticateWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('user info retrieval', () => {
    it('should get user info successfully', async () => {
      const mockUserInfoResponse = {
        id: 'google-123',
        email: 'test@gmail.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfoResponse)
      } as Response)

      const userInfo = await googleAuthService.getUserInfo('access-token')

      expect(userInfo).toEqual(mockGoogleUser)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo?access_token=access-token'
      )
    })

    it('should handle user info API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response)

      await expect(googleAuthService.getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to fetch Google user info'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(googleAuthService.getUserInfo('access-token')).rejects.toThrow(
        'Failed to fetch Google user info'
      )
    })
  })

  describe('access revocation', () => {
    it('should revoke access successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true
      } as Response)

      await googleAuthService.revokeAccess('access-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=access-token',
        { method: 'POST' }
      )
    })

    it('should handle revocation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response)

      await expect(googleAuthService.revokeAccess('invalid-token')).rejects.toThrow(
        'Failed to revoke Google access'
      )
    })
  })

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await googleAuthService.cleanup()

      expect(mockWebBrowser.coolDownAsync).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      mockWebBrowser.coolDownAsync.mockRejectedValue(new Error('Cool down failed'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await googleAuthService.cleanup()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to cool down browser:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('ID token parsing', () => {
    it('should parse valid ID token', async () => {
      // Create a mock JWT token with base64 encoded payload
      const payload = {
        sub: 'google-123',
        email: 'test@gmail.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg'
      }
      
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
      const mockIdToken = `header.${encodedPayload}.signature`

      // Use reflection to access private method
      const parseIdToken = (googleAuthService as any).parseIdToken.bind(googleAuthService)
      const result = await parseIdToken(mockIdToken)

      expect(result).toEqual(mockGoogleUser)
    })

    it('should handle invalid ID token format', async () => {
      const invalidToken = 'invalid.token'

      const parseIdToken = (googleAuthService as any).parseIdToken.bind(googleAuthService)
      
      await expect(parseIdToken(invalidToken)).rejects.toThrow(
        'Failed to parse Google ID token'
      )
    })

    it('should handle malformed JWT payload', async () => {
      const invalidPayload = 'invalid-base64'
      const malformedToken = `header.${invalidPayload}.signature`

      const parseIdToken = (googleAuthService as any).parseIdToken.bind(googleAuthService)
      
      await expect(parseIdToken(malformedToken)).rejects.toThrow(
        'Failed to parse Google ID token'
      )
    })
  })
})