import {Platform} from 'react-native';
import TouchID from 'react-native-touch-id';
import ReactNativeBiometrics from 'react-native-biometrics';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType?: string;
  error?: string;
}

class BiometricService {
  private rnBiometrics = new ReactNativeBiometrics();

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAvailable(): Promise<BiometricAvailability> {
    try {
      if (Platform.OS === 'ios') {
        const biometryType = await TouchID.isSupported();
        return {
          isAvailable: true,
          biometryType: biometryType as string,
        };
      } else {
        const {available, biometryType} = await this.rnBiometrics.isSensorAvailable();
        return {
          isAvailable: available,
          biometryType,
        };
      }
    } catch (error) {
      return {
        isAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Authenticate user using biometric authentication
   */
  async authenticateWithBiometrics(
    reason: string = 'Authenticate to access Teacher Hub',
  ): Promise<BiometricAuthResult> {
    try {
      const availability = await this.isBiometricAvailable();
      
      if (!availability.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      if (Platform.OS === 'ios') {
        await TouchID.authenticate(reason, {
          showErrorAlert: true,
          fallbackLabel: 'Use Passcode',
        });
        return {
          success: true,
          biometryType: availability.biometryType,
        };
      } else {
        const {success} = await this.rnBiometrics.simplePrompt({
          promptMessage: reason,
          cancelButtonText: 'Cancel',
        });
        
        return {
          success,
          biometryType: availability.biometryType,
        };
      }
    } catch (error) {
      let errorMessage = 'Authentication failed';
      
      if (error instanceof Error) {
        switch (error.message) {
          case 'UserCancel':
          case 'UserFallback':
            errorMessage = 'Authentication was cancelled';
            break;
          case 'BiometryNotAvailable':
            errorMessage = 'Biometric authentication is not available';
            break;
          case 'BiometryNotEnrolled':
            errorMessage = 'No biometric data is enrolled';
            break;
          case 'BiometryLockout':
            errorMessage = 'Biometric authentication is locked out';
            break;
          default:
            errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create biometric keys for secure storage
   */
  async createBiometricKeys(): Promise<{success: boolean; publicKey?: string}> {
    try {
      const {keysExist} = await this.rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        const {publicKey} = await this.rnBiometrics.createKeys();
        return {success: true, publicKey};
      }
      
      return {success: true};
    } catch (error) {
      return {success: false};
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteBiometricKeys(): Promise<boolean> {
    try {
      const {keysDeleted} = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a biometric signature for secure operations
   */
  async createBiometricSignature(
    payload: string,
    promptMessage: string = 'Sign in to Teacher Hub',
  ): Promise<{success: boolean; signature?: string}> {
    try {
      const {success, signature} = await this.rnBiometrics.createSignature({
        promptMessage,
        payload,
        cancelButtonText: 'Cancel',
      });

      return {success, signature};
    } catch (error) {
      return {success: false};
    }
  }
}

export const biometricService = new BiometricService();