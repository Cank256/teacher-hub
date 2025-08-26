import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Root Stack Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Modal: {
    screen: string;
    params?: any;
  };
};

// Authentication Stack Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyCredentials: {
    userId: string;
  };
  BiometricSetup: {
    userId: string;
  };
};

// Main Tab Navigation Types
export type MainTabParamList = {
  Posts: NavigatorScreenParams<PostsStackParamList>;
  Communities: NavigatorScreenParams<CommunitiesStackParamList>;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Resources: NavigatorScreenParams<ResourcesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Feature Stack Types
export type PostsStackParamList = {
  PostsFeed: undefined;
  PostDetail: {
    postId: string;
  };
  CreatePost: undefined;
  EditPost: {
    postId: string;
  };
};

export type CommunitiesStackParamList = {
  CommunitiesList: undefined;
  CommunityDetail: {
    communityId: string;
  };
  CommunityPosts: {
    communityId: string;
  };
  CommunityMembers: {
    communityId: string;
  };
};

export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: {
    conversationId: string;
    recipientName?: string;
  };
  NewConversation: undefined;
  UserSearch: {
    onSelectUser: (userId: string) => void;
  };
};

export type ResourcesStackParamList = {
  ResourcesList: undefined;
  ResourceDetail: {
    resourceId: string;
  };
  UploadResource: undefined;
  VideoPlayer: {
    videoUrl: string;
    title: string;
  };
};

export type ProfileStackParamList = {
  ProfileView: undefined;
  EditProfile: undefined;
  Settings: undefined;
  VerificationStatus: undefined;
  OfflineContent: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = 
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  BottomTabScreenProps<MainTabParamList, T>;

export type PostsStackScreenProps<T extends keyof PostsStackParamList> = 
  NativeStackScreenProps<PostsStackParamList, T>;

export type CommunitiesStackScreenProps<T extends keyof CommunitiesStackParamList> = 
  NativeStackScreenProps<CommunitiesStackParamList, T>;

export type MessagesStackScreenProps<T extends keyof MessagesStackParamList> = 
  NativeStackScreenProps<MessagesStackParamList, T>;

export type ResourcesStackScreenProps<T extends keyof ResourcesStackParamList> = 
  NativeStackScreenProps<ResourcesStackParamList, T>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = 
  NativeStackScreenProps<ProfileStackParamList, T>;

// Deep Link Types
export type DeepLinkConfig = {
  screens: {
    Onboarding: string;
    Auth: {
      screens: {
        Login: string;
        Register: string;
        ForgotPassword: string;
        VerifyCredentials: string;
        BiometricSetup: string;
      };
    };
    Main: {
      screens: {
        Posts: {
          screens: {
            PostsFeed: string;
            PostDetail: string;
            CreatePost: string;
            EditPost: string;
          };
        };
        Communities: {
          screens: {
            CommunitiesList: string;
            CommunityDetail: string;
            CommunityPosts: string;
            CommunityMembers: string;
          };
        };
        Messages: {
          screens: {
            ConversationsList: string;
            Chat: string;
            NewConversation: string;
            UserSearch: string;
          };
        };
        Resources: {
          screens: {
            ResourcesList: string;
            ResourceDetail: string;
            UploadResource: string;
            VideoPlayer: string;
          };
        };
        Profile: {
          screens: {
            ProfileView: string;
            EditProfile: string;
            Settings: string;
            VerificationStatus: string;
            OfflineContent: string;
          };
        };
      };
    };
    Modal: string;
  };
};

// Navigation State Types
export interface NavigationState {
  isReady: boolean;
  initialRouteName?: keyof RootStackParamList;
  routeHistory: string[];
}

// Navigation Service Types
export interface NavigationServiceInterface {
  navigate<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void;
  goBack(): void;
  reset(routeName: keyof RootStackParamList): void;
  canGoBack(): boolean;
  getCurrentRoute(): string | undefined;
  getState(): any;
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}