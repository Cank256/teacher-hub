import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthStack } from './stacks';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '@/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({
  isAuthenticated,
  isFirstLaunch,
}) => {
  // Determine initial route based on authentication and first launch status
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (isFirstLaunch) {
      return 'Onboarding';
    }
    return isAuthenticated ? 'Main' : 'Auth';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* Onboarding Screen */}
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* Authentication Flow */}
      <Stack.Screen
        name="Auth"
        component={AuthStack}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* Main App Flow (Protected) */}
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* Modal Screens */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="Modal"
          component={ModalScreen}
          options={{
            headerShown: true,
            title: 'Modal',
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

// Placeholder modal screen component
const ModalScreen: React.FC = () => {
  return null; // Will be implemented when modal functionality is needed
};