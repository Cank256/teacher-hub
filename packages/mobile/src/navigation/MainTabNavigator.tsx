import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';
import type { MainTabParamList } from './types';
import {
  PostsStack,
  CommunitiesStack,
  MessagesStack,
  ResourcesStack,
  ProfileStack,
} from './stacks';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: Platform.OS === 'ios' ? 0 : 8,
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          height: Platform.OS === 'ios' ? 83 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tab.Screen
        name="Posts"
        component={PostsStack}
        options={{
          tabBarLabel: 'Posts',
          tabBarIcon: ({ color, size }) => (
            // Placeholder icon - will be replaced with proper icons later
            <TabIcon name="posts" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Communities"
        component={CommunitiesStack}
        options={{
          tabBarLabel: 'Communities',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="communities" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="messages" color={color} size={size} />
          ),
          tabBarBadge: undefined, // Will be set dynamically based on unread count
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ResourcesStack}
        options={{
          tabBarLabel: 'Resources',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="resources" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="profile" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Placeholder tab icon component - will be replaced with proper icon library later
interface TabIconProps {
  name: string;
  color: string;
  size: number;
}

const TabIcon: React.FC<TabIconProps> = ({ name, color, size }) => {
  // This is a placeholder implementation
  // In the actual implementation, this would use a proper icon library like react-native-vector-icons
  const iconMap: Record<string, string> = {
    posts: '📝',
    communities: '👥',
    messages: '💬',
    resources: '📚',
    profile: '👤',
  };

  return (
    <Text style={{ fontSize: size, color }}>
      {iconMap[name] || '?'}
    </Text>
  );
};