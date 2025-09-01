import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { ImageOptimizationService } from '@/utils/imageOptimization';
import { HapticService } from '@/services/haptics';
import Text from '../Text';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ProfilePictureProps {
  imageUri?: string;
  size?: number;
  editable?: boolean;
  onImageChange?: (imageUri: string) => void;
  onImageRemove?: () => void;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUri,
  size = 120,
  editable = false,
  onImageChange,
  onImageRemove,
  loading = false,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!editable || loading || isUploading) return;
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (!editable || loading || isUploading) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = async () => {
    if (!editable || loading || isUploading) return;

    await HapticService.buttonPress();

    const options = [
      { text: 'Take Photo', onPress: () => selectImage('camera') },
      { text: 'Choose from Gallery', onPress: () => selectImage('gallery') },
    ];

    if (imageUri && onImageRemove) {
      options.push({ text: 'Remove Photo', onPress: handleRemoveImage });
    }

    options.push({ text: 'Cancel', style: 'cancel' as const });

    Alert.alert('Profile Picture', 'Choose an option', options);
  };

  const selectImage = async (source: 'camera' | 'gallery') => {
    try {
      setIsUploading(true);

      const result = await ImageOptimizationService.pickAndOptimizeImage(source, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        maxSizeKB: 300,
      });

      if (result && onImageChange) {
        onImageChange(result.uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert(
        'Error',
        'Failed to select image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onImageRemove?.()
        },
      ]
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
  ];

  const getInitials = () => {
    // This would typically come from user data
    return 'U'; // Default initial
  };

  const renderContent = () => {
    if (loading || isUploading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (imageUri) {
      return (
        <FastImage
          source={{ uri: imageUri }}
          style={[styles.image, { borderRadius: size / 2 }]}
          resizeMode={FastImage.resizeMode.cover}
        />
      );
    }

    return (
      <View style={styles.placeholderContainer}>
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {getInitials()}
        </Text>
      </View>
    );
  };

  const renderEditOverlay = () => {
    if (!editable || loading) return null;

    return (
      <View style={[styles.editOverlay, { borderRadius: size / 2 }]}>
        <View style={styles.editIcon}>
          <Text style={[styles.editText, { color: '#FFFFFF' }]}>✏️</Text>
        </View>
      </View>
    );
  };

  if (!editable) {
    return (
      <View style={containerStyle} testID={testID}>
        {renderContent()}
      </View>
    );
  }

  return (
    <AnimatedTouchableOpacity
      style={[containerStyle, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading || isUploading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Profile picture'}
      accessibilityHint="Tap to change profile picture"
      activeOpacity={1}
    >
      {renderContent()}
      {renderEditOverlay()}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    fontSize: 16,
  },
});

export default ProfilePicture;