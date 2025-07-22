import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set');
      return false;
    }

    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache delete');
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  // Additional methods for monitoring system
  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping setEx');
      return null;
    }

    try {
      return await this.client.setEx(key, seconds, value);
    } catch (error) {
      logger.error('Redis SETEX error:', error);
      return null;
    }
  }

  async zAdd(key: string, score: number, member: string): Promise<number>;
  async zAdd(key: string, scoreMembers: Array<{ score: number; value: string }>): Promise<number>;
  async zAdd(key: string, scoreOrMembers: number | Array<{ score: number; value: string }>, member?: string): Promise<number> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping zAdd');
      return 0;
    }

    try {
      if (typeof scoreOrMembers === 'number' && member) {
        return await this.client.zAdd(key, { score: scoreOrMembers, value: member });
      } else if (Array.isArray(scoreOrMembers)) {
        return await this.client.zAdd(key, scoreOrMembers);
      }
      return 0;
    } catch (error) {
      logger.error('Redis ZADD error:', error);
      return 0;
    }
  }

  async zRevRange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping zRevRange');
      return [];
    }

    try {
      return await this.client.zRange(key, start, stop, { REV: true });
    } catch (error) {
      logger.error('Redis ZREVRANGE error:', error);
      return [];
    }
  }

  async zRevRangeByScore(key: string, max: number, min: number, options?: { LIMIT?: { offset: number; count: number } }): Promise<string[]> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping zRevRangeByScore');
      return [];
    }

    try {
      const redisOptions: any = { REV: true };
      if (options?.LIMIT) {
        redisOptions.LIMIT = options.LIMIT;
      }
      return await this.client.zRangeByScore(key, min, max, redisOptions);
    } catch (error) {
      logger.error('Redis ZREVRANGEBYSCORE error:', error);
      return [];
    }
  }

  async zRemRangeByScore(key: string, min: number, max: number): Promise<number> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping zRemRangeByScore');
      return 0;
    }

    try {
      return await this.client.zRemRangeByScore(key, min, max);
    } catch (error) {
      logger.error('Redis ZREMRANGEBYSCORE error:', error);
      return 0;
    }
  }

  async sAdd(key: string, members: string | string[]): Promise<number> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping sAdd');
      return 0;
    }

    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      logger.error('Redis SADD error:', error);
      return 0;
    }
  }

  async sCard(key: string): Promise<number> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping sCard');
      return 0;
    }

    try {
      return await this.client.sCard(key);
    } catch (error) {
      logger.error('Redis SCARD error:', error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping expire');
      return false;
    }

    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  async ping(): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis PING error:', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();