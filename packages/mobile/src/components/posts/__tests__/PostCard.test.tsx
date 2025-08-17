import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PostCard } from '../PostCard';
import { postsSlice } from '../../../store/slices/postsSlice';
import { authSlice } from '../../../store/slices/authSlice';

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
    },
  };
});

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    PanGestureHandler: View,
    TapGestureHandler: View,
    State: {},
    Directions: {},
  };
});

// Mock post service
jest.mock('../../../services/postService', () => ({
  postService: {
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    addComment: jest.fn(),
  },
}));

const mockStore = configureStore({
  reducer: {
    posts: postsSlice.reducer,
    auth: authSlice.reducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: 'user-123',
        fullName: 'Test User',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
    },
    posts: {
      posts: [],
      loading: false,
      error: null,
    },
  },
});

const mockPost = {
  id: 'post-123',
  authorId: 'user-456',
  title: 'Mobile Test Post',
  content: 'This is a test post for mobile application testing.',
  visibility: 'public' as const,
  tags: ['mobile', 'testing'],
  mediaAttachments: [],
  likeCount: 10,
  commentCount: 5,
  isPinned: false,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  author: {
    id: 'user-456',
    fullName: 'John Doe',
    email: 'john@example.com',
    profileImageUrl: '/profiles/john.jpg',
  },
  isLiked: false,
};

const renderPostCard = (post = mockPost, props = {}) => {
  return render(
    <Provider store={mockStore}>
      <PostCard post={post} {...props} />
    </Provider>
  );
};

