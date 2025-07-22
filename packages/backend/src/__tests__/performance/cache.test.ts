import { cacheService } from '../../cache/cacheService';
import { redisClient } from '../../cache/redisClient';

describe('Cache Performance Tests', () => {
  beforeAll(async () => {
    // Connect to Redis for testing
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis not available for testing, skipping cache tests');
    }
  });

  afterAll(async () => {
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (redisClient.isHealthy()) {
      await redisClient.flushAll();
    }
  });

  describe('Cache Service Performance', () => {
    it('should cache and retrieve data efficiently', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const testData = { id: 1, name: 'Test Content', data: 'Large content data'.repeat(100) };
      const key = 'test-performance-key';

      // Measure cache set performance
      const setStart = Date.now();
      await cacheService.set(key, testData, { ttl: 300 });
      const setTime = Date.now() - setStart;

      // Measure cache get performance
      const getStart = Date.now();
      const retrieved = await cacheService.get(key);
      const getTime = Date.now() - getStart;

      expect(retrieved).toEqual(testData);
      expect(setTime).toBeLessThan(100); // Should complete within 100ms
      expect(getTime).toBeLessThan(50);  // Should complete within 50ms
    });

    it('should handle concurrent cache operations', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const concurrentOperations = 50;
      const promises: Promise<any>[] = [];

      const start = Date.now();

      // Create concurrent set operations
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          cacheService.set(`concurrent-key-${i}`, { id: i, data: `Data ${i}` }, { ttl: 300 })
        );
      }

      // Wait for all operations to complete
      await Promise.all(promises);
      const setTime = Date.now() - start;

      // Create concurrent get operations
      const getPromises: Promise<any>[] = [];
      const getStart = Date.now();

      for (let i = 0; i < concurrentOperations; i++) {
        getPromises.push(cacheService.get(`concurrent-key-${i}`));
      }

      const results = await Promise.all(getPromises);
      const getTime = Date.now() - getStart;

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations);
      results.forEach((result, index) => {
        expect(result).toEqual({ id: index, data: `Data ${index}` });
      });

      // Performance assertions
      expect(setTime).toBeLessThan(2000); // All sets should complete within 2 seconds
      expect(getTime).toBeLessThan(1000); // All gets should complete within 1 second
    });

    it('should efficiently handle cache misses', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const start = Date.now();
      const result = await cacheService.get('non-existent-key');
      const time = Date.now() - start;

      expect(result).toBeNull();
      expect(time).toBeLessThan(50); // Cache miss should be fast
    });

    it('should perform well with getOrSet pattern', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      let fallbackCallCount = 0;
      const expensiveOperation = async () => {
        fallbackCallCount++;
        // Simulate expensive operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 1, computed: 'expensive result' };
      };

      // First call should execute fallback
      const start1 = Date.now();
      const result1 = await cacheService.getOrSet('expensive-key', expensiveOperation, { ttl: 300 });
      const time1 = Date.now() - start1;

      // Second call should use cache
      const start2 = Date.now();
      const result2 = await cacheService.getOrSet('expensive-key', expensiveOperation, { ttl: 300 });
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(fallbackCallCount).toBe(1); // Fallback should only be called once
      expect(time1).toBeGreaterThan(100); // First call includes expensive operation
      expect(time2).toBeLessThan(50);     // Second call should be fast (cached)
    });
  });

  describe('Cache Memory Usage', () => {
    it('should handle large data efficiently', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      // Create large test data (1MB)
      const largeData = {
        id: 1,
        content: 'x'.repeat(1024 * 1024), // 1MB string
        metadata: { size: 'large', type: 'test' }
      };

      const start = Date.now();
      await cacheService.set('large-data-key', largeData, { ttl: 300 });
      const setTime = Date.now() - start;

      const getStart = Date.now();
      const retrieved = await cacheService.get('large-data-key');
      const getTime = Date.now() - getStart;

      expect(retrieved).toEqual(largeData);
      expect(setTime).toBeLessThan(1000); // Should handle large data within 1 second
      expect(getTime).toBeLessThan(500);  // Retrieval should be reasonably fast
    });
  });

  describe('Cache TTL Performance', () => {
    it('should handle TTL expiration correctly', async () => {
      if (!redisClient.isHealthy()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const testData = { id: 1, message: 'TTL test' };
      const key = 'ttl-test-key';

      // Set with short TTL
      await cacheService.set(key, testData, { ttl: 1 }); // 1 second TTL

      // Verify data exists immediately
      const immediate = await cacheService.get(key);
      expect(immediate).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify data has expired
      const expired = await cacheService.get(key);
      expect(expired).toBeNull();
    }, 10000); // Increase timeout for this test
  });
});