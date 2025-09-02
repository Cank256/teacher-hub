import React, { useState, useRef } from 'react';
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
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useInternationalization } from '@/contexts/InternationalizationContext';
import AccessibilityService from '@/services/accessibility/AccessibilityService';

interface AccessibleTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: TextInputProps['keyboardType'];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  testID?: string;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  required = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoFocus = false,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  testID,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const {
    getScaledFontSize,
    isScreenReaderEnabled,
    isHighContrastEnabled,
    getContrastRatio,
  } = useAccessibility();
  
  const { isRTL, getTextAlign, t } = useInternationalization();

  const accessibilityService = AccessibilityService.getInstance();

  // Calculate scaled font sizes
  const labelFontSize = getScaledFontSize(14);
  const inputFontSize = getScaledFontSize(16);
  const helperFontSize = getScaledFontSize(12);

  // Get minimum touch target size
  const minTouchTarget = accessibilityService.getMinimumTouchTargetSize();

  // Color adjustments for high contrast
  const getColors = () => {
    const contrastRatio = getContrastRatio();
    
    return {
      primary: isHighContrastEnabled ? '#000000' : '#2563EB',
      error: isHighContrastEnabled ? '#000000' : '#EF4444',
      text: isHighContrastEnabled ? '#000000' : '#1F2937',
      placeholder: isHighContrastEnabled ? '#666666' : '#9CA3AF',
      border: isHighContrastEnabled ? '#000000' : '#D1D5DB',
      borderFocused: isHighContrastEnabled ? '#000000' : '#2563EB',
      borderError: isHighContrastEnabled ? '#000000' : '#EF4444',
      background: isHighContrastEnabled ? '#FFFFFF' : '#FFFFFF',
      disabled: isHighContrastEnabled ? '#F3F4F6' : '#F9FAFB',
    };
  };

  const colors = getColors();

  // Generate accessibility properties
  const getAccessibilityProps = () => {
    const inputType = secureTextEntry ? 'password' : multiline ? 'multiline' : 'singleline';
    const role = accessibilityService.getAccessibilityRole(inputType);
    
    let accessibilityLabel = label;
    if (required && label) {
      accessibilityLabel = `${label}, ${t('accessibility.required', 'required')}`;
    }

    let accessibilityHint = '';
    if (helperText && !error) {
      accessibilityHint = helperText;
    }
    if (maxLength) {
      accessibilityHint += accessibilityHint ? `. ${t('common.maxLength', 'Maximum {{count}} characters', { count: maxLength })}` : t('common.maxLength', 'Maximum {{count}} characters', { count: maxLength });
    }

    const accessibilityState: any = {
      disabled,
    };

    if (error) {
      accessibilityState.invalid = true;
    }

    return {
      accessible: true,
      accessibilityRole: role as any,
      accessibilityLabel,
      accessibilityHint: isScreenReaderEnabled ? accessibilityHint : undefined,
      accessibilityState,
    };
  };

  const accessibilityProps = getAccessibilityProps();

  // Handle focus events
  const handleFocus = (e: any) => {
    setIsFocused(true);
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  // Handle right icon press
  const handleRightIconPress = () => {
    if (onRightIconPress) {
      accessibilityService.provideAccessibilityFeedback('selection');
      onRightIconPress();
    }
  };

  // Get border color based on state
  const getBorderColor = () => {
    if (error) return colors.borderError;
    if (isFocused) return colors.borderFocused;
    return colors.border;
  };

  // Container styles
  const containerStyle = [
    styles.container,
    style,
  ];

  // Input container styles
  const inputContainerStyle = [
    styles.inputContainer,
    {
      borderColor: getBorderColor(),
      backgroundColor: disabled ? colors.disabled : colors.background,
      minHeight: Math.max(multiline ? numberOfLines * 24 + 16 : 48, minTouchTarget),
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
  ];

  // Input styles
  const textInputStyle = [
    styles.input,
    {
      fontSize: inputFontSize,
      color: disabled ? colors.placeholder : colors.text,
      textAlign: getTextAlign(),
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    inputStyle,
  ];

  // Label styles
  const labelTextStyle = [
    styles.label,
    {
      fontSize: labelFontSize,
      color: error ? colors.error : colors.text,
    },
    labelStyle,
  ];

  // Error/Helper text styles
  const messageStyle = [
    styles.message,
    {
      fontSize: helperFontSize,
      color: error ? colors.error : colors.text,
    },
    error ? errorStyle : helperStyle,
  ];

  return (
    <View style={containerStyle}>
      {/* Label */}
      {label && (
        <Text style={labelTextStyle}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View style={inputContainerStyle}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={[styles.iconContainer, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
            {leftIcon}
          </View>
        )}

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={textInputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID={testID}
          {...accessibilityProps}
          {...textInputProps}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            style={[styles.iconContainer, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}
            onPress={handleRightIconPress}
            disabled={!onRightIconPress}
            accessible={!!onRightIconPress}
            accessibilityRole={onRightIconPress ? 'button' : undefined}
            accessibilityLabel={onRightIconPress ? t('common.action', 'Action') : undefined}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {/* Error/Helper Text */}
      {(error || helperText) && (
        <Text
          style={messageStyle}
          accessible={true}
          accessibilityRole="text"
          accessibilityLiveRegion={error ? 'assertive' : 'polite'}
        >
          {error || helperText}
        </Text>
      )}

      {/* Character Count */}
      {maxLength && value && (
        <Text
          style={[styles.characterCount, { fontSize: helperFontSize, color: colors.text }]}
          accessible={isScreenReaderEnabled}
          accessibilityLabel={t('common.characterCount', '{{current}} of {{max}} characters', {
            current: value.length,
            max: maxLength,
          })}
        >
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 4,
  },
  characterCount: {
    marginTop: 2,
    textAlign: 'right',
  },
});

export default AccessibleTextInput;