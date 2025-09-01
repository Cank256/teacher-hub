/**
 * Posts Service Tests
 */

// Mock ApiClient before importing postsService
jest.mock('../apiClient', () => ({
  ApiClient: {
    getInstance: jest.fn(() => ({
      getPaginated: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      uploadFile: jest.fn(),
    })),
  },
}));

import { postsService } from '../postsService';
import { ApiClient } from '../apiClient';
import { 
  Post, 
  PostCategory, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostFilters, 
  PostVisibility,
  PostSortBy,
  SharePlatform,
} from '../../../types/posts';

// Mock ApiClient
jest.mock('../apiClient');
const mockApiClient = ApiClient.getInstance() as jest.Mocked<ApiClient>;

// Test data
const mockPost: Post = {
  id: 'post-1',
  title: 'Test Post',
  content: 'Test content',
  author: {
    id: 'user-1',
    email: 'test@example.com',
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
  likes: 10,
  comments: 5,
  shares: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  isLiked: false,
  isBookmarked: false,
  visibility: PostVisibility.PUBLIC,
};

const mockCategory: PostCategory = {
  id: 'cat-1',
  name: 'Mathematics',
  color: '#3B82F6',
  icon: 'calculator-outline',
};

describe('PostsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    it('should fetch posts with default parameters', async () => {
      const mockResponse = {
        data: [mockPost],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await postsService.getPosts();

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/posts',
        { page: 1, limit: 20 },
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch posts with custom parameters and filters', async () => {
      const filters: PostFilters = {
        category: 'math',
        sortBy: PostSortBy.LIKES,
        sortOrder: 'desc',
      };

      const mockResponse = {
        data: [mockPost],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await postsService.getPosts(2, 10, filters);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/posts',
        { page: 2, limit: 10, ...filters },
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPostById', () => {
    it('should fetch post by ID', async () => {
      const mockResponse = {
        data: {
          post: mockPost,
          comments: [],
          relatedPosts: [],
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await postsService.getPostById('post-1');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/posts/post-1',
        undefined,
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const postData: CreatePostRequest = {
        title: 'New Post',
        content: 'New content',
        categoryId: 'cat-1',
        visibility: PostVisibility.PUBLIC,
      };

      const mockResponse = { data: mockPost };
      mockApiClient.uploadFile.mockResolvedValue(mockResponse);

      const result = await postsService.createPost(postData);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/posts',
        expect.any(FormData),
        { requiresAuth: true }
      );
      expect(result).toEqual(mockPost);
    });

    it('should create post with media attachments', async () => {
      const postData: CreatePostRequest = {
        title: 'New Post',
        content: 'New content',
        categoryId: 'cat-1',
        visibility: PostVisibility.PUBLIC,
        mediaAttachments: [new File([''], 'test.jpg')] as any,
      };

      const mockResponse = { data: mockPost };
      mockApiClient.uploadFile.mockResolvedValue(mockResponse);

      const result = await postsService.createPost(postData);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/posts',
        expect.any(FormData),
        { requiresAuth: true }
      );
      expect(result).toEqual(mockPost);
    });
  });

  describe('updatePost', () => {
    it('should update an existing post', async () => {
      const updates: UpdatePostRequest = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const updatedPost = { ...mockPost, ...updates };
      const mockResponse = { data: updatedPost };
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await postsService.updatePost('post-1', updates);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/posts/post-1',
        updates,
        { requiresAuth: true }
      );
      expect(result).toEqual(updatedPost);
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await postsService.deletePost('post-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/posts/post-1',
        { requiresAuth: true }
      );
    });
  });

  describe('toggleLike', () => {
    it('should toggle post like', async () => {
      const mockResponse = {
        data: { isLiked: true, likesCount: 11 },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await postsService.toggleLike('post-1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/posts/post-1/like',
        {},
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('toggleBookmark', () => {
    it('should toggle post bookmark', async () => {
      const mockResponse = {
        data: { isBookmarked: true },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await postsService.toggleBookmark('post-1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/posts/post-1/bookmark',
        {},
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('sharePost', () => {
    it('should share a post', async () => {
      const shareData = {
        platform: SharePlatform.WHATSAPP,
        message: 'Check this out!',
      };

      mockApiClient.post.mockResolvedValue(undefined);

      await postsService.sharePost('post-1', shareData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/posts/post-1/share',
        shareData,
        { requiresAuth: true }
      );
    });
  });

  describe('getCategories', () => {
    it('should fetch post categories', async () => {
      const mockResponse = {
        data: { categories: [mockCategory] },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await postsService.getCategories();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/posts/categories',
        undefined,
        { requiresAuth: true }
      );
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('getComments', () => {
    it('should fetch post comments', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await postsService.getComments('post-1');

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/posts/post-1/comments',
        { page: 1, limit: 20 },
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a post', async () => {
      const commentData = {
        content: 'Great post!',
      };

      const mockComment = {
        id: 'comment-1',
        postId: 'post-1',
        author: mockPost.author,
        content: 'Great post!',
        parentId: undefined,
        replies: [],
        likes: 0,
        isLiked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse = { data: mockComment };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await postsService.addComment('post-1', commentData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/posts/post-1/comments',
        commentData,
        { requiresAuth: true }
      );
      expect(result).toEqual(mockComment);
    });
  });

  describe('searchPosts', () => {
    it('should search posts with query and filters', async () => {
      const query = 'mathematics';
      const filters: PostFilters = {
        category: 'math',
      };

      const mockResponse = {
        data: [mockPost],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await postsService.searchPosts(query, filters);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/posts/search',
        { q: query, page: 1, limit: 20, ...filters },
        { requiresAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTrendingPosts', () => {
    it('should fetch trending posts', async () => {
      const mockResponse = {
        data: { posts: [mockPost] },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await postsService.getTrendingPosts(5);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/posts/trending',
        { limit: 5 },
        { requiresAuth: true }
      );
      expect(result).toEqual([mockPost]);
    });
  });

  describe('reportPost', () => {
    it('should report a post', async () => {
      const reason = 'spam';
      const description = 'This post is spam';

      mockApiClient.post.mockResolvedValue(undefined);

      await postsService.reportPost('post-1', reason, description);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/posts/post-1/report',
        { reason, description },
        { requiresAuth: true }
      );
    });
  });
});