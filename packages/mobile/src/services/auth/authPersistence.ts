import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {biometricService} from './biometricService';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    fullName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  tokens: AuthTokens;
  lastActivity: number;
}

class AuthPersistenceService {
  private readonly KEYCHAIN_SERVICE = 'TeacherHub';
  private readonly USER_SESSION_KEY = 'user_session';
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Store authentication tokens securely in keychain
   */
  async storeTokens(tokens: AuthTokens, email: string): Promise<boolean> {
    try {
      const tokenData = JSON.stringify(tokens);
      
      await Keychain.setInternetCredentials(
        this.KEYCHAIN_SERVICE,
        email,
        tokenData,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          accessGroup: 'group.teacherhub.auth',
          storage: Keychain.STORAGE_TYPE.KC,
        }
      );
      
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve authentication tokens from keychain
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.KEYCHAIN_SERVICE);
      
      if (credentials === false) {
        return null;
      }

      const tokens: AuthTokens = JSON.parse(credentials.password);
      
      // Check if tokens are expired
      if (tokens.expiresAt < Date.now()) {
        await this.clearTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication tokens
   */
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials(this.KEYCHAIN_SERVICE);
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * Store user session data
   */
  async storeUserSession(session: UserSession): Promise<boolean> {
    try {
      const sessionData = JSON.stringify({
        ...session,
        lastActivity: Date.now(),
      });
      
      await AsyncStorage.setItem(this.USER_SESSION_KEY, sessionData);
      return true;
    } catch (error) {
      console.error('Failed to store user session:', error);
      return false;
    }
  }

  /**
   * Retrieve user session data
   */
  async getUserSession(): Promise<UserSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(this.USER_SESSION_KEY);
      
      if (!sessionData) {
        return null;
      }

      const session: UserSession = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
        await this.clearUserSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to retrieve user session:', error);
      return null;
    }
  }

  /**
   * Clear user session data
   */
  async clearUserSession(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.USER_SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear user session:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(): Promise<boolean> {
    try {
      const session = await this.getUserSession();
      
      if (session) {
        session.lastActivity = Date.now();
        return await this.storeUserSession(session);
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update last activity:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<{success: boolean; error?: string}> {
    try {
      const availability = await biometricService.isBiometricAvailable();
      
      if (!availability.isAvailable) {
        return {
          success: false,
          error: availability.error || 'Biometric authentication is not available',
        };
      }

      // Test biometric authentication
      const authResult = await biometricService.authenticateWithBiometrics(
        'Enable biometric authentication for Teacher Hub'
      );

      if (authResult.success) {
        await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');
        await biometricService.createBiometricKeys();
        return {success: true};
      } else {
        return {
          success: false,
          error: authResult.error || 'Biometric authentication failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'false');
      await biometricService.deleteBiometricKeys();
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric and retrieve session
   */
  async authenticateWithBiometric(): Promise<UserSession | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      
      if (!isEnabled) {
        throw new Error('Biometric authentication is not enabled');
      }

      const authResult = await biometricService.authenticateWithBiometrics(
        'Authenticate to access Teacher Hub'
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // If biometric auth succeeds, get stored session
      const session = await this.getUserSession();
      
      if (session) {
        // Update last activity
        await this.updateLastActivity();
        return session;
      }

      throw new Error('No stored session found');
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // In a real app, this would call the refresh token endpoint
      // For now, we'll simulate token refresh
      const newTokens: AuthTokens = {
        accessToken: 'new_access_token_' + Date.now(),
        refreshToken: 'new_refresh_token_' + Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      return newTokens;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return null;
    }
  }

  /**
   * Check if current session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const session = await this.getUserSession();
      const tokens = await this.getTokens();
      
      return session !== null && tokens !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete logout - clear all stored data
   */
  async logout(): Promise<boolean> {
    try {
      await Promise.all([
        this.clearTokens(),
        this.clearUserSession(),
        this.disableBiometric(),
      ]);
      
      return true;
    } catch (error) {
      console.error('Failed to complete logout:', error);
      return false;
    }
  }

  /**
   * Migrate old authentication data to new format
   */
  async migrateAuthData(): Promise<boolean> {
    try {
      // Check if we have old format data and migrate it
      const oldCredentials = await Keychain.getInternetCredentials('TeacherHub_old');
      
      if (oldCredentials !== false) {
        // Migrate to new format
        const tokens: AuthTokens = {
          accessToken: oldCredentials.password,
          refreshToken: 'migrated_refresh_token',
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };
        
        await this.storeTokens(tokens, oldCredentials.username);
        await Keychain.resetInternetCredentials('TeacherHub_old');
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to migrate auth data:', error);
      return false;
    }
  }
}

export const authPersistence = new AuthPersistenceService();