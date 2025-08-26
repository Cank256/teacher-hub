/**
 * Google OAuth Authentication Service
 * Handles Google Sign-In integration using Expo AuthSession
 */

import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthResult, GoogleUser, AuthError, AuthErrorCode } from './types'

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession()

interface GoogleAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

class GoogleAuthService {
  private config: GoogleAuthConfig
  private discovery: AuthSession.DiscoveryDocument

  constructor(config: GoogleAuthConfig) {
    this.config = config
    this.discovery = AuthSession.useAutoDiscovery('https://accounts.google.com')
  }

  /**
   * Initialize Google Auth service
   */
  async initialize(): Promise<void> {
    try {
      // Pre-warm the browser for better UX
      await WebBrowser.warmUpAsync()
    } catch (error) {
      console.warn('Failed to warm up browser:', error)
    }
  }

  /**
   * Authenticate with Google
   */
  async authenticateWithGoogle(): Promise<GoogleAuthResult> {
    try {
      // Create auth request
      const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
          clientId: this.config.clientId,
          scopes: this.config.scopes,
          redirectUri: this.config.redirectUri,
          responseType: AuthSession.ResponseType.IdToken,
          additionalParameters: {},
          extraParams: {
            access_type: 'offline'
          }
        },
        this.discovery
      )

      if (!request) {
        throw new AuthError(
          'Failed to create Google auth request',
          AuthErrorCode.GOOGLE_AUTH_FAILED
        )
      }

      // Prompt for authentication
      const result = await promptAsync()

      if (result.type === 'success') {
        const { id_token, access_token } = result.params

        if (!id_token) {
          throw new AuthError(
            'No ID token received from Google',
            AuthErrorCode.GOOGLE_AUTH_FAILED
          )
        }

        // Parse user info from ID token
        const userInfo = await this.parseIdToken(id_token)

        return {
          success: true,
          idToken: id_token,
          accessToken: access_token,
          user: userInfo
        }
      } else if (result.type === 'cancel') {
        return {
          success: false,
          error: 'User cancelled Google authentication'
        }
      } else {
        throw new AuthError(
          result.error?.message || 'Google authentication failed',
          AuthErrorCode.GOOGLE_AUTH_FAILED
        )
      }
    } catch (error) {
      console.error('Google authentication error:', error)
      
      if (error instanceof AuthError) {
        throw error
      }

      return {
        success: false,
        error: (error as Error).message || 'Google authentication failed'
      }
    }
  }

  /**
   * Get user info from Google API
   */
  async getUserInfo(accessToken: string): Promise<GoogleUser> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const userInfo = await response.json()

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
        photoUrl: userInfo.picture
      }
    } catch (error) {
      throw new AuthError(
        'Failed to fetch Google user info',
        AuthErrorCode.GOOGLE_AUTH_FAILED,
        error as Error
      )
    }
  }

  /**
   * Revoke Google access token
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      throw new AuthError(
        'Failed to revoke Google access',
        AuthErrorCode.GOOGLE_AUTH_FAILED,
        error as Error
      )
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await WebBrowser.coolDownAsync()
    } catch (error) {
      console.warn('Failed to cool down browser:', error)
    }
  }

  // Private methods

  /**
   * Parse user information from ID token
   */
  private async parseIdToken(idToken: string): Promise<GoogleUser> {
    try {
      // Decode JWT token (simple base64 decode for payload)
      const parts = idToken.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format')
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      )

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        givenName: payload.given_name,
        familyName: payload.family_name,
        photoUrl: payload.picture
      }
    } catch (error) {
      throw new AuthError(
        'Failed to parse Google ID token',
        AuthErrorCode.GOOGLE_AUTH_FAILED,
        error as Error
      )
    }
  }
}

// Configuration for Google Auth
const googleAuthConfig: GoogleAuthConfig = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'teacher-hub',
    path: 'auth/google'
  }),
  scopes: ['openid', 'profile', 'email']
}

// Create singleton instance
const googleAuthService = new GoogleAuthService(googleAuthConfig)

// Export functions for use in AuthService
export const authenticateWithGoogle = (): Promise<GoogleAuthResult> => {
  return googleAuthService.authenticateWithGoogle()
}

export const getUserInfo = (accessToken: string): Promise<GoogleUser> => {
  return googleAuthService.getUserInfo(accessToken)
}

export const revokeGoogleAccess = (accessToken: string): Promise<void> => {
  return googleAuthService.revokeAccess(accessToken)
}

export const initializeGoogleAuth = (): Promise<void> => {
  return googleAuthService.initialize()
}

export const cleanupGoogleAuth = (): Promise<void> => {
  return googleAuthService.cleanup()
}

export { GoogleAuthService, googleAuthService }