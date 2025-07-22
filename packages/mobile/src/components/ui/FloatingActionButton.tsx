import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {theme} from '../../styles/theme';

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  style,
  size = 'medium',
  color = theme.colors.surface,
  backgroundColor = theme.colors.primary,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const buttonStyle = [
    styles.button,
    styles[size],
    {backgroundColor},
    style,
  ];

  const iconSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;

  return (
    <AnimatedTouchableOpacity
      style={[buttonStyle, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      testID="floating-action-button">
      <Icon name={icon} size={iconSize} color={color} />
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  small: {
    width: 40,
    height: 40,
  },
  medium: {
    width: 56,
    height: 56,
  },
  large: {
    width: 72,
    height: 72,
  },
});