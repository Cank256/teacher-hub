import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import adminRouter from '../admin';
import { AdminService } from '../../services/adminService';
import { AnalyticsService } from '../../services/analyticsService';
import { ModerationQueueService } from '../../services/moderationQueueService';

// Mock services
jest.mock('../../services/adminService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/moderationQueueService');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger');

const MockedAdminService = AdminService as jest.MockedClass<typeof AdminService>;
const MockedAnalyticsService = AnalyticsService as jest.MockedClass<typeof AnalyticsService>;
const MockedModerationQueueService = ModerationQueueService as jest.MockedClass<typeof ModerationQueueService>;

describe('Admin Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<Pool>;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  let mockModerationService: jest.Mocked<ModerationQueueService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockDb = {} as jest.Mocked<Pool>;
    app.locals.db = mockDb;

    // Mock auth middleware to add user to request
    app.use((req: any, res, next) => {
      req.user = { id: 'admin-1', role: 'admin' };
      next();
    });

    mockAdminService = {
      isUserAdmin: jest.fn().mockResolvedValue(true),
      getUserRole: jest.fn().mockResolvedValue('admin'),
      getAdminStats: jest.fn(),
      getAllPosts: jest.fn(),
      moderatePost: jest.fn(),
      getAllCommunities: jest.fn(),
      moderateCommunity: jest.fn(),
      getFlaggedMessages: jest.fn(),
      moderateMessage: jest.fn(),
      getAllResources: jest.fn(),
      moderateResource: jest.fn(),
      getAdminActions: jest.fn(),
      getPlatformAnalytics: jest.fn(),
      getUserAnalytics: jest.fn(),
      getContentAnalytics: jest.fn(),
      logAdminAction: jest.fn(),
      getModerationQueue: jest.fn(),
      assignModerationItem: jest.fn(),
      resolveModerationItem: jest.fn(),
      addToModerationQueue: jest.fn()
    } as any;

    mockAnalyticsService = {
      getPlatformAnalytics: jest.fn(),
      getUserAnalytics: jest.fn(),
      getContentAnalytics: jest.fn(),
      getCommunityAnalytics: jest.fn(),
      getResourceAnalytics: jest.fn(),
      getMessagingAnalytics: jest.fn()
    } as any;

    mockModerationService = {
      getQueue: jest.fn(),
      assignToModerator: jest.fn(),
      resolveItem: jest.fn(),
      getQueueStats: jest.fn(),
      reportContent: jest.fn()
    } as any;

    MockedAdminService.mockImplementation(() => mockAdminService);
    MockedAnalyticsService.mockImplementation(() => mockAnalyticsService);
    MockedModerationQueueService.mockImplementation(() => mockModerationService);

    app.use('/admin', adminRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Middleware', () => {
    it('should allow access for admin users', async () => {
      mockAdminService.getAdminStats.mockResolvedValue({
        pendingModerations: 5,
        totalActions: 50,
        flaggedContent: 10,
        activeAdmins: 3
      });

      mockAnalyticsService.getPlatformAnalytics.mockResolvedValue({
        totalUsers: 100,
        activeUsers: 80,
        totalPosts: 50,
        totalCommunities: 10,
        totalResources: 25,
        totalMessages: 200,
        dailyActiveUsers: 20,
        weeklyActiveUsers: 60,
        monthlyActiveUsers: 80
      });

      const response = await request(app).get('/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.adminStats).toBeDefined();
      expect(response.body.platformAnalytics).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      mockAdminService.isUserAdmin.mockResolvedValue(false);

      const response = await request(app).get('/admin/dashboard');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /admin/posts', () => {
    it('should retrieve all posts with pagination', async () => {
      const mockPosts = {
        data: [
          {
            id: 'post-1',
            authorId: 'user-1',
            communityId: null,
            title: 'Test Post',
            content: 'Test content',
            mediaAttachments: [],
            tags: [],
            visibility: 'public' as const,
            likeCount: 0,
            commentCount: 0,
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorName: 'John Doe',
            communityName: null
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };

      mockAdminService.getAllPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/admin/posts')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(mockAdminService.getAllPosts).toHaveBeenCalledWith(
        { page: 1, limit: 20, sortBy: 'created_at', sortOrder: 'desc' },
        expect.any(Object)
      );
    });

    it('should apply filters correctly', async () => {
      mockAdminService.getAllPosts.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      await request(app)
        .get('/admin/posts')
        .query({ authorId: 'user-1', flagged: 'true' });

      expect(mockAdminService.getAllPosts).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          authorId: 'user-1',
          flagged: true
        })
      );
    });
  });

  describe('POST /admin/posts/:postId/moderate', () => {
    it('should moderate post successfully', async () => {
      mockAdminService.moderatePost.mockResolvedValue();

      const response = await request(app)
        .post('/admin/posts/post-1/moderate')
        .send({
          action: 'approve',
          reason: 'Content is appropriate'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockAdminService.moderatePost).toHaveBeenCalledWith(
        'post-1',
        'admin-1',
        'approve',
        'Content is appropriate'
      );
    });

    it('should validate action parameter', async () => {
      const response = await request(app)
        .post('/admin/posts/post-1/moderate')
        .send({
          action: 'invalid',
          reason: 'Some reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_ACTION');
    });

    it('should require reason parameter', async () => {
      const response = await request(app)
        .post('/admin/posts/post-1/moderate')
        .send({
          action: 'approve'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('REASON_REQUIRED');
    });

    it('should handle service errors', async () => {
      mockAdminService.moderatePost.mockRejectedValue(new Error('Post not found'));

      const response = await request(app)
        .post('/admin/posts/post-1/moderate')
        .send({
          action: 'approve',
          reason: 'Content is appropriate'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('POST_MODERATION_FAILED');
    });
  });

  describe('GET /admin/communities', () => {
    it('should retrieve all communities', async () => {
      const mockCommunities = {
        data: [
          {
            id: 'community-1',
            name: 'Test Community',
            description: 'Test description',
            type: 'subject' as const,
            ownerId: 'user-1',
            moderators: [],
            isPrivate: false,
            requiresApproval: false,
            rules: [],
            imageUrl: null,
            memberCount: 10,
            postCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerName: 'John Doe'
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };

      mockAdminService.getAllCommunities.mockResolvedValue(mockCommunities);

      const response = await request(app).get('/admin/communities');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /admin/communities/:communityId/moderate', () => {
    it('should moderate community successfully', async () => {
      mockAdminService.moderateCommunity.mockResolvedValue();

      const response = await request(app)
        .post('/admin/communities/community-1/moderate')
        .send({
          action: 'suspend',
          reason: 'Violates guidelines'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /admin/messages/flagged', () => {
    it('should retrieve flagged messages', async () => {
      const mockMessages = {
        data: [
          {
            id: 'message-1',
            content: 'Flagged message',
            senderName: 'John Doe'
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };

      mockAdminService.getFlaggedMessages.mockResolvedValue(mockMessages);

      const response = await request(app).get('/admin/messages/flagged');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /admin/resources', () => {
    it('should retrieve all resources', async () => {
      const mockResources = {
        data: [
          {
            id: 'resource-1',
            title: 'Test Resource',
            authorName: 'John Doe',
            verificationStatus: 'pending'
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };

      mockAdminService.getAllResources.mockResolvedValue(mockResources);

      const response = await request(app).get('/admin/resources');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Analytics Endpoints', () => {
    describe('GET /admin/analytics/platform', () => {
      it('should retrieve platform analytics', async () => {
        const mockAnalytics = {
          totalUsers: 100,
          activeUsers: 80,
          totalPosts: 50,
          totalCommunities: 10,
          totalResources: 25,
          totalMessages: 200,
          dailyActiveUsers: 20,
          weeklyActiveUsers: 60,
          monthlyActiveUsers: 80
        };

        mockAnalyticsService.getPlatformAnalytics.mockResolvedValue(mockAnalytics);

        const response = await request(app).get('/admin/analytics/platform');

        expect(response.status).toBe(200);
        expect(response.body.totalUsers).toBe(100);
      });

      it('should handle date range parameters', async () => {
        mockAnalyticsService.getPlatformAnalytics.mockResolvedValue({
          totalUsers: 100,
          activeUsers: 80,
          totalPosts: 30,
          totalCommunities: 5,
          totalResources: 15,
          totalMessages: 100,
          dailyActiveUsers: 15,
          weeklyActiveUsers: 40,
          monthlyActiveUsers: 60
        });

        const response = await request(app)
          .get('/admin/analytics/platform')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          });

        expect(response.status).toBe(200);
        expect(mockAnalyticsService.getPlatformAnalytics).toHaveBeenCalledWith({
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        });
      });
    });

    describe('GET /admin/analytics/users', () => {
      it('should retrieve user analytics', async () => {
        const mockAnalytics = {
          newUsers: 20,
          activeUsers: 15,
          retentionRate: 75.5,
          averageSessionDuration: 2.5,
          topSubjects: ['Math', 'Science'],
          topRegions: ['Central', 'Eastern']
        };

        mockAnalyticsService.getUserAnalytics.mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get('/admin/analytics/users')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          });

        expect(response.status).toBe(200);
        expect(response.body.newUsers).toBe(20);
      });

      it('should require date range', async () => {
        const response = await request(app).get('/admin/analytics/users');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('DATE_RANGE_REQUIRED');
      });
    });

    describe('GET /admin/analytics/content', () => {
      it('should retrieve content analytics', async () => {
        const mockAnalytics = {
          totalPosts: 50,
          totalComments: 100,
          totalLikes: 200,
          totalShares: 50,
          topTags: ['education', 'science'],
          engagementRate: 600,
          averagePostsPerUser: 2.5
        };

        mockAnalyticsService.getContentAnalytics.mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get('/admin/analytics/content')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          });

        expect(response.status).toBe(200);
        expect(response.body.totalPosts).toBe(50);
      });
    });
  });

  describe('Moderation Queue Endpoints', () => {
    describe('GET /admin/moderation-queue', () => {
      it('should retrieve moderation queue', async () => {
        const mockQueue = {
          data: [
            {
              id: 'queue-1',
              itemType: 'post' as const,
              itemId: 'post-1',
              reportReason: 'Inappropriate content',
              reportedBy: 'user-1',
              status: 'pending' as const,
              assignedTo: null,
              createdAt: new Date(),
              resolvedAt: null,
              reporterName: 'John Doe',
              assigneeName: null,
              itemDetails: null
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        };

        mockModerationService.getQueue.mockResolvedValue(mockQueue);

        const response = await request(app).get('/admin/moderation-queue');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
      });
    });

    describe('POST /admin/moderation-queue/:itemId/assign', () => {
      it('should assign queue item to moderator', async () => {
        mockModerationService.assignToModerator.mockResolvedValue();

        const response = await request(app)
          .post('/admin/moderation-queue/queue-1/assign')
          .send({ moderatorId: 'moderator-1' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(mockModerationService.assignToModerator).toHaveBeenCalledWith(
          'queue-1',
          'moderator-1'
        );
      });

      it('should assign to current user if no moderatorId provided', async () => {
        mockModerationService.assignToModerator.mockResolvedValue();

        const response = await request(app)
          .post('/admin/moderation-queue/queue-1/assign')
          .send({});

        expect(response.status).toBe(200);
        expect(mockModerationService.assignToModerator).toHaveBeenCalledWith(
          'queue-1',
          'admin-1'
        );
      });
    });

    describe('POST /admin/moderation-queue/:itemId/resolve', () => {
      it('should resolve queue item', async () => {
        mockModerationService.resolveItem.mockResolvedValue();

        const response = await request(app)
          .post('/admin/moderation-queue/queue-1/resolve')
          .send({
            action: 'approve',
            reason: 'Content is appropriate',
            notes: 'Reviewed and approved'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(mockModerationService.resolveItem).toHaveBeenCalledWith(
          'queue-1',
          'admin-1',
          {
            action: 'approve',
            reason: 'Content is appropriate',
            notes: 'Reviewed and approved'
          }
        );
      });

      it('should validate action parameter', async () => {
        const response = await request(app)
          .post('/admin/moderation-queue/queue-1/resolve')
          .send({
            action: 'invalid',
            reason: 'Some reason'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_ACTION');
      });
    });

    describe('GET /admin/moderation-queue/stats', () => {
      it('should retrieve queue statistics', async () => {
        const mockStats = {
          totalPending: 5,
          totalReviewed: 3,
          totalResolved: 10,
          averageResolutionTime: 2.5,
          itemTypeBreakdown: { post: 3, comment: 2 }
        };

        mockModerationService.getQueueStats.mockResolvedValue(mockStats);

        const response = await request(app).get('/admin/moderation-queue/stats');

        expect(response.status).toBe(200);
        expect(response.body.totalPending).toBe(5);
      });
    });
  });

  describe('POST /admin/report', () => {
    it('should report content successfully', async () => {
      const mockQueueItem = {
        id: 'queue-1',
        itemType: 'post' as const,
        itemId: 'post-1',
        reportReason: 'Inappropriate content',
        reportedBy: 'admin-1',
        status: 'pending' as const,
        assignedTo: undefined,
        createdAt: new Date(),
        resolvedAt: undefined
      };

      mockModerationService.reportContent.mockResolvedValue(mockQueueItem);

      const response = await request(app)
        .post('/admin/report')
        .send({
          itemType: 'post',
          itemId: 'post-1',
          reason: 'Inappropriate content',
          additionalDetails: 'Contains offensive language'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.queueItem).toBeDefined();
    });

    it('should validate item type', async () => {
      const response = await request(app)
        .post('/admin/report')
        .send({
          itemType: 'invalid',
          itemId: 'item-1',
          reason: 'Some reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_ITEM_TYPE');
    });

    it('should require itemId and reason', async () => {
      const response = await request(app)
        .post('/admin/report')
        .send({
          itemType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('GET /admin/actions', () => {
    it('should retrieve admin actions', async () => {
      const mockActions = {
        data: [
          {
            id: 'action-1',
            action: 'approve_post',
            targetType: 'post',
            targetId: 'post-1',
            adminName: 'Admin User',
            timestamp: new Date()
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };

      mockAdminService.getAdminActions.mockResolvedValue(mockActions);

      const response = await request(app).get('/admin/actions');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by admin ID', async () => {
      mockAdminService.getAdminActions.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      await request(app)
        .get('/admin/actions')
        .query({ adminId: 'admin-1' });

      expect(mockAdminService.getAdminActions).toHaveBeenCalledWith(
        expect.any(Object),
        'admin-1'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAdminService.getAllPosts.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/admin/posts');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('POSTS_FETCH_FAILED');
    });

    it('should handle admin permission check errors', async () => {
      mockAdminService.isUserAdmin.mockRejectedValue(new Error('Permission check failed'));

      const response = await request(app).get('/admin/dashboard');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('PERMISSION_CHECK_FAILED');
    });
  });
});