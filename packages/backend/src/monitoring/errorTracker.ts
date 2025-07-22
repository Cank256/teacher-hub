import { v4 as uuidv4 } from 'uuid';
import { ErrorEvent } from './types';
import logger from '../utils/logger';
import { redisClient } from '../cache/redisClient';

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private readonly maxErrors = 1000;
  private readonly errorRetentionDays = 30;

  /**
   * Track an error event
   */
  async trackError(error: Partial<ErrorEvent>): Promise<void> {
    const errorEvent: ErrorEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      level: error.level || 'error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      userId: error.userId,
      requestId: error.requestId,
      endpoint: error.endpoint,
      method: error.method,
      statusCode: error.statusCode,
      userAgent: error.userAgent,
      ip: error.ip,
      metadata: error.metadata
    };

    // Store in memory (for quick access)
    this.errors.unshift(errorEvent);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log the error
    logger.error('Error tracked', errorEvent);

    // Store in Redis for persistence
    try {
      const key = `error:${errorEvent.id}`;
      await redisClient.setEx(key, 60 * 60 * 24 * this.errorRetentionDays, JSON.stringify(errorEvent));
      
      // Add to error index for querying
      await redisClient.zAdd('errors:index', [{
        score: errorEvent.timestamp.getTime(),
        value: errorEvent.id
      }]);
    } catch (redisError) {
      logger.warn('Failed to store error in Redis', { error: redisError });
    }

    // Check for alert conditions
    await this.checkAlertConditions(errorEvent);
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 50, offset: number = 0): Promise<ErrorEvent[]> {
    try {
      // Try to get from Redis first
      const errorIds = await redisClient.zRevRange('errors:index', offset, offset + limit - 1);
      const errors: ErrorEvent[] = [];

      for (const errorId of errorIds) {
        const errorData = await redisClient.get(`error:${errorId}`);
        if (errorData) {
          errors.push(JSON.parse(errorData));
        }
      }

      return errors;
    } catch (redisError) {
      logger.warn('Failed to get errors from Redis, using memory cache', { error: redisError });
      return this.errors.slice(offset, offset + limit);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<string, number>;
    trend: number[];
  }> {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    const cutoff = new Date(now.getTime() - timeRangeMs);
    const recentErrors = await this.getRecentErrors(1000);
    const filteredErrors = recentErrors.filter(error => error.timestamp >= cutoff);

    const stats = {
      total: filteredErrors.length,
      byLevel: {} as Record<string, number>,
      byEndpoint: {} as Record<string, number>,
      byStatusCode: {} as Record<string, number>,
      trend: [] as number[]
    };

    // Calculate statistics
    filteredErrors.forEach(error => {
      // By level
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
      
      // By endpoint
      if (error.endpoint) {
        stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;
      }
      
      // By status code
      if (error.statusCode) {
        const code = error.statusCode.toString();
        stats.byStatusCode[code] = (stats.byStatusCode[code] || 0) + 1;
      }
    });

    // Calculate trend (hourly buckets)
    const buckets = timeRange === 'hour' ? 12 : timeRange === 'day' ? 24 : 168; // 5-minute, hourly, or hourly buckets
    const bucketSize = timeRangeMs / buckets;
    
    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(cutoff.getTime() + i * bucketSize);
      const bucketEnd = new Date(bucketStart.getTime() + bucketSize);
      
      const bucketCount = filteredErrors.filter(error => 
        error.timestamp >= bucketStart && error.timestamp < bucketEnd
      ).length;
      
      stats.trend.push(bucketCount);
    }

    return stats;
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(error: ErrorEvent): Promise<void> {
    // Check for high error rate
    const recentErrors = await this.getRecentErrors(100);
    const last5Minutes = recentErrors.filter(e => 
      e.timestamp.getTime() > Date.now() - 5 * 60 * 1000
    );

    if (last5Minutes.length > 10) {
      logger.warn('High error rate detected', {
        count: last5Minutes.length,
        timeWindow: '5 minutes'
      });
    }

    // Check for critical errors
    if (error.level === 'error' && error.statusCode && error.statusCode >= 500) {
      logger.error('Critical error detected', error);
    }
  }

  /**
   * Clear old errors
   */
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - (this.errorRetentionDays * 24 * 60 * 60 * 1000);
    
    try {
      // Remove old errors from Redis
      await redisClient.zRemRangeByScore('errors:index', 0, cutoff);
      
      // Clean up memory cache
      this.errors = this.errors.filter(error => error.timestamp.getTime() > cutoff);
      
      logger.info('Error cleanup completed', { 
        cutoff: new Date(cutoff),
        remainingErrors: this.errors.length 
      });
    } catch (error) {
      logger.error('Error cleanup failed', { error });
    }
  }
}

export const errorTracker = new ErrorTracker();

// Schedule cleanup every hour
setInterval(() => {
  errorTracker.cleanup();
}, 60 * 60 * 1000);