import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Platform, Dimensions} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DashboardScreen} from '../screens/main/DashboardScreen';
import {ResourcesScreen} from '../screens/main/ResourcesScreen';
import {MessagesScreen} from '../screens/main/MessagesScreen';
import {CommunitiesScreen} from '../screens/main/CommunitiesScreen';
import {ProfileScreen} from '../screens/main/ProfileScreen';
import {theme} from '../styles/theme';

const {width} = Dimensions.get('window');

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
  const isTablet = width > 768;
  
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

          return <Icon name={iconName} size={focused ? size + 2 : size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? (isTablet ? 70 : 85) : 60,
          paddingBottom: Platform.OS === 'ios' ? (isTablet ? 10 : 25) : 10,
          paddingTop: 10,
          ...theme.shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 14 : 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        headerShown: false,
        // Enable swipe gestures between tabs
        swipeEnabled: true,
        tabBarHideOnKeyboard: true,
      })}>
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarTestID: 'dashboard-tab',
        }}
      />
      <Tab.Screen 
        name="Resources" 
        component={ResourcesScreen}
        options={{
          tabBarTestID: 'resources-tab',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarTestID: 'messages-tab',
        }}
      />
      <Tab.Screen 
        name="Communities" 
        component={CommunitiesScreen}
        options={{
          tabBarTestID: 'communities-tab',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarTestID: 'profile-tab',
        }}
      />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
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
            },
          };
        },
      }}>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{
          gestureEnabled: false, // Disable gesture for main tabs
        }}
      />
      {/* Additional stack screens would be added here */}
    </Stack.Navigator>
  );
};