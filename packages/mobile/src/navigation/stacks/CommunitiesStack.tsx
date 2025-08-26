import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CommunitiesStackParamList } from '../types';
import { CommunitiesListScreen } from '@/features/communities/screens';

const Stack = createNativeStackNavigator<CommunitiesStackParamList>();

export const CommunitiesStack: React.FC = () => {
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
        name="CommunitiesList"
        component={CommunitiesListScreen}
        options={{
          title: 'Communities',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="CommunityDetail"
        component={CommunitiesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Community',
        }}
      />
      <Stack.Screen
        name="CommunityPosts"
        component={CommunitiesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Community Posts',
        }}
      />
      <Stack.Screen
        name="CommunityMembers"
        component={CommunitiesListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Members',
        }}
      />
    </Stack.Navigator>
  );
};