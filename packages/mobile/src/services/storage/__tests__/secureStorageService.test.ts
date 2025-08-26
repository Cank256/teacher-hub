/**
 * Secure Storage Service Tests
 */

import { ExpoSecureStorageService } from '../secureStorageService'
import { StorageError, SecureStorageKeys } from '../types'

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn()
}))

import * as SecureStore from 'expo-secure-store'

describe('ExpoSecureStorageService', () => {
  let secureStorageService: ExpoSecureStorageService
  const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

  beforeEach(() => {
    jest.clearAllMocks()
    secureStorageService = new ExpoSecureStorageService()
  })

  describe('setSecureItem', () => {
    it('should store a secure item successfully', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined)

      await secureStorageService.setSecureItem('test-key', 'test-value')

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        expect.objectContaining({
          keychainService: 'teacher-hub-keychain',
          requireAuthentication: false
        })
      )
    })

    it('should throw StorageError on failure', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Storage failed'))

      await expect(secureStorageService.setSecureItem('test-key', 'test-value'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('getSecureItem', () => {
    it('should retrieve a secure item successfully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('test-value')

      const result = await secureStorageService.getSecureItem('test-key')

      expect(result).toBe('test-value')
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          keychainService: 'teacher-hub-keychain'
        })
      )
    })

    it('should return null for non-existent item', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null)

      const result = await secureStorageService.getSecureItem('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null when item not found error occurs', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Item not found'))

      const result = await secureStorageService.getSecureItem('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw StorageError on other failures', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Access denied'))

      await expect(secureStorageService.getSecureItem('test-key'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('removeSecureItem', () => {
    it('should remove a secure item successfully', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined)

      await secureStorageService.removeSecureItem('test-key')

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          keychainService: 'teacher-hub-keychain'
        })
      )
    })

    it('should throw StorageError on failure', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'))

      await expect(secureStorageService.removeSecureItem('test-key'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('clearSecureStorage', () => {
    it('should clear all secure storage items', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined)

      await secureStorageService.clearSecureStorage()

      // Should attempt to delete all SecureStorageKeys
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(
        Object.values(SecureStorageKeys).length
      )
    })
  })

  describe('setAuthTokens', () => {
    it('should store authentication tokens', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined)

      await secureStorageService.setAuthTokens('access-token', 'refresh-token')

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.ACCESS_TOKEN,
        'access-token',
        expect.any(Object)
      )
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.REFRESH_TOKEN,
        'refresh-token',
        expect.any(Object)
      )
    })
  })

  describe('getAuthTokens', () => {
    it('should retrieve authentication tokens', async () => {
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token')

      const result = await secureStorageService.getAuthTokens()

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })
    })

    it('should handle missing tokens', async () => {
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const result = await secureStorageService.getAuthTokens()

      expect(result).toEqual({
        accessToken: null,
        refreshToken: null
      })
    })
  })

  describe('clearAuthTokens', () => {
    it('should clear authentication tokens', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined)

      await secureStorageService.clearAuthTokens()

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.ACCESS_TOKEN,
        expect.any(Object)
      )
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.REFRESH_TOKEN,
        expect.any(Object)
      )
    })
  })

  describe('setBiometricKey', () => {
    it('should store biometric key with authentication required', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined)

      await secureStorageService.setBiometricKey('biometric-key')

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.BIOMETRIC_KEY,
        'biometric-key',
        expect.objectContaining({
          requireAuthentication: true,
          authenticationPrompt: 'Use biometrics to secure your account'
        })
      )
    })
  })

  describe('getBiometricKey', () => {
    it('should retrieve biometric key with authentication', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('biometric-key')

      const result = await secureStorageService.getBiometricKey()

      expect(result).toBe('biometric-key')
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.BIOMETRIC_KEY,
        expect.objectContaining({
          requireAuthentication: true,
          authenticationPrompt: 'Use biometrics to access your account'
        })
      )
    })

    it('should return null for non-existent biometric key', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Item not found'))

      const result = await secureStorageService.getBiometricKey()

      expect(result).toBeNull()
    })
  })

  describe('isAvailable', () => {
    it('should return true when secure storage is available', async () => {
      mockSecureStore.isAvailableAsync.mockResolvedValue(true)

      const result = await secureStorageService.isAvailable()

      expect(result).toBe(true)
    })

    it('should return false when secure storage is not available', async () => {
      mockSecureStore.isAvailableAsync.mockResolvedValue(false)

      const result = await secureStorageService.isAvailable()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockSecureStore.isAvailableAsync.mockRejectedValue(new Error('Check failed'))

      const result = await secureStorageService.isAvailable()

      expect(result).toBe(false)
    })
  })

  describe('setUserCredentials', () => {
    it('should store user credentials as JSON', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined)

      await secureStorageService.setUserCredentials('user@example.com', 'encrypted-password')

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SecureStorageKeys.USER_CREDENTIALS,
        JSON.stringify({
          email: 'user@example.com',
          encryptedPassword: 'encrypted-password'
        }),
        expect.any(Object)
      )
    })
  })

  describe('getUserCredentials', () => {
    it('should retrieve and parse user credentials', async () => {
      const credentials = {
        email: 'user@example.com',
        encryptedPassword: 'encrypted-password'
      }
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(credentials))

      const result = await secureStorageService.getUserCredentials()

      expect(result).toEqual(credentials)
    })

    it('should return null for non-existent credentials', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null)

      const result = await secureStorageService.getUserCredentials()

      expect(result).toBeNull()
    })
  })
})