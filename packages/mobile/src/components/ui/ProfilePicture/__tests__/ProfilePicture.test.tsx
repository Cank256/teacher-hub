/**
 * ProfilePicture Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfilePicture from '../ProfilePicture';
import { ImageOptimizationService } from '@/utils/imageOptimization';
import { HapticService } from '@/services/haptics';

// Mock dependencies
jest.mock('@/utils/imageOptimization');
jest.mock('@/services/haptics');
jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#2563EB',
        surface: '#F8FAFC',
        border: '#E5E7EB',
        textSecondary: '#6B7280',
      },
      borderRadius: {
        md: 8,
      },
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockImageOptimizationService = ImageOptimizationService as jest.Mocked<typeof ImageOptimizationService>;
const mockHapticService = HapticService as jest.Mocked<typeof HapticService>;

describe('ProfilePicture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Non-editable mode', () => {
    it('should render profile picture with image', () => {
      const imageUri = 'https://example.com/profile.jpg';
      const { getByTestId } = render(
        <ProfilePicture
          imageUri={imageUri}
          editable={false}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      expect(container).toBeTruthy();
    });

    it('should render placeholder when no image provided', () => {
      const { getByTestId } = render(
        <ProfilePicture
          editable={false}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      expect(container).toBeTruthy();
    });

    it('should not be pressable when not editable', () => {
      const onImageChange = jest.fn();
      const { getByTestId } = render(
        <ProfilePicture
          editable={false}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      expect(onImageChange).not.toHaveBeenCalled();
    });
  });

  describe('Editable mode', () => {
    it('should show action sheet when pressed', async () => {
      const onImageChange = jest.fn();
      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      await waitFor(() => {
        expect(mockHapticService.buttonPress).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Profile Picture',
          'Choose an option',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Take Photo' }),
            expect.objectContaining({ text: 'Choose from Gallery' }),
            expect.objectContaining({ text: 'Cancel' }),
          ])
        );
      });
    });

    it('should show remove option when image exists', async () => {
      const onImageChange = jest.fn();
      const onImageRemove = jest.fn();
      const { getByTestId } = render(
        <ProfilePicture
          imageUri="https://example.com/profile.jpg"
          editable={true}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Profile Picture',
          'Choose an option',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Remove Photo' }),
          ])
        );
      });
    });

    it('should handle image selection from gallery', async () => {
      const onImageChange = jest.fn();
      const mockOptimizedImage = {
        uri: 'file:///optimized/image.jpg',
        width: 512,
        height: 512,
        size: 100000,
        format: 'jpeg' as const,
      };

      mockImageOptimizationService.pickAndOptimizeImage.mockResolvedValue(mockOptimizedImage);

      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      // Simulate selecting "Choose from Gallery"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const galleryOption = alertCall[2].find((option: any) => option.text === 'Choose from Gallery');
      
      await galleryOption.onPress();

      await waitFor(() => {
        expect(mockImageOptimizationService.pickAndOptimizeImage).toHaveBeenCalledWith(
          'gallery',
          {
            maxWidth: 512,
            maxHeight: 512,
            quality: 0.8,
            maxSizeKB: 300,
          }
        );
        expect(onImageChange).toHaveBeenCalledWith(mockOptimizedImage.uri);
      });
    });

    it('should handle image selection from camera', async () => {
      const onImageChange = jest.fn();
      const mockOptimizedImage = {
        uri: 'file:///camera/image.jpg',
        width: 512,
        height: 512,
        size: 100000,
        format: 'jpeg' as const,
      };

      mockImageOptimizationService.pickAndOptimizeImage.mockResolvedValue(mockOptimizedImage);

      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      // Simulate selecting "Take Photo"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cameraOption = alertCall[2].find((option: any) => option.text === 'Take Photo');
      
      await cameraOption.onPress();

      await waitFor(() => {
        expect(mockImageOptimizationService.pickAndOptimizeImage).toHaveBeenCalledWith(
          'camera',
          {
            maxWidth: 512,
            maxHeight: 512,
            quality: 0.8,
            maxSizeKB: 300,
          }
        );
        expect(onImageChange).toHaveBeenCalledWith(mockOptimizedImage.uri);
      });
    });

    it('should handle image selection cancellation', async () => {
      const onImageChange = jest.fn();

      mockImageOptimizationService.pickAndOptimizeImage.mockResolvedValue(null);

      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      // Simulate selecting "Choose from Gallery"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const galleryOption = alertCall[2].find((option: any) => option.text === 'Choose from Gallery');
      
      await galleryOption.onPress();

      await waitFor(() => {
        expect(onImageChange).not.toHaveBeenCalled();
      });
    });

    it('should handle image selection error', async () => {
      const onImageChange = jest.fn();
      const error = new Error('Permission denied');

      mockImageOptimizationService.pickAndOptimizeImage.mockRejectedValue(error);

      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      // Simulate selecting "Choose from Gallery"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const galleryOption = alertCall[2].find((option: any) => option.text === 'Choose from Gallery');
      
      await galleryOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to select image. Please try again.',
          [{ text: 'OK' }]
        );
        expect(onImageChange).not.toHaveBeenCalled();
      });
    });

    it('should handle image removal', async () => {
      const onImageRemove = jest.fn();
      const { getByTestId } = render(
        <ProfilePicture
          imageUri="https://example.com/profile.jpg"
          editable={true}
          onImageRemove={onImageRemove}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      // Simulate selecting "Remove Photo"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const removeOption = alertCall[2].find((option: any) => option.text === 'Remove Photo');
      
      await removeOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Remove Photo',
          'Are you sure you want to remove your profile picture?',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Remove' }),
          ])
        );
      });

      // Simulate confirming removal
      const confirmCall = (Alert.alert as jest.Mock).mock.calls[1];
      const confirmOption = confirmCall[2].find((option: any) => option.text === 'Remove');
      
      confirmOption.onPress();

      expect(onImageRemove).toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      const { getByTestId } = render(
        <ProfilePicture
          loading={true}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      expect(container).toBeTruthy();
    });

    it('should not be pressable when loading', () => {
      const onImageChange = jest.fn();
      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          loading={true}
          onImageChange={onImageChange}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      fireEvent.press(container);

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(onImageChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom size', () => {
    it('should render with custom size', () => {
      const { getByTestId } = render(
        <ProfilePicture
          size={80}
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility properties', () => {
      const { getByTestId } = render(
        <ProfilePicture
          editable={true}
          accessibilityLabel="User profile picture"
          testID="profile-picture"
        />
      );

      const container = getByTestId('profile-picture');
      expect(container.props.accessibilityRole).toBe('button');
      expect(container.props.accessibilityLabel).toBe('User profile picture');
      expect(container.props.accessibilityHint).toBe('Tap to change profile picture');
    });
  });
});