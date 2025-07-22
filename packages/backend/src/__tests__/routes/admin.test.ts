import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/admin';
import { errorTracker } from '../../monitoring/errorTracker';
import { performanceMonitor } from '../../monitoring/performanceMonitor';
import { userAnalytics } from '../../monitoring/userAnalytics';

// Mock the monitoring modules
jest.mock('../../monitoring/errorTracker');
jest.mock('../../monitoring/performanceMonitor');
jest.mock('../../monitoring/userAnalytics');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'admin-user-123';
    req.sessionId = 'admin-session-123';
    req.user = { userId: 'admin-user-123', verificationStatus: 'verified' };
    next();
  }
}));

jest.mock('../../middleware/monitoring', () => ({
  userActionTrackingMiddleware: (action: string, category: string) => (req: any, res: any, next: any) => {
    next();
  }
}));

describe('Admin Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return comprehensive admin dashboard data', async () => {
      // Mock the monitoring data
      const mockSystemHealth = {
        timestamp: new Date(),
        status: 'healthy' as const,
        services: {
          database: 'up' as const,
          redis: 'up' as const,
          elasticsearch: 'up' as const,
          storage: 'up' as const
        },
        metrics: {
          memoryUsage: 45.2,
          cpuUsage: 23.1,
          diskUsage: 67.8,
          activeConnections: 150,
          responseTime: 245
        }
      };

      const mockErrorStats = {
        total: 25,
        byLevel: { error: 10, warn: 15 },
        byEndpoint: { '/api/content': 12, '/api/auth': 8, '/api/files': 5 },
        byStatusCode: { '500': 10, '400': 15 },
        trend: [2, 3, 1, 4, 2, 5, 3, 2, 1, 2]
      };

      const mockPerformanceStats = {
        responseTime: { avg: 245, p95: 450, p99: 680 },
        throughput: 125.5,
        errorRate: 2.1,
        slowestEndpoints: [
          { endpoint: '/api/search', avgTime: 850 },
          { endpoint: '/api/content/upload', avgTime: 650 }
        ],
        systemMetrics: {
          memoryUsage: 45.2,
          cpuUsage: 23.1,
          diskUsage: 67.8
        }
      };

      const mockAnalyticsStats = {
        totalEvents: 1250,
        uniqueUsers: 85,
        topEvents: [
          { event: 'page_view', count: 450 },
          { event: 'search', count: 320 }
        ],
        categoryBreakdown: { navigation: 450, search: 320, content: 280, messaging: 200 },
        platformBreakdown: { web: 750, mobile: 500 },
        userEngagement: {
          averageSessionDuration: 1800000,
          averageEventsPerUser: 14.7,
          returnUserRate: 68.2
        },
        trends: {
          hourly: [45, 52, 38, 67, 89, 76, 54, 43, 38, 45, 67, 78],
          daily: [850, 920, 780, 1100, 1250]
        }
      };

      const mockDailyActiveUsers = [
        { date: '2023-01-01', count: 75 },
        { date: '2023-01-02', count: 82 },
        { date: '2023-01-03', count: 85 }
      ];

      const mockRecentErrors = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'error' as const,
          message: 'Database connection failed',
          statusCode: 500,
          endpoint: '/api/content'
        },
        {
          id: '2',
          timestamp: new Date(),
          level: 'warn' as const,
          message: 'Slow query detected',
          statusCode: 200,
          endpoint: '/api/search'
        }
      ];

      // Setup mocks
      (performanceMonitor.getSystemHealth as jest.Mock).mockResolvedValue(mockSystemHealth);
      (errorTracker.getErrorStats as jest.Mock).mockResolvedValue(mockErrorStats);
      (performanceMonitor.getPerformanceStats as jest.Mock).mockResolvedValue(mockPerformanceStats);
      (userAnalytics.getAnalyticsSummary as jest.Mock).mockResolvedValue(mockAnalyticsStats);
      (userAnalytics.getDailyActiveUsers as jest.Mock).mockResolvedValue(mockDailyActiveUsers);
      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue(mockRecentErrors);

      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('analytics');
      expect(response.body).toHaveProperty('dailyActiveUsers');
      expect(response.body).toHaveProperty('recentErrors');
      expect(response.body).toHaveProperty('timestamp');

      expect(response.body.overview).toHaveProperty('totalUsers', 85);
      expect(response.body.overview).toHaveProperty('activeUsers', 85);
      expect(response.body.overview).toHaveProperty('systemStatus', 'healthy');
      expect(response.body.overview).toHaveProperty('criticalErrors', 1);

      expect(performanceMonitor.getSystemHealth).toHaveBeenCalled();
      expect(errorTracker.getErrorStats).toHaveBeenCalledWith('day');
      expect(performanceMonitor.getPerformanceStats).toHaveBeenCalledWith('day');
      expect(userAnalytics.getAnalyticsSummary).toHaveBeenCalledWith('day');
      expect(userAnalytics.getDailyActiveUsers).toHaveBeenCalledWith(30);
      expect(errorTracker.getRecentErrors).toHaveBeenCalledWith(20);
    });

    it('should handle different time ranges', async () => {
      (performanceMonitor.getSystemHealth as jest.Mock).mockResolvedValue({
        status: 'healthy',
        services: { database: 'up', redis: 'up', elasticsearch: 'up', storage: 'up' },
        metrics: { memoryUsage: 50, cpuUsage: 30, diskUsage: 60, activeConnections: 100, responseTime: 200 }
      });
      (errorTracker.getErrorStats as jest.Mock).mockResolvedValue({ total: 0, byLevel: {}, byEndpoint: {}, byStatusCode: {}, trend: [] });
      (performanceMonitor.getPerformanceStats as jest.Mock).mockResolvedValue({
        responseTime: { avg: 200, p95: 400, p99: 600 },
        throughput: 100,
        errorRate: 1,
        slowestEndpoints: [],
        systemMetrics: { memoryUsage: 50, cpuUsage: 30, diskUsage: 60 }
      });
      (userAnalytics.getAnalyticsSummary as jest.Mock).mockResolvedValue({
        totalEvents: 100,
        uniqueUsers: 50,
        topEvents: [],
        categoryBreakdown: {},
        platformBreakdown: {},
        userEngagement: { averageSessionDuration: 1000, averageEventsPerUser: 2, returnUserRate: 50 },
        trends: { hourly: [], daily: [] }
      });
      (userAnalytics.getDailyActiveUsers as jest.Mock).mockResolvedValue([{ date: '2023-01-01', count: 50 }]);
      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/admin/dashboard?timeRange=week')
        .expect(200);

      expect(errorTracker.getErrorStats).toHaveBeenCalledWith('week');
      expect(performanceMonitor.getPerformanceStats).toHaveBeenCalledWith('week');
      expect(userAnalytics.getAnalyticsSummary).toHaveBeenCalledWith('week');
    });
  });

  describe('GET /api/admin/reports/errors', () => {
    it('should return detailed error reports', async () => {
      const mockErrorStats = {
        total: 50,
        byLevel: { error: 20, warn: 30 },
        byEndpoint: { '/api/content': 25, '/api/auth': 15, '/api/files': 10 },
        byStatusCode: { '500': 20, '400': 30 },
        trend: [5, 6, 4, 8, 7, 9, 6, 5, 4, 5]
      };

      const mockRecentErrors = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'error' as const,
          message: 'Database timeout',
          statusCode: 500,
          endpoint: '/api/content'
        },
        {
          id: '2',
          timestamp: new Date(),
          level: 'error' as const,
          message: 'Authentication failed',
          statusCode: 401,
          endpoint: '/api/auth'
        }
      ];

      (errorTracker.getErrorStats as jest.Mock).mockResolvedValue(mockErrorStats);
      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue(mockRecentErrors);

      const response = await request(app)
        .get('/api/admin/reports/errors')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('recentErrors');
      expect(response.body).toHaveProperty('pagination');

      expect(response.body.analysis).toHaveProperty('byEndpoint');
      expect(response.body.analysis).toHaveProperty('criticalIssues');
      expect(response.body.analysis).toHaveProperty('frequentErrors');

      expect(response.body.pagination).toEqual({
        limit: 100,
        offset: 0,
        total: 50
      });
    });

    it('should handle pagination parameters', async () => {
      (errorTracker.getErrorStats as jest.Mock).mockResolvedValue({});
      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/admin/reports/errors?limit=50&offset=25')
        .expect(200);

      expect(errorTracker.getRecentErrors).toHaveBeenCalledWith(50, 25);
    });
  });

  describe('GET /api/admin/reports/performance', () => {
    it('should return performance reports with analysis', async () => {
      const mockPerformanceStats = {
        responseTime: { avg: 300, p95: 500, p99: 750 },
        throughput: 100,
        errorRate: 1.5,
        slowestEndpoints: [
          { endpoint: '/api/search', avgTime: 800 },
          { endpoint: '/api/upload', avgTime: 600 }
        ],
        systemMetrics: {
          memoryUsage: 75,
          cpuUsage: 45,
          diskUsage: 60
        }
      };

      const mockMetrics = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'response_time' as const,
          value: 250,
          unit: 'ms',
          endpoint: '/api/content'
        }
      ];

      (performanceMonitor.getPerformanceStats as jest.Mock).mockResolvedValue(mockPerformanceStats);
      (performanceMonitor.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/admin/reports/performance')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('responseTimeTrend');
      expect(response.body.analysis).toHaveProperty('resourceUsageTrend');
      expect(response.body.analysis).toHaveProperty('bottlenecks');
      expect(response.body.analysis).toHaveProperty('recommendations');

      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('response_time', 'day', 1000);
      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('memory_usage', 'day', 100);
      expect(performanceMonitor.getMetrics).toHaveBeenCalledWith('cpu_usage', 'day', 100);
    });

    it('should generate performance recommendations', async () => {
      const mockPerformanceStats = {
        responseTime: { avg: 1500, p95: 2000, p99: 3000 },
        throughput: 50,
        errorRate: 5,
        slowestEndpoints: [],
        systemMetrics: {
          memoryUsage: 85,
          cpuUsage: 90,
          diskUsage: 95
        }
      };

      (performanceMonitor.getPerformanceStats as jest.Mock).mockResolvedValue(mockPerformanceStats);
      (performanceMonitor.getMetrics as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/reports/performance')
        .expect(200);

      expect(response.body.analysis.recommendations).toContain(
        'Average response time is high. Consider optimizing slow endpoints.'
      );
      expect(response.body.analysis.recommendations).toContain(
        'Memory usage is high. Consider implementing memory optimization.'
      );
      expect(response.body.analysis.recommendations).toContain(
        'CPU usage is high. Consider scaling or optimizing CPU-intensive operations.'
      );
    });
  });

  describe('GET /api/admin/reports/analytics', () => {
    it('should return user analytics reports with insights', async () => {
      const mockAnalyticsStats = {
        totalEvents: 2000,
        uniqueUsers: 150,
        topEvents: [{ event: 'page_view', count: 800 }],
        categoryBreakdown: { navigation: 800, content: 600, search: 400, messaging: 200 },
        platformBreakdown: { web: 1200, mobile: 800 },
        userEngagement: {
          averageSessionDuration: 2400000,
          averageEventsPerUser: 13.3,
          returnUserRate: 72.5
        },
        trends: {
          hourly: [80, 90, 70, 110, 130, 120, 100, 85, 75, 90, 110, 125],
          daily: [1500, 1600, 1400, 1800, 2000]
        }
      };

      const mockDailyActiveUsers = [
        { date: '2023-01-01', count: 100 },
        { date: '2023-01-02', count: 110 },
        { date: '2023-01-03', count: 120 },
        { date: '2023-01-04', count: 115 },
        { date: '2023-01-05', count: 125 },
        { date: '2023-01-06', count: 130 },
        { date: '2023-01-07', count: 135 },
        { date: '2023-01-08', count: 140 },
        { date: '2023-01-09', count: 145 },
        { date: '2023-01-10', count: 150 }
      ];

      (userAnalytics.getAnalyticsSummary as jest.Mock).mockResolvedValue(mockAnalyticsStats);
      (userAnalytics.getDailyActiveUsers as jest.Mock).mockResolvedValue(mockDailyActiveUsers);

      const response = await request(app)
        .get('/api/admin/reports/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('userGrowth');
      expect(response.body.analysis).toHaveProperty('engagementMetrics');
      expect(response.body.analysis).toHaveProperty('contentInteraction');
      expect(response.body.analysis).toHaveProperty('insights');

      expect(response.body.analysis.insights).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Daily active users increased')
        ])
      );
    });
  });

  describe('GET /api/admin/moderation', () => {
    it('should return moderation dashboard data', async () => {
      const mockRecentErrors = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'error' as const,
          message: 'Content validation failed',
          endpoint: '/api/content/upload'
        }
      ];

      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue(mockRecentErrors);

      const response = await request(app)
        .get('/api/admin/moderation')
        .expect(200);

      expect(response.body).toHaveProperty('moderation');
      expect(response.body.moderation).toHaveProperty('pendingReviews');
      expect(response.body.moderation).toHaveProperty('flaggedContent');
      expect(response.body.moderation).toHaveProperty('contentStats');
      expect(response.body.moderation).toHaveProperty('recentIssues');
      expect(response.body.moderation).toHaveProperty('moderationTrends');
    });
  });

  describe('GET /api/admin/system/config', () => {
    it('should return system configuration', async () => {
      const response = await request(app)
        .get('/api/admin/system/config')
        .expect(200);

      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('environment');
      expect(response.body.config).toHaveProperty('version');
      expect(response.body.config).toHaveProperty('uptime');
      expect(response.body.config).toHaveProperty('services');
      expect(response.body.config).toHaveProperty('features');
    });
  });

  describe('GET /api/admin/export/:type', () => {
    it('should export errors data as JSON', async () => {
      const mockErrors = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'error',
          message: 'Test error'
        }
      ];

      (errorTracker.getRecentErrors as jest.Mock).mockResolvedValue(mockErrors);

      const response = await request(app)
        .get('/api/admin/export/errors')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id', '1');
      expect(response.body[0]).toHaveProperty('level', 'error');
      expect(response.body[0]).toHaveProperty('message', 'Test error');
      expect(response.body[0]).toHaveProperty('timestamp');
    });

    it('should export performance data as CSV', async () => {
      const mockMetrics = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'response_time',
          value: 250,
          unit: 'ms'
        }
      ];

      (performanceMonitor.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/admin/export/performance?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('id,timestamp,type,value,unit');
    });

    it('should return error for invalid export type', async () => {
      const response = await request(app)
        .get('/api/admin/export/invalid')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_EXPORT_TYPE');
    });
  });
});