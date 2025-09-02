/**
 * Device Capabilities Service Tests
 * 
 * Tests for device feature detection, capabilities checking,
 * and native module facade creation.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import DeviceInfo from 'react-native-device-info'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Notifications from 'expo-notifications'
import { Dimensions } from 'react-native'
import DeviceCapabilitiesService from '../DeviceCapabilitiesService'
import { createMockDeviceCapabilities } from './setup'

// Mock modules
const mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>
const mockLocation = Location as jest.Mocked<typeof Location>
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockLocalAuthentication = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>
const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>

describe('DeviceCapabilitiesService', () => {
  let deviceCapabilitiesService: DeviceCapabilitiesService

  beforeEach(() => {
    deviceCapabilitiesService = DeviceCapabilitiesService.getInstance()
    jest.clearAllMocks()

    // Set up default mock values
    mockDimensions.get.mockReturnValue({ width: 375, height: 812, scale: 3 })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Device Capabilities Detection', () => {
    it('should get comprehensive device capabilities', async () => {
      // Mock all device info methods
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0')
      mockDeviceInfo.getModel.mockResolvedValue('iPhone 13')
      mockDeviceInfo.getManufacturer.mockResolvedValue('Apple')
      mockDeviceInfo.hasNotch.mockResolvedValue(true)
      mockDeviceInfo.isTablet.mockResolvedValue(false)
      mockDeviceInfo.isEmulator.mockResolvedValue(false)

      // Mock feature availability
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true)
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const capabilities = await deviceCapabilitiesService.getDeviceCapabilities()

      expect(capabilities).toEqual({
        platform: 'ios',
        version: '15.0',
        model: 'iPhone 13',
        manufacturer: 'Apple',
        hasNotch: true,
        screenDensity: 3,
        screenWidth: 375,
        screenHeight: 812,
        isTablet: false,
        isEmulator: false,
        supportedFeatures: {
          camera: true,
          microphone: true,
          location: true,
          biometrics: true,
          notifications: true,
          backgroundRefresh: true,
          fileSystem: true
        }
      })
    })

    it('should cache device capabilities after first call', async () => {
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0')
      mockDeviceInfo.getModel.mockResolvedValue('iPhone 13')
      mockDeviceInfo.getManufacturer.mockResolvedValue('Apple')
      mockDeviceInfo.hasNotch.mockResolvedValue(true)
      mockDeviceInfo.isTablet.mockResolvedValue(false)
      mockDeviceInfo.isEmulator.mockResolvedValue(false)

      // Mock feature availability
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true)
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      // First call
      await deviceCapabilitiesService.getDeviceCapabilities()

      // Second call should use cached result
      await deviceCapabilitiesService.getDeviceCapabilities()

      // Device info methods should only be called once
      expect(mockDeviceInfo.getSystemVersion).toHaveBeenCalledTimes(1)
      expect(mockDeviceInfo.getModel).toHaveBeenCalledTimes(1)
    })

    it('should handle device info errors gracefully', async () => {
      mockDeviceInfo.getSystemVersion.mockRejectedValue(new Error('System version error'))
      mockDeviceInfo.getModel.mockRejectedValue(new Error('Model error'))
      mockDeviceInfo.getManufacturer.mockRejectedValue(new Error('Manufacturer error'))

      await expect(deviceCapabilitiesService.getDeviceCapabilities()).rejects.toThrow(
        'Failed to retrieve device capabilities'
      )
    })
  })

  describe('Feature Availability Checks', () => {
    beforeEach(() => {
      // Reset capabilities cache
      ;(deviceCapabilitiesService as any).capabilities = null
    })

    it('should check camera availability', async () => {
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const isAvailable = await deviceCapabilitiesService.isCameraAvailable()

      expect(isAvailable).toBe(true)
      expect(mockImagePicker.getCameraPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should check location availability', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      const isAvailable = await deviceCapabilitiesService.isLocationAvailable()

      expect(isAvailable).toBe(true)
      expect(mockLocation.hasServicesEnabledAsync).toHaveBeenCalledTimes(1)
    })

    it('should check biometrics availability', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true)

      const isAvailable = await deviceCapabilitiesService.isBiometricsAvailable()

      expect(isAvailable).toBe(true)
      expect(mockLocalAuthentication.hasHardwareAsync).toHaveBeenCalledTimes(1)
      expect(mockLocalAuthentication.isEnrolledAsync).toHaveBeenCalledTimes(1)
    })

    it('should return false for biometrics when hardware not available', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(false)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true)

      const isAvailable = await deviceCapabilitiesService.isBiometricsAvailable()

      expect(isAvailable).toBe(false)
    })

    it('should return false for biometrics when not enrolled', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(false)

      const isAvailable = await deviceCapabilitiesService.isBiometricsAvailable()

      expect(isAvailable).toBe(false)
    })

    it('should check notifications availability', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const isAvailable = await deviceCapabilitiesService.areNotificationsAvailable()

      expect(isAvailable).toBe(true)
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should return true for notifications when undetermined', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      const isAvailable = await deviceCapabilitiesService.areNotificationsAvailable()

      expect(isAvailable).toBe(true)
    })

    it('should check specific feature availability', async () => {
      // Mock device capabilities
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0')
      mockDeviceInfo.getModel.mockResolvedValue('iPhone 13')
      mockDeviceInfo.getManufacturer.mockResolvedValue('Apple')
      mockDeviceInfo.hasNotch.mockResolvedValue(true)
      mockDeviceInfo.isTablet.mockResolvedValue(false)
      mockDeviceInfo.isEmulator.mockResolvedValue(false)

      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const isCameraAvailable = await deviceCapabilitiesService.isFeatureAvailable('camera')

      expect(isCameraAvailable).toBe(true)
    })
  })

  describe('Device Information', () => {
    it('should get memory information', async () => {
      mockDeviceInfo.getTotalMemory.mockResolvedValue(4 * 1024 * 1024 * 1024) // 4GB
      mockDeviceInfo.getUsedMemory.mockResolvedValue(2 * 1024 * 1024 * 1024) // 2GB

      const memoryInfo = await deviceCapabilitiesService.getMemoryInfo()

      expect(memoryInfo).toEqual({
        total: 4 * 1024 * 1024 * 1024,
        used: 2 * 1024 * 1024 * 1024,
        free: 2 * 1024 * 1024 * 1024
      })
    })

    it('should handle memory info errors', async () => {
      mockDeviceInfo.getTotalMemory.mockRejectedValue(new Error('Memory info error'))
      mockDeviceInfo.getUsedMemory.mockRejectedValue(new Error('Memory info error'))

      const memoryInfo = await deviceCapabilitiesService.getMemoryInfo()

      expect(memoryInfo).toEqual({
        total: 0,
        used: 0,
        free: 0
      })
    })

    it('should get battery information', async () => {
      mockDeviceInfo.getBatteryLevel.mockResolvedValue(0.75) // 75%
      mockDeviceInfo.isBatteryCharging.mockResolvedValue(true)

      const batteryInfo = await deviceCapabilitiesService.getBatteryInfo()

      expect(batteryInfo).toEqual({
        level: 75,
        isCharging: true
      })
    })

    it('should handle battery info errors', async () => {
      mockDeviceInfo.getBatteryLevel.mockRejectedValue(new Error('Battery info error'))
      mockDeviceInfo.isBatteryCharging.mockRejectedValue(new Error('Battery info error'))

      const batteryInfo = await deviceCapabilitiesService.getBatteryInfo()

      expect(batteryInfo).toEqual({
        level: 100,
        isCharging: false
      })
    })
  })

  describe('Resource Checking', () => {
    beforeEach(() => {
      mockDeviceInfo.getTotalMemory.mockResolvedValue(4 * 1024 * 1024 * 1024) // 4GB
      mockDeviceInfo.getUsedMemory.mockResolvedValue(2 * 1024 * 1024 * 1024) // 2GB
      mockDeviceInfo.getBatteryLevel.mockResolvedValue(0.5) // 50%
      mockDeviceInfo.isBatteryCharging.mockResolvedValue(false)
    })

    it('should check if device has resources for camera feature', async () => {
      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('camera')

      expect(hasResources).toBe(true) // 2GB free memory > 512MB requirement, 50% battery > 10% requirement
    })

    it('should check if device has resources for video recording', async () => {
      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('video_recording')

      expect(hasResources).toBe(true) // 2GB free memory > 1GB requirement, 50% battery > 20% requirement
    })

    it('should return false when insufficient memory', async () => {
      mockDeviceInfo.getUsedMemory.mockResolvedValue(3.9 * 1024 * 1024 * 1024) // Only 100MB free

      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('video_recording')

      expect(hasResources).toBe(false) // 100MB free memory < 1GB requirement
    })

    it('should return false when insufficient battery', async () => {
      mockDeviceInfo.getBatteryLevel.mockResolvedValue(0.05) // 5% battery

      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('video_recording')

      expect(hasResources).toBe(false) // 5% battery < 20% requirement
    })

    it('should return true for unknown features', async () => {
      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('unknown_feature')

      expect(hasResources).toBe(true)
    })

    it('should handle resource checking errors', async () => {
      mockDeviceInfo.getTotalMemory.mockRejectedValue(new Error('Memory error'))

      const hasResources = await deviceCapabilitiesService.hasResourcesForFeature('camera')

      expect(hasResources).toBe(true) // Assume supported if we can't check
    })
  })

  describe('Fallback Handling', () => {
    it('should handle feature fallback with alternative action', async () => {
      const alternativeAction = jest.fn()

      await deviceCapabilitiesService.handleFeatureFallback('camera', {
        showError: true,
        errorMessage: 'Camera not available',
        alternativeAction
      })

      expect(alternativeAction).toHaveBeenCalledTimes(1)
    })

    it('should handle feature fallback without showing error', async () => {
      const alternativeAction = jest.fn()

      await deviceCapabilitiesService.handleFeatureFallback('camera', {
        showError: false,
        alternativeAction
      })

      expect(alternativeAction).toHaveBeenCalledTimes(1)
    })

    it('should use default error message when none provided', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await deviceCapabilitiesService.handleFeatureFallback('camera')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Feature fallback: camera',
        'camera is not available on this device. Some features may be limited.'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Native Module Facade', () => {
    it('should create typed facade for native module', async () => {
      const mockMethods = {
        testMethod: jest.fn().mockResolvedValue('success'),
        anotherMethod: jest.fn().mockResolvedValue(42)
      }

      interface TestModule {
        testMethod(param: string): Promise<string>
        anotherMethod(param: number): Promise<number>
      }

      const facade = deviceCapabilitiesService.createNativeModuleFacade<TestModule>(
        'TestModule',
        mockMethods
      )

      const result1 = await facade.testMethod('test')
      const result2 = await facade.anotherMethod(123)

      expect(result1).toBe('success')
      expect(result2).toBe(42)
      expect(mockMethods.testMethod).toHaveBeenCalledWith('test')
      expect(mockMethods.anotherMethod).toHaveBeenCalledWith(123)
    })

    it('should handle native module errors in facade', async () => {
      const mockMethods = {
        failingMethod: jest.fn().mockRejectedValue(new Error('Native error'))
      }

      interface TestModule {
        failingMethod(): Promise<void>
      }

      const facade = deviceCapabilitiesService.createNativeModuleFacade<TestModule>(
        'TestModule',
        mockMethods
      )

      await expect(facade.failingMethod()).rejects.toThrow(
        'Native module TestModule method failingMethod failed'
      )
    })
  })

  describe('Supported Features', () => {
    it('should get all supported features', async () => {
      // Mock all feature checks to return true
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true)
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true)
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const features = await deviceCapabilitiesService.getSupportedFeatures()

      expect(features).toEqual({
        camera: true,
        microphone: true,
        location: true,
        biometrics: true,
        notifications: true,
        backgroundRefresh: true,
        fileSystem: true
      })
    })

    it('should handle feature check errors', async () => {
      // Mock all feature checks to throw errors
      mockImagePicker.getCameraPermissionsAsync.mockRejectedValue(new Error('Camera error'))
      mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('Location error'))
      mockLocalAuthentication.hasHardwareAsync.mockRejectedValue(new Error('Biometrics error'))
      mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('Notifications error'))

      const features = await deviceCapabilitiesService.getSupportedFeatures()

      expect(features).toEqual({
        camera: false,
        microphone: false,
        location: false,
        biometrics: false,
        notifications: false,
        backgroundRefresh: false,
        fileSystem: false
      })
    })
  })
})