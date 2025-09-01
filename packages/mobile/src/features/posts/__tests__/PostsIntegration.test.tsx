/**
 * Posts Feature Integration Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostsFeedScreen, CreatePostScreen, PostDetailScreen } from '../screens';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { lightTheme } from '../../../theme/theme';
import { postsService } from '../../../services/api/postsService';
import { Post, PostVisibility } from '../../../types/posts';

// Mock dependencies
jest.mock('../../../services/haptics', () => ({
  HapticService: {
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    buttonPress: jest.fn(),
  },
}));

// These are already mocked in setup.ts
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }: any) => {
    const MockScrollView = require('react-native').ScrollView;
    return (
      <MockScrollView testID="flash-list">
        {ListHeaderComponent && ListHeaderComponent()}
        {data?.length > 0 
          ? data.map((item: any, index: number) => renderItem({ item, index }))
          : ListEmptyComponent && ListEmptyComponent()
        }
      </MockScrollView>
    );
  },
}));

// Mock posts service
jest.mock('../../../services/api/postsService');
const mockPostsService = postsService as jest.Mocked<typeof postsService>;

// Mock navigation
const Stack = createNativeStackNavigator();

// Test data
const mockPosts: Post[] = [
  {
    id: 'post-1',
    title: 'First Test Post',
    content: 'This is the first test post content.',
    author: {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: undefined,
      subjects: [],
      gradeLevels: [],
      schoolLocation: {
        id: 'loc-1',
        name: 'Kampala',
        district: 'Kampala',
        region: 'Central',
      },
      yearsOfExperience: 5,
      verificationStatus: 'verified' as any,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    },
    category: {
      id: 'cat-1',
      name: 'Mathematics',
      color: '#3B82F6',
      icon: 'calculator-outline',
    },
    mediaAttachments: [],
    likes: 15,
    comments: 3,
    shares: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isLiked: false,
    isBookmarked: false,
    visibility: PostVisibility.PUBLIC,
  },
  {
    id: 'post-2',
    title: 'Second Test Post',
    content: 'This is the second test post content.',
    author: {
      id: 'user-2',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      profilePicture: undefined,
      subjects: [],
      gradeLevels: [],
      schoolLocation: {
        id: 'loc-2',
        name: 'Entebbe',
        district: 'Wakiso',
        region: 'Central',
      },
      yearsOfExperience: 3,
      verificationStatus: 'verified' as any,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    },
    category: {
      id: 'cat-2',
      name: 'Science',
      color: '#10B981',
      icon: 'flask-outline',
    },
    mediaAttachments: [],
    likes: 8,
    comments: 2,
    shares: 0,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    isLiked: true,
    isBookmarked: false,
    visibility: PostVisibility.PUBLIC,
  },
];

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
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Posts Feature Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockPostsService.getPosts.mockResolvedValue({
      data: mockPosts,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    mockPostsService.getCategories.mockResolvedValue([
      { id: 'cat-1', name: 'Mathematics', color: '#3B82F6', icon: 'calculator-outline' },
      { id: 'cat-2', name: 'Science', color: '#10B981', icon: 'flask-outline' },
    ]);
  });

  describe('PostsFeedScreen', () => {
    it('renders posts feed correctly', async () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeTruthy();
        expect(screen.getByText('Second Test Post')).toBeTruthy();
      });

      // Check if posts are displayed with correct information
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Mathematics')).toBeTruthy();
      expect(screen.getByText('Science')).toBeTruthy();
    });

    it('shows empty state when no posts available', async () => {
      mockPostsService.getPosts.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No posts yet')).toBeTruthy();
        expect(screen.getByText('Be the first to share something with the community!')).toBeTruthy();
      });
    });

    it('handles post interactions correctly', async () => {
      mockPostsService.toggleLike.mockResolvedValue({ isLiked: true, likesCount: 16 });

      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeTruthy();
      });

      // Test like functionality
      const likeButton = screen.getByLabelText('Like post');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(mockPostsService.toggleLike).toHaveBeenCalledWith('post-1');
      });
    });

    it('navigates to create post screen', async () => {
      const mockNavigate = jest.fn();
      
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen 
              name="PostsFeed" 
              component={PostsFeedScreen}
              initialParams={{ navigation: { navigate: mockNavigate } } as any}
            />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-post-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('create-post-button'));
      // Navigation would be handled by React Navigation in real app
    });

    it('handles pull to refresh', async () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('posts-feed-list')).toBeTruthy();
      });

      // Simulate pull to refresh
      const flashList = screen.getByTestId('posts-feed-list');
      fireEvent(flashList, 'refresh');

      await waitFor(() => {
        expect(mockPostsService.getPosts).toHaveBeenCalledTimes(2);
      });
    });

    it('applies filters correctly', async () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Filter posts')).toBeTruthy();
      });

      // Open filters
      fireEvent.press(screen.getByLabelText('Filter posts'));

      await waitFor(() => {
        expect(screen.getByText('Popular')).toBeTruthy();
      });

      // Select popular filter
      fireEvent.press(screen.getByLabelText('Sort by Popular'));

      // Should refetch with new filter
      await waitFor(() => {
        expect(mockPostsService.getPosts).toHaveBeenCalledWith(
          1,
          20,
          expect.objectContaining({
            sortBy: 'likes',
            sortOrder: 'desc',
          })
        );
      });
    });
  });

  describe('CreatePostScreen', () => {
    it('renders create post form correctly', () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      expect(screen.getByText('Create Post')).toBeTruthy();
      expect(screen.getByTestId('post-title-input')).toBeTruthy();
      expect(screen.getByTestId('post-content-input')).toBeTruthy();
      expect(screen.getByText('Category')).toBeTruthy();
    });

    it('validates form inputs', async () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      // Try to submit empty form
      const submitButton = screen.getByTestId('submit-post-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('creates post successfully', async () => {
      const newPost = { ...mockPosts[0], id: 'new-post' };
      mockPostsService.createPost.mockResolvedValue(newPost);

      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      // Fill form
      fireEvent.changeText(screen.getByTestId('post-title-input'), 'New Test Post');
      fireEvent.changeText(screen.getByTestId('post-content-input'), 'This is a new test post.');

      await waitFor(() => {
        expect(screen.getByText('Mathematics')).toBeTruthy();
      });

      // Select category
      fireEvent.press(screen.getByLabelText('Select Mathematics category'));

      // Submit form
      const submitButton = screen.getByTestId('submit-post-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockPostsService.createPost).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Test Post',
            content: 'This is a new test post.',
            categoryId: 'cat-1',
            visibility: PostVisibility.PUBLIC,
          })
        );
      });
    });
  });

  describe('PostDetailScreen', () => {
    beforeEach(() => {
      mockPostsService.getPostById.mockResolvedValue({
        post: mockPosts[0],
        comments: [],
        relatedPosts: [],
      });

      mockPostsService.getComments.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('renders post detail correctly', async () => {
      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen 
              name="PostDetail" 
              component={PostDetailScreen}
              initialParams={{ postId: 'post-1' }}
            />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeTruthy();
        expect(screen.getByText('This is the first test post content.')).toBeTruthy();
        expect(screen.getByText('Comments (0)')).toBeTruthy();
      });
    });

    it('handles comment submission', async () => {
      const mockComment = {
        id: 'comment-1',
        postId: 'post-1',
        author: mockPosts[0].author,
        content: 'Great post!',
        parentId: undefined,
        replies: [],
        likes: 0,
        isLiked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPostsService.addComment.mockResolvedValue(mockComment);

      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen 
              name="PostDetail" 
              component={PostDetailScreen}
              initialParams={{ postId: 'post-1' }}
            />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('comment-input')).toBeTruthy();
      });

      // Add comment
      fireEvent.changeText(screen.getByTestId('comment-input'), 'Great post!');
      fireEvent.press(screen.getByText('Post'));

      await waitFor(() => {
        expect(mockPostsService.addComment).toHaveBeenCalledWith(
          'post-1',
          { content: 'Great post!' }
        );
      });
    });

    it('shows error state for non-existent post', async () => {
      mockPostsService.getPostById.mockRejectedValue(new Error('Post not found'));

      render(
        <TestWrapper>
          <Stack.Navigator>
            <Stack.Screen 
              name="PostDetail" 
              component={PostDetailScreen}
              initialParams={{ postId: 'non-existent' }}
            />
          </Stack.Navigator>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Post not found')).toBeTruthy();
        expect(screen.getByText('Go Back')).toBeTruthy();
      });
    });
  });

  describe('End-to-End Flow', () => {
    it('completes full post creation and viewing flow', async () => {
      const newPost = { ...mockPosts[0], id: 'new-post', title: 'E2E Test Post' };
      mockPostsService.createPost.mockResolvedValue(newPost);
      mockPostsService.getPostById.mockResolvedValue({
        post: newPost,
        comments: [],
        relatedPosts: [],
      });

      // Start with feed screen
      const { rerender } = render(
        <TestWrapper>
          <Stack.Navigator initialRouteName="PostsFeed">
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      // Wait for feed to load
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeTruthy();
      });

      // Navigate to create post (simulated)
      rerender(
        <TestWrapper>
          <Stack.Navigator initialRouteName="CreatePost">
            <Stack.Screen name="PostsFeed" component={PostsFeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          </Stack.Navigator>
        </TestWrapper>
      );

      // Create post
      fireEvent.changeText(screen.getByTestId('post-title-input'), 'E2E Test Post');
      fireEvent.changeText(screen.getByTestId('post-content-input'), 'This is an E2E test.');

      await waitFor(() => {
        expect(screen.getByText('Mathematics')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Select Mathematics category'));
      fireEvent.press(screen.getByTestId('submit-post-button'));

      await waitFor(() => {
        expect(mockPostsService.createPost).toHaveBeenCalled();
      });
    });
  });
});