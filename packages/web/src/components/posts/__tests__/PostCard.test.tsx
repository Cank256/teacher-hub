import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PostCard } from '../PostCard';
import { postsSlice } from '../../../store/slices/postsSlice';
import { authSlice } from '../../../store/slices/authSlice';

// Mock the post service
vi.mock('../../../services/postService', () => ({
  postService: {
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    addComment: vi.fn(),
  }
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
  title: 'Test Post Title',
  content: 'This is a test post content with some educational material.',
  visibility: 'public' as const,
  tags: ['education', 'math'],
  mediaAttachments: [],
  likeCount: 5,
  commentCount: 3,
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

describe('PostCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render post content correctly', () => {
      renderPostCard();

      expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      expect(screen.getByText(/This is a test post content/)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Like count
      expect(screen.getByText('3')).toBeInTheDocument(); // Comment count
    });

    it('should render author profile image', () => {
      renderPostCard();

      const profileImage = screen.getByAltText('John Doe');
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', '/profiles/john.jpg');
    });

    it('should render tags', () => {
      renderPostCard();

      expect(screen.getByText('education')).toBeInTheDocument();
      expect(screen.getByText('math')).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      renderPostCard();

      // Should show relative time
      expect(screen.getByText(/ago/)).toBeInTheDocument();
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

      renderPostCard(postWithMedia);

      const mediaImage = screen.getByAltText('Post attachment');
      expect(mediaImage).toBeInTheDocument();
      expect(mediaImage).toHaveAttribute('src', '/uploads/thumb.jpg');
    });

    it('should show pinned indicator for pinned posts', () => {
      const pinnedPost = { ...mockPost, isPinned: true };
      renderPostCard(pinnedPost);

      expect(screen.getByLabelText('Pinned post')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle like button click', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.likePost).mockResolvedValue(undefined);

      renderPostCard();

      const likeButton = screen.getByLabelText('Like post');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(postService.likePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should handle unlike button click for liked post', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.unlikePost).mockResolvedValue(undefined);

      const likedPost = { ...mockPost, isLiked: true };
      renderPostCard(likedPost);

      const unlikeButton = screen.getByLabelText('Unlike post');
      fireEvent.click(unlikeButton);

      await waitFor(() => {
        expect(postService.unlikePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should toggle comment section', () => {
      renderPostCard();

      const commentButton = screen.getByLabelText('Show comments');
      fireEvent.click(commentButton);

      expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
    });

    it('should handle comment submission', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.addComment).mockResolvedValue({
        id: 'comment-123',
        postId: 'post-123',
        authorId: 'user-123',
        content: 'Test comment',
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      renderPostCard();

      // Open comment section
      const commentButton = screen.getByLabelText('Show comments');
      fireEvent.click(commentButton);

      // Type comment
      const commentInput = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(commentInput, { target: { value: 'Test comment' } });

      // Submit comment
      const submitButton = screen.getByLabelText('Submit comment');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(postService.addComment).toHaveBeenCalledWith('post-123', 'Test comment');
      });
    });

    it('should handle share button click', () => {
      const onShare = vi.fn();
      renderPostCard(mockPost, { onShare });

      const shareButton = screen.getByLabelText('Share post');
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockPost);
    });

    it('should show edit/delete options for own posts', () => {
      const ownPost = { ...mockPost, authorId: 'user-123' };
      renderPostCard(ownPost);

      const moreButton = screen.getByLabelText('More options');
      fireEvent.click(moreButton);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show edit/delete options for other users posts', () => {
      renderPostCard();

      const moreButton = screen.getByLabelText('More options');
      fireEvent.click(moreButton);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderPostCard();

      expect(screen.getByLabelText('Like post')).toBeInTheDocument();
      expect(screen.getByLabelText('Show comments')).toBeInTheDocument();
      expect(screen.getByLabelText('Share post')).toBeInTheDocument();
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderPostCard();

      const likeButton = screen.getByLabelText('Like post');
      likeButton.focus();
      expect(likeButton).toHaveFocus();

      // Tab to next button
      fireEvent.keyDown(likeButton, { key: 'Tab' });
      const commentButton = screen.getByLabelText('Show comments');
      expect(commentButton).toHaveFocus();
    });

    it('should handle Enter key for button activation', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.likePost).mockResolvedValue(undefined);

      renderPostCard();

      const likeButton = screen.getByLabelText('Like post');
      fireEvent.keyDown(likeButton, { key: 'Enter' });

      await waitFor(() => {
        expect(postService.likePost).toHaveBeenCalledWith('post-123');
      });
    });

    it('should have proper heading structure', () => {
      renderPostCard();

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Test Post Title');
    });
  });

  describe('Error Handling', () => {
    it('should handle like error gracefully', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.likePost).mockRejectedValue(new Error('Network error'));

      renderPostCard();

      const likeButton = screen.getByLabelText('Like post');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to like post/)).toBeInTheDocument();
      });
    });

    it('should handle comment submission error', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.addComment).mockRejectedValue(new Error('Comment failed'));

      renderPostCard();

      // Open comment section
      const commentButton = screen.getByLabelText('Show comments');
      fireEvent.click(commentButton);

      // Submit comment
      const commentInput = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(commentInput, { target: { value: 'Test comment' } });

      const submitButton = screen.getByLabelText('Submit comment');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to add comment/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when liking post', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.likePost).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderPostCard();

      const likeButton = screen.getByLabelText('Like post');
      fireEvent.click(likeButton);

      expect(screen.getByLabelText('Liking post...')).toBeInTheDocument();
    });

    it('should show loading state when submitting comment', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.addComment).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderPostCard();

      // Open comment section
      const commentButton = screen.getByLabelText('Show comments');
      fireEvent.click(commentButton);

      // Submit comment
      const commentInput = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(commentInput, { target: { value: 'Test comment' } });

      const submitButton = screen.getByLabelText('Submit comment');
      fireEvent.click(submitButton);

      expect(screen.getByText('Posting...')).toBeInTheDocument();
    });
  });
});