/**
 * Camera Service
 * 
 * Handles camera integration for profile pictures and document scanning
 * with proper permissions and error handling.
 */

import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { Alert, Platform } from 'react-native'
import { 
  CameraOptions, 
  CameraResult, 
  DocumentScanOptions, 
  DocumentScanResult,
  PermissionResult,
  FallbackOptions,
  NativeModuleError
} from './types'

export class CameraService {
  private static instance: CameraService
  
  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService()
    }
    return CameraService.instance
  }

  /**
   * Request camera permissions with user-friendly rationale
   */
  async requestCameraPermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync()
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as any
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as any
      }
    } catch (error) {
      console.error('Error requesting media library permission:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  /**
   * Check if camera is available on the device
   */
  async isCameraAvailable(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync()
      return status !== 'undetermined' || Platform.OS === 'ios'
    } catch (error) {
      console.error('Error checking camera availability:', error)
      return false
    }
  }

  /**
   * Take a photo using the device camera
   */
  async takePhoto(options: CameraOptions = { mediaType: 'photo', quality: 'medium' }): Promise<CameraResult | null> {
    try {
      // Check permissions first
      const permission = await this.requestCameraPermission()
      if (!permission.granted) {
        this.handlePermissionDenied('camera', permission.canAskAgain)
        return null
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: this.mapMediaType(options.mediaType),
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect,
        quality: this.mapQuality(options.quality),
        videoMaxDuration: options.maxDuration,
      })

      if (result.canceled || !result.assets?.[0]) {
        return null
      }

      const asset = result.assets[0]
      return {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        size: asset.fileSize ?? 0,
        fileName: asset.fileName
      }
    } catch (error) {
      this.handleCameraError(error as NativeModuleError)
      return null
    }
  }

  /**
   * Pick image/video from media library
   */
  async pickFromLibrary(options: CameraOptions = { mediaType: 'photo', quality: 'medium' }): Promise<CameraResult | null> {
    try {
      // Check permissions first
      const permission = await this.requestMediaLibraryPermission()
      if (!permission.granted) {
        this.handlePermissionDenied('media_library', permission.canAskAgain)
        return null
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: this.mapMediaType(options.mediaType),
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect,
        quality: this.mapQuality(options.quality),
      })

      if (result.canceled || !result.assets?.[0]) {
        return null
      }

      const asset = result.assets[0]
      return {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        size: asset.fileSize ?? 0,
        fileName: asset.fileName
      }
    } catch (error) {
      this.handleCameraError(error as NativeModuleError)
      return null
    }
  }

  /**
   * Scan documents using camera (simplified implementation)
   * In a real app, you might use a dedicated document scanning library
   */
  async scanDocument(options: DocumentScanOptions = { quality: 'high' }): Promise<DocumentScanResult | null> {
    try {
      // For now, use camera to take photos of documents
      // In production, integrate with a document scanning SDK
      const photos: CameraResult[] = []
      const maxPages = options.maxPages ?? 5
      
      for (let i = 0; i < maxPages; i++) {
        const shouldContinue = i === 0 || await this.askForAnotherPage(i + 1)
        if (!shouldContinue) break

        const photo = await this.takePhoto({
          mediaType: 'photo',
          quality: options.quality,
          allowsEditing: true,
          aspect: [4, 3] // Good aspect ratio for documents
        })

        if (photo) {
          photos.push(photo)
        } else {
          break
        }
      }

      if (photos.length === 0) {
        return null
      }

      return {
        pages: photos.map(photo => ({
          uri: photo.uri,
          width: photo.width ?? 0,
          height: photo.height ?? 0,
          size: photo.size
        })),
        totalSize: photos.reduce((sum, photo) => sum + photo.size, 0)
      }
    } catch (error) {
      this.handleCameraError(error as NativeModuleError)
      return null
    }
  }

  /**
   * Show camera options (camera vs library)
   */
  async showImagePicker(options: CameraOptions = { mediaType: 'photo', quality: 'medium' }): Promise<CameraResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose how you want to select an image',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await this.takePhoto(options)
              resolve(result)
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await this.pickFromLibrary(options)
              resolve(result)
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null)
          }
        ]
      )
    })
  }

  /**
   * Handle graceful fallbacks when camera is not available
   */
  async handleCameraFallback(fallbackOptions: FallbackOptions = {}): Promise<void> {
    const { showError = true, errorMessage, alternativeAction, retryAction } = fallbackOptions

    if (showError) {
      const message = errorMessage ?? 'Camera is not available on this device. You can still upload images from your photo library.'
      
      Alert.alert(
        'Camera Unavailable',
        message,
        [
          ...(alternativeAction ? [{
            text: 'Use Photo Library',
            onPress: alternativeAction
          }] : []),
          ...(retryAction ? [{
            text: 'Retry',
            onPress: retryAction
          }] : []),
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      )
    }
  }

  // Private helper methods

  private mapMediaType(mediaType: CameraOptions['mediaType']): ImagePicker.MediaTypeOptions {
    switch (mediaType) {
      case 'photo':
        return ImagePicker.MediaTypeOptions.Images
      case 'video':
        return ImagePicker.MediaTypeOptions.Videos
      case 'mixed':
        return ImagePicker.MediaTypeOptions.All
      default:
        return ImagePicker.MediaTypeOptions.Images
    }
  }

  private mapQuality(quality: CameraOptions['quality']): number {
    switch (quality) {
      case 'low':
        return 0.3
      case 'medium':
        return 0.7
      case 'high':
        return 1.0
      default:
        return 0.7
    }
  }

  private handlePermissionDenied(type: string, canAskAgain: boolean): void {
    const message = canAskAgain
      ? `${type} permission is required to use this feature. Please grant permission to continue.`
      : `${type} permission has been permanently denied. Please enable it in your device settings.`

    Alert.alert(
      'Permission Required',
      message,
      [
        {
          text: 'OK',
          style: 'cancel'
        },
        ...(canAskAgain ? [] : [{
          text: 'Open Settings',
          onPress: () => {
            // In a real app, you might use Linking.openSettings()
            console.log('Open device settings')
          }
        }])
      ]
    )
  }

  private handleCameraError(error: NativeModuleError): void {
    console.error('Camera error:', error)
    
    let message = 'An error occurred while using the camera. Please try again.'
    
    if (error.code === 'E_CAMERA_UNAVAILABLE') {
      message = 'Camera is currently unavailable. Please check if another app is using it.'
    } else if (error.code === 'E_PERMISSION_MISSING') {
      message = 'Camera permission is required to use this feature.'
    } else if (error.code === 'E_PICKER_CANCELLED') {
      // User cancelled, don't show error
      return
    }

    Alert.alert('Camera Error', message)
  }

  private async askForAnotherPage(pageNumber: number): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Document Scanning',
        `Page ${pageNumber - 1} captured. Do you want to scan another page?`,
        [
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Scan Another',
            onPress: () => resolve(true)
          }
        ]
      )
    })
  }
}

export default CameraService.getInstance()