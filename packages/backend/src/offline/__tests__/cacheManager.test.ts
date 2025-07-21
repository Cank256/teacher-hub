import { CacheManager } from '../cache/cacheManager';
import { SQLiteStorage } from '../storage/sqliteStorage';
import { OfflineStorageConfig } from '../types';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let storage: SQLiteStorage;
  let config: OfflineStorageConfig;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `cache-test-${Date.now()}.db`;
    config = {
      dbPath: testDbPath,
      maxCacheSize: 50, // 50MB
      maxRetries: 3,
      retryDelay: 1000,
      syncInterval: 5000,
      priorityLevels: {
        high: 24,
        medium: 12,
        low: 6
      }
    };
    storage = new SQLiteStorage(config);
    cacheManager = new CacheManager(storage, config);
  });

  afterEach(() => {
    storage.close();
    const fullPath = join(process.cwd(), 'data', 'offline', testDbPath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  describe('Basic Caching', () => {
    it('should cache and retrieve data', async () => {
      const testData = { message: 'Hello Cache', timestamp: Date.now() };
      const key = 'test-cache-key';

      await cacheManager.cache(key, testData);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(testData);
    });

    it('should handle different priority levels', async () => {
      const highPriorityData = { priority: 'high', data: 'important' };
      const mediumPriorityData = { priority: 'medium', data: 'normal' };
      const lowPriorityData = { priority: 'low', data: 'optional' };

      await cacheManager.cache('high-key', highPriorityData, { priority: 'high' });
      await cacheManager.cache('medium-key', mediumPriorityData, { priority: 'medium' });
      await cacheManager.cache('low-key', lowPriorityData, { priority: 'low' });

      expect(cacheManager.get('high-key')).toEqual(highPriorityData);
      expect(cacheManager.get('medium-key')).toEqual(mediumPriorityData);
      expect(cacheManager.get('low-key')).toEqual(lowPriorityData);
    });

    it('should handle TTL expiration', async () => {
      const testData = { message: 'Expiring data' };
      const key = 'expiring-key';
      const ttl = 100; // 100ms

      await cacheManager.cache(key, testData, { ttl });
      
      // Should be available immediately
      expect(cacheManager.get(key)).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should handle tags', async () => {
      const testData = { message: 'Tagged data' };
      const key = 'tagged-key';
      const tags = ['user', 'profile', 'critical'];

      await cacheManager.cache(key, testData, { tags });
      
      // Note: The actual tagged key includes the tags
      // This test verifies the caching works with tags
      expect(() => cacheManager.cache(key, testData, { tags })).not.toThrow();
    });
  });

  describe('Critical Content Caching', () => {
    it('should cache critical content for a user', async () => {
      const userId = 'user-123';
      const content = {
        resources: [
          { id: 'res-1', title: 'Resource 1', downloadCount: 100 },
          { id: 'res-2', title: 'Resource 2', downloadCount: 50 }
        ],
        messages: [
          { id: 'msg-1', content: 'Message 1', timestamp: new Date() },
          { id: 'msg-2', content: 'Message 2', timestamp: new Date() }
        ],
        communities: [
          { id: 'comm-1', name: 'Math Teachers' },
          { id: 'comm-2', name: 'Science Hub' }
        ],
        profile: {
          id: userId,
          name: 'John Teacher',
          subjects: ['Mathematics', 'Physics']
        }
      };

      await cacheManager.cacheCriticalContent(userId, content);

      // Verify profile is cached
      const cachedProfile = cacheManager.get(`profile:${userId}`);
      expect(cachedProfile).toEqual(content.profile);

      // Verify messages are cached
      const cachedMessages = cacheManager.get(`messages:recent:${userId}`);
      expect(cachedMessages).toHaveLength(2);

      // Verify communities are cached
      const cachedCommunities = cacheManager.get(`communities:${userId}`);
      expect(cachedCommunities).toEqual(content.communities);

      // Verify priority resources are cached
      const cachedResources = cacheManager.get(`resources:priority:${userId}`);
      expect(cachedResources).toHaveLength(2);
    });
  });

  describe('Subject-based Resource Caching', () => {
    it('should cache resources by subject', async () => {
      const subject = 'Mathematics';
      const resources = [
        { id: 'math-1', title: 'Algebra Basics', subject: 'Mathematics' },
        { id: 'math-2', title: 'Geometry Guide', subject: 'Mathematics' }
      ];

      await cacheManager.cacheResourcesBySubject(subject, resources);

      const cachedResources = cacheManager.get(`resources:subject:${subject}`);
      expect(cachedResources).toEqual(resources);
    });
  });

  describe('Government Content Caching', () => {
    it('should cache government content with high priority', async () => {
      const governmentContent = [
        {
          id: 'gov-1',
          source: 'MOE',
          title: 'New Curriculum Guidelines',
          content: 'Updated guidelines for 2024'
        },
        {
          id: 'gov-2',
          source: 'UNEB',
          title: 'Exam Schedule',
          content: 'National exam dates'
        },
        {
          id: 'gov-3',
          source: 'NCDC',
          title: 'Resource Standards',
          content: 'Quality standards for educational resources'
        }
      ];

      await cacheManager.cacheGovernmentContent(governmentContent);

      // Verify all content is cached
      const cachedContent = cacheManager.get('government:content');
      expect(cachedContent).toEqual(governmentContent);

      // Verify content is cached by source
      const moeContent = cacheManager.get('government:MOE') as any[];
      expect(moeContent).toHaveLength(1);
      expect(moeContent[0]?.source).toBe('MOE');

      const unebContent = cacheManager.get('government:UNEB') as any[];
      expect(unebContent).toHaveLength(1);
      expect(unebContent[0]?.source).toBe('UNEB');

      const ncdcContent = cacheManager.get('government:NCDC') as any[];
      expect(ncdcContent).toHaveLength(1);
      expect(ncdcContent[0]?.source).toBe('NCDC');
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', () => {
      const stats = cacheManager.getCacheStats();

      expect(stats).toHaveProperty('quota');
      expect(stats).toHaveProperty('itemCount');
      expect(stats.quota).toHaveProperty('total');
      expect(stats.quota).toHaveProperty('used');
      expect(stats.quota).toHaveProperty('available');
      expect(stats.quota).toHaveProperty('critical');
    });
  });

  describe('Cache Management Operations', () => {
    it('should clear cache by tags', () => {
      const tags = ['user', 'temporary'];
      
      // Should not throw error
      expect(() => cacheManager.clearCacheByTags(tags)).not.toThrow();
    });

    it('should preload essential data', async () => {
      const userId = 'user-456';
      
      // Should not throw error
      await expect(cacheManager.preloadEssentialData(userId)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle caching errors gracefully', async () => {
      // Test with invalid data that might cause JSON serialization issues
      const circularData: any = {};
      circularData.self = circularData;

      await expect(cacheManager.cache('circular-key', circularData)).rejects.toThrow();
    });

    it('should return null for non-existent cache keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle storage quota checks', async () => {
      // This test verifies that quota checking doesn't throw errors
      const largeData = { data: 'x'.repeat(1000000) }; // 1MB of data
      
      await expect(cacheManager.cache('large-data', largeData)).resolves.not.toThrow();
    });
  });
});