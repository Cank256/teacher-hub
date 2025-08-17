import request from 'supertest';
import { app } from '../../index';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';

// Mock database connection
jest.mock('../../database/connection');

describe('Posts API Integration Tests', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    // Mock authentication
    userId = 'user-123';
    authToken = 'mock-jwt-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/posts', () => {
    it('should create a new post successfully', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content',
        visibility: 'public',
        tags: ['education', 'test'],
        mediaAttachments: []
      };

      const mockCreatedPost = {
        id: 'post-123',
        authorId: userId,
        ...postData,
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCreatedPost] });

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedPost
      });
    });

    it('should return 400 for invalid post data', async () => {
      const invalidPostData = {
        title: '', // Empty title
        content: 'Content without title',
        visibility: 'invalid' // Invalid visibility
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPostData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Content',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authentication');
    });
  });

  describe('GET /api/posts/feed', () => {
    it('should return paginated feed posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          authorId: 'user-456',
          title: 'Post 1',
          content: 'Content 1',
          likeCount: 5,
          commentCount: 2,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-456',
            fullName: 'John Doe',
            profileImageUrl: '/profiles/john.jpg'
          }
        },
        {
          id: 'post-2',
          authorId: 'user-789',
          title: 'Post 2',
          content: 'Content 2',
          likeCount: 3,
          commentCount: 1,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-789',
            fullName: 'Jane Smith',
            profileImageUrl: '/profiles/jane.jpg'
          }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockPosts }) // Get posts
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Get total count

      const response = await request(app)
        .get('/api/posts/feed?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          posts: mockPosts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        }
      });
    });

    it('should handle empty feed', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No posts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Zero count

      const response = await request(app)
        .get('/api/posts/feed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.posts).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update post successfully', async () => {
      const postId = 'post-123';
      const updates = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const mockExistingPost = {
        id: postId,
        authorId: userId,
        title: 'Original Title',
        content: 'Original content'
      };

      const mockUpdatedPost = {
        ...mockExistingPost,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockExistingPost] }) // Get existing post
        .mockResolvedValueOnce({ rows: [mockUpdatedPost] }); // Update post

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedPost
      });
    });

    it('should return 403 for unauthorized update', async () => {
      const postId = 'post-123';
      const updates = { title: 'Updated Title' };

      const mockExistingPost = {
        id: postId,
        authorId: 'different-user', // Different author
        title: 'Original Title'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockExistingPost] });

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 404 for non-existent post', async () => {
      const postId = 'non-existent';
      const updates = { title: 'Updated Title' };

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Post not found

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete post successfully', async () => {
      const postId = 'post-123';

      const mockExistingPost = {
        id: postId,
        authorId: userId,
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

      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Post deleted successfully'
      });
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('should like post successfully', async () => {
      const postId = 'post-123';

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing like
        .mockResolvedValueOnce({ rows: [{ id: 'like-123' }] }) // Insert like
        .mockResolvedValueOnce({ rows: [] }); // Update like count

      const response = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Post liked successfully'
      });
    });

    it('should return 400 if already liked', async () => {
      const postId = 'post-123';

      const existingLike = { id: 'like-123', postId, userId };
      mockDb.query.mockResolvedValueOnce({ rows: [existingLike] });

      const response = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already liked');
    });
  });

  describe('DELETE /api/posts/:id/like', () => {
    it('should unlike post successfully', async () => {
      const postId = 'post-123';

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Delete like
        .mockResolvedValueOnce({ rows: [] }); // Update like count

      const response = await request(app)
        .delete(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Post unliked successfully'
      });
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    it('should add comment successfully', async () => {
      const postId = 'post-123';
      const commentData = {
        content: 'This is a great post!'
      };

      const mockComment = {
        id: 'comment-123',
        postId,
        authorId: userId,
        content: commentData.content,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockComment] }) // Insert comment
        .mockResolvedValueOnce({ rows: [] }); // Update comment count

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockComment
      });
    });

    it('should add nested comment successfully', async () => {
      const postId = 'post-123';
      const parentCommentId = 'comment-456';
      const commentData = {
        content: 'This is a reply',
        parentCommentId
      };

      const mockComment = {
        id: 'comment-789',
        postId,
        authorId: userId,
        parentCommentId,
        content: commentData.content,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: parentCommentId }] }) // Verify parent exists
        .mockResolvedValueOnce({ rows: [mockComment] }) // Insert comment
        .mockResolvedValueOnce({ rows: [] }); // Update comment count

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.data.parentCommentId).toBe(parentCommentId);
    });
  });

  describe('GET /api/posts/:id/comments', () => {
    it('should return paginated comments', async () => {
      const postId = 'post-123';

      const mockComments = [
        {
          id: 'comment-1',
          postId,
          authorId: 'user-456',
          content: 'Great post!',
          likeCount: 2,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-456',
            fullName: 'John Doe',
            profileImageUrl: '/profiles/john.jpg'
          }
        },
        {
          id: 'comment-2',
          postId,
          authorId: 'user-789',
          content: 'Thanks for sharing!',
          likeCount: 1,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-789',
            fullName: 'Jane Smith',
            profileImageUrl: '/profiles/jane.jpg'
          }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockComments }) // Get comments
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Get total count

      const response = await request(app)
        .get(`/api/posts/${postId}/comments?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          comments: mockComments,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        }
      });
    });
  });
});