import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {biometricService, BiometricAuthResult} from './biometricService';
import {authPersistence, AuthTokens, UserSession} from './authPersistence';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: string;
  yearsExperience: number;
  credentials?: any[];
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  token: string;
}

export interface GoogleRegisterData {
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {district: string; region: string};
  yearsExperience: number;
  credentials: any[];
  bio?: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private readonly API_BASE_URL = 'http://localhost:3001'; // TODO: Use environment variable

  constructor() {
    this.configureGoogleSignIn();
  }

  private configureGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: 'YOUR_WEB_CLIENT_ID', // TODO: Replace with actual web client ID
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      const mockUser = {
        id: '1',
        email: credentials.email,
        fullName: 'John Doe',
        verificationStatus: 'verified' as const,
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      // Store tokens and session using new persistence service
      await authPersistence.storeTokens(mockTokens, credentials.email);
      
      const session: UserSession = {
        user: mockUser,
        tokens: mockTokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: mockUser,
        token: mockTokens.accessToken,
      };
    } catch (error) {
      throw new Error('Login failed');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful registration
      const mockUser = {
        id: '1',
        email: userData.email,
        fullName: userData.fullName,
        verificationStatus: 'pending' as const,
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      // Store tokens and session using new persistence service
      await authPersistence.storeTokens(mockTokens, userData.email);
      
      const session: UserSession = {
        user: mockUser,
        tokens: mockTokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: mockUser,
        token: mockTokens.accessToken,
      };
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await authPersistence.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      return await authPersistence.isSessionValid();
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    try {
      const session = await authPersistence.getUserSession();
      return session?.user || null;
    } catch (error) {
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const tokens = await authPersistence.getTokens();
      return tokens?.accessToken || null;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const tokens = await authPersistence.getTokens();
      if (tokens?.refreshToken) {
        const newTokens = await authPersistence.refreshTokens(tokens.refreshToken);
        if (newTokens) {
          const session = await authPersistence.getUserSession();
          if (session) {
            await authPersistence.storeTokens(newTokens, session.user.email);
            return newTokens.accessToken;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Biometric Authentication Methods

  async isBiometricAvailable(): Promise<boolean> {
    const availability = await biometricService.isBiometricAvailable();
    return availability.isAvailable;
  }

  async isBiometricEnabled(): Promise<boolean> {
    return await authPersistence.isBiometricEnabled();
  }

  async enableBiometric(): Promise<{success: boolean; error?: string}> {
    return await authPersistence.enableBiometric();
  }

  async disableBiometric(): Promise<void> {
    try {
      await authPersistence.disableBiometric();
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }

  async authenticateWithBiometric(): Promise<BiometricAuthResult> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled',
        };
      }

      const result = await biometricService.authenticateWithBiometrics(
        'Authenticate to access Teacher Hub'
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async loginWithBiometric(): Promise<AuthResponse | null> {
    try {
      const session = await authPersistence.authenticateWithBiometric();
      
      if (!session) {
        throw new Error('Biometric authentication failed');
      }

      // Update last activity
      await authPersistence.updateLastActivity();

      return {
        user: session.user,
        token: session.tokens.accessToken,
      };
    } catch (error) {
      throw error;
    }
  }

  // Google OAuth Methods

  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.serverAuthCode) {
        throw new Error('Failed to get authorization code from Google');
      }

      // Send authorization code to backend
      const response = await fetch(`${this.API_BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: userInfo.serverAuthCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 202 && data.requiresRegistration) {
          // User needs to complete registration
          throw new Error('REGISTRATION_REQUIRED');
        }
        throw new Error(data.error?.message || 'Google login failed');
      }

      // Store tokens and session
      const tokens: AuthTokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      await authPersistence.storeTokens(tokens, data.data.user.email);
      
      const session: UserSession = {
        user: data.data.user,
        tokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: data.data.user,
        token: tokens.accessToken,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'REGISTRATION_REQUIRED') {
          throw error;
        }
        
        // Handle specific Google Sign-In errors
        if (error.message.includes(statusCodes.SIGN_IN_CANCELLED)) {
          throw new Error('Google sign-in was cancelled');
        } else if (error.message.includes(statusCodes.IN_PROGRESS)) {
          throw new Error('Google sign-in is already in progress');
        } else if (error.message.includes(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
          throw new Error('Google Play Services not available');
        }
      }
      
      throw new Error('Google login failed');
    }
  }

  async registerWithGoogle(userData: GoogleRegisterData): Promise<AuthResponse> {
    try {
      // Get the current Google user info
      const currentUser = await GoogleSignin.getCurrentUser();
      
      if (!currentUser?.serverAuthCode) {
        // If no current user, sign in first
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        
        if (!userInfo.serverAuthCode) {
          throw new Error('Failed to get authorization code from Google');
        }
      }

      const authCode = currentUser?.serverAuthCode || (await GoogleSignin.getCurrentUser())?.serverAuthCode;
      
      if (!authCode) {
        throw new Error('No authorization code available');
      }

      // Create form data for registration
      const formData = new FormData();
      formData.append('code', authCode);
      formData.append('subjects', JSON.stringify(userData.subjects));
      formData.append('gradeLevels', JSON.stringify(userData.gradeLevels));
      formData.append('schoolLocation', JSON.stringify(userData.schoolLocation));
      formData.append('yearsExperience', userData.yearsExperience.toString());
      
      if (userData.bio) {
        formData.append('bio', userData.bio);
      }

      // Add credential files
      userData.credentials.forEach((credential, index) => {
        if (credential.uri) {
          formData.append('credentialDocuments', {
            uri: credential.uri,
            type: credential.type || 'application/pdf',
            name: credential.name || `credential_${index}.pdf`,
          } as any);
        }
      });

      // Add credentials metadata
      const credentialsMetadata = userData.credentials.map(() => ({
        type: 'teaching_license',
        institution: 'To be verified',
        issueDate: new Date(),
        documentUrl: '', // Will be set by backend
      }));
      formData.append('credentials', JSON.stringify(credentialsMetadata));

      // Send registration request
      const response = await fetch(`${this.API_BASE_URL}/auth/google/register`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Google registration failed');
      }

      const data = await response.json();

      // Store tokens and session
      const tokens: AuthTokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      await authPersistence.storeTokens(tokens, data.data.user.email);
      
      const session: UserSession = {
        user: data.data.user,
        tokens,
        lastActivity: Date.now(),
      };
      
      await authPersistence.storeUserSession(session);

      return {
        user: data.data.user,
        token: tokens.accessToken,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Google registration failed');
    }
  }

  async signOutGoogle(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Error signing out from Google:', error);
    }
  }

  async isGoogleSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();