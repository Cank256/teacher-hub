/**
 * Image Optimization Tests
 */

import { ImageOptimizationService } from '../imageOptimization';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Mock the expo modules
jest.mock('expo-image-picker');
jest.mock('expo-image-manipulator');
jest.mock('expo-file-system');

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockImageManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('ImageOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pickAndOptimizeImage', () => {
    it('should pick and optimize image from gallery successfully', async () => {
      // Mock permissions
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
      });

      // Mock image picker result
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            width: 2000,
            height: 2000,
            type: 'image',
          },
        ],
      });

      // Mock file info
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024 * 1024, // 1MB
        isDirectory: false,
        uri: 'file:///path/to/image.jpg',
        modificationTime: Date.now(),
      });

      // Mock image manipulation
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/optimized.jpg',
        width: 1024,
        height: 1024,
      });

      const result = await ImageOptimizationService.pickAndOptimizeImage('gallery');

      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      expect(result).toEqual({
        uri: 'file:///path/to/optimized.jpg',
        width: 1024,
        height: 1024,
        size: 1024 * 1024,
        format: 'jpeg',
      });
    });

    it('should pick and optimize image from camera successfully', async () => {
      // Mock permissions
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
      });

      // Mock camera result
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/camera.jpg',
            width: 1500,
            height: 1500,
            type: 'image',
          },
        ],
      });

      // Mock file info
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 800 * 1024, // 800KB
        isDirectory: false,
        uri: 'file:///path/to/camera.jpg',
        modificationTime: Date.now(),
      });

      // Mock image manipulation
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/optimized-camera.jpg',
        width: 1024,
        height: 1024,
      });

      const result = await ImageOptimizationService.pickAndOptimizeImage('camera');

      expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      expect(result).toBeDefined();
    });

    it('should return null when permission is denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: false,
        status: 'denied',
        expires: 'never',
        canAskAgain: true,
      });

      await expect(
        ImageOptimizationService.pickAndOptimizeImage('gallery')
      ).rejects.toThrow('Permission to access camera/gallery was denied');
    });

    it('should return null when user cancels selection', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await ImageOptimizationService.pickAndOptimizeImage('gallery');

      expect(result).toBeNull();
    });
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      const imageUri = 'file:///path/to/image.jpg';

      // Mock file info
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 300 * 1024, // 300KB (under limit)
        isDirectory: false,
        uri: imageUri,
        modificationTime: Date.now(),
      });

      // Mock image manipulation
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/optimized.jpg',
        width: 800,
        height: 600,
      });

      const result = await ImageOptimizationService.optimizeImage(imageUri);

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(imageUri);
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalled();
      expect(result).toEqual({
        uri: 'file:///path/to/optimized.jpg',
        width: 800,
        height: 600,
        size: 300 * 1024,
        format: 'jpeg',
      });
    });

    it('should optimize large image with multiple attempts', async () => {
      const imageUri = 'file:///path/to/large-image.jpg';

      // Mock file info - first call returns large size, subsequent calls return smaller
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          size: 2 * 1024 * 1024, // 2MB (over limit)
          isDirectory: false,
          uri: imageUri,
          modificationTime: Date.now(),
        })
        .mockResolvedValue({
          exists: true,
          size: 400 * 1024, // 400KB (under limit)
          isDirectory: false,
          uri: 'file:///path/to/optimized.jpg',
          modificationTime: Date.now(),
        });

      // Mock image manipulation
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/optimized.jpg',
        width: 512,
        height: 512,
      });

      const result = await ImageOptimizationService.optimizeImage(imageUri, {
        maxSizeKB: 500,
      });

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalled();
      expect(result.size).toBeLessThanOrEqual(500 * 1024);
    });

    it('should throw error for non-existent image', async () => {
      const imageUri = 'file:///path/to/nonexistent.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: imageUri,
        modificationTime: Date.now(),
      });

      await expect(
        ImageOptimizationService.optimizeImage(imageUri)
      ).rejects.toThrow('Image file does not exist');
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail successfully', async () => {
      const imageUri = 'file:///path/to/image.jpg';

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/thumbnail.jpg',
        width: 150,
        height: 150,
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 50 * 1024, // 50KB
        isDirectory: false,
        uri: 'file:///path/to/thumbnail.jpg',
        modificationTime: Date.now(),
      });

      const result = await ImageOptimizationService.createThumbnail(imageUri);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        imageUri,
        [{ resize: { width: 150, height: 150 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      expect(result).toEqual({
        uri: 'file:///path/to/thumbnail.jpg',
        width: 150,
        height: 150,
        size: 50 * 1024,
        format: 'jpeg',
      });
    });

    it('should create custom size thumbnail', async () => {
      const imageUri = 'file:///path/to/image.jpg';
      const size = 200;

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file:///path/to/thumbnail-200.jpg',
        width: 200,
        height: 200,
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 75 * 1024,
        isDirectory: false,
        uri: 'file:///path/to/thumbnail-200.jpg',
        modificationTime: Date.now(),
      });

      const result = await ImageOptimizationService.createThumbnail(imageUri, size);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        imageUri,
        [{ resize: { width: size, height: size } }],
        expect.any(Object)
      );
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });
  });

  describe('validateImage', () => {
    it('should validate image successfully', async () => {
      const imageUri = 'file:///path/to/image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 2 * 1024 * 1024, // 2MB
        isDirectory: false,
        uri: imageUri,
        modificationTime: Date.now(),
      });

      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: imageUri,
        width: 1920,
        height: 1080,
      });

      const result = await ImageOptimizationService.validateImage(imageUri);

      expect(result).toEqual({
        isValid: true,
        info: {
          size: 2 * 1024 * 1024,
          width: 1920,
          height: 1080,
        },
      });
    });

    it('should reject non-existent image', async () => {
      const imageUri = 'file:///path/to/nonexistent.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: imageUri,
        modificationTime: Date.now(),
      });

      const result = await ImageOptimizationService.validateImage(imageUri);

      expect(result).toEqual({
        isValid: false,
        error: 'Image file does not exist',
      });
    });

    it('should reject oversized image', async () => {
      const imageUri = 'file:///path/to/huge-image.jpg';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        isDirectory: false,
        uri: imageUri,
        modificationTime: Date.now(),
      });

      const result = await ImageOptimizationService.validateImage(imageUri);

      expect(result).toEqual({
        isValid: false,
        error: 'Image size (15MB) exceeds maximum allowed size (10MB)',
      });
    });
  });

  describe('clearImageCache', () => {
    it('should clear cache directory successfully', async () => {
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true,
        uri: cacheDir,
        modificationTime: Date.now(),
      });

      mockFileSystem.deleteAsync.mockResolvedValue();

      await ImageOptimizationService.clearImageCache();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(cacheDir);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(cacheDir, { idempotent: true });
    });

    it('should handle non-existent cache directory', async () => {
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: cacheDir,
        modificationTime: Date.now(),
      });

      await ImageOptimizationService.clearImageCache();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(cacheDir);
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });
});