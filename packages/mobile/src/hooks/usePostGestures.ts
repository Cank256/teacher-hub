import {useCallback} from 'react';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {Dimensions} from 'react-native';

const {width: screenWidth} = Dimensions.get('window');

interface UsePostGesturesProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
}

export const usePostGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  swipeThreshold = screenWidth * 0.3,
}: UsePostGesturesProps) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {startX: number}
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      
      // Add some resistance when swiping
      const progress = Math.abs(event.translationX) / screenWidth;
      scale.value = 1 - progress * 0.1;
      opacity.value = 1 - progress * 0.3;
    },
    onEnd: (event) => {
      const shouldSwipeLeft = event.translationX < -swipeThreshold && event.velocityX < -500;
      const shouldSwipeRight = event.translationX > swipeThreshold && event.velocityX > 500;

      if (shouldSwipeLeft && onSwipeLeft) {
        // Animate out to the left
        translateX.value = withSpring(-screenWidth, {damping: 15, stiffness: 300});
        scale.value = withSpring(0.8, {damping: 15, stiffness: 300});
        opacity.value = withSpring(0, {damping: 15, stiffness: 300});
        runOnJS(onSwipeLeft)();
      } else if (shouldSwipeRight && onSwipeRight) {
        // Animate out to the right
        translateX.value = withSpring(screenWidth, {damping: 15, stiffness: 300});
        scale.value = withSpring(0.8, {damping: 15, stiffness: 300});
        opacity.value = withSpring(0, {damping: 15, stiffness: 300});
        runOnJS(onSwipeRight)();
      } else {
        // Spring back to center
        translateX.value = withSpring(0, {damping: 15, stiffness: 300});
        scale.value = withSpring(1, {damping: 15, stiffness: 300});
        opacity.value = withSpring(1, {damping: 15, stiffness: 300});
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {scale: scale.value},
    ],
    opacity: opacity.value,
  }));

  const resetAnimation = useCallback(() => {
    translateX.value = withSpring(0, {damping: 15, stiffness: 300});
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
    opacity.value = withSpring(1, {damping: 15, stiffness: 300});
  }, [translateX, scale, opacity]);

  return {
    gestureHandler,
    animatedStyle,
    resetAnimation,
  };
};

// Hook for double tap gesture
export const useDoubleTapGesture = (onDoubleTap: () => void) => {
  const scale = useSharedValue(1);
  
  const doubleTapHandler = useCallback(() => {
    scale.value = withSpring(1.2, {damping: 15, stiffness: 300}, () => {
      scale.value = withSpring(1, {damping: 15, stiffness: 300});
    });
    onDoubleTap();
  }, [onDoubleTap, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return {
    doubleTapHandler,
    animatedStyle,
  };
};