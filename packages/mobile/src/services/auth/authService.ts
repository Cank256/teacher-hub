import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

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

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: credentials.email,
          fullName: 'John Doe',
          verificationStatus: 'verified',
        },
        token: 'mock_jwt_token_' + Date.now(),
      };

      // Store token securely
      await Keychain.setInternetCredentials(
        'TeacherHub',
        credentials.email,
        mockResponse.token
      );

      // Store user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(mockResponse.user));

      return mockResponse;
    } catch (error) {
      throw new Error('Login failed');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful registration
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: userData.email,
          fullName: userData.fullName,
          verificationStatus: 'pending',
        },
        token: 'mock_jwt_token_' + Date.now(),
      };

      // Store token securely
      await Keychain.setInternetCredentials(
        'TeacherHub',
        userData.email,
        mockResponse.token
      );

      // Store user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(mockResponse.user));

      return mockResponse;
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      // Remove token from keychain
      await Keychain.resetInternetCredentials('TeacherHub');
      
      // Remove user data
      await AsyncStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials('TeacherHub');
      return credentials !== false;
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('TeacherHub');
      return credentials !== false ? credentials.password : null;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      // In a real app, this would call the refresh token endpoint
      const currentToken = await this.getToken();
      if (currentToken) {
        const newToken = 'refreshed_' + currentToken;
        const credentials = await Keychain.getInternetCredentials('TeacherHub');
        if (credentials !== false) {
          await Keychain.setInternetCredentials(
            'TeacherHub',
            credentials.username,
            newToken
          );
        }
        return newToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();