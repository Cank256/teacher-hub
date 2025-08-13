import { Pool } from 'pg';
import { AdminService } from '../adminService';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AdminService', () => {
  let mockDb: jest.Mocked<Pool>;
  let adminService: AdminService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockDb = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    } as jest.Mocked<Pool>;

    adminService = new AdminService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPosts', () => {
    it('should retrieve all posts with pagination', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          author_id: 'user-1',
          title: 'Test Post',
          content: 'Test content',
          media_attachments: [],
          tags: [],
          visibility: 'public',
          like_count: 5,
          comment_count: 2,
          is_pinned: false,
          created_at: new Date(),
          updated_at: new Date(),
          author_name: 'John Doe',
          community_name: null
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockPosts }); // data query

      const pagination = { page: 1, limit: 20 };
      const result = await adminService.getAllPosts(pagination);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].title).toBe('Test Post');
    });

    it('should apply filters correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const pagination = { page: 1, limit: 20 };
      const filters = { authorId: 'user-1', flagged: true };

      await adminService.getAllPosts(pagination, filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('p.author_id = $1'),
        expect.arrayContaining(['user-1'])
      );
    });
  });

  describe('moderatePost', () => {
    it('should approve a post successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'post-1' }] }) // verify post exists
        .mockResolvedValueOnce(undefined) // delete flags
        .mockResolvedValueOnce(undefined) // log admin action
        .mockResolvedValueOnce(undefined); // COMMIT

      await adminService.moderatePost('post-1', 'admin-1', 'approve', 'Content is appropriate');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Admin admin-1 performed approve on post post-1')
      );
    });

    it('should delete a post successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'post-1' }] }) // verify post exists
        .mockResolvedValueOnce(undefined) // delete post
        .mockResolvedValueOnce(undefined) // log admin action
        .mockResolvedValueOnce(undefined); // COMMIT

      await adminService.moderatePost('post-1', 'admin-1', 'delete', 'Inappropriate content');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM posts WHERE id = $1',
        ['post-1']
      );
    });

    it('should handle post not found error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // post not found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        adminService.moderatePost('nonexistent', 'admin-1', 'approve', 'reason')
      ).rejects.toThrow('Post not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getAllCommunities', () => {
    it('should retrieve all communities with pagination', async () => {
      const mockCommunities = [
        {
          id: 'community-1',
          name: 'Test Community',
          description: 'Test description',
          type: 'subject',
          owner_id: 'user-1',
          moderators_json: '[]',
          is_private: false,
          requires_approval: false,
          rules_json: '[]',
          image_url: null,
          member_count: 10,
          post_count: 5,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          owner_name: 'John Doe'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockCommunities });

      const pagination = { page: 1, limit: 20 };
      const result = await adminService.getAllCommunities(pagination);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Community');
    });
  });

  describe('moderateCommunity', () => {
    it('should suspend a community successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'community-1' }] }) // verify community exists
        .mockResolvedValueOnce(undefined) // deactivate community
        .mockResolvedValueOnce(undefined) // log admin action
        .mockResolvedValueOnce(undefined); // COMMIT

      await adminService.moderateCommunity('community-1', 'admin-1', 'suspend', 'Violates guidelines');

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE communities SET is_active = false WHERE id = $1',
        ['community-1']
      );
    });
  });

  describe('getFlaggedMessages', () => {
    it('should retrieve flagged messages', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          sender_id: 'user-1',
          recipient_id: 'user-2',
          content: 'Test message',
          type: 'text',
          attachments_json: '[]',
          timestamp: new Date(),
          read_by_json: '[]',
          sync_status: 'synced',
          is_edited: false,
          sender_name: 'John Doe',
          recipient_name: 'Jane Doe'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockMessages });

      const pagination = { page: 1, limit: 20 };
      const result = await adminService.getFlaggedMessages(pagination);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].content).toBe('Test message');
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should retrieve platform analytics', async () => {
      const mockAnalytics = {
        total_users: '100',
        active_users: '80',
        total_posts: '50',
        total_communities: '10',
        total_resources: '25',
        total_messages: '200',
        daily_active_users: '20',
        weekly_active_users: '60',
        monthly_active_users: '80'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAnalytics] });

      const result = await adminService.getPlatformAnalytics();

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(80);
      expect(result.totalPosts).toBe(50);
    });

    it('should handle date range filter', async () => {
      const mockAnalytics = {
        total_users: '100',
        active_users: '80',
        total_posts: '30',
        total_communities: '5',
        total_resources: '15',
        total_messages: '100',
        daily_active_users: '15',
        weekly_active_users: '40',
        monthly_active_users: '60'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAnalytics] });

      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const result = await adminService.getPlatformAnalytics(dateRange);

      expect(result.totalPosts).toBe(30);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at BETWEEN $1 AND $2'),
        expect.arrayContaining([dateRange.startDate, dateRange.endDate])
      );
    });
  });

  describe('isUserAdmin', () => {
    it('should return true for admin user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const result = await adminService.isUserAdmin('admin-1');

      expect(result).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await adminService.isUserAdmin('user-1');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await adminService.isUserAdmin('user-1');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserRole', () => {
    it('should return user role', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const result = await adminService.getUserRole('admin-1');

      expect(result).toBe('admin');
    });

    it('should return null for user without role', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await adminService.getUserRole('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getAdminStats', () => {
    it('should retrieve admin statistics', async () => {
      const mockStats = {
        pending_moderations: '5',
        total_actions: '50',
        flagged_content: '10',
        active_admins: '3'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await adminService.getAdminStats();

      expect(result.pendingModerations).toBe(5);
      expect(result.totalActions).toBe(50);
      expect(result.flaggedContent).toBe(10);
      expect(result.activeAdmins).toBe(3);
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      const mockAction = {
        id: 'action-1',
        admin_id: 'admin-1',
        action: 'approve_post',
        target_type: 'post',
        target_id: 'post-1',
        reason: 'Content is appropriate',
        details_json: null,
        timestamp: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAction] });

      const result = await adminService.logAdminAction(
        'admin-1',
        'approve_post',
        'post',
        'post-1',
        'Content is appropriate'
      );

      expect(result.id).toBe('action-1');
      expect(result.action).toBe('approve_post');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        adminService.getAllPosts({ page: 1, limit: 20 })
      ).rejects.toThrow('Failed to retrieve posts');

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting all posts for admin:',
        expect.any(Error)
      );
    });

    it('should handle transaction rollback on moderation errors', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // query fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        adminService.moderatePost('post-1', 'admin-1', 'approve', 'reason')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});