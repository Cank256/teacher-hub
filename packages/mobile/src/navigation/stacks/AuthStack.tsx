import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';
import { LoginScreen, RegisterScreen } from '@/features/auth/screens';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
          headerShown: false, // Custom header in component
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          headerShown: false, // Custom header in component
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={LoginScreen} // Placeholder - will be implemented later
        options={{
          title: 'Reset Password',
        }}
      />
      <Stack.Screen
        name="VerifyCredentials"
        component={LoginScreen} // Placeholder - will be implemented later
        options={{
          title: 'Verify Credentials',
        }}
      />
      <Stack.Screen
        name="BiometricSetup"
        component={LoginScreen} // Placeholder - will be implemented later
        options={{
          title: 'Setup Biometrics',
        }}
      />
    </Stack.Navigator>
  );
};