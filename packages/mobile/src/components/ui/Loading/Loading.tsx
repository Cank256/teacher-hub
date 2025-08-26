import React from 'react';
import {
  View,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import Text from '../Text/Text';

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  color,
  text,
  overlay = false,
  style,
  testID,
}) => {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'medium':
        return 32;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const getContainerStyles = () => {
    const baseStyle = {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };

    if (overlay) {
      return {
        ...baseStyle,
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.overlay,
        zIndex: 1000,
      };
    }

    return baseStyle;
  };

  const loadingColor = color || theme.colors.primary;

  return (
    <View style={[getContainerStyles(), style]} testID={testID}>
      <View style={{ alignItems: 'center' }}>
        <ActivityIndicator
          size={getSizeValue()}
          color={loadingColor}
          testID={`${testID}-indicator`}
        />
        
        {text && (
          <Text
            variant="label"
            color="textSecondary"
            align="center"
            style={{
              marginTop: theme.spacing.sm,
              color: overlay ? '#FFFFFF' : theme.colors.textSecondary,
            }}
          >
            {text}
          </Text>
        )}
      </View>
    </View>
  );
};

export default Loading;