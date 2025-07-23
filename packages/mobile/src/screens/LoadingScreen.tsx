import React, {useEffect} from 'react';
import {View, Text, ActivityIndicator, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {theme} from '../styles/theme';

interface LoadingScreenProps {
  message?: string;
  onBiometricAuth?: () => void;
  showBiometricPrompt?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading Teacher Hub...',
  onBiometricAuth,
  showBiometricPrompt = false,
}) => {
  useEffect(() => {
    if (showBiometricPrompt && onBiometricAuth) {
      // Automatically trigger biometric authentication when component mounts
      const timer = setTimeout(() => {
        onBiometricAuth();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showBiometricPrompt, onBiometricAuth]);

  return (
    <View style={styles.container}>
      {showBiometricPrompt ? (
        <View style={styles.biometricContainer}>
          <View style={styles.biometricIcon}>
            <Icon name="fingerprint" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.biometricTitle}>Authentication Required</Text>
          <Text style={styles.biometricMessage}>{message}</Text>
          
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={onBiometricAuth}
            testID="biometric-auth-button">
            <Icon name="fingerprint" size={24} color={theme.colors.surface} />
            <Text style={styles.biometricButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.text}>{message}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  text: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  biometricContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  biometricIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  biometricTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  biometricMessage: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    minWidth: 200,
    ...theme.shadows.md,
  },
  biometricButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});