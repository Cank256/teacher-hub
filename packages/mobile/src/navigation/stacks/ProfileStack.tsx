import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../types';
import { ProfileViewScreen } from '@/features/profile/screens';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
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
        name="ProfileView"
        component={ProfileViewScreen}
        options={{
          title: 'Profile',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={ProfileViewScreen} // Placeholder - will be implemented later
        options={{
          title: 'Edit Profile',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={ProfileViewScreen} // Placeholder - will be implemented later
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="VerificationStatus"
        component={ProfileViewScreen} // Placeholder - will be implemented later
        options={{
          title: 'Verification Status',
        }}
      />
      <Stack.Screen
        name="OfflineContent"
        component={ProfileViewScreen} // Placeholder - will be implemented later
        options={{
          title: 'Offline Content',
        }}
      />
    </Stack.Navigator>
  );
};