import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../types';
import { ConversationsListScreen } from '@/features/messaging/screens';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesStack: React.FC = () => {
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
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{
          title: 'Messages',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ConversationsListScreen} // Placeholder - will be implemented later
        options={({ route }) => ({
          title: route.params?.recipientName || 'Chat',
        })}
      />
      <Stack.Screen
        name="NewConversation"
        component={ConversationsListScreen} // Placeholder - will be implemented later
        options={{
          title: 'New Message',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="UserSearch"
        component={ConversationsListScreen} // Placeholder - will be implemented later
        options={{
          title: 'Search Users',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};