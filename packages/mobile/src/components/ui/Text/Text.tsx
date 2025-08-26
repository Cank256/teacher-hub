import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

export interface TextProps extends RNTextProps {
  variant?: 
    | 'display'
    | 'headline'
    | 'title'
    | 'body'
    | 'label'
    | 'caption';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'text' | 'textSecondary' | 'textDisabled' | 'error' | 'success' | 'warning';
  align?: 'left' | 'center' | 'right' | 'justify';
  children: React.ReactNode;
}

const Text: React.FC<TextProps> = ({
  variant = 'body',
  weight = 'regular',
  color = 'text',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getTextStyles = (): TextStyle => {
    const variantStyles = {
      display: {
        fontSize: theme.typography.fontSize.xxxl,
        lineHeight: theme.typography.lineHeight.xxxl,
        fontFamily: theme.typography.fontFamily.bold,
      },
      headline: {
        fontSize: theme.typography.fontSize.xxl,
        lineHeight: theme.typography.lineHeight.xxl,
        fontFamily: theme.typography.fontFamily.semibold,
      },
      title: {
        fontSize: theme.typography.fontSize.xl,
        lineHeight: theme.typography.lineHeight.xl,
        fontFamily: theme.typography.fontFamily.semibold,
      },
      body: {
        fontSize: theme.typography.fontSize.md,
        lineHeight: theme.typography.lineHeight.md,
        fontFamily: theme.typography.fontFamily.regular,
      },
      label: {
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.sm,
        fontFamily: theme.typography.fontFamily.medium,
      },
      caption: {
        fontSize: theme.typography.fontSize.xs,
        lineHeight: theme.typography.lineHeight.xs,
        fontFamily: theme.typography.fontFamily.regular,
      },
    };

    const weightStyles = {
      light: { fontFamily: theme.typography.fontFamily.regular, fontWeight: theme.typography.fontWeight.light },
      regular: { fontFamily: theme.typography.fontFamily.regular, fontWeight: theme.typography.fontWeight.regular },
      medium: { fontFamily: theme.typography.fontFamily.medium, fontWeight: theme.typography.fontWeight.medium },
      semibold: { fontFamily: theme.typography.fontFamily.semibold, fontWeight: theme.typography.fontWeight.semibold },
      bold: { fontFamily: theme.typography.fontFamily.bold, fontWeight: theme.typography.fontWeight.bold },
    };

    const colorStyles = {
      primary: { color: theme.colors.primary },
      secondary: { color: theme.colors.secondary },
      text: { color: theme.colors.text },
      textSecondary: { color: theme.colors.textSecondary },
      textDisabled: { color: theme.colors.textDisabled },
      error: { color: theme.colors.error },
      success: { color: theme.colors.success },
      warning: { color: theme.colors.warning },
    };

    const alignStyles = {
      left: { textAlign: 'left' as const },
      center: { textAlign: 'center' as const },
      right: { textAlign: 'right' as const },
      justify: { textAlign: 'justify' as const },
    };

    return {
      ...variantStyles[variant],
      ...weightStyles[weight],
      ...colorStyles[color],
      ...alignStyles[align],
    };
  };

  return (
    <RNText
      style={[getTextStyles(), style]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default Text;