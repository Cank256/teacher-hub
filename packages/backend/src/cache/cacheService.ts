import { redisClient } from './redisClient';
import logger from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private defaultTTL = 3600; // 1 hour default
  private keyPrefix = 'teacher-hub:';

  constructor() {}

  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return JSON.parse(cached);
      }
      
      logger.debug(`Cache miss for key: ${cacheKey}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);
      
      const success = await redisClient.set(cacheKey, serialized, ttl);
      
      if (success) {
        logger.debug(`Cache set for key: ${cacheKey}, TTL: ${ttl}s`);
      }
      
      return success;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const success = await redisClient.del(cacheKey);
      
      if (success) {
        logger.debug(`Cache deleted for key: ${cacheKey}`);
      }
      
      return success;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await redisClient.exists(cacheKey);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Cache with fallback - get from cache or execute function and cache result
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // Execute fallback function
      logger.debug(`Executing fallback for cache key: ${key}`);
      const result = await fallbackFn();

      // Cache the result
      await this.set(key, result, options);

      return result;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      // If caching fails, still return the result from fallback
      return await fallbackFn();
    }
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const prefix = options?.prefix || this.keyPrefix;
      const fullPattern = `${prefix}${pattern}`;
      
      // Note: This is a simplified implementation
      // In production, you might want to use Redis SCAN for better performance
      logger.info(`Invalidating cache pattern: ${fullPattern}`);
      
      // For now, we'll just log the pattern
      // A full implementation would scan and delete matching keys
      return 0;
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
      return 0;
    }
  }

  // Health check
  isHealthy(): boolean {
    return redisClient.isHealthy();
  }
}

export const cacheService = new CacheService();