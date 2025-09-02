import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useInternationalization } from '@/contexts/InternationalizationContext';

interface AccessibleTextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'text' | 'textSecondary';
  align?: 'left' | 'center' | 'right' | 'auto';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  capitalize?: boolean;
  accessibilityRole?: 'text' | 'header' | 'link' | 'button';
  accessibilityLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  semanticRole?: 'heading' | 'paragraph' | 'label' | 'caption' | 'emphasis' | 'strong';
  children: React.ReactNode;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  variant = 'body1',
  color = 'text',
  align = 'auto',
  weight = 'regular',
  italic = false,
  underline = false,
  strikethrough = false,
  uppercase = false,
  lowercase = false,
  capitalize = false,
  accessibilityRole = 'text',
  accessibilityLevel,
  semanticRole,
  style,
  children,
  ...textProps
}) => {
  const {
    getScaledFontSize,
    isHighContrastEnabled,
    getContrastRatio,
    settings,
  } = useAccessibility();
  
  const { isRTL, getTextAlign } = useInternationalization();

  // Get base font sizes for variants
  const getVariantStyles = () => {
    const variants = {
      h1: { fontSize: 32, fontWeight: 'bold' as const, lineHeight: 40 },
      h2: { fontSize: 28, fontWeight: 'bold' as const, lineHeight: 36 },
      h3: { fontSize: 24, fontWeight: 'semibold' as const, lineHeight: 32 },
      h4: { fontSize: 20, fontWeight: 'semibold' as const, lineHeight: 28 },
      h5: { fontSize: 18, fontWeight: 'medium' as const, lineHeight: 24 },
      h6: { fontSize: 16, fontWeight: 'medium' as const, lineHeight: 22 },
      body1: { fontSize: 16, fontWeight: 'regular' as const, lineHeight: 24 },
      body2: { fontSize: 14, fontWeight: 'regular' as const, lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: 'regular' as const, lineHeight: 16 },
      overline: { fontSize: 10, fontWeight: 'medium' as const, lineHeight: 14, textTransform: 'uppercase' as const },
    };

    const variantStyle = variants[variant];
    
    return {
      fontSize: getScaledFontSize(variantStyle.fontSize),
      fontWeight: weight !== 'regular' ? weight : variantStyle.fontWeight,
      lineHeight: variantStyle.lineHeight * (getScaledFontSize(variantStyle.fontSize) / variantStyle.fontSize),
      textTransform: variantStyle.textTransform,
    };
  };

  // Get color values with contrast adjustments
  const getColorValue = () => {
    const contrastRatio = getContrastRatio();
    
    const colors = {
      primary: isHighContrastEnabled ? '#000000' : '#2563EB',
      secondary: isHighContrastEnabled ? '#333333' : '#7C3AED',
      error: isHighContrastEnabled ? '#000000' : '#EF4444',
      warning: isHighContrastEnabled ? '#000000' : '#F59E0B',
      success: isHighContrastEnabled ? '#000000' : '#10B981',
      info: isHighContrastEnabled ? '#000000' : '#3B82F6',
      text: isHighContrastEnabled ? '#000000' : '#1F2937',
      textSecondary: isHighContrastEnabled ? '#333333' : '#6B7280',
    };

    return colors[color];
  };

  // Get text alignment
  const getTextAlignment = () => {
    if (align === 'auto') {
      return getTextAlign();
    }
    
    // Handle RTL for explicit alignments
    if (isRTL) {
      if (align === 'left') return 'right';
      if (align === 'right') return 'left';
    }
    
    return align;
  };

  // Generate accessibility properties
  const getAccessibilityProps = () => {
    let role = accessibilityRole;
    let level = accessibilityLevel;

    // Auto-detect heading role and level from variant
    if (variant.startsWith('h') && !accessibilityLevel) {
      role = 'header';
      level = parseInt(variant.charAt(1)) as 1 | 2 | 3 | 4 | 5 | 6;
    }

    // Set semantic role based on variant if not specified
    if (!semanticRole) {
      if (variant.startsWith('h')) {
        // Heading role is handled by accessibilityRole
      } else if (variant === 'caption') {
        role = 'text';
      }
    }

    const props: any = {
      accessible: true,
      accessibilityRole: role,
    };

    // Add accessibility level for headers
    if (role === 'header' && level) {
      props.accessibilityLevel = level;
    }

    return props;
  };

  // Apply text transformations
  const transformText = (text: React.ReactNode): React.ReactNode => {
    if (typeof text !== 'string') return text;
    
    if (uppercase) return text.toUpperCase();
    if (lowercase) return text.toLowerCase();
    if (capitalize) return text.charAt(0).toUpperCase() + text.slice(1);
    
    return text;
  };

  const variantStyles = getVariantStyles();
  const colorValue = getColorValue();
  const textAlign = getTextAlignment();
  const accessibilityProps = getAccessibilityProps();

  const textStyle = [
    styles.text,
    {
      fontSize: variantStyles.fontSize,
      fontWeight: variantStyles.fontWeight,
      lineHeight: variantStyles.lineHeight,
      color: colorValue,
      textAlign,
      fontStyle: italic ? 'italic' : 'normal',
      textDecorationLine: (() => {
        const decorations = [];
        if (underline) decorations.push('underline');
        if (strikethrough) decorations.push('line-through');
        return decorations.length > 0 ? decorations.join(' ') : 'none';
      })(),
      textTransform: variantStyles.textTransform || (uppercase ? 'uppercase' : lowercase ? 'lowercase' : capitalize ? 'capitalize' : 'none'),
      writingDirection: isRTL ? 'rtl' : 'ltr',
      // Apply bold text preference from accessibility settings
      fontWeight: settings.isBoldTextEnabled ? 'bold' : variantStyles.fontWeight,
    },
    style,
  ];

  return (
    <RNText
      style={textStyle}
      {...accessibilityProps}
      {...textProps}
    >
      {transformText(children)}
    </RNText>
  );
};

// Convenience components for common text variants
export const Heading1: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="h6" {...props} />
);

export const BodyText: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="body1" {...props} />
);

export const SmallText: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="body2" {...props} />
);

export const Caption: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="caption" {...props} />
);

export const Overline: React.FC<Omit<AccessibleTextProps, 'variant'>> = (props) => (
  <AccessibleText variant="overline" {...props} />
);

const styles = StyleSheet.create({
  text: {
    // Base text styles
  },
});

export default AccessibleText;