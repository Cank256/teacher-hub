import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { render, createMockUser, createMockApiResponse } from '../../../test/testUtils';
import { AuthService } from '../../../services/auth/authService';
import { MMKVService } from '../../../services/storage/mmkvService';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

// Mock services
jest.mock('../../../services/auth/authService');
jest.mock('../../../services/storage/mmkvService');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockMMKVService = MMKVService as jest.MockedClass<typeof MMKVService>;

describe('Authentication Integration Tests', () => {
  let queryClient: QueryClient;
  let authService: jest.Mocked<AuthService>;
  let storageService: jest.Mocked<MMKVService>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    authService = new mockAuthService() as jest.Mocked<AuthService>;
    storageService = new mockMMKVService() as jest.Mocked<MMKVService>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Login Flow Integration', () => {
    it('should complete successful login flow', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      authService.login.mockResolvedValue(mockAuthResponse);
      storageService.setString.mockResolvedValue();

      const { getByTestId, getByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      // Fill in login form
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      // Wait for login to complete
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify token storage
      expect(storageService.setString).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
      expect(storageService.setString).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
    });

    it('should handle login validation errors', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      const loginButton = getByText('Login');

      // Try to login without filling form
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Email is required')).toBeTruthy();
        expect(queryByText('Password is required')).toBeTruthy();
      });

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should handle login API errors', async () => {
      const mockError = new Error('Invalid credentials');
      authService.login.mockRejectedValue(mockError);

      const { getByTestId, getByText, queryByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Invalid credentials')).toBeTruthy();
      });

      expect(storageService.setString).not.toHaveBeenCalled();
    });

    it('should handle Google OAuth login', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-google-jwt-token',
        refreshToken: 'mock-google-refresh-token',
        expiresIn: 3600,
      };

      authService.loginWithGoogle.mockResolvedValue(mockAuthResponse);
      storageService.setString.mockResolvedValue();

      const { getByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(authService.loginWithGoogle).toHaveBeenCalled();
      });

      expect(storageService.setString).toHaveBeenCalledWith('auth_token', 'mock-google-jwt-token');
    });
  });

  describe('Registration Flow Integration', () => {
    it('should complete successful registration flow', async () => {
      const mockUser = createMockUser({ verificationStatus: 'pending' });
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      authService.register.mockResolvedValue(mockAuthResponse);
      storageService.setString.mockResolvedValue();

      const { getByTestId, getByText } = render(
        <RegisterScreen />,
        { queryClient }
      );

      // Fill in registration form
      const firstNameInput = getByTestId('first-name-input');
      const lastNameInput = getByTestId('last-name-input');
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const registerButton = getByText('Register');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(passwordInput, 'SecurePass123!');
      fireEvent.changeText(confirmPasswordInput, 'SecurePass123!');
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
        });
      });

      expect(storageService.setString).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
    });

    it('should validate password confirmation', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <RegisterScreen />,
        { queryClient }
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const registerButton = getByText('Register');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'differentpassword');
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(queryByText('Passwords do not match')).toBeTruthy();
      });

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('should handle registration API errors', async () => {
      const mockError = new Error('Email already exists');
      authService.register.mockRejectedValue(mockError);

      const { getByTestId, getByText, queryByText } = render(
        <RegisterScreen />,
        { queryClient }
      );

      // Fill form with valid data
      const firstNameInput = getByTestId('first-name-input');
      const lastNameInput = getByTestId('last-name-input');
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const registerButton = getByText('Register');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'SecurePass123!');
      fireEvent.changeText(confirmPasswordInput, 'SecurePass123!');
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(queryByText('Email already exists')).toBeTruthy();
      });

      expect(storageService.setString).not.toHaveBeenCalled();
    });
  });

  describe('Token Management Integration', () => {
    it('should refresh token when expired', async () => {
      const mockUser = createMockUser();
      const mockRefreshResponse = {
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      storageService.getString
        .mockResolvedValueOnce('expired-token')
        .mockResolvedValueOnce('valid-refresh-token');
      
      authService.refreshToken.mockResolvedValue(mockRefreshResponse);
      storageService.setString.mockResolvedValue();

      // Simulate token refresh
      await authService.refreshToken('valid-refresh-token');

      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(storageService.setString).toHaveBeenCalledWith('auth_token', 'new-jwt-token');
      expect(storageService.setString).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
    });

    it('should logout when refresh token is invalid', async () => {
      const mockError = new Error('Invalid refresh token');
      
      storageService.getString.mockResolvedValue('invalid-refresh-token');
      authService.refreshToken.mockRejectedValue(mockError);
      storageService.delete.mockResolvedValue();

      try {
        await authService.refreshToken('invalid-refresh-token');
      } catch (error) {
        // Handle expected error
      }

      // Should clear stored tokens
      expect(storageService.delete).toHaveBeenCalledWith('auth_token');
      expect(storageService.delete).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Biometric Authentication Integration', () => {
    it('should enable biometric authentication after successful login', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      authService.login.mockResolvedValue(mockAuthResponse);
      authService.enableBiometrics.mockResolvedValue(true);
      storageService.setString.mockResolvedValue();
      storageService.setBoolean.mockResolvedValue();

      const { getByTestId, getByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      // Complete login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalled();
      });

      // Enable biometrics
      const enableBiometricsButton = getByText('Enable Biometric Login');
      fireEvent.press(enableBiometricsButton);

      await waitFor(() => {
        expect(authService.enableBiometrics).toHaveBeenCalled();
      });

      expect(storageService.setBoolean).toHaveBeenCalledWith('biometrics_enabled', true);
    });

    it('should authenticate with biometrics', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      storageService.getBoolean.mockResolvedValue(true);
      authService.authenticateWithBiometrics.mockResolvedValue(mockAuthResponse);

      const { getByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      const biometricButton = getByText('Use Biometric Login');
      fireEvent.press(biometricButton);

      await waitFor(() => {
        expect(authService.authenticateWithBiometrics).toHaveBeenCalled();
      });
    });
  });

  describe('Credential Verification Integration', () => {
    it('should upload and verify teaching credentials', async () => {
      const mockCredentialResponse = {
        id: 'credential-123',
        status: 'pending',
        uploadedAt: new Date().toISOString(),
      };

      authService.verifyCredentials.mockResolvedValue(mockCredentialResponse);

      // Mock file picker
      const mockFile = {
        uri: 'file://path/to/credential.pdf',
        type: 'application/pdf',
        name: 'teaching-certificate.pdf',
        size: 1024000,
      };

      const { getByText, getByTestId } = render(
        <RegisterScreen />,
        { queryClient }
      );

      // Navigate to credential verification step
      const nextButton = getByText('Next');
      fireEvent.press(nextButton);

      // Upload credential
      const uploadButton = getByText('Upload Teaching Certificate');
      fireEvent.press(uploadButton);

      // Simulate file selection
      const fileInput = getByTestId('file-input');
      fireEvent(fileInput, 'onFileSelect', mockFile);

      const submitButton = getByText('Submit for Verification');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(authService.verifyCredentials).toHaveBeenCalledWith([mockFile]);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from network errors during login', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      // First call fails with network error, second succeeds
      authService.login
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAuthResponse);

      const { getByTestId, getByText, queryByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(queryByText('Network error')).toBeTruthy();
      });

      // Retry login
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('State Persistence Integration', () => {
    it('should restore authentication state on app restart', async () => {
      const mockUser = createMockUser();
      
      storageService.getString
        .mockResolvedValueOnce('stored-jwt-token')
        .mockResolvedValueOnce('stored-refresh-token');
      
      authService.validateToken.mockResolvedValue(mockUser);

      // Simulate app restart
      const { queryByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      await waitFor(() => {
        expect(authService.validateToken).toHaveBeenCalledWith('stored-jwt-token');
      });

      // Should not show login form if token is valid
      expect(queryByText('Login')).toBeNull();
    });

    it('should clear invalid tokens on app restart', async () => {
      storageService.getString
        .mockResolvedValueOnce('invalid-jwt-token')
        .mockResolvedValueOnce('invalid-refresh-token');
      
      authService.validateToken.mockRejectedValue(new Error('Invalid token'));
      storageService.delete.mockResolvedValue();

      const { queryByText } = render(
        <LoginScreen />,
        { queryClient }
      );

      await waitFor(() => {
        expect(storageService.delete).toHaveBeenCalledWith('auth_token');
        expect(storageService.delete).toHaveBeenCalledWith('refresh_token');
      });

      // Should show login form
      expect(queryByText('Login')).toBeTruthy();
    });
  });
});