import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useInternationalization } from '@/contexts/InternationalizationContext';
import AccessibilityService from '@/services/accessibility/AccessibilityService';

interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  testID?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
}) => {
  const {
    getScaledFontSize,
    getAnimationDuration,
    getContrastRatio,
    isScreenReaderEnabled,
    isHighContrastEnabled,
  } = useAccessibility();
  
  const { isRTL, getFlexDirection } = useInternationalization();

  const accessibilityService = AccessibilityService.getInstance();

  // Get minimum touch target size
  const minTouchTarget = accessibilityService.getMinimumTouchTargetSize();

  // Calculate scaled dimensions
  const getSizeStyles = () => {
    const baseHeight = size === 'small' ? 36 : size === 'large' ? 56 : 48;
    const baseFontSize = size === 'small' ? 14 : size === 'large' ? 18 : 16;
    const basePadding = size === 'small' ? 12 : size === 'large' ? 20 : 16;

    return {
      height: Math.max(baseHeight, minTouchTarget),
      fontSize: getScaledFontSize(baseFontSize),
      paddingHorizontal: basePadding,
    };
  };

  const sizeStyles = getSizeStyles();

  // Get variant styles with contrast adjustments
  const getVariantStyles = () => {
    const contrastRatio = getContrastRatio();
    
    const variants = {
      primary: {
        backgroundColor: isHighContrastEnabled ? '#000000' : '#2563EB',
        borderColor: isHighContrastEnabled ? '#000000' : '#2563EB',
        textColor: isHighContrastEnabled ? '#FFFFFF' : '#FFFFFF',
      },
      secondary: {
        backgroundColor: isHighContrastEnabled ? '#FFFFFF' : '#F1F5F9',
        borderColor: isHighContrastEnabled ? '#000000' : '#E2E8F0',
        textColor: isHighContrastEnabled ? '#000000' : '#334155',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: isHighContrastEnabled ? '#000000' : '#2563EB',
        textColor: isHighContrastEnabled ? '#000000' : '#2563EB',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: isHighContrastEnabled ? '#000000' : '#2563EB',
      },
      danger: {
        backgroundColor: isHighContrastEnabled ? '#000000' : '#EF4444',
        borderColor: isHighContrastEnabled ? '#000000' : '#EF4444',
        textColor: '#FFFFFF',
      },
    };

    return variants[variant];
  };

  const variantStyles = getVariantStyles();

  // Handle press with accessibility feedback
  const handlePress = () => {
    if (disabled || loading) return;
    
    // Provide haptic feedback for accessibility
    accessibilityService.provideAccessibilityFeedback('selection');
    
    onPress();
  };

  // Generate accessibility properties
  const getAccessibilityProps = () => {
    const label = accessibilityLabel || title;
    const hint = accessibilityHint || accessibilityService.generateAccessibilityHint('button', title);
    
    let accessibilityState: any = {
      disabled: disabled || loading,
    };

    if (loading) {
      accessibilityState.busy = true;
    }

    return {
      accessible: true,
      accessibilityRole: accessibilityRole as any,
      accessibilityLabel: label,
      accessibilityHint: isScreenReaderEnabled ? hint : undefined,
      accessibilityState,
    };
  };

  const accessibilityProps = getAccessibilityProps();

  // Render content with proper RTL support
  const renderContent = () => {
    const contentStyle = {
      flexDirection: getFlexDirection(),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };

    if (loading) {
      return (
        <View style={contentStyle}>
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
            style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}
          />
          <Text style={[styles.text, { color: variantStyles.textColor, fontSize: sizeStyles.fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      );
    }

    if (icon) {
      const iconMargin = iconPosition === 'left' 
        ? { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }
        : { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 };

      return (
        <View style={contentStyle}>
          {iconPosition === 'left' && <View style={iconMargin}>{icon}</View>}
          <Text style={[styles.text, { color: variantStyles.textColor, fontSize: sizeStyles.fontSize }, textStyle]}>
            {title}
          </Text>
          {iconPosition === 'right' && <View style={iconMargin}>{icon}</View>}
        </View>
      );
    }

    return (
      <Text style={[styles.text, { color: variantStyles.textColor, fontSize: sizeStyles.fontSize }, textStyle]}>
        {title}
      </Text>
    );
  };

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: variantStyles.backgroundColor,
      borderColor: variantStyles.borderColor,
      height: sizeStyles.height,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      minWidth: minTouchTarget,
      minHeight: minTouchTarget,
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : undefined,
    },
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      {...accessibilityProps}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AccessibleButton;