describe('Mobile PostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render post content correctly', () => {
      const { getByText, getByTestId } = renderPostCard();

      expect(getByText('Mobile Test Post')).toBeTruthy();
      expect(getByText('This is a test post for mobile application testing.')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('10')).toBeTruthy(); // Like count
      expect(getByText('5')).toBeTruthy(); // Comment count
    });

    it('should render author profile image', () => {
      const { getByTestId } = renderPostCard();

      const profileImage = getByTestId('author-profile-image');
      expect(profileImage).toBeTruthy();
      expect(profileImage.props.source.uri).toBe('/profiles/john.jpg');
    });

    it('should render tags as touchable elements', () => {
      const { getByText } = renderPostCard();

      const mobileTag = getByText('mobile');
      const testingTag = getByText('testing');
      
      expect(mobileTag).toBeTruthy();
      expect(testingTag).toBeTruthy();
    });

    it('should render media attachments when present', () => {
      const postWithMedia = {
        ...mockPost,
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'image' as const,
            url: '/uploads/image.jpg',
            thumbnailUrl: '/uploads/thumb.jpg',
            filename: 'image.jpg',
            size: 1024000,
          },
        ],
      };

      const { getByTestId } = renderPostCard(postWithMedia);

      const mediaImage = getByTestId('post-media-image');
      expect(mediaImage).toBeTruthy();
      expect(mediaImage.props.source.uri).toBe('/uploads/thumb.jpg');
    });

    it('should show pinned indicator for pinned posts', () => {
      const pinnedPost = { ...mockPost, isPinned: true };
      const { getByTestId } = renderPostCard(pinnedPost);

      expect(getByTestId('pinned-indicator')).toBeTruthy();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle like button press', async () => {
      const { postService } = require('../../../services/postService');
      postService.likePost.mockResolvedValue(undefined);

      const { getByTestId } = renderPostCard();

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(postService.likePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should handle unlike button press for liked post', async () => {
      const { postService } = require('../../../services/postService');
      postService.unlikePost.mockResolvedValue(undefined);

      const likedPost = { ...mockPost, isLiked: true };
      const { getByTestId } = renderPostCard(likedPost);

      const unlikeButton = getByTestId('unlike-button');
      fireEvent.press(unlikeButton);

      await waitFor(() => {
        expect(postService.unlikePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should toggle comment section', () => {
      const { getByTestId, queryByTestId } = renderPostCard();

      const commentButton = getByTestId('comment-button');
      fireEvent.press(commentButton);

      expect(getByTestId('comment-section')).toBeTruthy();
    });

    it('should handle comment submission', async () => {
      const { postService } = require('../../../services/postService');
      postService.addComment.mockResolvedValue({
        id: 'comment-123',
        postId: 'post-123',
        authorId: 'user-123',
        content: 'Mobile test comment',
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { getByTestId } = renderPostCard();

      // Open comment section
      const commentButton = getByTestId('comment-button');
      fireEvent.press(commentButton);

      // Type comment
      const commentInput = getByTestId('comment-input');
      fireEvent.changeText(commentInput, 'Mobile test comment');

      // Submit comment
      const submitButton = getByTestId('submit-comment-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(postService.addComment).toHaveBeenCalledWith('post-123', 'Mobile test comment');
      });
    });

    it('should handle share button press', () => {
      const onShare = jest.fn();
      const { getByTestId } = renderPostCard(mockPost, { onShare });

      const shareButton = getByTestId('share-button');
      fireEvent.press(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockPost);
    });

    it('should show action sheet for own posts', () => {
      const ownPost = { ...mockPost, authorId: 'user-123' };
      const { getByTestId } = renderPostCard(ownPost);

      const moreButton = getByTestId('more-options-button');
      fireEvent.press(moreButton);

      expect(getByTestId('action-sheet')).toBeTruthy();
    });
  });

  describe('Gesture Handling', () => {
    it('should handle swipe gestures for navigation', () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      
      const { getByTestId } = renderPostCard(mockPost, { 
        onSwipeLeft, 
        onSwipeRight 
      });

      const postCard = getByTestId('post-card');
      
      // Simulate swipe left
      fireEvent(postCard, 'onSwipeLeft');
      expect(onSwipeLeft).toHaveBeenCalled();

      // Simulate swipe right
      fireEvent(postCard, 'onSwipeRight');
      expect(onSwipeRight).toHaveBeenCalled();
    });

    it('should handle double tap to like', async () => {
      const { postService } = require('../../../services/postService');
      postService.likePost.mockResolvedValue(undefined);

      const { getByTestId } = renderPostCard();

      const postContent = getByTestId('post-content');
      fireEvent(postContent, 'onDoubleTap');

      await waitFor(() => {
        expect(postService.likePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should handle long press for context menu', () => {
      const { getByTestId } = renderPostCard();

      const postCard = getByTestId('post-card');
      fireEvent(postCard, 'onLongPress');

      expect(getByTestId('context-menu')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when liking post', async () => {
      const { postService } = require('../../../services/postService');
      postService.likePost.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByTestId } = renderPostCard();

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      expect(getByTestId('like-loading-indicator')).toBeTruthy();
    });

    it('should show loading indicator when submitting comment', async () => {
      const { postService } = require('../../../services/postService');
      postService.addComment.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByTestId } = renderPostCard();

      // Open comment section
      const commentButton = getByTestId('comment-button');
      fireEvent.press(commentButton);

      // Submit comment
      const commentInput = getByTestId('comment-input');
      fireEvent.changeText(commentInput, 'Test comment');

      const submitButton = getByTestId('submit-comment-button');
      fireEvent.press(submitButton);

      expect(getByTestId('comment-loading-indicator')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle like error gracefully', async () => {
      const { postService } = require('../../../services/postService');
      postService.likePost.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderPostCard();

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(getByText('Failed to like post')).toBeTruthy();
      });
    });

    it('should handle comment submission error', async () => {
      const { postService } = require('../../../services/postService');
      postService.addComment.mockRejectedValue(new Error('Comment failed'));

      const { getByTestId, getByText } = renderPostCard();

      // Open comment section and submit comment
      const commentButton = getByTestId('comment-button');
      fireEvent.press(commentButton);

      const commentInput = getByTestId('comment-input');
      fireEvent.changeText(commentInput, 'Test comment');

      const submitButton = getByTestId('submit-comment-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Failed to add comment')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderPostCard();

      expect(getByLabelText('Like post')).toBeTruthy();
      expect(getByLabelText('Show comments')).toBeTruthy();
      expect(getByLabelText('Share post')).toBeTruthy();
      expect(getByLabelText('More options')).toBeTruthy();
    });

    it('should have proper accessibility hints', () => {
      const { getByTestId } = renderPostCard();

      const likeButton = getByTestId('like-button');
      expect(likeButton.props.accessibilityHint).toBe('Double tap to like this post');
    });

    it('should support VoiceOver navigation', () => {
      const { getByTestId } = renderPostCard();

      const postCard = getByTestId('post-card');
      expect(postCard.props.accessible).toBe(true);
      expect(postCard.props.accessibilityRole).toBe('article');
    });

    it('should announce dynamic content changes', () => {
      const { getByTestId } = renderPostCard();

      const likeCount = getByTestId('like-count');
      expect(likeCount.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large content', () => {
      const longPost = {
        ...mockPost,
        content: 'a'.repeat(10000), // Very long content
      };

      const startTime = Date.now();
      renderPostCard(longPost);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle rapid interactions without lag', async () => {
      const { postService } = require('../../../services/postService');
      postService.likePost.mockResolvedValue(undefined);

      const { getByTestId } = renderPostCard();

      const likeButton = getByTestId('like-button');
      
      // Rapid taps
      for (let i = 0; i < 10; i++) {
        fireEvent.press(likeButton);
      }

      // Should only call service once due to debouncing
      await waitFor(() => {
        expect(postService.likePost).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Device-specific Features', () => {
    it('should handle iOS-specific interactions', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'ios';

      const { getByTestId } = renderPostCard();

      const postCard = getByTestId('post-card');
      expect(postCard.props.style).toContainEqual(
        expect.objectContaining({ shadowOpacity: expect.any(Number) })
      );
    });

    it('should handle Android-specific interactions', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'android';

      const { getByTestId } = renderPostCard();

      const postCard = getByTestId('post-card');
      expect(postCard.props.style).toContainEqual(
        expect.objectContaining({ elevation: expect.any(Number) })
      );
    });

    it('should adapt to different screen sizes', () => {
      const Dimensions = require('react-native').Dimensions;
      
      // Test tablet size
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });

      const { getByTestId } = renderPostCard();

      const postCard = getByTestId('post-card');
      expect(postCard.props.style).toContainEqual(
        expect.objectContaining({ maxWidth: expect.any(Number) })
      );
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline state gracefully', () => {
      const { getByTestId, getByText } = renderPostCard(mockPost, { 
        isOffline: true 
      });

      expect(getByText('Offline')).toBeTruthy();
      
      const likeButton = getByTestId('like-button');
      expect(likeButton.props.disabled).toBe(true);
    });

    it('should queue actions when offline', async () => {
      const { getByTestId } = renderPostCard(mockPost, { 
        isOffline: true 
      });

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Should show queued indicator
      expect(getByTestId('action-queued-indicator')).toBeTruthy();
    });
  });
});