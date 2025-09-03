/**
 * Secure Storage Service
 * Uses Expo SecureStore for sensitive data storage with Keychain (iOS) and Keystore (Android)
 */

import * as SecureStore from 'expo-secure-store'
import { SecureStorageService, StorageError, StorageErrorCode, SecureStorageKeys } from './types'

class ExpoSecureStorageService implements SecureStorageService {
  private readonly options: SecureStore.SecureStoreOptions

  constructor() {
    this.options = {
      keychainService: 'teacher-hub-keychain',
      requireAuthentication: false, // Set to true for biometric-protected items
      authenticationPrompt: 'Authenticate to access secure data'
    }
  }

  /**
   * Store a secure item
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, this.options)
    } catch (error) {
      throw new StorageError(
        `Failed to set secure item with key: ${key}`,
        StorageErrorCode.ENCRYPTION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Retrieve a secure item
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key, this.options)
      return value
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null
      }
      throw new StorageError(
        `Failed to get secure item with key: ${key}`,
        StorageErrorCode.ITEM_NOT_FOUND,
        error as Error
      )
    }
  }

  /**
   * Remove a secure item
   */
  async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, this.options)
    } catch (error) {
      throw new StorageError(
        `Failed to remove secure item with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Clear all secure storage (removes all items with our keychain service)
   */
  async clearSecureStorage(): Promise<void> {
    try {
      // Get all secure storage keys and remove them
      const keys = Object.values(SecureStorageKeys)
      await Promise.all(
        keys.map(key => this.removeSecureItem(key).catch(() => {
          // Ignore errors for non-existent keys
        }))
      )
    } catch (error) {
      throw new StorageError(
        'Failed to clear secure storage',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Store authentication tokens securely
   */
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        this.setSecureItem(SecureStorageKeys.ACCESS_TOKEN, accessToken),
        this.setSecureItem(SecureStorageKeys.REFRESH_TOKEN, refreshToken)
      ])
    } catch (error) {
      throw new StorageError(
        'Failed to store authentication tokens',
        StorageErrorCode.ENCRYPTION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Retrieve authentication tokens
   */
  async getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getSecureItem(SecureStorageKeys.ACCESS_TOKEN).catch(() => null),
        this.getSecureItem(SecureStorageKeys.REFRESH_TOKEN).catch(() => null)
      ])
      
      return { accessToken, refreshToken }
    } catch (error) {
      console.warn('Failed to retrieve authentication tokens:', error)
      // Return null tokens instead of throwing
      return { accessToken: null, refreshToken: null }
    }
  }

  /**
   * Clear authentication tokens
   */
  async clearAuthTokens(): Promise<void> {
    try {
      await Promise.all([
        this.removeSecureItem(SecureStorageKeys.ACCESS_TOKEN),
        this.removeSecureItem(SecureStorageKeys.REFRESH_TOKEN)
      ])
    } catch (error) {
      throw new StorageError(
        'Failed to clear authentication tokens',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Store biometric authentication key
   */
  async setBiometricKey(key: string): Promise<void> {
    try {
      const biometricOptions: SecureStore.SecureStoreOptions = {
        ...this.options,
        requireAuthentication: true,
        authenticationPrompt: 'Use biometrics to secure your account'
      }
      
      await SecureStore.setItemAsync(SecureStorageKeys.BIOMETRIC_KEY, key, biometricOptions)
    } catch (error) {
      throw new StorageError(
        'Failed to set biometric key',
        StorageErrorCode.ENCRYPTION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Retrieve biometric authentication key
   */
  async getBiometricKey(): Promise<string | null> {
    try {
      const biometricOptions: SecureStore.SecureStoreOptions = {
        ...this.options,
        requireAuthentication: true,
        authenticationPrompt: 'Use biometrics to access your account'
      }
      
      return await SecureStore.getItemAsync(SecureStorageKeys.BIOMETRIC_KEY, biometricOptions)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null
      }
      throw new StorageError(
        'Failed to get biometric key',
        StorageErrorCode.ITEM_NOT_FOUND,
        error as Error
      )
    }
  }

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync()
    } catch (error) {
      return false
    }
  }

  /**
   * Store user credentials securely (for remember me functionality)
   */
  async setUserCredentials(email: string, encryptedPassword: string): Promise<void> {
    try {
      const credentials = JSON.stringify({ email, encryptedPassword })
      await this.setSecureItem(SecureStorageKeys.USER_CREDENTIALS, credentials)
    } catch (error) {
      throw new StorageError(
        'Failed to store user credentials',
        StorageErrorCode.ENCRYPTION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Retrieve user credentials
   */
  async getUserCredentials(): Promise<{ email: string; encryptedPassword: string } | null> {
    try {
      const credentials = await this.getSecureItem(SecureStorageKeys.USER_CREDENTIALS)
      if (!credentials) {
        return null
      }
      return JSON.parse(credentials)
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve user credentials',
        StorageErrorCode.ITEM_NOT_FOUND,
        error as Error
      )
    }
  }
}

// Create singleton instance
export const secureStorage = new ExpoSecureStorageService()

export { ExpoSecureStorageService }