import React, {useEffect, useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector, useDispatch} from 'react-redux';
import {AppState, AppStateStatus} from 'react-native';
import * as Keychain from 'react-native-keychain';

import {RootState, AppDispatch} from '../store';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {LoadingScreen} from '../screens/LoadingScreen';
import {checkAuthStatus, logoutUser, setLoading} from '../store/slices/authSlice';
import {biometricService} from '../services/auth/biometricService';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Loading: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading, biometric} = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [requiresBiometricAuth, setRequiresBiometricAuth] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle app state changes for security
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground
        if (isAuthenticated && biometric.isEnabled) {
          setRequiresBiometricAuth(true);
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isAuthenticated, biometric.isEnabled]);

  // Initialize authentication state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        dispatch(setLoading(true));
        
        // Check if we have stored credentials
        const credentials = await Keychain.getInternetCredentials('TeacherHub');
        
        if (credentials !== false) {
          // We have stored credentials, check if they're still valid
          await dispatch(checkAuthStatus()).unwrap();
        }
      } catch (error) {
        console.log('Auth initialization error:', error);
        // If there's an error, clear any stored credentials
        await Keychain.resetInternetCredentials('TeacherHub');
      } finally {
        dispatch(setLoading(false));
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Handle biometric authentication requirement
  const handleBiometricAuth = async () => {
    try {
      const result = await biometricService.authenticateWithBiometrics(
        'Authenticate to access Teacher Hub'
      );
      
      if (result.success) {
        setRequiresBiometricAuth(false);
      } else {
        // If biometric auth fails, log out the user
        dispatch(logoutUser());
        setRequiresBiometricAuth(false);
      }
    } catch (error) {
      // If there's an error, log out the user for security
      dispatch(logoutUser());
      setRequiresBiometricAuth(false);
    }
  };

  // Show loading screen during initialization
  if (isInitializing || isLoading) {
    return (
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
      </Stack.Navigator>
    );
  }

  // Show biometric authentication screen if required
  if (requiresBiometricAuth) {
    return (
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen 
          name="Loading" 
          component={() => (
            <LoadingScreen 
              message="Please authenticate to continue"
              onBiometricAuth={handleBiometricAuth}
              showBiometricPrompt={true}
            />
          )} 
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe gestures for security
        animationEnabled: true,
        cardStyleInterpolator: ({current, layouts}) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          };
        },
      }}>
      {isAuthenticated ? (
        <Stack.Screen 
          name="Main" 
          component={MainNavigator}
          options={{
            animationEnabled: true,
          }}
        />
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            animationEnabled: true,
          }}
        />
      )}
    </Stack.Navigator>
  );
};