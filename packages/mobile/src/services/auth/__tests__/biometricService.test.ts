/**
 * BiometricService Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as LocalAuthentication from 'expo-local-authentication'
import { BiometricService } from '../biometricService'
import { BiometricType } from '../types'
import { secureStorage, defaultStorage } from '@/services/storage'

// Import setup to ensure mocks are applied
import './setup'

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>
const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

describe('BiometricService', () => {
  let biometricService: BiometricService

  const testConfig = {
    promptTitle: 'Test Authentication',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use Password'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    biometricService = new BiometricService(testConfig)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully when hardware is available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)

      await biometricService.initialize()

      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled()
    })

    it('should initialize with warning when hardware is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await biometricService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith('Biometric hardware not available on this device')
      consoleSpy.mockRestore()
    })

    it('should handle initialization errors', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'))

      await expect(biometricService.initialize()).rejects.toThrow(
        'Failed to initialize biometric authentication'
      )
    })
  })

  describe('availability checks', () => {
    it('should return true when biometrics are available and enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)

      const isAvailable = await biometricService.isAvailable()

      expect(isAvailable).toBe(true)
      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled()
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled()
    })

    it('should return false when hardware is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)

      const isAvailable = await biometricService.isAvailable()

      expect(isAvailable).toBe(false)
    })

    it('should return false when biometrics are not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false)

      const isAvailable = await biometricService.isAvailable()

      expect(isAvailable).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware error'))

      const isAvailable = await biometricService.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('capabilities', () => {
    it('should return correct capabilities', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ])

      const capabilities = await biometricService.getCapabilities()

      expect(capabilities).toEqual({
        isAvailable: true,
        isEnrolled: true,
        supportedTypes: [BiometricType.FINGERPRINT, BiometricType.FACE_ID]
      })
    })

    it('should handle errors in capabilities check', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Capabilities error'))

      const capabilities = await biometricService.getCapabilities()

      expect(capabilities).toEqual({
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: []
      })
    })
  })

  describe('authentication', () => {
    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ])
    })

    it('should authenticate successfully', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true })

      const result = await biometricService.authenticate()

      expect(result.success).toBe(true)
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: testConfig.promptTitle,
        cancelLabel: testConfig.cancelLabel,
        fallbackLabel: testConfig.fallbackLabel,
        disableDeviceFallback: false
      })
    })

    it('should handle authentication failure', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'AuthenticationFailed'
      })

      const result = await biometricService.authenticate()

      expect(result.success).toBe(false)
      expect(result.error).toBe('AuthenticationFailed')
      expect(result.cancelled).toBe(false)
    })

    it('should detect user cancellation', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'UserCancel'
      })

      const result = await biometricService.authenticate()

      expect(result.success).toBe(false)
      expect(result.cancelled).toBe(true)
      expect(result.error).toBe('UserCancel')
    })

    it('should handle hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false)

      const result = await biometricService.authenticate()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Biometric authentication is not available on this device')
    })

    it('should handle biometrics not enrolled', async () => {
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false)

      const result = await biometricService.authenticate()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No biometric credentials are enrolled on this device')
    })

    it('should use custom configuration', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true })

      const customConfig = {
        promptTitle: 'Custom Title',
        promptDescription: 'Custom Description'
      }

      await biometricService.authenticate(customConfig)

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Custom Title',
        description: 'Custom Description',
        cancelLabel: testConfig.cancelLabel,
        fallbackLabel: testConfig.fallbackLabel,
        disableDeviceFallback: false
      })
    })
  })

  describe('enable/disable biometrics', () => {
    const userId = 'user-123'

    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ])
    })

    it('should enable biometric authentication successfully', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true })

      const result = await biometricService.enableBiometricAuth(userId)

      expect(result).toBe(true)
      expect(mockSecureStorage.setBiometricKey).toHaveBeenCalled()
      expect(mockDefaultStorage.setBool).toHaveBeenCalledWith('biometric_enabled', true)
      expect(mockDefaultStorage.setItem).toHaveBeenCalledWith(
        'biometric_enabled_at',
        expect.any(String)
      )
    })

    it('should fail to enable when hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false)

      await expect(biometricService.enableBiometricAuth(userId)).rejects.toThrow(
        'Biometric authentication is not available or not enrolled'
      )
    })

    it('should fail to enable when biometrics not enrolled', async () => {
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false)

      await expect(biometricService.enableBiometricAuth(userId)).rejects.toThrow(
        'Biometric authentication is not available or not enrolled'
      )
    })

    it('should fail to enable when authentication fails', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'AuthenticationFailed'
      })

      const result = await biometricService.enableBiometricAuth(userId)

      expect(result).toBe(false)
      expect(mockSecureStorage.setBiometricKey).not.toHaveBeenCalled()
    })

    it('should disable biometric authentication successfully', async () => {
      await biometricService.disableBiometricAuth()

      expect(mockSecureStorage.removeSecureItem).toHaveBeenCalledWith('biometric_key')
      expect(mockDefaultStorage.setBool).toHaveBeenCalledWith('biometric_enabled', false)
      expect(mockDefaultStorage.removeItem).toHaveBeenCalledWith('biometric_enabled_at')
    })
  })

  describe('biometric status', () => {
    it('should return true when biometrics are enabled', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(true)
      mockSecureStorage.getBiometricKey.mockResolvedValue('biometric-key')

      const isEnabled = await biometricService.isBiometricEnabled()

      expect(isEnabled).toBe(true)
    })

    it('should return false when biometrics are disabled', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(false)
      mockSecureStorage.getBiometricKey.mockResolvedValue('biometric-key')

      const isEnabled = await biometricService.isBiometricEnabled()

      expect(isEnabled).toBe(false)
    })

    it('should return false when biometric key is missing', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(true)
      mockSecureStorage.getBiometricKey.mockResolvedValue(null)

      const isEnabled = await biometricService.isBiometricEnabled()

      expect(isEnabled).toBe(false)
    })

    it('should verify biometric key exists', async () => {
      mockSecureStorage.getBiometricKey.mockResolvedValue('biometric-key')

      const keyExists = await biometricService.verifyBiometricKey()

      expect(keyExists).toBe(true)
    })

    it('should return complete status', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ])
      mockDefaultStorage.getBool.mockResolvedValue(true)
      mockSecureStorage.getBiometricKey.mockResolvedValue('biometric-key')
      mockDefaultStorage.getItem.mockResolvedValue('2024-01-01T00:00:00.000Z')

      const status = await biometricService.getStatus()

      expect(status).toEqual({
        isAvailable: true,
        isEnrolled: true,
        isEnabled: true,
        supportedTypes: [BiometricType.FINGERPRINT],
        lastEnabledAt: new Date('2024-01-01T00:00:00.000Z')
      })
    })
  })

  describe('login authentication', () => {
    beforeEach(() => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true)
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ])
    })

    it('should authenticate for login successfully', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(true)
      mockSecureStorage.getBiometricKey.mockResolvedValue('biometric-key')
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true })

      const result = await biometricService.authenticateForLogin()

      expect(result.success).toBe(true)
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Sign In',
        description: 'Place your finger on the sensor or look at the camera',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false
      })
    })

    it('should fail when biometrics are not enabled', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(false)

      const result = await biometricService.authenticateForLogin()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Biometric authentication is not enabled')
    })

    it('should fail when biometric key is invalid', async () => {
      mockDefaultStorage.getBool.mockResolvedValue(true)
      mockSecureStorage.getBiometricKey.mockResolvedValue(null)
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true })

      const result = await biometricService.authenticateForLogin()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Biometric key is invalid. Please re-enable biometric authentication.')
    })
  })
})