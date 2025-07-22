import { errorTracker } from '../../monitoring/errorTracker';
import { redisClient } from '../../cache/redisClient';

// Mock Redis client
jest.mock('../../cache/redisClient', () => ({
  redisClient: {
    setEx: jest.fn(),
    zAdd: jest.fn(),
    zRevRange: jest.fn(),
    get: jest.fn(),
    zRevRangeByScore: jest.fn(),
    zRemRangeByScore: jest.fn()
  }
}));

describe('ErrorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackError', () => {
    it('should track an error with all properties', async () => {
      const errorData = {
        level: 'error' as const,
        message: 'Test error',
        stack: 'Error stack trace',
        userId: 'user123',
        requestId: 'req123',
        endpoint: '/api/test',
        method: 'POST',
        statusCode: 500,
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        metadata: { key: 'value' }
      };

      await errorTracker.trackError(errorData);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalledWith('errors:index', expect.any(Object));
    });

    it('should track an error with minimal properties', async () => {
      const errorData = {
        message: 'Simple error'
      };

      await errorTracker.trackError(errorData);

      expect(redisClient.setEx).toHaveBeenCalled();
      expect(redisClient.zAdd).toHaveBeenCalled();
    });

    it('should handle Redis failures gracefully', async () => {
      (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const errorData = {
        message: 'Test error'
      };

      await expect(errorTracker.trackError(errorData)).resolves.not.toThrow();
    });
  });

  describe('getRecentErrors', () => {
    it('should retrieve errors from Redis', async () => {
      const mockErrorIds = ['error1', 'error2'];
      const mockError = {
        id: 'error1',
        timestamp: new Date(),
        level: 'error',
        message: 'Test error'
      };

      (redisClient.zRevRange as jest.Mock).mockResolvedValue(mockErrorIds);
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockError));

      const errors = await errorTracker.getRecentErrors(10, 0);

      expect(errors).toHaveLength(2);
      expect(redisClient.zRevRange).toHaveBeenCalledWith('errors:index', 0, 9);
    });

    it('should fallback to memory cache when Redis fails', async () => {
      (redisClient.zRevRange as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const errors = await errorTracker.getRecentErrors(10, 0);

      expect(errors).toBeInstanceOf(Array);
    });
  });

  describe('getErrorStats', () => {
    it('should calculate error statistics', async () => {
      // Mock recent errors
      const mockErrors = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'error' as const,
          message: 'Error 1',
          endpoint: '/api/test',
          statusCode: 500
        },
        {
          id: '2',
          timestamp: new Date(),
          level: 'warn' as const,
          message: 'Warning 1',
          endpoint: '/api/test',
          statusCode: 400
        }
      ];

      jest.spyOn(errorTracker, 'getRecentErrors').mockResolvedValue(mockErrors);

      const stats = await errorTracker.getErrorStats('day');

      expect(stats.total).toBe(2);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byEndpoint['/api/test']).toBe(2);
      expect(stats.byStatusCode['500']).toBe(1);
      expect(stats.byStatusCode['400']).toBe(1);
      expect(stats.trend).toBeInstanceOf(Array);
    });

    it('should handle empty error list', async () => {
      jest.spyOn(errorTracker, 'getRecentErrors').mockResolvedValue([]);

      const stats = await errorTracker.getErrorStats('day');

      expect(stats.total).toBe(0);
      expect(stats.byLevel).toEqual({});
      expect(stats.byEndpoint).toEqual({});
      expect(stats.byStatusCode).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('should remove old errors from Redis', async () => {
      await errorTracker.cleanup();

      expect(redisClient.zRemRangeByScore).toHaveBeenCalledWith(
        'errors:index',
        0,
        expect.any(Number)
      );
    });

    it('should handle cleanup failures gracefully', async () => {
      (redisClient.zRemRangeByScore as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(errorTracker.cleanup()).resolves.not.toThrow();
    });
  });
});