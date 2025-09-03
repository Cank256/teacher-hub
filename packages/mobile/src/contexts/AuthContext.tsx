import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, initializeAuthServices } from '@/services/auth';
import { User, VerificationStatus } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
  isLoading: boolean;
  user: User | null;
  verificationStatus: VerificationStatus;
  login: () => void;
  logout: () => void;
  completeOnboarding: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FIRST_LAUNCH_KEY = '@first_launch';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(VerificationStatus.PENDING);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Starting auth initialization...');
      
      // Check if this is the first launch (this should always work)
      try {
        const hasLaunchedBefore = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        setIsFirstLaunch(hasLaunchedBefore === null);
        console.log('First launch check completed:', hasLaunchedBefore === null);
      } catch (error) {
        console.warn('Failed to check first launch, defaulting to true:', error);
        setIsFirstLaunch(true);
      }

      // Try to initialize auth services with timeout
      try {
        console.log('Initializing auth services...');
        const initPromise = initializeAuthServices();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        console.log('Auth services initialized successfully');

        // Check authentication status
        const isAuth = await authService.isAuthenticated();
        setIsAuthenticated(isAuth);
        console.log('Authentication status:', isAuth);

        if (isAuth) {
          // Get current user
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          
          if (currentUser) {
            setVerificationStatus(currentUser.verificationStatus);
          }
          console.log('Current user loaded:', currentUser?.email);
        }
      } catch (error) {
        console.warn('Auth services initialization failed, using offline mode:', error);
        // Set default values for offline mode
        setIsAuthenticated(false);
        setUser(null);
        setVerificationStatus(VerificationStatus.PENDING);
      }
    } catch (error) {
      console.error('Critical auth initialization error:', error);
      // Ensure we always set safe defaults
      setIsAuthenticated(false);
      setUser(null);
      setVerificationStatus(VerificationStatus.PENDING);
      setIsFirstLaunch(true);
    } finally {
      console.log('Auth initialization completed');
      setIsLoading(false);
    }
  };

  const login = () => {
    // This is called after successful authentication in the auth screens
    // The actual authentication is handled by the auth service
    setIsAuthenticated(true);
    refreshUser();
  };

  const logout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setVerificationStatus(VerificationStatus.PENDING);
    } catch (error) {
      console.warn('Failed to logout:', error);
      // Force logout even if API call fails
      setIsAuthenticated(false);
      setUser(null);
      setVerificationStatus(VerificationStatus.PENDING);
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

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        setVerificationStatus(currentUser.verificationStatus);
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isFirstLaunch,
    isLoading,
    user,
    verificationStatus,
    login,
    logout,
    completeOnboarding,
    refreshUser,
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