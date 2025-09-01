/**
 * PostCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PostCard from '../PostCard';
import { ThemeProvider } from '../../../../theme/ThemeContext';
import { lightTheme } from '../../../../theme/theme';
import { Post, PostVisibility, PostCategory, User, VerificationStatus } from '../../../../types/posts';

// Mock dependencies
jest.mock('../../../../services/haptics', () => ({
  HapticService: {
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    buttonPress: jest.fn(),
  },
}));

// These are already mocked in setup.ts, but we can add specific mocks if needed

// Mock React Query hooks
jest.mock('../../../../services/api/hooks/usePosts', () => ({
  useTogglePostLike: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useTogglePostBookmark: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useSharePost: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

// Test data
const mockUser: User = {
  id: 'user-1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profilePicture: 'https://example.com/avatar.jpg',
  subjects: [],
  gradeLevels: [],
  schoolLocation: {
    id: 'loc-1',
    name: 'Kampala',
    district: 'Kampala',
    region: 'Central',
  },
  yearsOfExperience: 5,
  verificationStatus: VerificationStatus.VERIFIED,
  createdAt: new Date('2023-01-01'),
  lastActiveAt: new Date('2024-01-01'),
};

const mockCategory: PostCategory = {
  id: 'cat-1',
  name: 'Mathematics',
  color: '#3B82F6',
  icon: 'calculator-outline',
  description: 'Math related posts',
};

const mockPost: Post = {
  id: 'post-1',
  title: 'Test Post Title',
  content: 'This is a test post content that should be displayed in the card.',
  author: mockUser,
  category: mockCategory,
  mediaAttachments: [],
  likes: 10,
  comments: 5,
  shares: 2,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isLiked: false,
  isBookmarked: false,
  visibility: PostVisibility.PUBLIC,
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialTheme={lightTheme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('PostCard', () => {
  const defaultProps = {
    post: mockPost,
    onPress: jest.fn(),
    onAuthorPress: jest.fn(),
    onCategoryPress: jest.fn(),
    onCommentPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post content correctly', () => {
    render(
      <TestWrapper>
        <PostCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Post Title')).toBeTruthy();
    expect(screen.getByText(/This is a test post content/)).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy(); // likes count
    expect(screen.getByText('5')).toBeTruthy(); // comments count
    expect(screen.getByText('2')).toBeTruthy(); // shares count
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} onPress={onPress} />
      </TestWrapper>
    );

    fireEvent.press(screen.getByTestId('post-card-post-1'));
    expect(onPress).toHaveBeenCalledWith(mockPost);
  });

  it('calls onAuthorPress when author info is pressed', () => {
    const onAuthorPress = jest.fn();
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} onAuthorPress={onAuthorPress} />
      </TestWrapper>
    );

    fireEvent.press(screen.getByLabelText("View John Doe's profile"));
    expect(onAuthorPress).toHaveBeenCalledWith('user-1');
  });

  it('calls onCategoryPress when category badge is pressed', () => {
    const onCategoryPress = jest.fn();
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} onCategoryPress={onCategoryPress} />
      </TestWrapper>
    );

    fireEvent.press(screen.getByLabelText('View posts in Mathematics category'));
    expect(onCategoryPress).toHaveBeenCalledWith('cat-1');
  });

  it('calls onCommentPress when comment button is pressed', () => {
    const onCommentPress = jest.fn();
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} onCommentPress={onCommentPress} />
      </TestWrapper>
    );

    fireEvent.press(screen.getByLabelText('View 5 comments'));
    expect(onCommentPress).toHaveBeenCalledWith(mockPost);
  });

  it('shows like button in correct state', () => {
    const likedPost = { ...mockPost, isLiked: true };
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} post={likedPost} />
      </TestWrapper>
    );

    const likeButton = screen.getByLabelText('Unlike post');
    expect(likeButton).toBeTruthy();
  });

  it('shows bookmark button in correct state', () => {
    const bookmarkedPost = { ...mockPost, isBookmarked: true };
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} post={bookmarkedPost} />
      </TestWrapper>
    );

    const bookmarkButton = screen.getByLabelText('Remove bookmark');
    expect(bookmarkButton).toBeTruthy();
  });

  it('truncates long content and shows read more button', () => {
    const longContentPost = {
      ...mockPost,
      content: 'A'.repeat(300), // Long content that should be truncated
    };
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} post={longContentPost} />
      </TestWrapper>
    );

    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('shows full content when showFullContent is true', () => {
    const longContentPost = {
      ...mockPost,
      content: 'A'.repeat(300),
    };
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} post={longContentPost} showFullContent={true} />
      </TestWrapper>
    );

    // Should not show read more button when showing full content
    expect(screen.queryByText('Read more')).toBeNull();
  });

  it('handles like button press', async () => {
    render(
      <TestWrapper>
        <PostCard {...defaultProps} />
      </TestWrapper>
    );

    const likeButton = screen.getByLabelText('Like post');
    fireEvent.press(likeButton);

    // Should trigger haptic feedback and mutation
    await waitFor(() => {
      expect(require('../../../../services/haptics').HapticService.light).toHaveBeenCalled();
    });
  });

  it('handles bookmark button press', async () => {
    render(
      <TestWrapper>
        <PostCard {...defaultProps} />
      </TestWrapper>
    );

    const bookmarkButton = screen.getByLabelText('Bookmark post');
    fireEvent.press(bookmarkButton);

    // Should trigger haptic feedback and mutation
    await waitFor(() => {
      expect(require('../../../../services/haptics').HapticService.light).toHaveBeenCalled();
    });
  });

  it('handles share button press', async () => {
    // Mock Share.share
    const mockShare = jest.fn().mockResolvedValue({ action: 'sharedAction' });
    jest.doMock('react-native', () => ({
      ...jest.requireActual('react-native'),
      Share: { share: mockShare, sharedAction: 'sharedAction' },
    }));

    render(
      <TestWrapper>
        <PostCard {...defaultProps} />
      </TestWrapper>
    );

    const shareButton = screen.getByLabelText('Share post');
    fireEvent.press(shareButton);

    // Should trigger haptic feedback
    await waitFor(() => {
      expect(require('../../../../services/haptics').HapticService.medium).toHaveBeenCalled();
    });
  });

  it('displays relative timestamp correctly', () => {
    const recentPost = {
      ...mockPost,
      createdAt: new Date(Date.now() - 60000), // 1 minute ago
    };
    
    render(
      <TestWrapper>
        <PostCard {...defaultProps} post={recentPost} />
      </TestWrapper>
    );

    expect(screen.getByText(/minute ago/)).toBeTruthy();
  });

  it('applies correct accessibility labels', () => {
    render(
      <TestWrapper>
        <PostCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByLabelText("View John Doe's profile")).toBeTruthy();
    expect(screen.getByLabelText('View posts in Mathematics category')).toBeTruthy();
    expect(screen.getByLabelText('Like post')).toBeTruthy();
    expect(screen.getByLabelText('View 5 comments')).toBeTruthy();
    expect(screen.getByLabelText('Share post')).toBeTruthy();
    expect(screen.getByLabelText('Bookmark post')).toBeTruthy();
  });
});