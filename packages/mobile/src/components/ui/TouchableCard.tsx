import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {theme} from '../../styles/theme';

interface TouchableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const TouchableCard: React.FC<TouchableCardProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  hapticFeedback = true,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
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

  const handlePress = () => {
    if (hapticFeedback) {
      // Haptic feedback would be implemented here
      // HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleLongPress = () => {
    if (hapticFeedback) {
      // HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.();
  };

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, animatedStyle, style]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      testID="touchable-card">
      <View style={styles.content}>
        {children}
      </View>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  content: {
    padding: theme.spacing.lg,
  },
});