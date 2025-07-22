import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DashboardScreen} from '../screens/main/DashboardScreen';
import {ResourcesScreen} from '../screens/main/ResourcesScreen';
import {MessagesScreen} from '../screens/main/MessagesScreen';
import {CommunitiesScreen} from '../screens/main/CommunitiesScreen';
import {ProfileScreen} from '../screens/main/ProfileScreen';
import {theme} from '../styles/theme';

export type MainTabParamList = {
  Dashboard: undefined;
  Resources: undefined;
  Messages: undefined;
  Communities: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ResourceDetail: {resourceId: string};
  MessageDetail: {conversationId: string};
  CommunityDetail: {communityId: string};
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Resources':
              iconName = 'library-books';
              break;
            case 'Messages':
              iconName = 'message';
              break;
            case 'Communities':
              iconName = 'group';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Resources" component={ResourcesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
};