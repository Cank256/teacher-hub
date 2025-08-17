import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { PostCard } from '../posts/PostCard';
import { PostCreator } from '../posts/PostCreator';
import { CommunityCard } from '../communities/CommunityCard';
import { CommunityCreator } from '../communities/CommunityCreator';
import { MessageThread } from '../messaging/MessageThread';
import { ResourceUploader } from '../resources/ResourceUploader';
import { postsSlice } from '../../store/slices/postsSlice';
import { authSlice } from '../../store/slices/authSlice';
import { communitiesSlice } from '../../store/slices/communitiesSlice';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

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
      communities: [],
      userCommunities: [],
      loading: false,
      error: null,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Accessibility Tests', () => {
  describe('PostCard Accessibility', () => {
    const mockPost = {
      id: 'post-123',
      authorId: 'user-456',
      title: 'Accessible Post Title',
      content: 'This is an accessible post with proper semantic structure.',
      visibility: 'public' as const,
      tags: ['education', 'accessibility'],
      mediaAttachments: [],
      likeCount: 5,
      commentCount: 3,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: 'user-456',
        fullName: 'John Doe',
        email: 'john@example.com',
        profileImageUrl: '/profiles/john.jpg',
      },
      isLiked: false,
    };

    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<PostCard post={mockPost} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<PostCard post={mockPost} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Accessible Post Title');
    });

    it('should have proper ARIA labels for interactive elements', () => {
      renderWithProviders(<PostCard post={mockPost} />);
      
      expect(screen.getByLabelText('Like post')).toBeInTheDocument();
      expect(screen.getByLabelText('Show comments')).toBeInTheDocument();
      expect(screen.getByLabelText('Share post')).toBeInTheDocument();
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
    });

    it('should have proper alt text for images', () => {
      renderWithProviders(<PostCard post={mockPost} />);
      
      const authorImage = screen.getByAltText('John Doe');
      expect(authorImage).toBeInTheDocument();
    });

    it('should have proper button roles and states', () => {
      renderWithProviders(<PostCard post={mockPost} />);
      
      const likeButton = screen.getByLabelText('Like post');
      expect(likeButton).toHaveAttribute('role', 'button');
      expect(likeButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have proper semantic structure', () => {
      const { container } = renderWithProviders(<PostCard post={mockPost} />);
      
      expect(container.querySelector('article')).toBeInTheDocument();
      expect(container.querySelector('time')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<PostCard post={mockPost} />);
      
      const likeButton = screen.getByLabelText('Like post');
      expect(likeButton).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('PostCreator Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<PostCreator />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      renderWithProviders(<PostCreator />);
      
      expect(screen.getByLabelText('Post title')).toBeInTheDocument();
      expect(screen.getByLabelText('Post content')).toBeInTheDocument();
      expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
    });

    it('should have proper form validation messages', async () => {
      renderWithProviders(<PostCreator />);
      
      const submitButton = screen.getByText('Post');
      submitButton.click();

      const errorMessage = await screen.findByText('Title is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper fieldset and legend for related fields', () => {
      renderWithProviders(<PostCreator />);
      
      const visibilityFieldset = screen.getByRole('group', { name: /visibility settings/i });
      expect(visibilityFieldset).toBeInTheDocument();
    });

    it('should have proper file upload accessibility', () => {
      renderWithProviders(<PostCreator />);
      
      const fileInput = screen.getByLabelText('Add media');
      expect(fileInput).toHaveAttribute('aria-describedby');
      expect(fileInput).toHaveAttribute('accept');
    });

    it('should announce dynamic content changes', () => {
      renderWithProviders(<PostCreator />);
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('CommunityCard Accessibility', () => {
    const mockCommunity = {
      id: 'community-123',
      name: 'Accessible Community',
      description: 'A community focused on accessibility in education.',
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
        fullName: 'Jane Smith',
        email: 'jane@example.com',
      },
      userMembership: null,
    };

    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<CommunityCard community={mockCommunity} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<CommunityCard community={mockCommunity} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Accessible Community');
    });

    it('should have proper link accessibility', () => {
      renderWithProviders(<CommunityCard community={mockCommunity} />);
      
      const communityLink = screen.getByRole('link', { name: /accessible community/i });
      expect(communityLink).toHaveAttribute('href');
    });

    it('should have proper button states for membership', () => {
      renderWithProviders(<CommunityCard community={mockCommunity} />);
      
      const joinButton = screen.getByText('Join');
      expect(joinButton).toHaveAttribute('aria-describedby');
    });

    it('should have proper statistics presentation', () => {
      renderWithProviders(<CommunityCard community={mockCommunity} />);
      
      const memberCount = screen.getByText('25 members');
      expect(memberCount).toHaveAttribute('aria-label', '25 members');
      
      const postCount = screen.getByText('15 posts');
      expect(postCount).toHaveAttribute('aria-label', '15 posts');
    });
  });

  describe('CommunityCreator Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<CommunityCreator />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<CommunityCreator />);
      
      expect(screen.getByLabelText('Community name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Community type')).toBeInTheDocument();
    });

    it('should have proper checkbox accessibility', () => {
      renderWithProviders(<CommunityCreator />);
      
      const privateCheckbox = screen.getByLabelText('Private community');
      expect(privateCheckbox).toHaveAttribute('role', 'checkbox');
      expect(privateCheckbox).toHaveAttribute('aria-checked');
    });

    it('should have proper rules section accessibility', () => {
      renderWithProviders(<CommunityCreator />);
      
      const rulesSection = screen.getByRole('group', { name: /community rules/i });
      expect(rulesSection).toBeInTheDocument();
    });

    it('should announce form validation errors', async () => {
      renderWithProviders(<CommunityCreator />);
      
      const submitButton = screen.getByText('Create Community');
      submitButton.click();

      const errorMessage = await screen.findByText('Community name is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('MessageThread Accessibility', () => {
    const mockMessages = [
      {
        id: 'message-1',
        senderId: 'user-456',
        content: 'Hello, how are you?',
        timestamp: new Date(),
        sender: {
          id: 'user-456',
          fullName: 'John Doe',
          profileImageUrl: '/profiles/john.jpg',
        },
      },
      {
        id: 'message-2',
        senderId: 'user-123',
        content: 'I am doing well, thank you!',
        timestamp: new Date(),
        sender: {
          id: 'user-123',
          fullName: 'Test User',
          profileImageUrl: '/profiles/test.jpg',
        },
      },
    ];

    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper message list structure', () => {
      renderWithProviders(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );
      
      const messageList = screen.getByRole('log');
      expect(messageList).toHaveAttribute('aria-label', 'Message history');
    });

    it('should have proper message accessibility', () => {
      renderWithProviders(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );
      
      const messages = screen.getAllByRole('article');
      expect(messages).toHaveLength(2);
      
      messages.forEach(message => {
        expect(message).toHaveAttribute('aria-labelledby');
      });
    });

    it('should have proper input accessibility', () => {
      renderWithProviders(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );
      
      const messageInput = screen.getByLabelText('Type a message');
      expect(messageInput).toHaveAttribute('aria-describedby');
      
      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeInTheDocument();
    });

    it('should announce new messages to screen readers', () => {
      renderWithProviders(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('ResourceUploader Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<ResourceUploader />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper file input accessibility', () => {
      renderWithProviders(<ResourceUploader />);
      
      const fileInput = screen.getByLabelText('Upload resource file');
      expect(fileInput).toHaveAttribute('aria-describedby');
      expect(fileInput).toHaveAttribute('accept');
    });

    it('should have proper drag and drop accessibility', () => {
      renderWithProviders(<ResourceUploader />);
      
      const dropZone = screen.getByRole('button', { name: /drag and drop/i });
      expect(dropZone).toHaveAttribute('aria-describedby');
      expect(dropZone).toHaveAttribute('tabIndex', '0');
    });

    it('should announce upload progress', () => {
      renderWithProviders(<ResourceUploader />);
      
      const progressRegion = screen.getByRole('progressbar');
      expect(progressRegion).toHaveAttribute('aria-label');
      expect(progressRegion).toHaveAttribute('aria-valuenow');
    });

    it('should have proper form validation', async () => {
      renderWithProviders(<ResourceUploader />);
      
      const submitButton = screen.getByText('Upload');
      submitButton.click();

      const errorMessage = await screen.findByText('Please select a file');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text', async () => {
      const { container } = renderWithProviders(
        <PostCard post={{
          id: 'post-123',
          authorId: 'user-456',
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
          author: {
            id: 'user-456',
            fullName: 'Test Author',
            email: 'test@example.com',
          },
          isLiked: false,
        }} />
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should not rely solely on color for information', () => {
      renderWithProviders(<PostCard post={{
        id: 'post-123',
        authorId: 'user-456',
        title: 'Test Post',
        content: 'Test content',
        visibility: 'public',
        tags: ['important'],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      }} />);

      // Pinned posts should have both visual and text indicators
      expect(screen.getByLabelText('Pinned post')).toBeInTheDocument();
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should have proper focus indicators', () => {
      renderWithProviders(<PostCreator />);
      
      const titleInput = screen.getByLabelText('Post title');
      titleInput.focus();
      expect(titleInput).toHaveFocus();
      expect(titleInput).toHaveClass('focus:ring-2');
    });

    it('should trap focus in modal dialogs', () => {
      // This would test modal focus trapping
      // Implementation depends on modal component structure
    });

    it('should restore focus after modal closes', () => {
      // This would test focus restoration
      // Implementation depends on modal component structure
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper landmark roles', () => {
      const { container } = renderWithProviders(
        <div>
          <PostCard post={{
            id: 'post-123',
            authorId: 'user-456',
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
            author: {
              id: 'user-456',
              fullName: 'Test Author',
              email: 'test@example.com',
            },
            isLiked: false,
          }} />
        </div>
      );

      expect(container.querySelector('[role="article"]')).toBeInTheDocument();
    });

    it('should have proper live regions for dynamic content', () => {
      renderWithProviders(<PostCreator />);
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper descriptions for complex UI elements', () => {
      renderWithProviders(<ResourceUploader />);
      
      const fileInput = screen.getByLabelText('Upload resource file');
      const description = screen.getByText(/supported formats/i);
      expect(fileInput).toHaveAttribute('aria-describedby', description.id);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through interactive elements', () => {
      renderWithProviders(<PostCard post={{
        id: 'post-123',
        authorId: 'user-456',
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
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      }} />);

      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });

    it('should support Enter and Space key activation', () => {
      renderWithProviders(<PostCard post={{
        id: 'post-123',
        authorId: 'user-456',
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
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      }} />);

      const likeButton = screen.getByLabelText('Like post');
      expect(likeButton).toHaveAttribute('onKeyDown');
    });

    it('should have proper skip links for navigation', () => {
      // This would test skip link implementation
      // Implementation depends on layout structure
    });
  });
});