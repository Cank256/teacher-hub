/**
 * Biometric Authentication Service
 * Handles fingerprint, Face ID, and other biometric authentication methods
 */

import * as LocalAuthentication from 'expo-local-authentication'
import { secureStorage, defaultStorage } from '@/services/storage'
import {
  BiometricAuthResult,
  BiometricCapabilities,
  BiometricType,
  AuthError,
  AuthErrorCode
} from './types'

interface BiometricConfig {
  promptTitle: string
  promptSubtitle: string
  promptDescription?: string
  cancelLabel: string
  fallbackLabel: string
  disableDeviceFallback?: boolean
}

class BiometricService {
  private config: BiometricConfig
  private isInitialized = false

  constructor(config: BiometricConfig) {
    this.config = config
  }

  /**
   * Initialize biometric service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check if biometric hardware is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      if (!hasHardware) {
        console.warn('Biometric hardware not available on this device')
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize biometric service:', error)
      throw new AuthError(
        'Failed to initialize biometric authentication',
        AuthErrorCode.BIOMETRIC_NOT_AVAILABLE,
        error as Error
      )
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      return hasHardware && isEnrolled
    } catch (error) {
      console.error('Error checking biometric availability:', error)
      return false
    }
  }

  /**
   * Get detailed biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()

      const mappedTypes: BiometricType[] = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return BiometricType.FINGERPRINT
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return BiometricType.FACE_ID
          case LocalAuthentication.AuthenticationType.IRIS:
            return BiometricType.IRIS
          default:
            return BiometricType.FINGERPRINT
        }
      })

      return {
        isAvailable: hasHardware,
        isEnrolled,
        supportedTypes: mappedTypes
      }
    } catch (error) {
      console.error('Error getting biometric capabilities:', error)
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: []
      }
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(customConfig?: Partial<BiometricConfig>): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getCapabilities()
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device'
        }
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'No biometric credentials are enrolled on this device'
        }
      }

      const config = { ...this.config, ...customConfig }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: config.promptTitle,
        subtitle: config.promptSubtitle,
        description: config.promptDescription,
        cancelLabel: config.cancelLabel,
        fallbackLabel: config.fallbackLabel,
        disableDeviceFallback: config.disableDeviceFallback || false
      })

      if (result.success) {
        return { success: true }
      } else {
        const isCancelled = result.error === 'UserCancel' || 
                           result.error === 'UserFallback' ||
                           result.error === 'SystemCancel'

        return {
          success: false,
          cancelled: isCancelled,
          error: result.error || 'Biometric authentication failed'
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error)
      return {
        success: false,
        error: (error as Error).message || 'Biometric authentication failed'
      }
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometricAuth(userId: string): Promise<boolean> {
    try {
      const capabilities = await this.getCapabilities()
      
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        throw new AuthError(
          'Biometric authentication is not available or not enrolled',
          AuthErrorCode.BIOMETRIC_NOT_AVAILABLE
        )
      }

      // First, authenticate to ensure user can use biometrics
      const authResult = await this.authenticate({
        promptTitle: 'Enable Biometric Authentication',
        promptSubtitle: 'Verify your identity to enable biometric login'
      })

      if (!authResult.success) {
        return false
      }

      // Generate and store biometric key
      const biometricKey = await this.generateBiometricKey(userId)
      await secureStorage.setBiometricKey(biometricKey)
      
      // Mark biometrics as enabled
      await defaultStorage.setBool('biometric_enabled', true)
      await defaultStorage.setItem('biometric_enabled_at', new Date().toISOString())

      return true
    } catch (error) {
      console.error('Error enabling biometric authentication:', error)
      throw new AuthError(
        'Failed to enable biometric authentication',
        AuthErrorCode.BIOMETRIC_NOT_AVAILABLE,
        error as Error
      )
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      // Remove biometric key
      await secureStorage.removeSecureItem('biometric_key')
      
      // Mark biometrics as disabled
      await defaultStorage.setBool('biometric_enabled', false)
      await defaultStorage.removeItem('biometric_enabled_at')
      
      console.log('Biometric authentication disabled')
    } catch (error) {
      console.error('Error disabling biometric authentication:', error)
      throw new AuthError(
        'Failed to disable biometric authentication',
        AuthErrorCode.BIOMETRIC_NOT_AVAILABLE,
        error as Error
      )
    }
  }

  /**
   * Check if biometric authentication is enabled for the app
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const isEnabled = await defaultStorage.getBool('biometric_enabled')
      const hasKey = await secureStorage.getBiometricKey()
      return Boolean(isEnabled && hasKey)
    } catch (error) {
      console.error('Error checking biometric status:', error)
      return false
    }
  }

  /**
   * Verify biometric key exists and is valid
   */
  async verifyBiometricKey(): Promise<boolean> {
    try {
      const biometricKey = await secureStorage.getBiometricKey()
      return Boolean(biometricKey)
    } catch (error) {
      console.error('Error verifying biometric key:', error)
      return false
    }
  }

