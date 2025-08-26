import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FIRST_LAUNCH_KEY = '@first_launch';
const AUTH_TOKEN_KEY = '@auth_token';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if this is the first launch
      const hasLaunchedBefore = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      setIsFirstLaunch(hasLaunchedBefore === null);

      // Check authentication status
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      setIsAuthenticated(!!token);
    } catch (error) {
      console.warn('Failed to check auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      // This is a placeholder implementation
      // In the actual implementation, this would handle real authentication
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, 'dummy_token');
      setIsAuthenticated(true);
    } catch (error) {
      console.warn('Failed to login:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setIsAuthenticated(false);
    } catch (error) {
      console.warn('Failed to logout:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
      setIsFirstLaunch(false);
    } catch (error) {
      console.warn('Failed to complete onboarding:', error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isFirstLaunch,
    isLoading,
    login,
    logout,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};