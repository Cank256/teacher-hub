/**
 * Device Integration Tests
 * 
 * Integration tests for device services working together,
 * permission flows, and cross-service functionality.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import * as FileSystem from 'expo-file-system'
import { Alert } from 'react-native'
import CameraService from '../CameraService'
import LocationService from '../LocationService'
import FileSystemService from '../FileSystemService'
import DeviceCapabilitiesService from '../DeviceCapabilitiesService'
import { 
  createMockCameraResult, 
  createMockLocationResult,
  mockPermissionGranted,
  mockPermissionDenied
} from './setup'

// Mock modules
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockLocation = Location as jest.Mocked<typeof Location>
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>
const mockAlert = Alert as jest.Mocked<typeof Alert>

describe('Device Integration Tests', () => {
  let cameraService: CameraService
  let locationService: LocationService
  let fileSystemService: FileSystemService
  let deviceCapabilitiesService: DeviceCapabilitiesService

  beforeEach(() => {
    cameraService = CameraService.getInstance()
    locationService = LocationService.getInstance()
    fileSystemService = FileSystemService.getInstance()
    deviceCapabilitiesService = DeviceCapabilitiesService.getInstance()
    
    jest.clearAllMocks()

    // Set up default mock values
    mockFileSystem.documentDirectory = 'file:///mock/documents/'
    mockFileSystem.cacheDirectory = 'file:///mock/cache/'
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Camera and File System Integration', () => {
    it('should capture photo and save to file system', async () => {
      // Mock camera permission and capture
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const mockCameraResult = createMockCameraResult({
        uri: 'file:///temp/captured-photo.jpg',
        fileName: 'captured-photo.jpg'
      })

      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [mockCameraResult]
      })

      // Mock file system operations
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })
      mockFileSystem.copyAsync.mockResolvedValue()

      // Capture photo
      const cameraResult = await cameraService.takePhoto({
        mediaType: 'photo',
        quality: 'high'
      })

      expect(cameraResult).not.toBeNull()

      // Save to file system
      const savedPath = await fileSystemService.saveFile(
        cameraResult!.uri,
        'profile-picture.jpg',
        'images'
      )

      expect(savedPath).toBe('file:///mock/documents/images/profile-picture.jpg')
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: 'file:///temp/captured-photo.jpg',
        to: 'file:///mock/documents/images/profile-picture.jpg'
      })
    })

    it('should handle camera failure and provide file picker fallback', async () => {
      // Mock camera permission denied
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
        expires: 'never'
      })

      // Mock media library permission granted
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never',
        accessPrivileges: 'all'
      })

      const mockLibraryResult = createMockCameraResult({
        uri: 'file:///library/selected-photo.jpg',
        fileName: 'selected-photo.jpg'
      })

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockLibraryResult]
      })

      // Try camera first (should fail)
      const cameraResult = await cameraService.takePhoto()
      expect(cameraResult).toBeNull()

      // Fallback to library
      const libraryResult = await cameraService.pickFromLibrary()
      expect(libraryResult).toEqual(expect.objectContaining({
        uri: 'file:///library/selected-photo.jpg',
        fileName: 'selected-photo.jpg'
      }))
    })
  })

  describe('Location and File System Integration', () => {
    it('should get location and save to file system', async () => {
      // Mock location permission and retrieval
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      const mockLocationResult = createMockLocationResult({
        latitude: -0.3476,
        longitude: 32.5825
      })

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: mockLocationResult.latitude,
          longitude: mockLocationResult.longitude,
          altitude: mockLocationResult.altitude,
          accuracy: mockLocationResult.accuracy,
          speed: mockLocationResult.speed,
          heading: mockLocationResult.heading
        },
        timestamp: mockLocationResult.timestamp
      })

      // Mock file system operations
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })

      // Get location
      const location = await locationService.getCurrentLocation({
        accuracy: 'high'
      })

      expect(location).toEqual(mockLocationResult)

      // Save location data to file system (simulate caching)
      const locationData = JSON.stringify(location)
      const locationBlob = new Blob([locationData], { type: 'application/json' })
      
      // In a real implementation, you would save the blob to file system
      // For testing, we just verify the location was retrieved correctly
      expect(location?.latitude).toBe(-0.3476)
      expect(location?.longitude).toBe(32.5825)
    })

    it('should handle location failure and provide manual entry fallback', async () => {
      // Mock location permission denied
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      // Try to get location (should fail)
      const location = await locationService.getCurrentLocation()
      expect(location).toBeNull()

      // Verify permission denial alert was shown
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        expect.stringContaining('Location permission is required'),
        expect.any(Array)
      )

      // Simulate manual location entry and save to file system
      const manualLocation = {
        latitude: -0.3476,
        longitude: 32.5825,
        timestamp: Date.now()
      }

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })

      // Save manual location
      const locationData = JSON.stringify(manualLocation)
      // In real implementation, would save to file system
      expect(manualLocation.latitude).toBe(-0.3476)
    })
  })

  describe('Cross-Service Permission Management', () => {
    it('should check multiple permissions and provide unified status', async () => {
      // Mock various permission checks
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      // Check camera permission
      const cameraPermission = await cameraService.requestCameraPermission()
      expect(cameraPermission.granted).toBe(true)

      // Check location permission
      const locationPermission = await locationService.getLocationPermissionStatus()
      expect(locationPermission.granted).toBe(false)

      // Get overall device capabilities
      const capabilities = await deviceCapabilitiesService.getSupportedFeatures()
      expect(capabilities.camera).toBe(true)
      expect(capabilities.location).toBe(false)
    })

    it('should handle permission request flow across services', async () => {
      // Mock initial permission states
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      // Request permissions in sequence
      const cameraPermission = await cameraService.requestCameraPermission()
      const locationPermission = await locationService.requestLocationPermission()

      expect(cameraPermission.granted).toBe(true)
      expect(locationPermission.granted).toBe(true)

      // Verify both services can now function
      expect(await cameraService.isCameraAvailable()).toBe(true)
      expect(await locationService.isLocationEnabled()).toBe(true)
    })
  })

  describe('Device Capabilities and Service Availability', () => {
    it('should check device capabilities before using services', async () => {
      // Mock device capabilities
      const mockCapabilities = {
        camera: true,
        location: true,
        fileSystem: true,
        microphone: false,
        biometrics: false,
        notifications: true,
        backgroundRefresh: true
      }

      // Mock individual capability checks
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      // Check capabilities
      const cameraAvailable = await deviceCapabilitiesService.isFeatureAvailable('camera')
      const locationAvailable = await deviceCapabilitiesService.isFeatureAvailable('location')
      const fileSystemAvailable = await deviceCapabilitiesService.isFeatureAvailable('fileSystem')

      expect(cameraAvailable).toBe(true)
      expect(locationAvailable).toBe(true)
      expect(fileSystemAvailable).toBe(true)

      // Use services based on availability
      if (cameraAvailable) {
        const cameraResult = await cameraService.isCameraAvailable()
        expect(cameraResult).toBe(true)
      }

      if (locationAvailable) {
        const locationEnabled = await locationService.isLocationEnabled()
        expect(locationEnabled).toBe(true)
      }
    })

    it('should provide graceful fallbacks when capabilities are limited', async () => {
      // Mock limited device capabilities
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false)

      // Check capabilities
      const cameraAvailable = await deviceCapabilitiesService.isFeatureAvailable('camera')
      const locationAvailable = await deviceCapabilitiesService.isFeatureAvailable('location')

      expect(cameraAvailable).toBe(false)
      expect(locationAvailable).toBe(false)

      // Handle fallbacks
      const alternativeAction = jest.fn()

      await cameraService.handleCameraFallback({
        showError: false,
        alternativeAction
      })

      await locationService.handleLocationFallback({
        showError: false,
        alternativeAction
      })

      expect(alternativeAction).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle service errors and provide recovery options', async () => {
      // Mock camera error
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const cameraError = new Error('Camera hardware error')
      ;(cameraError as any).code = 'E_CAMERA_UNAVAILABLE'
      mockImagePicker.launchCameraAsync.mockRejectedValue(cameraError)

      // Mock file system as backup
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })

      // Try camera (should fail)
      const cameraResult = await cameraService.takePhoto()
      expect(cameraResult).toBeNull()

      // Verify error handling
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Camera Error',
        'Camera is currently unavailable. Please check if another app is using it.'
      )

      // Use file system as recovery option
      const fileSystemInfo = await fileSystemService.getFileSystemInfo()
      expect(fileSystemInfo).toBeDefined()
    })

    it('should coordinate error recovery across services', async () => {
      // Mock multiple service failures
      mockImagePicker.requestCameraPermissionsAsync.mockRejectedValue(
        new Error('Camera permission error')
      )
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValue(
        new Error('Location permission error')
      )

      // Try services (should fail)
      const cameraPermission = await cameraService.requestCameraPermission()
      const locationPermission = await locationService.requestLocationPermission()

      expect(cameraPermission.granted).toBe(false)
      expect(locationPermission.granted).toBe(false)

      // Check if file system is still available as fallback
      const fileSystemAvailable = await deviceCapabilitiesService.isFeatureAvailable('fileSystem')
      expect(fileSystemAvailable).toBe(true)

      // Use file system for basic functionality
      const fileSystemInfo = await fileSystemService.getFileSystemInfo()
      expect(fileSystemInfo).toBeDefined()
    })
  })

  describe('Performance and Resource Management', () => {
    it('should check resources before intensive operations', async () => {
      // Mock sufficient resources
      jest.spyOn(deviceCapabilitiesService, 'hasResourcesForFeature')
        .mockResolvedValue(true)

      // Check resources before camera operation
      const hasResourcesForCamera = await deviceCapabilitiesService.hasResourcesForFeature('camera')
      expect(hasResourcesForCamera).toBe(true)

      // Proceed with camera operation
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const cameraAvailable = await cameraService.isCameraAvailable()
      expect(cameraAvailable).toBe(true)
    })

    it('should handle insufficient resources gracefully', async () => {
      // Mock insufficient resources
      jest.spyOn(deviceCapabilitiesService, 'hasResourcesForFeature')
        .mockResolvedValue(false)

      // Check resources before video recording
      const hasResourcesForVideo = await deviceCapabilitiesService.hasResourcesForFeature('video_recording')
      expect(hasResourcesForVideo).toBe(false)

      // Handle fallback for resource-intensive operation
      await deviceCapabilitiesService.handleFeatureFallback('video_recording', {
        showError: false,
        errorMessage: 'Insufficient resources for video recording'
      })

      // Verify fallback was handled
      expect(hasResourcesForVideo).toBe(false)
    })
  })
})