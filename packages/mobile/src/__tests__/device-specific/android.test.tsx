import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, ToastAndroid, PermissionsAndroid } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PostCard } from '../../components/posts/PostCard';
import { CommunityCard } from '../../components/communities/CommunityCard';
import { ResourceUploader } from '../../components/resources/ResourceUploader';
import { postsSlice } from '../../store/slices/postsSlice';
import { authSlice } from '../../store/slices/authSlice';
import { communitiesSlice } from '../../store/slices/communitiesSlice';

// Mock Android-specific modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'android',
      Version: 30,
      select: jest.fn((obj) => obj.android),
    },
    ToastAndroid: {
      show: jest.fn(),
      SHORT: 'SHORT',
      LONG: 'LONG',
      TOP: 'TOP',
      BOTTOM: 'BOTTOM',
      CENTER: 'CENTER',
    },
    PermissionsAndroid: {
      request: jest.fn(),
      check: jest.fn(),
      PERMISSIONS: {
        CAMERA: 'android.permission.CAMERA',
        WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
    },
    BackHandler: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },
  };
});

// Mock Android-specific libraries
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/data/data/com.teacherhub/files',
  ExternalDirectoryPath: '/storage/emulated/0/Android/data/com.teacherhub/files',
  writeFile: jest.fn(),
  readFile: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

