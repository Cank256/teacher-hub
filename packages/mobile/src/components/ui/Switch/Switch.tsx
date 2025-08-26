import React from 'react';
import {
  View,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { HapticService } from '../../../services/haptics';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
}

const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'medium',
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();
  const animatedValue = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    animatedValue.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [value, animatedValue]);

  const handlePress = async () => {
    if (disabled) return;
    
    if (hapticFeedback) {
      await HapticService.toggle();
    }
    
    onValueChange(!value);
  };

  const getSizeConfig = () => {
    const configs = {
      small: {
        width: 36,
        height: 20,
        thumbSize: 16,
        padding: 2,
      },
      medium: {
        width: 44,
        height: 24,
        thumbSize: 20,
        padding: 2,
      },
      large: {
        width: 52,
        height: 28,
        thumbSize: 24,
        padding: 2,
      },
    };
    
    return configs[size];
  };

  const sizeConfig = getSizeConfig();

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animatedValue.value,
      [0, 1],
      [theme.colors.border, theme.colors.primary]
    );

    return {
      backgroundColor,
      opacity: disabled ? 0.5 : 1,
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = animatedValue.value * (sizeConfig.width - sizeConfig.thumbSize - sizeConfig.padding * 2);
    
    return {
      transform: [{ translateX }],
    };
  });

  const trackStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    borderRadius: sizeConfig.height / 2,
    padding: sizeConfig.padding,
    justifyContent: 'center' as const,
  };

  const thumbStyle = {
    width: sizeConfig.thumbSize,
    height: sizeConfig.thumbSize,
    borderRadius: sizeConfig.thumbSize / 2,
    backgroundColor: '#FFFFFF',
    ...theme.shadows.sm,
  };

  return (
    <TouchableOpacity
      style={style}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        checked: value,
        disabled,
      }}
      activeOpacity={0.8}
    >
      <Animated.View style={[trackStyle, trackAnimatedStyle]}>
        <Animated.View style={[thumbStyle, thumbAnimatedStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Switch;