  /**
   * Get biometric authentication status
   */
  async getStatus(): Promise<{
    isAvailable: boolean
    isEnrolled: boolean
    isEnabled: boolean
    supportedTypes: BiometricType[]
    lastEnabledAt?: Date
  }> {
    try {
      const capabilities = await this.getCapabilities()
      const isEnabled = await this.isBiometricEnabled()
      const lastEnabledAt = await defaultStorage.getItem<string>('biometric_enabled_at')

      return {
        isAvailable: capabilities.isAvailable,
        isEnrolled: capabilities.isEnrolled,
        isEnabled,
        supportedTypes: capabilities.supportedTypes,
        lastEnabledAt: lastEnabledAt ? new Date(lastEnabledAt) : undefined
      }
    } catch (error) {
      console.error('Error getting biometric status:', error)
      return {
        isAvailable: false,
        isEnrolled: false,
        isEnabled: false,
        supportedTypes: []
      }
    }
  }

  /**
   * Handle biometric authentication for login
   */
  async authenticateForLogin(): Promise<BiometricAuthResult> {
    try {
      const isEnabled = await this.isBiometricEnabled()
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled'
        }
      }

      const result = await this.authenticate({
        promptTitle: 'Sign In',
        promptSubtitle: 'Use your biometric to sign in to Teacher Hub',
        promptDescription: 'Place your finger on the sensor or look at the camera'
      })

      if (result.success) {
        // Verify the biometric key is still valid
        const keyValid = await this.verifyBiometricKey()
        if (!keyValid) {
          return {
            success: false,
            error: 'Biometric key is invalid. Please re-enable biometric authentication.'
          }
        }
      }

      return result
    } catch (error) {
      console.error('Biometric login authentication error:', error)
      return {
        success: false,
        error: (error as Error).message || 'Biometric authentication failed'
      }
    }
  }

  // Private methods

  /**
   * Generate a unique biometric key for the user
   */
  private async generateBiometricKey(userId: string): Promise<string> {
    const timestamp = Date.now().toString()
    const randomValue = Math.random().toString(36).substring(2)
    return `${userId}-${timestamp}-${randomValue}`
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyError(error: string): string {
    switch (error) {
      case 'UserCancel':
        return 'Authentication was cancelled'
      case 'UserFallback':
        return 'User chose to use fallback authentication'
      case 'SystemCancel':
        return 'Authentication was cancelled by the system'
      case 'PasscodeNotSet':
        return 'Device passcode is not set'
      case 'BiometryNotAvailable':
        return 'Biometric authentication is not available'
      case 'BiometryNotEnrolled':
        return 'No biometric credentials are enrolled'
      case 'BiometryLockout':
        return 'Biometric authentication is locked out'
      default:
        return error || 'Biometric authentication failed'
    }
  }
}

// Default configuration
const defaultBiometricConfig: BiometricConfig = {
  promptTitle: 'Authenticate',
  promptSubtitle: 'Use your biometric to continue',
  cancelLabel: 'Cancel',
  fallbackLabel: 'Use Password'
}

// Create singleton instance
export const biometricService = new BiometricService(defaultBiometricConfig)

// Export convenience functions
export const authenticateWithBiometrics = (config?: Partial<BiometricConfig>): Promise<BiometricAuthResult> => {
  return biometricService.authenticate(config)
}

export const enableBiometrics = (userId: string): Promise<boolean> => {
  return biometricService.enableBiometricAuth(userId)
}

export const disableBiometrics = (): Promise<void> => {
  return biometricService.disableBiometricAuth()
}

export const isBiometricAvailable = (): Promise<boolean> => {
  return biometricService.isAvailable()
}

export const getBiometricCapabilities = (): Promise<BiometricCapabilities> => {
  return biometricService.getCapabilities()
}

export const isBiometricEnabled = (): Promise<boolean> => {
  return biometricService.isBiometricEnabled()
}

export { BiometricService }