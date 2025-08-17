import {Platform, Alert, Linking} from 'react-native';
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {request, PERMISSIONS, RESULTS, Permission} from 'react-native-permissions';

export interface MediaFile {
  uri: string;
  type: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CameraOptions {
  mediaType: 'photo' | 'video' | 'mixed';
  quality: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
  videoQuality?: 'low' | 'medium' | 'high';
  durationLimit?: number;
}

class CameraService {
  private async requestCameraPermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  private async requestPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.PHOTO_LIBRARY 
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
      
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return false;
    }
  }

  private showPermissionAlert(type: 'camera' | 'library') {
    const title = type === 'camera' ? 'Camera Permission' : 'Photo Library Permission';
    const message = type === 'camera' 
      ? 'This app needs access to your camera to take photos and videos.'
      : 'This app needs access to your photo library to select images and videos.';

    Alert.alert(
      title,
      message,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Settings', onPress: () => Linking.openSettings()},
      ]
    );
  }

  private convertImagePickerResponse(response: ImagePickerResponse): MediaFile[] {
    if (!response.assets) return [];

    return response.assets.map(asset => ({
      uri: asset.uri || '',
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `media_${Date.now()}`,
      fileSize: asset.fileSize || 0,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    }));
  }

  async capturePhoto(options: Partial<CameraOptions> = {}): Promise<MediaFile[]> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      this.showPermissionAlert('camera');
      return [];
    }

    return new Promise((resolve) => {
      launchCamera(
        {
          mediaType: 'photo' as MediaType,
          quality: options.quality === 'high' ? 1 : options.quality === 'medium' ? 0.7 : 0.5,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1920,
          includeBase64: false,
          includeExtra: false,
        },
        (response) => {
          if (response.didCancel || response.errorMessage) {
            resolve([]);
            return;
          }

          const files = this.convertImagePickerResponse(response);
          resolve(files);
        }
      );
    });
  }

  async captureVideo(options: Partial<CameraOptions> = {}): Promise<MediaFile[]> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      this.showPermissionAlert('camera');
      return [];
    }

    return new Promise((resolve) => {
      launchCamera(
        {
          mediaType: 'video' as MediaType,
          quality: options.quality === 'high' ? 1 : options.quality === 'medium' ? 0.7 : 0.5,
          videoQuality: options.videoQuality || 'medium',
          durationLimit: options.durationLimit || 60, // 60 seconds default
          includeBase64: false,
          includeExtra: false,
        },
        (response) => {
          if (response.didCancel || response.errorMessage) {
            resolve([]);
            return;
          }

          const files = this.convertImagePickerResponse(response);
          resolve(files);
        }
      );
    });
  }

  async selectFromLibrary(options: Partial<CameraOptions> = {}): Promise<MediaFile[]> {
    const hasPermission = await this.requestPhotoLibraryPermission();
    if (!hasPermission) {
      this.showPermissionAlert('library');
      return [];
    }

    return new Promise((resolve) => {
      launchImageLibrary(
        {
          mediaType: (options.mediaType || 'mixed') as MediaType,
          quality: options.quality === 'high' ? 1 : options.quality === 'medium' ? 0.7 : 0.5,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1920,
          selectionLimit: 5, // Allow multiple selection
          includeBase64: false,
          includeExtra: false,
        },
        (response) => {
          if (response.didCancel || response.errorMessage) {
            resolve([]);
            return;
          }

          const files = this.convertImagePickerResponse(response);
          resolve(files);
        }
      );
    });
  }

  showMediaPicker(options: Partial<CameraOptions> = {}): Promise<MediaFile[]> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Media',
        'Choose how you want to add media to your post',
        [
          {text: 'Cancel', style: 'cancel', onPress: () => resolve([])},
          {
            text: 'Camera',
            onPress: async () => {
              const files = options.mediaType === 'video' 
                ? await this.captureVideo(options)
                : await this.capturePhoto(options);
              resolve(files);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const files = await this.selectFromLibrary(options);
              resolve(files);
            },
          },
        ]
      );
    });
  }

  validateMediaFile(file: MediaFile, maxSizeInMB: number = 10): {valid: boolean; error?: string} {
    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.fileSize > maxSizeInBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeInMB}MB limit`,
      };
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mov',
      'video/avi',
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: 'Unsupported file type',
      };
    }

    return {valid: true};
  }
}

export const cameraService = new CameraService();