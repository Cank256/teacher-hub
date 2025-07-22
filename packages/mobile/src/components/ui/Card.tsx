import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {theme} from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  touchable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  touchable = true,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    style,
  ];

  if (onPress && touchable) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
        testID="card-touchable">
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID="card">
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  default: {
    ...theme.shadows.sm,
  },
  elevated: {
    ...theme.shadows.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});