import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ResourcesStackParamList } from '../types';
import { ResourcesListScreen } from '@/features/resources/screens';

const Stack = createNativeStackNavigator<ResourcesStackParamList>();

export const ResourcesStack: React.FC = () => {
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
        name="ResourcesList"
        component={ResourcesListScreen}
        options={{
          title: 'Resources',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="ResourceDetail"
        component={ResourcesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Resource Details',
        }}
      />
      <Stack.Screen
        name="UploadResource"
        component={ResourcesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Upload Resource',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="VideoPlayer"
        component={ResourcesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Video Player',
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
};