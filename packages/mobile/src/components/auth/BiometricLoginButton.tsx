import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootState, AppDispatch} from '../../store';
import {loginWithBiometric} from '../../store/slices/authSlice';
import {theme} from '../../styles/theme';

interface BiometricLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {biometric, isLoading} = useSelector((state: RootState) => state.auth);

  const handleBiometricLogin = async () => {
    try {
      const result = await dispatch(loginWithBiometric()).unwrap();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Biometric login failed';
      onError?.(errorMessage);
      Alert.alert('Authentication Failed', errorMessage);
    }
  };

  if (!biometric.isAvailable || !biometric.isEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Or use biometric authentication</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleBiometricLogin}
        disabled={isLoading}
        testID="biometric-login-button">
        <Icon
          name="fingerprint"
          size={32}
          color={theme.colors.primary}
        />
        <Text style={styles.buttonText}>
          {isLoading ? 'Authenticating...' : 'Use Biometric'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 120,
    ...theme.shadows.sm,
  },
  buttonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
});