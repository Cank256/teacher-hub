import React, { useState, useEffect } from 'react';
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
import { authService, biometricService } from '@/services/auth';
import { AuthStackScreenProps } from '@/navigation/types';
import { AuthError, AuthErrorCode } from '@/services/auth/types';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

type Props = AuthStackScreenProps<'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onChange',
  });

  const rememberMe = watch('rememberMe');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const isEnabled = await biometricService.isBiometricEnabled();
      const capabilities = await biometricService.getBiometricCapabilities();
      setIsBiometricAvailable(isEnabled && capabilities.isAvailable && capabilities.isEnrolled);
    } catch (error) {
      console.warn('Failed to check biometric availability:', error);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await authService.login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      if (result.success && result.user) {
        // Update auth context
        login();
        
        // Navigate based on verification status
        if (result.requiresVerification) {
          navigation.navigate('VerifyCredentials', { userId: result.user.id });
        }
        // Navigation to main app will be handled by auth state change
      } else {
        Alert.alert(
          'Login Failed',
          result.error || 'Please check your credentials and try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof AuthError) {
        switch (error.code) {
          case AuthErrorCode.INVALID_CREDENTIALS:
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          case AuthErrorCode.USER_NOT_FOUND:
            errorMessage = 'No account found with this email address.';
            break;
          case AuthErrorCode.NETWORK_ERROR:
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }

      Alert.alert('Login Error', errorMessage, [{ text: 'OK', style: 'default' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await authService.loginWithGoogle();

      if (result.success && result.user) {
        // Update auth context
        login();
        
        // Navigate based on verification status
        if (result.requiresVerification) {
          navigation.navigate('VerifyCredentials', { userId: result.user.id });
        }
        // Navigation to main app will be handled by auth state change
      } else {
        Alert.alert(
          'Google Login Failed',
          result.error || 'Failed to sign in with Google. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Google login error:', error);
      
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (error instanceof AuthError && error.code === AuthErrorCode.GOOGLE_AUTH_FAILED) {
        errorMessage = 'Google authentication was cancelled or failed.';
      }

      Alert.alert('Google Login Error', errorMessage, [{ text: 'OK', style: 'default' }]);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await authService.authenticateWithBiometrics();

      if (result.success) {
        // Update auth context
        login();
        // Navigation to main app will be handled by auth state change
      } else if (!result.cancelled) {
        Alert.alert(
          'Biometric Authentication Failed',
          result.error || 'Biometric authentication failed. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert(
        'Biometric Error',
        'Biometric authentication failed. Please use your password instead.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    rememberMeText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end',
      marginBottom: theme.spacing.lg,
    },
    forgotPasswordText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.primary,
    },
    loginButton: {
      marginBottom: theme.spacing.md,
    },
    biometricButton: {
      marginBottom: theme.spacing.lg,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      marginHorizontal: theme.spacing.md,
    },
    googleButton: {
      marginBottom: theme.spacing.lg,
    },
    footer: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    registerText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    registerLink: {
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to Teacher Hub and connect with fellow educators
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
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    required
                    testID="login-email-input"
                    accessibilityLabel="Email address input"
                    accessibilityHint="Enter your registered email address"
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
                    placeholder="Enter your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    required
                    rightIcon={
                      <Text style={{ color: theme.colors.primary }}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    }
                    onRightIconPress={togglePasswordVisibility}
                    testID="login-password-input"
                    accessibilityLabel="Password input"
                    accessibilityHint="Enter your account password"
                  />
                )}
              />
            </View>

            <View style={styles.rememberMeContainer}>
              <Controller
                control={control}
                name="rememberMe"
                render={({ field: { onChange, value } }) => (
                  <Button
                    title={value ? '✓ Remember me' : 'Remember me'}
                    onPress={() => onChange(!value)}
                    variant="ghost"
                    size="small"
                    testID="remember-me-button"
                    accessibilityLabel="Remember me checkbox"
                    accessibilityHint="Keep me signed in on this device"
                  />
                )}
              />
              
              <Button
                title="Forgot Password?"
                onPress={handleForgotPassword}
                variant="ghost"
                size="small"
                style={styles.forgotPasswordButton}
                testID="forgot-password-button"
                accessibilityLabel="Forgot password"
                accessibilityHint="Reset your password"
              />
            </View>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.loginButton}
              testID="login-submit-button"
              accessibilityLabel="Sign in"
              accessibilityHint="Sign in to your account"
            />

            {isBiometricAvailable && (
              <Button
                title="Sign In with Biometrics"
                onPress={handleBiometricLogin}
                variant="outline"
                style={styles.biometricButton}
                testID="biometric-login-button"
                accessibilityLabel="Sign in with biometrics"
                accessibilityHint="Use fingerprint or face recognition to sign in"
              />
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="outline"
            loading={isGoogleLoading}
            disabled={isGoogleLoading}
            style={styles.googleButton}
            testID="google-login-button"
            accessibilityLabel="Sign in with Google"
            accessibilityHint="Use your Google account to sign in"
          />

          <View style={styles.footer}>
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerLink} onPress={handleRegister}>
                Register here
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};