import { userAnalytics } from '../../monitoring/userAnalytics';
import { redisClient } from '../../cache/redisClient';

// Mock Redis client
jest.mock('../../cache/redisClient', () => ({
  redisClient: {
    setEx: jest.fn(),
    zAdd: jest.fn(),
    sAdd: jest.fn(),
    expire: jest.fn(),
    zRevRangeByScore: jest.fn(),
    get: jest.fn(),
    sCard: jest.fn(),
    zRemRangeByScore: jest.fn()
  }
}));

describe('UserAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track a user analytics event', async () => {
      const event = {
        userId: 'user123',
        sessionId: 'session123',
        event: 'page_view',
        category: 'navigation' as const,
        properties: { page: '/dashboard' },
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        platform: 'web' as const
      };

      await userAnalytics.trackEvent(event);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalledWith('analytics:events', expect.any(Object));
      expect(redisClient.zAdd).toHaveBeenCalledWith('analytics:user:user123', expect.any(Object));
      expect(redisClient.zAdd).toHaveBeenCalledWith('analytics:category:navigation', expect.any(Object));
      expect(redisClient.sAdd).toHaveBeenCalled(); // For DAU tracking
    });

    it('should handle minimal event data', async () => {
      const event = {
        event: 'click'
      };

      await userAnalytics.trackEvent(event);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalled();
    });

    it('should handle Redis failures gracefully', async () => {
      (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const event = {
        userId: 'user123',
        event: 'test_event'
      };

      await expect(userAnalytics.trackEvent(event)).resolves.not.toThrow();
    });
  });

  describe('getUserEvents', () => {
    it('should retrieve user events from Redis', async () => {
      const mockEventIds = ['event1', 'event2'];
      const mockEvent = {
        id: 'event1',
        timestamp: new Date(),
        userId: 'user123',
        event: 'page_view'
      };

      (redisClient.zRevRangeByScore as jest.Mock).mockResolvedValue(mockEventIds);
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockEvent));

      const events = await userAnalytics.getUserEvents('user123', 'day', 100);

      expect(events).toHaveLength(2);
      expect(redisClient.zRevRangeByScore).toHaveBeenCalledWith(
        'analytics:user:user123',
        expect.any(Number),
        expect.any(Number),
        { LIMIT: { offset: 0, count: 100 } }
      );
    });

    it('should fallback to memory cache when Redis fails', async () => {
      (redisClient.zRevRangeByScore as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const events = await userAnalytics.getUserEvents('user123', 'day', 100);

      expect(events).toBeInstanceOf(Array);
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should calculate analytics summary', async () => {
      const mockEvents = [
        {
          id: '1',
          timestamp: new Date(),
          userId: 'user1',
          sessionId: 'session1',
          event: 'page_view',
          category: 'navigation' as const,
          platform: 'web' as const
        },
        {
          id: '2',
          timestamp: new Date(),
          userId: 'user2',
          sessionId: 'session2',
          event: 'click',
          category: 'content' as const,
          platform: 'mobile' as const
        },
        {
          id: '3',
          timestamp: new Date(),
          userId: 'user1',
          sessionId: 'session1',
          event: 'page_view',
          category: 'navigation' as const,
          platform: 'web' as const
        }
      ];

      // Mock the private getEvents method
      jest.spyOn(userAnalytics as any, 'getEvents').mockResolvedValue(mockEvents);
      jest.spyOn(userAnalytics as any, 'calculateSessionDurations').mockResolvedValue([300000, 600000]);
      jest.spyOn(userAnalytics as any, 'calculateHourlyTrend').mockResolvedValue([1, 2, 0, 0]);
      jest.spyOn(userAnalytics as any, 'calculateDailyTrend').mockResolvedValue([3]);

      const summary = await userAnalytics.getAnalyticsSummary('day');

      expect(summary.totalEvents).toBe(3);
      expect(summary.uniqueUsers).toBe(2);
      expect(summary.topEvents).toHaveLength(2);
      expect(summary.topEvents[0]?.event).toBe('page_view');
      expect(summary.topEvents[0]?.count).toBe(2);
      expect(summary.categoryBreakdown.navigation).toBe(2);
      expect(summary.categoryBreakdown.content).toBe(1);
      expect(summary.platformBreakdown.web).toBe(2);
      expect(summary.platformBreakdown.mobile).toBe(1);
      expect(summary.userEngagement.averageEventsPerUser).toBe(1.5);
    });

    it('should handle empty events', async () => {
      jest.spyOn(userAnalytics as any, 'getEvents').mockResolvedValue([]);
      jest.spyOn(userAnalytics as any, 'calculateSessionDurations').mockResolvedValue([]);
      jest.spyOn(userAnalytics as any, 'calculateHourlyTrend').mockResolvedValue([]);
      jest.spyOn(userAnalytics as any, 'calculateDailyTrend').mockResolvedValue([]);

      const summary = await userAnalytics.getAnalyticsSummary('day');

      expect(summary.totalEvents).toBe(0);
      expect(summary.uniqueUsers).toBe(0);
      expect(summary.topEvents).toHaveLength(0);
    });
  });

  describe('getDailyActiveUsers', () => {
    it('should retrieve daily active users', async () => {
      (redisClient.sCard as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(110);

      const dau = await userAnalytics.getDailyActiveUsers(3);

      expect(dau).toHaveLength(3);
      expect(dau[0]?.count).toBe(110); // Most recent day first after reverse
      expect(dau[1]?.count).toBe(95);
      expect(dau[2]?.count).toBe(100);
      expect(redisClient.sCard).toHaveBeenCalledTimes(3);
    });

    it('should handle Redis failures gracefully', async () => {
      (redisClient.sCard as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const dau = await userAnalytics.getDailyActiveUsers(2);

      expect(dau).toHaveLength(2);
      expect(dau[0]?.count).toBe(0);
      expect(dau[1]?.count).toBe(0);
    });
  });

  describe('getUserJourney', () => {
    it('should analyze user journey', async () => {
      const mockEvents = [
        {
          id: '1',
          timestamp: new Date('2023-01-01T10:00:00Z'),
          userId: 'user123',
          sessionId: 'session123',
          event: 'page_view',
          category: 'navigation' as const,
          properties: { page: '/dashboard' },
          platform: 'web' as const
        },
        {
          id: '2',
          timestamp: new Date('2023-01-01T10:05:00Z'),
          userId: 'user123',
          sessionId: 'session123',
          event: 'search',
          category: 'search' as const,
          properties: { query: 'math resources' },
          platform: 'web' as const
        },
        {
          id: '3',
          timestamp: new Date('2023-01-01T10:10:00Z'),
          userId: 'user123',
          sessionId: 'session123',
          event: 'download',
          category: 'content' as const,
          properties: { resourceId: 'res123' },
          platform: 'web' as const
        }
      ];

      jest.spyOn(userAnalytics, 'getUserEvents').mockResolvedValue(mockEvents);

      const journey = await userAnalytics.getUserJourney('user123', 'session123');

      expect(journey.events).toHaveLength(3);
      expect(journey.duration).toBe(10 * 60 * 1000); // 10 minutes
      expect(journey.pages).toContain('/dashboard');
      expect(journey.actions).toContain('page_view');
      expect(journey.actions).toContain('search');
      expect(journey.actions).toContain('download');
      expect(journey.conversionFunnel.page_view).toBe(1);
      expect(journey.conversionFunnel.search).toBe(1);
      expect(journey.conversionFunnel.download).toBe(1);
    });

    it('should handle empty journey', async () => {
      jest.spyOn(userAnalytics, 'getUserEvents').mockResolvedValue([]);

      const journey = await userAnalytics.getUserJourney('user123');

      expect(journey.events).toHaveLength(0);
      expect(journey.duration).toBe(0);
      expect(journey.pages).toHaveLength(0);
      expect(journey.actions).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    it('should remove old events from Redis', async () => {
      await userAnalytics.cleanup();

      expect(redisClient.zRemRangeByScore).toHaveBeenCalledWith(
        'analytics:events',
        0,
        expect.any(Number)
      );
    });

    it('should handle cleanup failures gracefully', async () => {
      (redisClient.zRemRangeByScore as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(userAnalytics.cleanup()).resolves.not.toThrow();
    });
  });
});