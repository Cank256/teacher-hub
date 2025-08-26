import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  variant?: 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperTextStyle?: TextStyle;
  required?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'medium',
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  helperTextStyle,
  required = false,
  showCharacterCount = false,
  maxLength,
  value,
  onFocus,
  onBlur,
  editable = true,
  ...props
}, ref) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [
        error ? theme.colors.error : theme.colors.border,
        error ? theme.colors.error : theme.colors.primary,
      ]
    );

    return {
      borderColor,
      borderWidth: withTiming(isFocused ? 2 : 1, { duration: 200 }),
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [
        error ? theme.colors.error : theme.colors.textSecondary,
        error ? theme.colors.error : theme.colors.primary,
      ]
    );

    return { color };
  });

  const getContainerStyles = () => {
    const sizeStyles = {
      small: { minHeight: 36 },
      medium: { minHeight: 48 },
      large: { minHeight: 56 },
    };

    const variantStyles = {
      outlined: {
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.md,
      },
      filled: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 0,
      },
    };

    return [
      styles.container,
      sizeStyles[size],
      variantStyles[variant],
      !editable && styles.disabled,
    ];
  };

  const getInputStyles = () => {
    const baseStyle = {
      flex: 1,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
    };

    const sizeStyles = {
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

    return [
      baseStyle,
      sizeStyles[size],
      inputStyle,
    ];
  };

  const getLabelStyles = () => {
    return [
      {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.medium,
        marginBottom: theme.spacing.xs,
      },
      labelStyle,
    ];
  };

  const getErrorStyles = () => {
    return [
      {
        fontSize: theme.typography.fontSize.xs,
        fontFamily: theme.typography.fontFamily.regular,
        color: theme.colors.error,
        marginTop: theme.spacing.xs,
      },
      errorStyle,
    ];
  };

  const getHelperTextStyles = () => {
    return [
      {
        fontSize: theme.typography.fontSize.xs,
        fontFamily: theme.typography.fontFamily.regular,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
      },
      helperTextStyle,
    ];
  };

  const characterCount = value?.length || 0;
  const showCount = showCharacterCount && maxLength;

  return (
    <View style={[containerStyle]}>
      {label && (
        <Animated.Text 
          style={[getLabelStyles(), animatedLabelStyle]}
          accessibilityLabel={`${label}${required ? ', required' : ''}`}
        >
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Animated.Text>
      )}
      
      <Animated.View 
        style={[
          getContainerStyles(),
          variant === 'outlined' && animatedBorderStyle,
          styles.inputContainer,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={getInputStyles()}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          maxLength={maxLength}
          placeholderTextColor={theme.colors.textDisabled}
          selectionColor={theme.colors.primary}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityState={{
            disabled: !editable,
          }}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityRole={onRightIconPress ? 'button' : undefined}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      
      <View style={styles.bottomContainer}>
        <View style={styles.messageContainer}>
          {error ? (
            <Text style={getErrorStyles()}>{error}</Text>
          ) : helperText ? (
            <Text style={getHelperTextStyles()}>{helperText}</Text>
          ) : null}
        </View>
        
        {showCount && (
          <Text style={[getHelperTextStyles(), styles.characterCount]}>
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  messageContainer: {
    flex: 1,
  },
  characterCount: {
    marginLeft: 8,
  },
});

Input.displayName = 'Input';

export default Input;