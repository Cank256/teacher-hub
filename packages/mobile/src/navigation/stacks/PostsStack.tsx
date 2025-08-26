import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PostsStackParamList } from '../types';
import { PostsFeedScreen } from '@/features/posts/screens';

const Stack = createNativeStackNavigator<PostsStackParamList>();

export const PostsStack: React.FC = () => {
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
        name="PostsFeed"
        component={PostsFeedScreen}
        options={{
          title: 'Posts',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostsFeedScreen} // Placeholder - will be implemented later
        options={{
          title: 'Post Details',
        }}
      />
      <Stack.Screen
        name="CreatePost"
        component={PostsFeedScreen} // Placeholder - will be implemented later
        options={{
          title: 'Create Post',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EditPost"
        component={PostsFeedScreen} // Placeholder - will be implemented later
        options={{
          title: 'Edit Post',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};