/**
 * Image Optimization Utilities
 * Handles image compression, resizing, and format conversion
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxSizeKB?: number;
}

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export class ImageOptimizationService {
  private static readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'jpeg',
    maxSizeKB: 500,
  };

  /**
   * Pick image from camera or gallery with optimization
   */
  static async pickAndOptimizeImage(
    source: 'camera' | 'gallery' = 'gallery',
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage | null> {
    try {
      // Request permissions
      const permissionResult = source === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error('Permission to access camera/gallery was denied');
      }

      // Pick image
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square aspect ratio for profile pictures
            quality: 1, // We'll optimize later
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square aspect ratio for profile pictures
            quality: 1, // We'll optimize later
          });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      
      // Optimize the selected image
      return await this.optimizeImage(asset.uri, options);
    } catch (error) {
      console.error('Error picking and optimizing image:', error);
      throw error;
    }
  }

  /**
   * Optimize an existing image
   */
  static async optimizeImage(
    imageUri: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Get original image info
      const originalInfo = await FileSystem.getInfoAsync(imageUri);
      if (!originalInfo.exists) {
        throw new Error('Image file does not exist');
      }

      let optimizedUri = imageUri;
      let currentSize = originalInfo.size || 0;
      let attempts = 0;
      const maxAttempts = 3;

      // Optimize until we meet size requirements or max attempts
      while (currentSize > config.maxSizeKB * 1024 && attempts < maxAttempts) {
        const quality = Math.max(0.3, config.quality - (attempts * 0.2));
        const scaleFactor = Math.max(0.5, 1 - (attempts * 0.2));

        const manipulateOptions: ImageManipulator.ImageManipulateOptions = {
          compress: quality,
          format: this.getImageManipulatorFormat(config.format),
        };

        // Add resize if needed
        if (config.maxWidth || config.maxHeight) {
          manipulateOptions.resize = {
            width: config.maxWidth ? Math.floor(config.maxWidth * scaleFactor) : undefined,
            height: config.maxHeight ? Math.floor(config.maxHeight * scaleFactor) : undefined,
          };
        }

        const result = await ImageManipulator.manipulateAsync(
          optimizedUri,
          [],
          manipulateOptions
        );

        optimizedUri = result.uri;

        // Check new size
        const newInfo = await FileSystem.getInfoAsync(optimizedUri);
        currentSize = newInfo.size || 0;
        attempts++;
      }

      // Get final image dimensions
      const finalResult = await ImageManipulator.manipulateAsync(
        optimizedUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        uri: finalResult.uri,
        width: finalResult.width,
        height: finalResult.height,
        size: currentSize,
        format: config.format,
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail from image
   */
  static async createThumbnail(
    imageUri: string,
    size: number = 150
  ): Promise<OptimizedImage> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: size, height: size } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const info = await FileSystem.getInfoAsync(result.uri);

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size: info.size || 0,
        format: 'jpeg',
      };
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   */
  static async validateImage(imageUri: string): Promise<{
    isValid: boolean;
    error?: string;
    info?: {
      size: number;
      width?: number;
      height?: number;
    };
  }> {
    try {
      const info = await FileSystem.getInfoAsync(imageUri);
      
      if (!info.exists) {
        return { isValid: false, error: 'Image file does not exist' };
      }

      const size = info.size || 0;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (size > maxSize) {
        return { 
          isValid: false, 
          error: `Image size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)` 
        };
      }

      // Try to get image dimensions
      try {
        const result = await ImageManipulator.manipulateAsync(imageUri, [], {});
        return {
          isValid: true,
          info: {
            size,
            width: result.width,
            height: result.height,
          },
        };
      } catch {
        return {
          isValid: true,
          info: { size },
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: `Failed to validate image: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Get cache directory for optimized images
   */
  static getCacheDirectory(): string {
    return `${FileSystem.cacheDirectory}optimized_images/`;
  }

  /**
   * Clear image cache
   */
  static async clearImageCache(): Promise<void> {
    try {
      const cacheDir = this.getCacheDirectory();
      const info = await FileSystem.getInfoAsync(cacheDir);
      
      if (info.exists) {
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      }
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }

  private static getImageManipulatorFormat(format: string): ImageManipulator.SaveFormat {
    switch (format) {
      case 'png':
        return ImageManipulator.SaveFormat.PNG;
      case 'webp':
        return ImageManipulator.SaveFormat.WEBP;
      case 'jpeg':
      default:
        return ImageManipulator.SaveFormat.JPEG;
    }
  }
}