import { PostService } from '../postService';
import { getConnection } from '../../database/connection';

// Mock the database connection
jest.mock('../../database/connection');
jest.mock('../../utils/logger');

const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getConnection as jest.Mock).mockReturnValue(mockPool);
  mockPool.connect.mockResolvedValue(mockClient);
});

describe('PostService', () => {
  let postService: PostService;

  beforeEach(() => {
    postService = new PostService();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const mockPost = {
        id: 'post-id',
        author_id: 'user-id',
        community_id: null as string | null,
        title: 'Test Post',
        content: 'Test content',
        media_attachments: '[]',
        tags: '["test"]',
        visibility: 'public',
        like_count: 0,
        comment_count: 0,
        is_pinned: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPost] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await postService.createPost('user-id', {
        title: 'Test Post',
        content: 'Test content',
        tags: ['test'],
        visibility: 'public'
      });

      expect(result).toEqual({
        id: 'post-id',
        authorId: 'user-id',
        communityId: null,
        title: 'Test Post',
        content: 'Test content',
        mediaAttachments: [],
        tags: ['test'],
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: mockPost.created_at,
        updatedAt: mockPost.updated_at
      });
    });

    it('should throw error for community post when user is not a member', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // membership check

      await expect(
        postService.createPost('user-id', {
          title: 'Test Post',
          content: 'Test content',
          communityId: 'community-id',
          visibility: 'community'
        })
      ).rejects.toThrow('User is not a member of the specified community');
    });
  });

  describe('getPost', () => {
    it('should return post when user has access', async () => {
      const mockPost = {
        id: 'post-id',
        author_id: 'user-id',
        community_id: null as string | null,
        title: 'Test Post',
        content: 'Test content',
        media_attachments: '[]',
        tags: '["test"]',
        visibility: 'public',
        like_count: 0,
        comment_count: 0,
        is_pinned: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockPost] });

      const result = await postService.getPost('post-id', 'viewer-id');

      expect(result).toEqual({
        id: 'post-id',
        authorId: 'user-id',
        communityId: null,
        title: 'Test Post',
        content: 'Test content',
        mediaAttachments: [],
        tags: ['test'],
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: mockPost.created_at,
        updatedAt: mockPost.updated_at
      });
    });

    it('should return null when post not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await postService.getPost('non-existent-id', 'viewer-id');

      expect(result).toBeNull();
    });
  });

  describe('likePost', () => {
    it('should like a post successfully', async () => {
      const mockPost = {
        id: 'post-id',
        author_id: 'author-id',
        visibility: 'public'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPost] }) // post check
        .mockResolvedValueOnce({ rows: [] }) // existing like check
        .mockResolvedValueOnce({ rows: [] }) // insert like
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await expect(
        postService.likePost('post-id', 'user-id')
      ).resolves.not.toThrow();
    });

    it('should throw error when post already liked', async () => {
      const mockPost = {
        id: 'post-id',
        author_id: 'author-id',
        visibility: 'public'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPost] }) // post check
        .mockResolvedValueOnce({ rows: [{ id: 'like-id' }] }); // existing like check

      await expect(
        postService.likePost('post-id', 'user-id')
      ).rejects.toThrow('Post already liked by user');
    });
  });

  describe('addComment', () => {
    it('should add a comment successfully', async () => {
      const mockPost = {
        id: 'post-id',
        author_id: 'author-id',
        visibility: 'public'
      };

      const mockComment = {
        id: 'comment-id',
        post_id: 'post-id',
        author_id: 'user-id',
        parent_comment_id: null as string | null,
        content: 'Test comment',
        like_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPost] }) // post check
        .mockResolvedValueOnce({ rows: [mockComment] }) // insert comment
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await postService.addComment('post-id', 'user-id', 'Test comment');

      expect(result).toEqual({
        id: 'comment-id',
        postId: 'post-id',
        authorId: 'user-id',
        parentCommentId: null,
        content: 'Test comment',
        likeCount: 0,
        createdAt: mockComment.created_at,
        updatedAt: mockComment.updated_at
      });
    });
  });
});