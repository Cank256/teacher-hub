/**
 * Authentication Services Index
 * Main entry point for all authentication-related services
 */

// Core services
export { AuthService } from './authService'
export { GoogleAuthService, googleAuthService } from './googleAuthService'
export { BiometricService, biometricService } from './biometricService'
export { CredentialService, credentialService } from './credentialService'

// Types and interfaces
export * from './types'

// Convenience functions
export {
  authenticateWithGoogle,
  getUserInfo,
  revokeGoogleAccess,
  initializeGoogleAuth,
  cleanupGoogleAuth
} from './googleAuthService'

export {
  authenticateWithBiometrics,
  enableBiometrics,
  disableBiometrics,
  isBiometricAvailable,
  getBiometricCapabilities,
  isBiometricEnabled
} from './biometricService'

export {
  pickDocument,
  takePhoto,
  pickImage,
  uploadCredentials,
  getVerificationStatus,
  resubmitCredentials,
  getDocumentTypes,
  validateDocument
} from './credentialService'

// Main auth service configuration and initialization
import { AuthService } from './authService'
import { AuthConfig } from './types'

// Default configuration
const defaultAuthConfig: AuthConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  tokenRefreshThreshold: 5, // 5 minutes before expiry
  biometricPromptTitle: 'Authenticate',
  maxLoginAttempts: 5,
  lockoutDuration: 15 // 15 minutes
}

// Create singleton auth service instance
export const authService = new AuthService(defaultAuthConfig)

// Initialize all auth services
export const initializeAuthServices = async (): Promise<void> => {
  try {
    console.log('Initializing authentication services...')
    
    // Initialize main auth service with timeout
    try {
      const initPromise = authService.initialize()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth service initialization timeout')), 5000)
      )
      await Promise.race([initPromise, timeoutPromise])
      console.log('Auth service initialized')
    } catch (error) {
      console.warn('Auth service initialization failed, continuing in offline mode:', error)
    }
    
    // Initialize Google auth service (non-blocking)
    try {
      const { initializeGoogleAuth } = await import('./googleAuthService')
      await initializeGoogleAuth()
      console.log('Google auth service initialized')
    } catch (error) {
      console.warn('Google auth service initialization failed:', error)
    }
    
    // Initialize biometric service (non-blocking)
    try {
      const { biometricService } = await import('./biometricService')
      await biometricService.initialize()
      console.log('Biometric service initialized')
    } catch (error) {
      console.warn('Biometric service initialization failed:', error)
    }
    
    console.log('Authentication services initialization completed')
  } catch (error) {
    console.error('Critical error during authentication services initialization:', error)
    // Don't throw - allow app to continue in offline mode
  }
}

// Cleanup all auth services
export const cleanupAuthServices = async (): Promise<void> => {
  try {
    console.log('Cleaning up authentication services...')
    
    // Cleanup Google auth service
    const { cleanupGoogleAuth } = await import('./googleAuthService')
    await cleanupGoogleAuth()
    
    console.log('Authentication services cleaned up')
  } catch (error) {
    console.error('Failed to cleanup authentication services:', error)
  }
}

// Export default auth service
export default authService