const mockStore = configureStore({
  reducer: {
    posts: postsSlice.reducer,
    auth: authSlice.reducer,
    communities: communitiesSlice.reducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: 'user-123',
        fullName: 'Android Test User',
        email: 'android@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
    },
    posts: {
      posts: [],
      loading: false,
      error: null,
    },
    communities: {
      communities: [],
      userCommunities: [],
      loading: false,
      error: null,
    },
  },
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('Android-Specific Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('Android Styling and Material Design', () => {
    it('should apply Android-specific elevation styles', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Android Test Post',
        content: 'Testing Android-specific features',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const postCard = getByTestId('post-card');
      expect(postCard.props.style).toContainEqual(
        expect.objectContaining({
          elevation: expect.any(Number),
        })
      );
    });

    it('should use Material Design ripple effects', () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'Android Community',
        description: 'Testing Android features',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Test Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const joinButton = getByTestId('join-button');
      expect(joinButton.props.android_ripple).toEqual(
        expect.objectContaining({
          color: expect.any(String),
          borderless: false,
        })
      );
    });

    it('should handle Android status bar configuration', () => {
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const statusBar = getByTestId('android-status-bar');
      expect(statusBar.props.backgroundColor).toBe('#1976D2');
      expect(statusBar.props.barStyle).toBe('light-content');
    });
  });

  describe('Android Toast Messages', () => {
    it('should show Android toast for success messages', async () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Toast Test Post',
        content: 'Testing toast messages',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Simulate successful like
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ToastAndroid.show).toHaveBeenCalledWith(
        'Post liked successfully',
        ToastAndroid.SHORT
      );
    });

    it('should show Android toast for error messages', async () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'Error Test Community',
        description: 'Testing error toasts',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Test Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      // Mock join failure
      const { communityService } = require('../../services/communityService');
      communityService.joinCommunity = jest.fn().mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ToastAndroid.show).toHaveBeenCalledWith(
        'Failed to join community',
        ToastAndroid.LONG
      );
    });
  });

  describe('Android Permissions', () => {
    it('should request camera permission before opening camera', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.request.mockResolvedValue('granted');

      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const cameraButton = getByTestId('take-photo-button');
      fireEvent.press(cameraButton);

      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        expect.objectContaining({
          title: 'Camera Permission',
          message: 'This app needs access to camera to take photos',
        })
      );
    });

    it('should request storage permission before saving files', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.request.mockResolvedValue('granted');

      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const saveButton = getByTestId('save-file-button');
      fireEvent.press(saveButton);

      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        expect.objectContaining({
          title: 'Storage Permission',
          message: 'This app needs access to storage to save files',
        })
      );
    });

    it('should handle permission denial gracefully', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.request.mockResolvedValue('denied');

      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const cameraButton = getByTestId('take-photo-button');
      fireEvent.press(cameraButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ToastAndroid.show).toHaveBeenCalledWith(
        'Camera permission is required to take photos',
        ToastAndroid.LONG
      );
    });
  });

  describe('Android Back Button Handling', () => {
    it('should handle back button press in modal', () => {
      const { BackHandler } = require('react-native');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const modal = getByTestId('upload-modal');
      fireEvent(modal, 'onShow');

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function)
      );
    });

    it('should remove back button listener on modal close', () => {
      const { BackHandler } = require('react-native');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const modal = getByTestId('upload-modal');
      fireEvent(modal, 'onDismiss');

      expect(BackHandler.removeEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function)
      );
    });

    it('should exit app on back button press from main screen', () => {
      const { BackHandler } = require('react-native');
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Back Button Test',
        content: 'Testing back button',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      renderWithProvider(<PostCard post={mockPost} />);

      // Simulate back button press
      const backHandler = BackHandler.addEventListener.mock.calls[0][1];
      const result = backHandler();

      expect(result).toBe(false); // Allow default behavior (exit app)
    });
  });

  describe('Android Vibration', () => {
    it('should provide vibration feedback on long press', () => {
      const { Vibration } = require('react-native');
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Vibration Test',
        content: 'Testing vibration feedback',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const postCard = getByTestId('post-card');
      fireEvent(postCard, 'onLongPress');

      expect(Vibration.vibrate).toHaveBeenCalledWith(50);
    });

    it('should provide pattern vibration for notifications', () => {
      const { Vibration } = require('react-native');
      const mockCommunity = {
        id: 'community-123',
        name: 'Vibration Community',
        description: 'Testing vibration patterns',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Test Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      // Simulate successful join
      setTimeout(() => {
        expect(Vibration.vibrate).toHaveBeenCalledWith([0, 100, 50, 100]);
      }, 100);
    });
  });

  describe('Android File System', () => {
    it('should use Android external storage for file operations', async () => {
      const RNFS = require('react-native-fs');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const uploadButton = getByTestId('upload-file-button');
      fireEvent.press(uploadButton);

      expect(RNFS.exists).toHaveBeenCalledWith(
        expect.stringContaining(RNFS.ExternalDirectoryPath)
      );
    });

    it('should create directories in Android file system', async () => {
      const RNFS = require('react-native-fs');
      RNFS.exists.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const createFolderButton = getByTestId('create-folder-button');
      fireEvent.press(createFolderButton);

      expect(RNFS.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('/uploads'),
        expect.objectContaining({
          NSURLIsExcludedFromBackupKey: true,
        })
      );
    });

    it('should handle Android file system errors', async () => {
      const RNFS = require('react-native-fs');
      RNFS.writeFile.mockRejectedValue(new Error('Permission denied'));

      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const saveButton = getByTestId('save-file-button');
      fireEvent.press(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ToastAndroid.show).toHaveBeenCalledWith(
        'Failed to save file: Permission denied',
        ToastAndroid.LONG
      );
    });
  });

  describe('Android Version Compatibility', () => {
    it('should handle Android API 30+ features', () => {
      Platform.Version = 30;
      
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const modernFeature = getByTestId('android30-feature');
      expect(modernFeature).toBeTruthy();
    });

    it('should fallback for older Android versions', () => {
      Platform.Version = 23;
      
      const { getByTestId, queryByTestId } = renderWithProvider(<ResourceUploader />);

      expect(queryByTestId('android30-feature')).toBeFalsy();
      expect(getByTestId('legacy-android-feature')).toBeTruthy();
    });

    it('should handle scoped storage for Android 10+', () => {
      Platform.Version = 29;
      
      const RNFS = require('react-native-fs');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const saveButton = getByTestId('save-file-button');
      fireEvent.press(saveButton);

      // Should use scoped storage path
      expect(RNFS.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('/Android/data/com.teacherhub/files'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('Android Performance Optimizations', () => {
    it('should use Android-specific image loading optimizations', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Performance Test',
        content: 'Testing Android performance',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'image' as const,
            url: '/uploads/large-image.jpg',
            thumbnailUrl: '/uploads/thumb.jpg',
            filename: 'large-image.jpg',
            size: 5000000,
          },
        ],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const image = getByTestId('post-media-image');
      expect(image.props.resizeMode).toBe('cover');
      expect(image.props.fadeDuration).toBe(300);
    });

    it('should implement Android-specific memory management', () => {
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const scrollView = getByTestId('upload-scroll-view');
      expect(scrollView.props.removeClippedSubviews).toBe(true);
      expect(scrollView.props.persistentScrollbar).toBe(true);
    });
  });

  describe('Android Accessibility', () => {
    it('should use Android-specific accessibility services', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Accessibility Test',
        content: 'Testing Android accessibility',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const likeButton = getByTestId('like-button');
      expect(likeButton.props.accessibilityRole).toBe('button');
      expect(likeButton.props.importantForAccessibility).toBe('yes');
    });

    it('should support Android TalkBack navigation', () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'TalkBack Test',
        description: 'Testing TalkBack support',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Test Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const communityCard = getByTestId('community-card');
      expect(communityCard.props.accessibilityActions).toContainEqual(
        expect.objectContaining({
          name: 'activate',
          label: 'Open community',
        })
      );
    });
  });

  describe('Android Network and Connectivity', () => {
    it('should handle Android network state changes', () => {
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const networkListener = getByTestId('network-listener');
      fireEvent(networkListener, 'onNetworkStateChange', {
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
      });

      expect(getByTestId('wifi-indicator')).toBeTruthy();
    });

    it('should optimize for Android data usage', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Data Usage Test',
        content: 'Testing data optimization',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'video' as const,
            url: '/uploads/video.mp4',
            thumbnailUrl: '/uploads/video-thumb.jpg',
            filename: 'video.mp4',
            size: 50000000, // 50MB
          },
        ],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const video = getByTestId('post-media-video');
      expect(video.props.shouldPlay).toBe(false); // Don't auto-play on mobile data
      expect(video.props.resizeMode).toBe('contain');
    });
  });
});