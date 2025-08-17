import { PostService } from '../postService';
import { DatabaseConnection } from '../../database/connection';
import { UserRepository } from '../../database/repositories/userRepository';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../../database/repositories/userRepository');

describe('PostService', () => {
  let postService: PostService;
  let mockDb: jest.Mocked<DatabaseConnection>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    } as any;

    postService = new PostService(mockDb, mockUserRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const authorId = 'user-123';
      const postData = {
        title: 'Test Post',
        content: 'This is a test post',
        visibility: 'public' as const,
        tags: ['education', 'test'],
        mediaAttachments: []
      };

      const mockPost = {
        id: 'post-123',
        authorId,
        ...postData,
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPost] });

      const result = await postService.createPost(authorId, postData);

      expect(result).toEqual(mockPost);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.arrayContaining([authorId, postData.title, postData.content])
      );
    });

    it('should throw error for invalid author', async () => {
      const authorId = 'invalid-user';
      const postData = {
        title: 'Test Post',
        content: 'This is a test post',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: []
      };

      mockUserRepo.findById.mockResolvedValueOnce(null);

      await expect(postService.createPost(authorId, postData)).rejects.toThrow('User not found');
    });

    it('should validate post content length', async () => {
      const authorId = 'user-123';
      const postData = {
        title: 'Test Post',
        content: 'a'.repeat(10001), // Exceeds max length
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: []
      };

      await expect(postService.createPost(authorId, postData)).rejects.toThrow('Content too long');
    });
  });

  describe('updatePost', () => {
    it('should update post successfully', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const updates = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const mockExistingPost = {
        id: postId,
        authorId,
        title: 'Original Title',
        content: 'Original content',
        visibility: 'public',
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedPost = {
        ...mockExistingPost,
        ...updates,
        updatedAt: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockExistingPost] }) // Get existing post
        .mockResolvedValueOnce({ rows: [mockUpdatedPost] }); // Update post

      const result = await postService.updatePost(postId, authorId, updates);

      expect(result).toEqual(mockUpdatedPost);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unauthorized update', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const wrongAuthorId = 'user-456';
      const updates = { title: 'Updated Title' };

      const mockExistingPost = {
        id: postId,
        authorId: wrongAuthorId,
        title: 'Original Title'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockExistingPost] });

      await expect(postService.updatePost(postId, authorId, updates)).rejects.toThrow('Unauthorized');
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';

      const mockExistingPost = {
        id: postId,
        authorId,
        title: 'Test Post'
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockExistingPost] }) // Get existing post
        .mockResolvedValueOnce({ rows: [] }) // Delete comments
        .mockResolvedValueOnce({ rows: [] }) // Delete likes
        .mockResolvedValueOnce({ rows: [] }); // Delete post

      await postService.deletePost(postId, authorId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('getFeedPosts', () => {
    it('should return paginated feed posts', async () => {
      const userId = 'user-123';
      const pagination = { page: 1, limit: 10 };

      const mockPosts = [
        {
          id: 'post-1',
          authorId: 'user-456',
          title: 'Post 1',
          content: 'Content 1',
          likeCount: 5,
          commentCount: 2,
          createdAt: new Date()
        },
        {
          id: 'post-2',
          authorId: 'user-789',
          title: 'Post 2',
          content: 'Content 2',
          likeCount: 3,
          commentCount: 1,
          createdAt: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockPosts }) // Get posts
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Get total count

      const result = await postService.getFeedPosts(userId, pagination);

      expect(result.data).toEqual(mockPosts);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('likePost', () => {
    it('should like post successfully', async () => {
      const postId = 'post-123';
      const userId = 'user-123';

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing like
        .mockResolvedValueOnce({ rows: [{ id: 'like-123' }] }) // Insert like
        .mockResolvedValueOnce({ rows: [] }); // Update like count

      await postService.likePost(postId, userId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should not like post twice', async () => {
      const postId = 'post-123';
      const userId = 'user-123';

      const existingLike = { id: 'like-123', postId, userId };
      mockDb.query.mockResolvedValueOnce({ rows: [existingLike] });

      await expect(postService.likePost(postId, userId)).rejects.toThrow('Already liked');
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const content = 'This is a comment';

      const mockComment = {
        id: 'comment-123',
        postId,
        authorId,
        content,
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockComment] }) // Insert comment
        .mockResolvedValueOnce({ rows: [] }); // Update comment count

      const result = await postService.addComment(postId, authorId, content);

      expect(result).toEqual(mockComment);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should add nested comment successfully', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const content = 'This is a reply';
      const parentCommentId = 'comment-456';

      const mockComment = {
        id: 'comment-789',
        postId,
        authorId,
        parentCommentId,
        content,
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: parentCommentId }] }) // Verify parent exists
        .mockResolvedValueOnce({ rows: [mockComment] }) // Insert comment
        .mockResolvedValueOnce({ rows: [] }); // Update comment count

      const result = await postService.addComment(postId, authorId, content, parentCommentId);

      expect(result).toEqual(mockComment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });
  });
});