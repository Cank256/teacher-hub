import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PostCard } from '../../components/posts/PostCard';
import { CommunityCard } from '../../components/communities/CommunityCard';
import { ResourceUploader } from '../../components/resources/ResourceUploader';
import { postsSlice } from '../../store/slices/postsSlice';
import { authSlice } from '../../store/slices/authSlice';
import { communitiesSlice } from '../../store/slices/communitiesSlice';

// Mock iOS-specific modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      Version: '15.0',
      select: jest.fn((obj) => obj.ios),
    },
    Alert: {
      alert: jest.fn(),
    },
    ActionSheetIOS: {
      showActionSheetWithOptions: jest.fn(),
    },
    Haptics: {
      impactAsync: jest.fn(),
      notificationAsync: jest.fn(),
      selectionAsync: jest.fn(),
    },
    StatusBar: {
      setBarStyle: jest.fn(),
      setHidden: jest.fn(),
    },
  };
});

// Mock iOS-specific libraries
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(),
    getPhotos: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
  MediaType: {
    photo: 'photo',
    video: 'video',
  },
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
        fullName: 'iOS Test User',
        email: 'ios@example.com',
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

describe('iOS-Specific Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  describe('iOS Styling and Appearance', () => {
    it('should apply iOS-specific shadow styles', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'iOS Test Post',
        content: 'Testing iOS-specific features',
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
          shadowColor: expect.any(String),
          shadowOffset: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
          shadowOpacity: expect.any(Number),
          shadowRadius: expect.any(Number),
        })
      );
    });

    it('should use iOS-specific blur effects', () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'iOS Community',
        description: 'Testing iOS features',
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

      const blurView = getByTestId('ios-blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.props.blurType).toBe('light');
    });

    it('should handle safe area insets correctly', () => {
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const safeAreaView = getByTestId('safe-area-view');
      expect(safeAreaView).toBeTruthy();
      expect(safeAreaView.props.edges).toEqual(['top', 'left', 'right']);
    });
  });

  describe('iOS Haptic Feedback', () => {
    it('should provide impact feedback on button press', () => {
      const { Haptics } = require('react-native');
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Haptic Test Post',
        content: 'Testing haptic feedback',
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

      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('should provide notification feedback on success', async () => {
      const { Haptics } = require('react-native');
      const mockCommunity = {
        id: 'community-123',
        name: 'Test Community',
        description: 'Testing notifications',
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
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('should provide selection feedback on picker interaction', () => {
      const { Haptics } = require('react-native');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const picker = getByTestId('file-type-picker');
      fireEvent(picker, 'onValueChange', 'image');

      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('iOS Action Sheets', () => {
    it('should show iOS action sheet for post options', () => {
      const { ActionSheetIOS } = require('react-native');
      const mockPost = {
        id: 'post-123',
        authorId: 'user-123', // Own post
        title: 'Action Sheet Test',
        content: 'Testing action sheet',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-123',
          fullName: 'Test User',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const moreButton = getByTestId('more-options-button');
      fireEvent.press(moreButton);

      expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining(['Edit', 'Delete', 'Share', 'Cancel']),
          cancelButtonIndex: 3,
          destructiveButtonIndex: 1,
        }),
        expect.any(Function)
      );
    });

    it('should handle action sheet selection', () => {
      const { ActionSheetIOS } = require('react-native');
      const mockCommunity = {
        id: 'community-123',
        name: 'Action Sheet Community',
        description: 'Testing action sheets',
        type: 'subject' as const,
        ownerId: 'user-123',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-123',
          fullName: 'Test User',
          email: 'test@example.com',
        },
        userMembership: {
          id: 'membership-123',
          role: 'owner' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };

      ActionSheetIOS.showActionSheetWithOptions.mockImplementation((options, callback) => {
        callback(0); // Select first option (Manage)
      });

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const moreButton = getByTestId('more-options-button');
      fireEvent.press(moreButton);

      expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalled();
    });
  });

  describe('iOS Camera and Photo Library', () => {
    it('should launch iOS image picker for photo selection', () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const photoButton = getByTestId('select-photo-button');
      fireEvent.press(photoButton);

      expect(launchImageLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: 'photo',
          quality: 0.8,
          includeBase64: false,
        }),
        expect.any(Function)
      );
    });

    it('should launch iOS camera for photo capture', () => {
      const { launchCamera } = require('react-native-image-picker');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const cameraButton = getByTestId('take-photo-button');
      fireEvent.press(cameraButton);

      expect(launchCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: 'photo',
          quality: 0.8,
          includeBase64: false,
        }),
        expect.any(Function)
      );
    });

    it('should save image to iOS camera roll', async () => {
      const { CameraRoll } = require('@react-native-camera-roll/camera-roll');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const saveButton = getByTestId('save-to-camera-roll-button');
      fireEvent.press(saveButton);

      expect(CameraRoll.save).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'photo',
          album: 'TeacherHub',
        })
      );
    });
  });

  describe('iOS Status Bar', () => {
    it('should set iOS status bar style', () => {
      const { StatusBar } = require('react-native');
      renderWithProvider(<ResourceUploader />);

      expect(StatusBar.setBarStyle).toHaveBeenCalledWith('dark-content', true);
    });

    it('should handle status bar visibility changes', () => {
      const { StatusBar } = require('react-native');
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const fullscreenButton = getByTestId('fullscreen-button');
      fireEvent.press(fullscreenButton);

      expect(StatusBar.setHidden).toHaveBeenCalledWith(true, 'slide');
    });
  });

  describe('iOS Alerts and Modals', () => {
    it('should show iOS-style alert for confirmations', () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'Alert Test Community',
        description: 'Testing iOS alerts',
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
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };

      const { getByTestId } = renderWithProvider(<CommunityCard community={mockCommunity} />);

      const leaveButton = getByTestId('leave-button');
      fireEvent.press(leaveButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Leave Community',
        'Are you sure you want to leave Alert Test Community?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Leave', style: 'destructive' }),
        ])
      );
    });

    it('should handle iOS alert button responses', () => {
      Alert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user tapping destructive button
        buttons[1].onPress();
      });

      const mockPost = {
        id: 'post-123',
        authorId: 'user-123',
        title: 'Delete Test Post',
        content: 'Testing deletion',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-123',
          fullName: 'Test User',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const onDelete = jest.fn();
      const { getByTestId } = renderWithProvider(
        <PostCard post={mockPost} onDelete={onDelete} />
      );

      const deleteButton = getByTestId('delete-button');
      fireEvent.press(deleteButton);

      expect(onDelete).toHaveBeenCalledWith('post-123');
    });
  });

  describe('iOS Performance Optimizations', () => {
    it('should use iOS-specific image caching', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Image Cache Test',
        content: 'Testing image caching',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'image' as const,
            url: '/uploads/large-image.jpg',
            thumbnailUrl: '/uploads/thumb.jpg',
            filename: 'large-image.jpg',
            size: 5000000, // 5MB
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
      expect(image.props.cache).toBe('force-cache');
      expect(image.props.priority).toBe('high');
    });

    it('should implement iOS-specific memory management', () => {
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const uploader = getByTestId('resource-uploader');
      expect(uploader.props.removeClippedSubviews).toBe(true);
      expect(uploader.props.maxToRenderPerBatch).toBe(10);
    });
  });

  describe('iOS Accessibility', () => {
    it('should use iOS-specific accessibility traits', () => {
      const mockPost = {
        id: 'post-123',
        authorId: 'user-456',
        title: 'Accessibility Test',
        content: 'Testing iOS accessibility',
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
      expect(likeButton.props.accessibilityTraits).toContain('button');
      expect(likeButton.props.accessibilityRole).toBe('button');
    });

    it('should support iOS VoiceOver gestures', () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'VoiceOver Test',
        description: 'Testing VoiceOver support',
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

  describe('iOS Version Compatibility', () => {
    it('should handle iOS 15+ features', () => {
      Platform.Version = '15.0';
      
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const modernFeature = getByTestId('ios15-feature');
      expect(modernFeature).toBeTruthy();
    });

    it('should fallback for older iOS versions', () => {
      Platform.Version = '13.0';
      
      const { getByTestId, queryByTestId } = renderWithProvider(<ResourceUploader />);

      expect(queryByTestId('ios15-feature')).toBeFalsy();
      expect(getByTestId('legacy-feature')).toBeTruthy();
    });
  });
});