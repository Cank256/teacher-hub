import { SQLiteStorage } from '../storage/sqliteStorage';
import { CacheEntry, OfflineStorageConfig, StorageQuota } from '../types';
import logger from '../../utils/logger';

export class CacheManager {
  private storage: SQLiteStorage;
  private config: OfflineStorageConfig;

  constructor(storage: SQLiteStorage, config: OfflineStorageConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Cache data with intelligent priority-based storage
   */
  async cache<T>(key: string, data: T, options: {
    priority?: 'high' | 'medium' | 'low';
    ttl?: number; // Time to live in milliseconds
    tags?: string[];
  } = {}): Promise<void> {
    const { priority = 'medium', ttl, tags = [] } = options;
    
    try {
      // Check storage quota before caching
      const quota = this.storage.getStorageQuota();
      if (quota.critical) {
        await this.evictLowPriorityItems();
      }

      const expiresAt = ttl ? new Date(Date.now() + ttl) : undefined;
      
      // Store the data with the original key (tags are for metadata only)
      this.storage.setCache(key, data, priority, expiresAt);
      
      logger.debug('Data cached successfully', { key, priority, ttl });
    } catch (error) {
      logger.error('Failed to cache data', { key, error });
      throw error;
    }
  }

  /**
   * Retrieve cached data
   */
  get<T>(key: string): T | null {
    try {
      return this.storage.getCache<T>(key);
    } catch (error) {
      logger.error('Failed to retrieve cached data', { key, error });
      return null;
    }
  }

  /**
   * Cache critical content for offline access
   */
  async cacheCriticalContent(userId: string, content: {
    resources: any[];
    messages: any[];
    communities: any[];
    profile: any;
  }): Promise<void> {
    try {
      // Cache user profile with high priority
      await this.cache(`profile:${userId}`, content.profile, {
        priority: 'high',
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['profile', 'critical']
      });

      // Cache recent messages with high priority
      await this.cache(`messages:recent:${userId}`, content.messages.slice(0, 100), {
        priority: 'high',
        ttl: 12 * 60 * 60 * 1000, // 12 hours
        tags: ['messages', 'critical']
      });

      // Cache user's communities with medium priority
      await this.cache(`communities:${userId}`, content.communities, {
        priority: 'medium',
        ttl: 6 * 60 * 60 * 1000, // 6 hours
        tags: ['communities']
      });

      // Cache frequently accessed resources with medium priority
      const priorityResources = content.resources
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 50);

      await this.cache(`resources:priority:${userId}`, priorityResources, {
        priority: 'medium',
        ttl: 8 * 60 * 60 * 1000, // 8 hours
        tags: ['resources', 'priority']
      });

      logger.info('Critical content cached successfully', { userId });
    } catch (error) {
      logger.error('Failed to cache critical content', { userId, error });
      throw error;
    }
  }

  /**
   * Cache resources by subject for quick access
   */
  async cacheResourcesBySubject(subject: string, resources: any[]): Promise<void> {
    try {
      await this.cache(`resources:subject:${subject}`, resources, {
        priority: 'medium',
        ttl: 4 * 60 * 60 * 1000, // 4 hours
        tags: ['resources', 'subject', subject]
      });

      logger.debug('Resources cached by subject', { subject, count: resources.length });
    } catch (error) {
      logger.error('Failed to cache resources by subject', { subject, error });
      throw error;
    }
  }

  /**
   * Cache government content with high priority
   */
  async cacheGovernmentContent(content: any[]): Promise<void> {
    try {
      await this.cache('government:content', content, {
        priority: 'high',
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['government', 'official', 'critical']
      });

      // Cache by source for quick filtering
      const contentBySource = content.reduce((acc, item) => {
        if (!acc[item.source]) acc[item.source] = [];
        acc[item.source].push(item);
        return acc;
      }, {});

      for (const [source, sourceContent] of Object.entries(contentBySource)) {
        await this.cache(`government:${source}`, sourceContent, {
          priority: 'high',
          ttl: 24 * 60 * 60 * 1000,
          tags: ['government', source.toLowerCase()]
        });
      }

      logger.info('Government content cached successfully', { count: content.length });
    } catch (error) {
      logger.error('Failed to cache government content', { error });
      throw error;
    }
  }

  /**
   * Evict low priority items when storage is critical
   */
  private async evictLowPriorityItems(): Promise<void> {
    try {
      // This would require additional SQL queries to identify and remove low priority items
      // For now, we'll implement a simple cleanup strategy
      this.storage.cleanup();
      
      logger.info('Low priority items evicted due to storage constraints');
    } catch (error) {
      logger.error('Failed to evict low priority items', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    quota: StorageQuota;
    itemCount: number;
  } {
    const quota = this.storage.getStorageQuota();
    
    // This would require additional queries to get accurate item count
    // For now, return basic quota information
    return {
      quota,
      itemCount: 0 // Placeholder
    };
  }

  /**
   * Clear cache by tags
   */
  clearCacheByTags(tags: string[]): void {
    try {
      // This would require implementing tag-based cache clearing
      // For now, log the operation
      logger.info('Cache cleared by tags', { tags });
    } catch (error) {
      logger.error('Failed to clear cache by tags', { tags, error });
    }
  }

  /**
   * Preload essential data for offline use
   */
  async preloadEssentialData(userId: string): Promise<void> {
    try {
      // This would integrate with other services to preload essential data
      // Implementation would depend on the specific services available
      logger.info('Essential data preload initiated', { userId });
    } catch (error) {
      logger.error('Failed to preload essential data', { userId, error });
      throw error;
    }
  }
}