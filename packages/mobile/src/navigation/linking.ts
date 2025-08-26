import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';

// Define the URL scheme for the app
const prefix = Linking.createURL('/');

// Deep linking configuration
export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'teacherhub://', 'https://teacherhub.ug', 'https://app.teacherhub.ug'],
  
  config: {
    screens: {
      Onboarding: 'onboarding',
      
      Auth: {
        screens: {
          Login: 'auth/login',
          Register: 'auth/register',
          ForgotPassword: 'auth/forgot-password',
          VerifyCredentials: 'auth/verify/:userId',
          BiometricSetup: 'auth/biometric-setup/:userId',
        },
      },
      
      Main: {
        screens: {
          Posts: {
            screens: {
              PostsFeed: 'posts',
              PostDetail: 'posts/:postId',
              CreatePost: 'posts/create',
              EditPost: 'posts/:postId/edit',
            },
          },
          
          Communities: {
            screens: {
              CommunitiesList: 'communities',
              CommunityDetail: 'communities/:communityId',
              CommunityPosts: 'communities/:communityId/posts',
              CommunityMembers: 'communities/:communityId/members',
            },
          },
          
          Messages: {
            screens: {
              ConversationsList: 'messages',
              Chat: 'messages/:conversationId',
              NewConversation: 'messages/new',
              UserSearch: 'messages/search',
            },
          },
          
          Resources: {
            screens: {
              ResourcesList: 'resources',
              ResourceDetail: 'resources/:resourceId',
              UploadResource: 'resources/upload',
              VideoPlayer: 'resources/video/:videoId',
            },
          },
          
          Profile: {
            screens: {
              ProfileView: 'profile',
              EditProfile: 'profile/edit',
              Settings: 'profile/settings',
              VerificationStatus: 'profile/verification',
              OfflineContent: 'profile/offline',
            },
          },
        },
      },
      
      Modal: 'modal/:screen',
    },
  },
  
  // Custom URL parsing for complex scenarios
  getInitialURL: async () => {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    
    if (url != null) {
      return url;
    }
    
    // Handle notification-based deep links
    // This would integrate with push notification handling
    return null;
  },
  
  // Subscribe to incoming links
  subscribe: (listener) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      listener(url);
    };

    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription?.remove();
    };
  },
};

// Helper functions for deep linking
export const createDeepLink = {
  // Authentication links
  login: () => Linking.createURL('auth/login'),
  register: () => Linking.createURL('auth/register'),
  verifyCredentials: (userId: string) => Linking.createURL(`auth/verify/${userId}`),
  
  // Posts links
  postDetail: (postId: string) => Linking.createURL(`posts/${postId}`),
  createPost: () => Linking.createURL('posts/create'),
  
  // Communities links
  communityDetail: (communityId: string) => Linking.createURL(`communities/${communityId}`),
  communityPosts: (communityId: string) => Linking.createURL(`communities/${communityId}/posts`),
  
  // Messages links
  chat: (conversationId: string) => Linking.createURL(`messages/${conversationId}`),
  newConversation: () => Linking.createURL('messages/new'),
  
  // Resources links
  resourceDetail: (resourceId: string) => Linking.createURL(`resources/${resourceId}`),
  uploadResource: () => Linking.createURL('resources/upload'),
  
  // Profile links
  profile: () => Linking.createURL('profile'),
  settings: () => Linking.createURL('profile/settings'),
};

// URL validation helpers
export const validateDeepLink = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const validSchemes = ['teacherhub', 'https'];
    const validHosts = ['teacherhub.ug', 'app.teacherhub.ug'];
    
    if (parsedUrl.protocol === 'teacherhub:') {
      return true;
    }
    
    if (parsedUrl.protocol === 'https:' && validHosts.includes(parsedUrl.hostname)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

// Extract parameters from deep link
export const extractDeepLinkParams = (url: string): Record<string, string> => {
  try {
    const parsedUrl = new URL(url);
    const params: Record<string, string> = {};
    
    // Extract query parameters
    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Extract path parameters (basic implementation)
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    pathSegments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        const nextSegment = pathSegments[index + 1];
        if (nextSegment && !nextSegment.startsWith(':')) {
          params[paramName] = nextSegment;
        }
      }
    });
    
    return params;
  } catch {
    return {};
  }
};