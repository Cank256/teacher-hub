import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {Dimensions, Platform} from 'react-native';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const {width: screenWidth} = Dimensions.get('window');

export const useNavigationGestures = () => {
  const navigation = useNavigation();

  const handleSwipeGesture = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const {translationX, velocityX, state} = event.nativeEvent;

      if (state === State.END) {
        const swipeThreshold = screenWidth * 0.3;
        const velocityThreshold = 500;

        // Right swipe (go back)
        if (
          (translationX > swipeThreshold || velocityX > velocityThreshold) &&
          navigation.canGoBack()
        ) {
          navigation.goBack();
        }
      }
    },
    [navigation],
  );

  const isGestureEnabled = Platform.OS === 'ios' || Platform.OS === 'android';

  return {
    handleSwipeGesture,
    isGestureEnabled,
  };
};