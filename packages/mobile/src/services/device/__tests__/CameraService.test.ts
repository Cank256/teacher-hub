/**
 * Camera Service Tests
 * 
 * Tests for camera integration including permissions,
 * image capture, and document scanning functionality.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import CameraService from '../CameraService'
import { 
  createMockCameraResult, 
  mockPermissionGranted, 
  mockPermissionDenied 
} from './setup'

// Mock modules
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockAlert = Alert as jest.Mocked<typeof Alert>

describe('CameraService', () => {
  let cameraService: CameraService

  beforeEach(() => {
    cameraService = CameraService.getInstance()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Permission Management', () => {
    it('should request camera permission successfully', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const result = await cameraService.requestCameraPermission()

      expect(result).toEqual(mockPermissionGranted)
      expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should handle camera permission denial', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      const result = await cameraService.requestCameraPermission()

      expect(result).toEqual(mockPermissionDenied)
    })

    it('should request media library permission successfully', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never',
        accessPrivileges: 'all'
      })

      const result = await cameraService.requestMediaLibraryPermission()

      expect(result.granted).toBe(true)
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should check camera availability', async () => {
      mockImagePicker.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const isAvailable = await cameraService.isCameraAvailable()

      expect(isAvailable).toBe(true)
      expect(mockImagePicker.getCameraPermissionsAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe('Photo Capture', () => {
    beforeEach(() => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
    })

    it('should take photo successfully', async () => {
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file:///mock/photo.jpg',
          width: 1920,
          height: 1080,
          type: 'image',
          fileSize: 1024 * 1024,
          fileName: 'photo.jpg'
        }]
      }

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockResult)

      const result = await cameraService.takePhoto({
        mediaType: 'photo',
        quality: 'high'
      })

      expect(result).toEqual({
        uri: 'file:///mock/photo.jpg',
        type: 'image',
        width: 1920,
        height: 1080,
        size: 1024 * 1024,
        fileName: 'photo.jpg',
        duration: undefined
      })

      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined,
        quality: 1.0,
        videoMaxDuration: undefined
      })
    })

    it('should handle cancelled photo capture', async () => {
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: []
      })

      const result = await cameraService.takePhoto()

      expect(result).toBeNull()
    })

    it('should handle camera permission denial during photo capture', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      const result = await cameraService.takePhoto()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'camera permission is required to use this feature. Please grant permission to continue.',
        expect.any(Array)
      )
    })

    it('should map quality settings correctly', async () => {
      const mockResult = {
        canceled: false,
        assets: [createMockCameraResult()]
      }

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockResult)

      // Test low quality
      await cameraService.takePhoto({ mediaType: 'photo', quality: 'low' })
      expect(mockImagePicker.launchCameraAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ quality: 0.3 })
      )

      // Test medium quality
      await cameraService.takePhoto({ mediaType: 'photo', quality: 'medium' })
      expect(mockImagePicker.launchCameraAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ quality: 0.7 })
      )

      // Test high quality
      await cameraService.takePhoto({ mediaType: 'photo', quality: 'high' })
      expect(mockImagePicker.launchCameraAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ quality: 1.0 })
      )
    })
  })

  describe('Library Selection', () => {
    beforeEach(() => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never',
        accessPrivileges: 'all'
      })
    })

    it('should pick from library successfully', async () => {
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file:///mock/library-photo.jpg',
          width: 1920,
          height: 1080,
          type: 'image',
          fileSize: 2 * 1024 * 1024,
          fileName: 'library-photo.jpg'
        }]
      }

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockResult)

      const result = await cameraService.pickFromLibrary({
        mediaType: 'photo',
        quality: 'medium'
      })

      expect(result).toEqual({
        uri: 'file:///mock/library-photo.jpg',
        type: 'image',
        width: 1920,
        height: 1080,
        size: 2 * 1024 * 1024,
        fileName: 'library-photo.jpg',
        duration: undefined
      })

      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined,
        quality: 0.7
      })
    })

    it('should handle video selection', async () => {
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file:///mock/video.mp4',
          width: 1920,
          height: 1080,
          type: 'video',
          fileSize: 10 * 1024 * 1024,
          fileName: 'video.mp4',
          duration: 30000
        }]
      }

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockResult)

      const result = await cameraService.pickFromLibrary({
        mediaType: 'video',
        quality: 'high'
      })

      expect(result?.type).toBe('video')
      expect(result?.duration).toBe(30000)
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos
        })
      )
    })
  })

  describe('Document Scanning', () => {
    beforeEach(() => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      // Mock Alert.alert for document scanning flow
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user choosing "Done" after first page
        if (title === 'Document Scanning') {
          const doneButton = buttons?.find(b => b.text === 'Done')
          if (doneButton?.onPress) {
            doneButton.onPress()
          }
        }
      })
    })

    it('should scan single document page', async () => {
      const mockPhotoResult = {
        canceled: false,
        assets: [{
          uri: 'file:///mock/document-page1.jpg',
          width: 1920,
          height: 1080,
          type: 'image',
          fileSize: 1.5 * 1024 * 1024,
          fileName: 'document-page1.jpg'
        }]
      }

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockPhotoResult)

      const result = await cameraService.scanDocument({
        quality: 'high',
        maxPages: 1
      })

      expect(result).toEqual({
        pages: [{
          uri: 'file:///mock/document-page1.jpg',
          width: 1920,
          height: 1080,
          size: 1.5 * 1024 * 1024
        }],
        totalSize: 1.5 * 1024 * 1024
      })

      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1.0,
        videoMaxDuration: undefined
      })
    })

    it('should handle cancelled document scan', async () => {
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: []
      })

      const result = await cameraService.scanDocument()

      expect(result).toBeNull()
    })
  })

  describe('Image Picker Dialog', () => {
    it('should show image picker options', async () => {
      const mockResult = createMockCameraResult()
      
      // Mock Alert.alert to simulate user selecting camera
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const cameraButton = buttons?.find(b => b.text === 'Camera')
        if (cameraButton?.onPress) {
          // Mock successful camera capture
          mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
            status: 'granted',
            canAskAgain: true,
            granted: true,
            expires: 'never'
          })
          mockImagePicker.launchCameraAsync.mockResolvedValue({
            canceled: false,
            assets: [mockResult]
          })
          cameraButton.onPress()
        }
      })

      const resultPromise = cameraService.showImagePicker()

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Select Image',
        'Choose how you want to select an image',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Camera' }),
          expect.objectContaining({ text: 'Photo Library' }),
          expect.objectContaining({ text: 'Cancel' })
        ])
      )

      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  describe('Error Handling', () => {
    it('should handle camera errors gracefully', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const error = new Error('Camera unavailable')
      ;(error as any).code = 'E_CAMERA_UNAVAILABLE'
      mockImagePicker.launchCameraAsync.mockRejectedValue(error)

      const result = await cameraService.takePhoto()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Camera Error',
        'Camera is currently unavailable. Please check if another app is using it.'
      )
    })

    it('should handle permission errors', async () => {
      const error = new Error('Permission missing')
      ;(error as any).code = 'E_PERMISSION_MISSING'
      mockImagePicker.requestCameraPermissionsAsync.mockRejectedValue(error)

      const result = await cameraService.requestCameraPermission()

      expect(result.granted).toBe(false)
    })

    it('should not show error for user cancellation', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const error = new Error('User cancelled')
      ;(error as any).code = 'E_PICKER_CANCELLED'
      mockImagePicker.launchCameraAsync.mockRejectedValue(error)

      const result = await cameraService.takePhoto()

      expect(result).toBeNull()
      expect(mockAlert.alert).not.toHaveBeenCalled()
    })
  })

  describe('Fallback Handling', () => {
    it('should handle camera fallback with alternative action', async () => {
      const alternativeAction = jest.fn()

      await cameraService.handleCameraFallback({
        showError: true,
        errorMessage: 'Custom error message',
        alternativeAction
      })

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Camera Unavailable',
        'Custom error message',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Use Photo Library' }),
          expect.objectContaining({ text: 'OK' })
        ])
      )
    })

    it('should handle camera fallback without showing error', async () => {
      await cameraService.handleCameraFallback({
        showError: false
      })

      expect(mockAlert.alert).not.toHaveBeenCalled()
    })
  })
})