import { performanceMonitor } from '../../monitoring/performanceMonitor';
import { redisClient } from '../../cache/redisClient';

// Mock Redis client
jest.mock('../../cache/redisClient', () => ({
  redisClient: {
    setEx: jest.fn(),
    zAdd: jest.fn(),
    zRevRangeByScore: jest.fn(),
    get: jest.fn(),
    ping: jest.fn(),
    zRemRangeByScore: jest.fn(),
    isHealthy: jest.fn()
  }
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the health cache
    (performanceMonitor as any).systemHealthCache = null;
  });

  describe('recordMetric', () => {
    it('should record a performance metric', async () => {
      const metric = {
        type: 'response_time' as const,
        value: 150,
        unit: 'ms',
        endpoint: '/api/test',
        method: 'GET',
        userId: 'user123'
      };

      await performanceMonitor.recordMetric(metric);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalledWith(
        'metrics:response_time',
        expect.any(Object)
      );
    });

    it('should handle minimal metric data', async () => {
      const metric = {
        value: 100
      };

      await performanceMonitor.recordMetric(metric);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalled();
    });

    it('should handle Redis failures gracefully', async () => {
      (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const metric = {
        type: 'response_time' as const,
        value: 150
      };

      await expect(performanceMonitor.recordMetric(metric)).resolves.not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should retrieve metrics by type from Redis', async () => {
      const mockMetricIds = ['metric1', 'metric2'];
      const mockMetric = {
        id: 'metric1',
        timestamp: new Date(),
        type: 'response_time',
        value: 150,
        unit: 'ms'
      };

      (redisClient.zRevRangeByScore as jest.Mock).mockResolvedValue(mockMetricIds);
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockMetric));

      const metrics = await performanceMonitor.getMetrics('response_time', 'day', 100);

      expect(metrics).toHaveLength(2);
      expect(redisClient.zRevRangeByScore).toHaveBeenCalledWith(
        'metrics:response_time',
        expect.any(Number),
        expect.any(Number),
        { LIMIT: { offset: 0, count: 100 } }
      );
    });

    it('should fallback to memory cache when Redis fails', async () => {
      (redisClient.zRevRangeByScore as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const metrics = await performanceMonitor.getMetrics('response_time', 'day', 100);

      expect(metrics).toBeInstanceOf(Array);
    });
  });

  describe('getPerformanceStats', () => {
    it('should calculate performance statistics', async () => {
      const mockMetrics = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'response_time' as const,
          value: 100,
          unit: 'ms',
          endpoint: '/api/test'
        },
        {
          id: '2',
          timestamp: new Date(),
          type: 'response_time' as const,
          value: 200,
          unit: 'ms',
          endpoint: '/api/test'
        },
        {
          id: '3',
          timestamp: new Date(),
          type: 'response_time' as const,
          value: 300,
          unit: 'ms',
          endpoint: '/api/other'
        }
      ];

      jest.spyOn(performanceMonitor, 'getMetrics').mockResolvedValue(mockMetrics);

      const stats = await performanceMonitor.getPerformanceStats('day');

      expect(stats.responseTime.avg).toBe(200);
      expect(stats.throughput).toBeGreaterThan(0);
      expect(stats.slowestEndpoints).toHaveLength(2);
      expect(stats.slowestEndpoints[0]?.endpoint).toBe('/api/other');
      expect(stats.slowestEndpoints[0]?.avgTime).toBe(300);
      expect(stats.systemMetrics).toHaveProperty('memoryUsage');
      expect(stats.systemMetrics).toHaveProperty('cpuUsage');
    });

    it('should handle empty metrics', async () => {
      jest.spyOn(performanceMonitor, 'getMetrics').mockResolvedValue([]);

      const stats = await performanceMonitor.getPerformanceStats('day');

      expect(stats.responseTime.avg).toBe(0);
      expect(stats.throughput).toBe(0);
      expect(stats.slowestEndpoints).toHaveLength(0);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      (redisClient.isHealthy as jest.Mock).mockReturnValue(true);
      (redisClient.ping as jest.Mock).mockResolvedValue('PONG');

      const health = await performanceMonitor.getSystemHealth();

      expect(health.status).toBeDefined();
      expect(health.services).toHaveProperty('redis');
      expect(health.services).toHaveProperty('database');
      expect(health.services).toHaveProperty('elasticsearch');
      expect(health.services).toHaveProperty('storage');
      expect(health.metrics).toHaveProperty('memoryUsage');
      expect(health.metrics).toHaveProperty('cpuUsage');
    });

    it('should detect Redis service failure', async () => {
      (redisClient.isHealthy as jest.Mock).mockReturnValue(false);

      const health = await performanceMonitor.getSystemHealth();

      expect(health.services.redis).toBe('down');
      expect(health.status).toBe('unhealthy');
    });

    it('should cache health status', async () => {
      (redisClient.isHealthy as jest.Mock).mockReturnValue(true);
      (redisClient.ping as jest.Mock).mockResolvedValue('PONG');

      const health1 = await performanceMonitor.getSystemHealth();
      const health2 = await performanceMonitor.getSystemHealth();

      expect(health1).toBe(health2); // Should return cached instance
    });
  });

  describe('cleanup', () => {
    it('should remove old metrics from Redis', async () => {
      await performanceMonitor.cleanup();

      const metricTypes = ['response_time', 'memory_usage', 'cpu_usage', 'database_query', 'cache_hit_rate'];
      
      metricTypes.forEach(type => {
        expect(redisClient.zRemRangeByScore).toHaveBeenCalledWith(
          `metrics:${type}`,
          0,
          expect.any(Number)
        );
      });
    });

    it('should handle cleanup failures gracefully', async () => {
      (redisClient.zRemRangeByScore as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(performanceMonitor.cleanup()).resolves.not.toThrow();
    });
  });
});