import { Pool } from 'pg';
import { AnalyticsService } from '../analyticsService';
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

describe('AnalyticsService', () => {
  let mockDb: jest.Mocked<Pool>;
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    } as jest.Mocked<Pool>;

    analyticsService = new AnalyticsService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatformAnalytics', () => {
    it('should retrieve platform analytics without date range', async () => {
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

      const result = await analyticsService.getPlatformAnalytics();

      expect(result).toEqual({
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
    });

    it('should retrieve platform analytics with date range', async () => {
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

      const result = await analyticsService.getPlatformAnalytics(dateRange);

      expect(result.totalPosts).toBe(30);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at BETWEEN $1 AND $2'),
        [dateRange.startDate, dateRange.endDate]
      );
    });
  });

  describe('getUserAnalytics', () => {
    it('should retrieve user analytics', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ new_users: '20', active_users: '15' }] }) // user metrics
        .mockResolvedValueOnce({ rows: [{ retention_rate: '75.5' }] }) // retention
        .mockResolvedValueOnce({ rows: [{ avg_session_duration: '2.5' }] }) // session duration
        .mockResolvedValueOnce({ rows: [{ subject: 'Math' }, { subject: 'Science' }] }) // subjects
        .mockResolvedValueOnce({ rows: [{ region: 'Central' }, { region: 'Eastern' }] }); // regions

      const result = await analyticsService.getUserAnalytics(dateRange);

      expect(result).toEqual({
        newUsers: 20,
        activeUsers: 15,
        retentionRate: 75.5,
        averageSessionDuration: 2.5,
        topSubjects: ['Math', 'Science'],
        topRegions: ['Central', 'Eastern']
      });
    });

    it('should handle null values gracefully', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ new_users: '0', active_users: '0' }] })
        .mockResolvedValueOnce({ rows: [{ retention_rate: null }] })
        .mockResolvedValueOnce({ rows: [{ avg_session_duration: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getUserAnalytics(dateRange);

      expect(result.retentionRate).toBe(0);
      expect(result.averageSessionDuration).toBe(0);
      expect(result.topSubjects).toEqual([]);
      expect(result.topRegions).toEqual([]);
    });
  });

  describe('getContentAnalytics', () => {
    it('should retrieve content analytics', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_posts: '50', 
            total_comments: '100', 
            total_likes: '200', 
            total_shares: '50' 
          }] 
        }) // content metrics
        .mockResolvedValueOnce({ rows: [{ tag: 'education' }, { tag: 'science' }] }) // tags
        .mockResolvedValueOnce({ rows: [{ avg_posts_per_user: '2.5' }] }); // avg posts

      const result = await analyticsService.getContentAnalytics(dateRange);

      expect(result).toEqual({
        totalPosts: 50,
        totalComments: 100,
        totalLikes: 200,
        totalShares: 50,
        topTags: ['education', 'science'],
        engagementRate: 600, // (200 + 100) / 50 * 100
        averagePostsPerUser: 2.5
      });
    });

    it('should handle zero posts gracefully', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_posts: '0', 
            total_comments: '0', 
            total_likes: '0', 
            total_shares: '0' 
          }] 
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_posts_per_user: null }] });

      const result = await analyticsService.getContentAnalytics(dateRange);

      expect(result.engagementRate).toBe(0);
      expect(result.averagePostsPerUser).toBe(0);
    });
  });

  describe('getCommunityAnalytics', () => {
    it('should retrieve community analytics', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_communities: '20',
            new_communities: '5',
            active_communities: '15',
            avg_members_per_community: '25.5'
          }] 
        }) // main metrics
        .mockResolvedValueOnce({ rows: [{ type: 'subject' }, { type: 'region' }] }) // types
        .mockResolvedValueOnce({ rows: [{ current_period: '5', previous_period: '3' }] }); // growth

      const result = await analyticsService.getCommunityAnalytics(dateRange);

      expect(result).toEqual({
        totalCommunities: 20,
        newCommunities: 5,
        activeCommunities: 15,
        averageMembersPerCommunity: 25.5,
        topCommunityTypes: ['subject', 'region'],
        communityGrowthRate: 66.66666666666667 // (5-3)/3 * 100
      });
    });

    it('should handle zero previous period gracefully', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_communities: '20',
            new_communities: '5',
            active_communities: '15',
            avg_members_per_community: '25.5'
          }] 
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ current_period: '5', previous_period: '0' }] });

      const result = await analyticsService.getCommunityAnalytics(dateRange);

      expect(result.communityGrowthRate).toBe(0);
    });
  });

  describe('getResourceAnalytics', () => {
    it('should retrieve resource analytics', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_resources: '100',
            new_resources: '20',
            total_downloads: '500',
            average_rating: '4.2',
            video_resources: '15',
            verified_resources: '18'
          }] 
        }) // main metrics
        .mockResolvedValueOnce({ rows: [{ type: 'document' }, { type: 'video' }] }); // types

      const result = await analyticsService.getResourceAnalytics(dateRange);

      expect(result).toEqual({
        totalResources: 100,
        newResources: 20,
        totalDownloads: 500,
        averageRating: 4.2,
        topResourceTypes: ['document', 'video'],
        videoResources: 15,
        verifiedResources: 18
      });
    });

    it('should handle null values gracefully', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_resources: '100',
            new_resources: '20',
            total_downloads: null,
            average_rating: null,
            video_resources: '15',
            verified_resources: '18'
          }] 
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getResourceAnalytics(dateRange);

      expect(result.totalDownloads).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.topResourceTypes).toEqual([]);
    });
  });

  describe('getMessagingAnalytics', () => {
    it('should retrieve messaging analytics', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_messages: '1000',
            new_messages: '200',
            active_conversations: '50'
          }] 
        }) // main metrics
        .mockResolvedValueOnce({ rows: [{ avg_messages_per_conversation: '4.5' }] }) // avg messages
        .mockResolvedValueOnce({ 
          rows: [
            { type: 'text', count: '180' },
            { type: 'image', count: '15' },
            { type: 'file', count: '5' }
          ] 
        }); // message types

      const result = await analyticsService.getMessagingAnalytics(dateRange);

      expect(result).toEqual({
        totalMessages: 1000,
        newMessages: 200,
        activeConversations: 50,
        averageMessagesPerConversation: 4.5,
        messageTypes: {
          text: 180,
          image: 15,
          file: 5
        }
      });
    });
  });

  describe('trackUserActivity', () => {
    it('should track user activity successfully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackUserActivity('user-1', 'login', { ip: '127.0.0.1' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_activity_log'),
        ['user-1', 'login', '{"ip":"127.0.0.1"}']
      );
    });

    it('should not throw error on tracking failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        analyticsService.trackUserActivity('user-1', 'login')
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error tracking user activity:',
        expect.any(Error)
      );
    });
  });

  describe('getUserActivityReport', () => {
    it('should retrieve user activity report', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] }) // total activities
        .mockResolvedValueOnce({ 
          rows: [
            { activity: 'login', count: '20' },
            { activity: 'post_create', count: '15' },
            { activity: 'message_send', count: '15' }
          ] 
        }) // activities by type
        .mockResolvedValueOnce({ 
          rows: [
            { date: '2023-01-01', count: '5' },
            { date: '2023-01-02', count: '8' },
            { date: '2023-01-03', count: '3' }
          ] 
        }); // daily activity

      const result = await analyticsService.getUserActivityReport('user-1', dateRange);

      expect(result).toEqual({
        totalActivities: 50,
        activitiesByType: {
          login: 20,
          post_create: 15,
          message_send: 15
        },
        dailyActivity: [
          { date: '2023-01-01', count: 5 },
          { date: '2023-01-02', count: 8 },
          { date: '2023-01-03', count: 3 }
        ]
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        analyticsService.getPlatformAnalytics()
      ).rejects.toThrow('Failed to retrieve platform analytics');

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting platform analytics:',
        expect.any(Error)
      );
    });

    it('should handle date range validation', async () => {
      const invalidDateRange = {
        startDate: new Date('invalid'),
        endDate: new Date('2023-01-31')
      };

      mockDb.query.mockRejectedValueOnce(new Error('Invalid date'));

      await expect(
        analyticsService.getUserAnalytics(invalidDateRange)
      ).rejects.toThrow('Failed to retrieve user analytics');
    });
  });
});