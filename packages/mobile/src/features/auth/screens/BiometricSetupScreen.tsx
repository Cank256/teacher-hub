import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { authService, biometricService } from '@/services/auth';
import { AuthStackScreenProps } from '@/navigation/types';
import { BiometricCapabilities, BiometricType } from '@/services/auth/types';

type Props = AuthStackScreenProps<'BiometricSetup'>;

export const BiometricSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { userId } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      const caps = await authService.getBiometricCapabilities();
      setCapabilities(caps);
      
      // Check if biometrics are already enabled
      const isEnabled = await biometricService.isBiometricEnabled();
      setIsSetupComplete(isEnabled);
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
    }
  };

  const enableBiometrics = async () => {
    if (isLoading) return;

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const success = await authService.enableBiometrics();
      
      if (success) {
        setIsSetupComplete(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          'Biometric Authentication Enabled!',
          'You can now use your fingerprint or face recognition to sign in quickly and securely.',
          [
            {
              text: 'Great!',
              onPress: () => {
                // Navigate to main app
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Setup Failed',
          'Failed to enable biometric authentication. You can set this up later in your profile settings.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      
      Alert.alert(
        'Setup Error',
        'An error occurred while setting up biometric authentication. You can try again later in your profile settings.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const skipBiometrics = () => {
    Alert.alert(
      'Skip Biometric Setup?',
      'You can enable biometric authentication later in your profile settings for faster and more secure sign-ins.',
      [
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
        {
          text: 'Set Up Now',
          style: 'cancel',
        },
      ]
    );
  };

  const continueToApp = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const getBiometricTypeText = () => {
    if (!capabilities?.supportedTypes.length) return 'biometric authentication';
    
    const types = capabilities.supportedTypes;
    if (types.includes(BiometricType.FACE_ID)) {
      return 'Face ID';
    } else if (types.includes(BiometricType.FINGERPRINT)) {
      return 'fingerprint';
    } else {
      return 'biometric authentication';
    }
  };

  const getBiometricIcon = () => {
    if (!capabilities?.supportedTypes.length) return '🔐';
    
    const types = capabilities.supportedTypes;
    if (types.includes(BiometricType.FACE_ID)) {
      return '👤';
    } else if (types.includes(BiometricType.FINGERPRINT)) {
      return '👆';
    } else {
      return '🔐';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
    },
    icon: {
      fontSize: 80,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: theme.typography.lineHeight.lg,
    },
    description: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
      marginBottom: theme.spacing.xl,
    },
    benefitsList: {
      alignSelf: 'stretch',
      marginBottom: theme.spacing.xl,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    benefitIcon: {
      fontSize: 20,
      marginRight: theme.spacing.md,
    },
    benefitText: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text,
      lineHeight: theme.typography.lineHeight.md,
    },
    buttonContainer: {
      alignSelf: 'stretch',
      gap: theme.spacing.md,
    },
    enableButton: {
      marginBottom: theme.spacing.md,
    },
    unavailableContainer: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.xl,
    },
    unavailableIcon: {
      fontSize: 60,
      marginBottom: theme.spacing.lg,
    },
    unavailableTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    unavailableText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
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
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
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
    },
  });

  // If biometrics are not available
  if (capabilities && !capabilities.isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableIcon}>📱</Text>
            <Text style={styles.unavailableTitle}>Biometric Authentication Unavailable</Text>
            <Text style={styles.unavailableText}>
              Your device doesn't support biometric authentication or it's not set up. 
              You can still use your password to sign in securely.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Continue to App"
              onPress={continueToApp}
              testID="continue-to-app-button"
            />
          </View>
        </View>
      </View>
    );
  }

  // If biometrics are not enrolled
  if (capabilities && !capabilities.isEnrolled) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableIcon}>⚙️</Text>
            <Text style={styles.unavailableTitle}>Biometric Authentication Not Set Up</Text>
            <Text style={styles.unavailableText}>
              Please set up {getBiometricTypeText()} in your device settings first, 
              then return to enable it for Teacher Hub.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Continue to App"
              onPress={continueToApp}
              testID="continue-to-app-button"
            />
          </View>
        </View>
      </View>
    );
  }

  // If biometrics are already set up
  if (isSetupComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Biometric Authentication Enabled!</Text>
            <Text style={styles.successText}>
              You can now use {getBiometricTypeText()} to sign in quickly and securely.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Continue to App"
              onPress={continueToApp}
              testID="continue-to-app-button"
            />
          </View>
        </View>
      </View>
    );
  }

  // Main biometric setup screen
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{getBiometricIcon()}</Text>
        
        <Text style={styles.title}>Enable {getBiometricTypeText()}</Text>
        
        <Text style={styles.subtitle}>
          Sign in faster and more securely
        </Text>
        
        <Text style={styles.description}>
          Use your {getBiometricTypeText()} to sign in to Teacher Hub quickly and securely 
          without having to enter your password every time.
        </Text>

        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={styles.benefitText}>Faster sign-in experience</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <Text style={styles.benefitText}>Enhanced security for your account</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🛡️</Text>
            <Text style={styles.benefitText}>Your biometric data stays on your device</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>📱</Text>
            <Text style={styles.benefitText}>Works seamlessly with your device security</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={`Enable ${getBiometricTypeText()}`}
            onPress={enableBiometrics}
            loading={isLoading}
            disabled={isLoading}
            style={styles.enableButton}
            testID="enable-biometrics-button"
          />
          
          <Button
            title="Skip for Now"
            onPress={skipBiometrics}
            variant="outline"
            testID="skip-biometrics-button"
          />
        </View>
      </View>
    </View>
  );
};