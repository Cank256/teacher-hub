import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { authService } from '@/services/auth';
import { AuthStackScreenProps } from '@/navigation/types';
import { AuthError, AuthErrorCode } from '@/services/auth/types';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

type Props = AuthStackScreenProps<'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const success = await authService.requestPasswordReset(data.email);

      if (success) {
        setSentEmail(data.email);
        setIsEmailSent(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'Request Failed',
          'Failed to send password reset email. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof AuthError) {
        switch (error.code) {
          case AuthErrorCode.USER_NOT_FOUND:
            errorMessage = 'No account found with this email address. Please check your email and try again.';
            break;
          case AuthErrorCode.NETWORK_ERROR:
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }

      Alert.alert('Reset Request Failed', errorMessage, [{ text: 'OK', style: 'default' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendEmail = async () => {
    if (sentEmail) {
      await onSubmit({ email: sentEmail });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    icon: {
      fontSize: 60,
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
    },
    form: {
      marginBottom: theme.spacing.xl,
    },
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    submitButton: {
      marginBottom: theme.spacing.md,
    },
    footer: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    backText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    backLink: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.primary,
    },
    successContainer: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.success + '10',
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.xl,
    },
    successIcon: {
      fontSize: 60,
      marginBottom: theme.spacing.lg,
    },
    successTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.success,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    successText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
      marginBottom: theme.spacing.lg,
    },
    emailText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    instructionsList: {
      alignSelf: 'stretch',
      marginBottom: theme.spacing.xl,
    },
    instructionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    instructionNumber: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.primary,
      marginRight: theme.spacing.md,
      minWidth: 20,
    },
    instructionText: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text,
      lineHeight: theme.typography.lineHeight.md,
    },
    resendContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    resendText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
  });

  if (isEmailSent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successText}>
                We've sent password reset instructions to:
              </Text>
              <Text style={styles.emailText}>{sentEmail}</Text>
            </View>

            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1.</Text>
                <Text style={styles.instructionText}>
                  Check your email inbox (and spam folder) for a message from Teacher Hub
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2.</Text>
                <Text style={styles.instructionText}>
                  Click the "Reset Password" link in the email
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3.</Text>
                <Text style={styles.instructionText}>
                  Follow the instructions to create a new password
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>4.</Text>
                <Text style={styles.instructionText}>
                  Return to the app and sign in with your new password
                </Text>
              </View>
            </View>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                Didn't receive the email? Check your spam folder or
              </Text>
              <Button
                title="Resend Email"
                onPress={handleResendEmail}
                variant="outline"
                size="small"
                loading={isLoading}
                disabled={isLoading}
                testID="resend-email-button"
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.backText}>
                Remember your password?{' '}
                <Text style={styles.backLink} onPress={handleBackToLogin}>
                  Back to Sign In
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="Enter your email address"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    required
                    testID="forgot-password-email-input"
                    accessibilityLabel="Email address input"
                    accessibilityHint="Enter the email address associated with your account"
                  />
                )}
              />
            </View>

            <Button
              title="Send Reset Instructions"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.submitButton}
              testID="send-reset-button"
              accessibilityLabel="Send password reset instructions"
              accessibilityHint="Send password reset email to the entered address"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.backText}>
              Remember your password?{' '}
              <Text style={styles.backLink} onPress={handleBackToLogin}>
                Back to Sign In
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};