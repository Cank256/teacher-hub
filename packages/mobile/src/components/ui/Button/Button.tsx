import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { HapticService } from '../../../services/haptics';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
  icon,
  iconPosition = 'left',
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (hapticFeedback) {
      await HapticService.buttonPress();
    }
    
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getButtonStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 48,
      },
      large: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        minHeight: 56,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.sm,
      },
      secondary: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    const disabledStyle = disabled ? { opacity: 0.5 } : {};

    return [
      baseStyle,
      sizeStyles[size],
      variantStyles[variant],
      disabledStyle,
      style,
    ];
  };

  const getTextStyles = () => {
    const baseTextStyle = {
      fontFamily: theme.typography.fontFamily.semibold,
      textAlign: 'center' as const,
    };

    const sizeTextStyles = {
      small: {
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.sm,
      },
      medium: {
        fontSize: theme.typography.fontSize.md,
        lineHeight: theme.typography.lineHeight.md,
      },
      large: {
        fontSize: theme.typography.fontSize.lg,
        lineHeight: theme.typography.lineHeight.lg,
      },
    };

    const variantTextStyles = {
      primary: {
        color: '#FFFFFF',
      },
      secondary: {
        color: theme.colors.text,
      },
      outline: {
        color: theme.colors.primary,
      },
      ghost: {
        color: theme.colors.primary,
      },
    };

    const disabledTextStyle = disabled ? { opacity: 0.7 } : {};

    return [
      baseTextStyle,
      sizeTextStyles[size],
      variantTextStyles[variant],
      disabledTextStyle,
      textStyle,
    ];
  };

  const getActivityIndicatorColor = () => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return theme.colors.text;
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={getActivityIndicatorColor()}
          testID={`${testID}-loading`}
        />
      );
    }

    const textElement = <Text style={getTextStyles()}>{title}</Text>;
    
    if (!icon) {
      return textElement;
    }

    return (
      <>
        {iconPosition === 'left' && (
          <>{icon}<Text style={{ width: theme.spacing.sm }} /></>
        )}
        {textElement}
        {iconPosition === 'right' && (
          <><Text style={{ width: theme.spacing.sm }} />{icon}</>
        )}
      </>
    );
  };

  return (
    <AnimatedTouchableOpacity
      style={[getButtonStyles(), animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ 
        disabled: disabled || loading,
        busy: loading,
      }}
      activeOpacity={1} // We handle opacity with animations
    >
      {renderContent()}
    </AnimatedTouchableOpacity>
  );
};

export default Button;
