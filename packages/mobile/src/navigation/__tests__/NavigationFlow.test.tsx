import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@/contexts';
import { RootNavigator } from '../RootNavigator';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://localhost:8081/${path}`),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Test wrapper component
const TestWrapper: React.FC<{
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
  children?: React.ReactNode;
}> = ({ isAuthenticated, isFirstLaunch, children }) => (
  <NavigationContainer>
    <AuthProvider>
      <RootNavigator
        isAuthenticated={isAuthenticated}
        isFirstLaunch={isFirstLaunch}
      />
      {children}
    </AuthProvider>
  </NavigationContainer>
);

describe('Navigation Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('First Launch Flow', () => {
    it('should show onboarding screen on first launch', () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={false} isFirstLaunch={true} />
      );

      expect(getByText('Welcome to Teacher Hub')).toBeTruthy();
      expect(getByText('Get Started')).toBeTruthy();
    });

    it('should navigate to auth flow after onboarding', async () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={false} isFirstLaunch={true} />
      );

      const getStartedButton = getByText('Get Started');
      fireEvent.press(getStartedButton);

      await waitFor(() => {
        expect(getByText('Welcome Back')).toBeTruthy();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should show login screen when not authenticated', () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={false} isFirstLaunch={false} />
      );

      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should navigate to register screen from login', async () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={false} isFirstLaunch={false} />
      );

      const registerLink = getByText("Don't have an account? Register");
      fireEvent.press(registerLink);

      await waitFor(() => {
        expect(getByText('Register Screen')).toBeTruthy();
      });
    });
  });

  describe('Main App Flow', () => {
    it('should show main tab navigator when authenticated', () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={true} isFirstLaunch={false} />
      );

      // Should show tab bar labels
      expect(getByText('Posts')).toBeTruthy();
      expect(getByText('Communities')).toBeTruthy();
      expect(getByText('Messages')).toBeTruthy();
      expect(getByText('Resources')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
    });

    it('should navigate between tabs', async () => {
      const { getByText } = render(
        <TestWrapper isAuthenticated={true} isFirstLaunch={false} />
      );

      // Default should show Posts
      expect(getByText('Posts Feed')).toBeTruthy();

      // Navigate to Communities
      const communitiesTab = getByText('Communities');
      fireEvent.press(communitiesTab);

      await waitFor(() => {
        expect(getByText('Communities')).toBeTruthy();
      });

      // Navigate to Messages
      const messagesTab = getByText('Messages');
      fireEvent.press(messagesTab);

      await waitFor(() => {
        expect(getByText('Messages')).toBeTruthy();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should not show main app when not authenticated', () => {
      const { queryByText } = render(
        <TestWrapper isAuthenticated={false} isFirstLaunch={false} />
      );

      // Should not show tab bar
      expect(queryByText('Posts')).toBeNull();
      expect(queryByText('Communities')).toBeNull();
      expect(queryByText('Messages')).toBeNull();
      expect(queryByText('Resources')).toBeNull();
      expect(queryByText('Profile')).toBeNull();

      // Should show login instead
      expect(queryByText('Welcome Back')).toBeTruthy();
    });

    it('should show main app only when authenticated', () => {
      const { getByText, queryByText } = render(
        <TestWrapper isAuthenticated={true} isFirstLaunch={false} />
      );

      // Should show tab bar
      expect(getByText('Posts')).toBeTruthy();
      expect(getByText('Communities')).toBeTruthy();
      expect(getByText('Messages')).toBeTruthy();
      expect(getByText('Resources')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();

      // Should not show login
      expect(queryByText('Welcome Back')).toBeNull();
    });
  });
});