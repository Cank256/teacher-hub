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
import { useAuth } from '@/contexts';
import { authService } from '@/services/auth';
import { AuthStackScreenProps } from '@/navigation/types';
import { AuthError, AuthErrorCode } from '@/services/auth/types';

// Validation schema
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type Props = AuthStackScreenProps<'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await authService.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        subjects: ['1'], // Default subject - will be updated in profile
        gradeLevels: ['1'], // Default grade level - will be updated in profile
        schoolLocation: 'Kampala', // Default location - will be updated in profile
        yearsOfExperience: 0, // Default experience - will be updated in profile
      });

      if (result.success && result.user) {
        login();

        Alert.alert(
          'Registration Successful!',
          'Welcome to Teacher Hub! Please verify your teaching credentials to access all features.',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (result.requiresVerification) {
                  navigation.navigate('VerifyCredentials', { userId: result.user!.id });
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Registration Failed',
          result.error || 'Failed to create your account. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error instanceof AuthError) {
        switch (error.code) {
          case AuthErrorCode.EMAIL_ALREADY_EXISTS:
            errorMessage = 'An account with this email already exists.';
            break;
          case AuthErrorCode.WEAK_PASSWORD:
            errorMessage = 'Password does not meet security requirements.';
            break;
          case AuthErrorCode.NETWORK_ERROR:
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = error.message;
        }
      }

      Alert.alert('Registration Error', errorMessage, [{ text: 'OK', style: 'default' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
      marginBottom: theme.spacing.md,
    },
    nameRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    nameInput: {
      flex: 1,
    },
    termsContainer: {
      marginBottom: theme.spacing.lg,
    },
    registerButton: {
      marginBottom: theme.spacing.lg,
    },
    footer: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    loginText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    loginLink: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.primary,
    },
  });

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
            <Text style={styles.title}>Join Teacher Hub</Text>
            <Text style={styles.subtitle}>
              Create your account and connect with fellow educators across Uganda
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, styles.nameInput]}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="First Name"
                      placeholder="First name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.firstName?.message ?? ''}
                      autoCapitalize="words"
                      required
                      testID="register-first-name-input"
                    />
                  )}
                />
              </View>

              <View style={[styles.inputContainer, styles.nameInput]}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Last Name"
                      placeholder="Last name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.lastName?.message ?? ''}
                      autoCapitalize="words"
                      required
                      testID="register-last-name-input"
                    />
                  )}
                />
              </View>
            </View>

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
                    error={errors.email?.message ?? ''}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    required
                    testID="register-email-input"
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Create a strong password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message ?? ''}
                    secureTextEntry={!showPassword}
                    required
                    rightIcon={
                      <Text style={{ color: theme.colors.primary }}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    }
                    onRightIconPress={togglePasswordVisibility}
                    testID="register-password-input"
                    helperText="Must contain uppercase, lowercase, and number"
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message ?? ''}
                    secureTextEntry={!showConfirmPassword}
                    required
                    rightIcon={
                      <Text style={{ color: theme.colors.primary }}>
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </Text>
                    }
                    onRightIconPress={toggleConfirmPasswordVisibility}
                    testID="register-confirm-password-input"
                  />
                )}
              />
            </View>

            <View style={styles.termsContainer}>
              <Controller
                control={control}
                name="agreeToTerms"
                render={({ field: { onChange, value } }) => (
                  <Button
                    title={`${value ? '✓ ' : ''}I agree to the Terms and Conditions and Privacy Policy`}
                    onPress={() => onChange(!value)}
                    variant={value ? 'primary' : 'outline'}
                    size="small"
                    testID="agree-terms-button"
                  />
                )}
              />
              {errors.agreeToTerms && (
                <Text style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing.xs }}>
                  {errors.agreeToTerms.message}
                </Text>
              )}
            </View>

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.registerButton}
              testID="register-submit-button"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink} onPress={handleLogin}>
                Sign in here
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};