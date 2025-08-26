import React from 'react';
import {
  View,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
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

export interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  pressable?: boolean;
  hapticFeedback?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  style,
  pressable = false,
  hapticFeedback = true,
  onPress,
  ...props
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (!pressable || !onPress) return;
    
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    if (!pressable || !onPress) return;
    
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = async () => {
    if (!onPress) return;
    
    if (hapticFeedback) {
      await HapticService.light();
    }
    
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getCardStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden' as const,
    };

    const paddingStyles = {
      none: {},
      small: { padding: theme.spacing.sm },
      medium: { padding: theme.spacing.md },
      large: { padding: theme.spacing.lg },
    };

    const variantStyles = {
      elevated: {
        backgroundColor: theme.colors.card,
        ...theme.shadows.md,
      },
      outlined: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      filled: {
        backgroundColor: theme.colors.surface,
      },
    };

    return [
      baseStyle,
      paddingStyles[padding],
      variantStyles[variant],
      style,
    ];
  };

  if (pressable && onPress) {
    return (
      <AnimatedTouchableOpacity
        style={[getCardStyles(), animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // We handle opacity with animations
        accessibilityRole="button"
        {...props}
      >
        {children}
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <View style={getCardStyles()}>
      {children}
    </View>
  );
};

export default Card;