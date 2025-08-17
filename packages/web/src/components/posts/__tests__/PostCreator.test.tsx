import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import { PostCreator } from '../PostCreator';
import { postsSlice } from '../../../store/slices/postsSlice';
import { authSlice } from '../../../store/slices/authSlice';
import { communitiesSlice } from '../../../store/slices/communitiesSlice';

// Mock the post service
vi.mock('../../../services/postService', () => ({
  postService: {
    createPost: vi.fn(),
    uploadMedia: vi.fn(),
  }
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
    communities: {
      userCommunities: [
        {
          id: 'community-1',
          name: 'Math Teachers',
          description: 'Community for math educators',
          memberCount: 25,
        },
        {
          id: 'community-2',
          name: 'Science Teachers',
          description: 'Community for science educators',
          memberCount: 30,
        },
      ],
      loading: false,
      error: null,
    },
  },
});

const renderPostCreator = (props = {}) => {
  return render(
    <Provider store={mockStore}>
      <PostCreator {...props} />
    </Provider>
  );
};

describe('PostCreator', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render post creation form', () => {
      renderPostCreator();

      expect(screen.getByPlaceholderText('What would you like to share?')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Post title...')).toBeInTheDocument();
      expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
      expect(screen.getByText('Post')).toBeInTheDocument();
    });

    it('should render community selection when user has communities', () => {
      renderPostCreator();

      expect(screen.getByLabelText('Community (optional)')).toBeInTheDocument();
      expect(screen.getByText('Select a community')).toBeInTheDocument();
    });

    it('should render media upload section', () => {
      renderPostCreator();

      expect(screen.getByLabelText('Add media')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop files here, or click to select')).toBeInTheDocument();
    });

    it('should render tag input', () => {
      renderPostCreator();

      expect(screen.getByPlaceholderText('Add tags (press Enter to add)')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update title field', async () => {
      renderPostCreator();

      const titleInput = screen.getByPlaceholderText('Post title...');
      await user.type(titleInput, 'My Test Post');

      expect(titleInput).toHaveValue('My Test Post');
    });

    it('should update content field', async () => {
      renderPostCreator();

      const contentInput = screen.getByPlaceholderText('What would you like to share?');
      await user.type(contentInput, 'This is my post content');

      expect(contentInput).toHaveValue('This is my post content');
    });

    it('should change visibility setting', async () => {
      renderPostCreator();

      const visibilitySelect = screen.getByLabelText('Visibility');
      await user.selectOptions(visibilitySelect, 'community');

      expect(visibilitySelect).toHaveValue('community');
    });

    it('should select community', async () => {
      renderPostCreator();

      const communitySelect = screen.getByLabelText('Community (optional)');
      await user.selectOptions(communitySelect, 'community-1');

      expect(communitySelect).toHaveValue('community-1');
    });

    it('should add tags', async () => {
      renderPostCreator();

      const tagInput = screen.getByPlaceholderText('Add tags (press Enter to add)');
      await user.type(tagInput, 'education');
      await user.keyboard('{Enter}');

      expect(screen.getByText('education')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('should remove tags', async () => {
      renderPostCreator();

      const tagInput = screen.getByPlaceholderText('Add tags (press Enter to add)');
      await user.type(tagInput, 'education');
      await user.keyboard('{Enter}');

      const removeTagButton = screen.getByLabelText('Remove tag education');
      await user.click(removeTagButton);

      expect(screen.queryByText('education')).not.toBeInTheDocument();
    });
  });

  describe('Media Upload', () => {
    it('should handle file selection', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.uploadMedia).mockResolvedValue({
        id: 'media-1',
        type: 'image',
        url: '/uploads/image.jpg',
        thumbnailUrl: '/uploads/thumb.jpg',
        filename: 'image.jpg',
        size: 1024000,
      });

      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const file = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(postService.uploadMedia).toHaveBeenCalledWith(file);
      });
    });

    it('should show upload progress', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.uploadMedia).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const file = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('should handle upload error', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.uploadMedia).mockRejectedValue(new Error('Upload failed'));

      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const file = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large-file.jpg', { 
        type: 'image/jpeg' 
      });

      await user.upload(fileInput, largeFile);

      expect(screen.getByText(/File size exceeds limit/)).toBeInTheDocument();
    });

    it('should validate file type', async () => {
      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const invalidFile = new File(['content'], 'script.js', { type: 'application/javascript' });

      await user.upload(fileInput, invalidFile);

      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument();
    });

    it('should remove uploaded media', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.uploadMedia).mockResolvedValue({
        id: 'media-1',
        type: 'image',
        url: '/uploads/image.jpg',
        thumbnailUrl: '/uploads/thumb.jpg',
        filename: 'image.jpg',
        size: 1024000,
      });

      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      const file = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByAltText('Uploaded media')).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText('Remove media');
      await user.click(removeButton);

      expect(screen.queryByAltText('Uploaded media')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should create post successfully', async () => {
      const { postService } = await import('../../../services/postService');
      const mockCreatedPost = {
        id: 'post-123',
        authorId: 'user-123',
        title: 'Test Post',
        content: 'Test content',
        visibility: 'public',
        tags: ['education'],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(postService.createPost).mockResolvedValue(mockCreatedPost);

      const onPostCreated = vi.fn();
      renderPostCreator({ onPostCreated });

      // Fill form
      await user.type(screen.getByPlaceholderText('Post title...'), 'Test Post');
      await user.type(screen.getByPlaceholderText('What would you like to share?'), 'Test content');
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter to add)');
      await user.type(tagInput, 'education');
      await user.keyboard('{Enter}');

      // Submit form
      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      await waitFor(() => {
        expect(postService.createPost).toHaveBeenCalledWith({
          title: 'Test Post',
          content: 'Test content',
          visibility: 'public',
          tags: ['education'],
          mediaAttachments: [],
          communityId: undefined,
        });
      });

      expect(onPostCreated).toHaveBeenCalledWith(mockCreatedPost);
    });

    it('should handle submission error', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.createPost).mockRejectedValue(new Error('Creation failed'));

      renderPostCreator();

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Post title...'), 'Test Post');
      await user.type(screen.getByPlaceholderText('What would you like to share?'), 'Test content');

      // Submit form
      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create post/)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.createPost).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderPostCreator();

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Post title...'), 'Test Post');
      await user.type(screen.getByPlaceholderText('What would you like to share?'), 'Test content');

      // Submit form
      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should reset form after successful submission', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.createPost).mockResolvedValue({
        id: 'post-123',
        authorId: 'user-123',
        title: 'Test Post',
        content: 'Test content',
        visibility: 'public',
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      renderPostCreator();

      // Fill form
      const titleInput = screen.getByPlaceholderText('Post title...');
      const contentInput = screen.getByPlaceholderText('What would you like to share?');
      
      await user.type(titleInput, 'Test Post');
      await user.type(contentInput, 'Test content');

      // Submit form
      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      await waitFor(() => {
        expect(titleInput).toHaveValue('');
        expect(contentInput).toHaveValue('');
      });
    });
  });

  describe('Form Validation', () => {
    it('should require title', async () => {
      renderPostCreator();

      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('should require content', async () => {
      renderPostCreator();

      await user.type(screen.getByPlaceholderText('Post title...'), 'Test Post');

      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      expect(screen.getByText('Content is required')).toBeInTheDocument();
    });

    it('should validate title length', async () => {
      renderPostCreator();

      const longTitle = 'a'.repeat(201); // Exceeds 200 character limit
      await user.type(screen.getByPlaceholderText('Post title...'), longTitle);

      expect(screen.getByText(/Title must be less than 200 characters/)).toBeInTheDocument();
    });

    it('should validate content length', async () => {
      renderPostCreator();

      const longContent = 'a'.repeat(10001); // Exceeds 10000 character limit
      await user.type(screen.getByPlaceholderText('What would you like to share?'), longContent);

      expect(screen.getByText(/Content must be less than 10000 characters/)).toBeInTheDocument();
    });

    it('should validate tag format', async () => {
      renderPostCreator();

      const tagInput = screen.getByPlaceholderText('Add tags (press Enter to add)');
      await user.type(tagInput, 'invalid tag with spaces');
      await user.keyboard('{Enter}');

      expect(screen.getByText(/Tags cannot contain spaces/)).toBeInTheDocument();
    });

    it('should limit number of tags', async () => {
      renderPostCreator();

      const tagInput = screen.getByPlaceholderText('Add tags (press Enter to add)');
      
      // Add maximum number of tags (10)
      for (let i = 0; i < 11; i++) {
        await user.type(tagInput, `tag${i}`);
        await user.keyboard('{Enter}');
      }

      expect(screen.getByText(/Maximum 10 tags allowed/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderPostCreator();

      expect(screen.getByLabelText('Post title')).toBeInTheDocument();
      expect(screen.getByLabelText('Post content')).toBeInTheDocument();
      expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
      expect(screen.getByLabelText('Community (optional)')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderPostCreator();

      const titleInput = screen.getByPlaceholderText('Post title...');
      titleInput.focus();
      expect(titleInput).toHaveFocus();

      await user.keyboard('{Tab}');
      const contentInput = screen.getByPlaceholderText('What would you like to share?');
      expect(contentInput).toHaveFocus();
    });

    it('should announce form errors to screen readers', async () => {
      renderPostCreator();

      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      const errorMessage = screen.getByText('Title is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should have proper ARIA attributes for file upload', () => {
      renderPostCreator();

      const fileInput = screen.getByLabelText('Add media');
      expect(fileInput).toHaveAttribute('aria-describedby');
    });
  });

  describe('Draft Functionality', () => {
    it('should save draft automatically', async () => {
      renderPostCreator();

      await user.type(screen.getByPlaceholderText('Post title...'), 'Draft Title');
      await user.type(screen.getByPlaceholderText('What would you like to share?'), 'Draft content');

      // Wait for auto-save
      await waitFor(() => {
        expect(screen.getByText('Draft saved')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should restore draft on component mount', () => {
      // Mock localStorage with saved draft
      const mockDraft = {
        title: 'Restored Title',
        content: 'Restored content',
        tags: ['restored'],
      };
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockDraft));

      renderPostCreator();

      expect(screen.getByDisplayValue('Restored Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Restored content')).toBeInTheDocument();
      expect(screen.getByText('restored')).toBeInTheDocument();
    });

    it('should clear draft after successful submission', async () => {
      const { postService } = await import('../../../services/postService');
      vi.mocked(postService.createPost).mockResolvedValue({
        id: 'post-123',
        authorId: 'user-123',
        title: 'Test Post',
        content: 'Test content',
        visibility: 'public',
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      renderPostCreator();

      // Fill and submit form
      await user.type(screen.getByPlaceholderText('Post title...'), 'Test Post');
      await user.type(screen.getByPlaceholderText('What would you like to share?'), 'Test content');

      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('postDraft');
      });
    });
  });
});