import React, {useState} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {loginWithGoogle} from '../../store/slices/authSlice';

interface GoogleSignInButtonProps {
  onRegistrationRequired?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onRegistrationRequired,
  onError,
  disabled = false,
  style,
  textStyle,
}) => {
  const dispatch = useAppDispatch();
  const {isLoading} = useAppSelector(state => state.auth);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading || isGoogleLoading) {
      return;
    }

    setIsGoogleLoading(true);

    try {
      const result = await dispatch(loginWithGoogle());

      if (loginWithGoogle.rejected.match(result)) {
        const error = result.error.message;

        if (error === 'REGISTRATION_REQUIRED') {
          if (onRegistrationRequired) {
            onRegistrationRequired();
          } else {
            Alert.alert(
              'Registration Required',
              'Please complete your teacher profile to continue.',
              [{text: 'OK'}]
            );
          }
        } else {
          const errorMessage = error || 'Google sign-in failed';
          if (onError) {
            onError(errorMessage);
          } else {
            Alert.alert('Sign-in Failed', errorMessage, [{text: 'OK'}]);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      if (onError) {
        onError(errorMessage);
      } else {
        Alert.alert('Sign-in Failed', errorMessage, [{text: 'OK'}]);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isButtonDisabled = disabled || isLoading || isGoogleLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isButtonDisabled && styles.buttonDisabled,
        style,
      ]}
      onPress={handleGoogleSignIn}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
      accessibilityLabel="Sign in with Google"
      accessibilityRole="button"
      accessibilityState={{disabled: isButtonDisabled}}>
      <View style={styles.buttonContent}>
        {isGoogleLoading ? (
          <ActivityIndicator size="small" color="#4285F4" style={styles.icon} />
        ) : (
          <View style={styles.googleIcon}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
        )}
        <Text style={[styles.buttonText, textStyle]}>
          {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
});