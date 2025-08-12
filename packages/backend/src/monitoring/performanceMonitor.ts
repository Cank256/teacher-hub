import { v4 as uuidv4 } from 'uuid';
import { PerformanceMetric, SystemHealth } from './types';
import logger from '../utils/logger';
import { redisClient } from '../cache/redisClient';
import os from 'os';

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 10000;
  private readonly metricRetentionDays = 7;
  private systemHealthCache: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthChecks();
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Partial<PerformanceMetric>): Promise<void> {
    const performanceMetric: PerformanceMetric = {
      id: uuidv4(),
      timestamp: new Date(),
      type: metric.type || 'response_time',
      value: metric.value || 0,
      unit: metric.unit || 'ms',
      endpoint: metric.endpoint,
      method: metric.method,
      userId: metric.userId,
      metadata: metric.metadata
    };

    // Store in memory
    this.metrics.unshift(performanceMetric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    // Store in Redis for persistence
    try {
      const key = `metric:${performanceMetric.id}`;
      await redisClient.setEx(key, 60 * 60 * 24 * this.metricRetentionDays, JSON.stringify(performanceMetric));
      
      // Add to metrics index
      await redisClient.zAdd(`metrics:${performanceMetric.type}`, [{
        score: performanceMetric.timestamp.getTime(),
        value: performanceMetric.id
      }]);
    } catch (error) {
      logger.warn('Failed to store metric in Redis', { error });
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(
    type?: string,
    timeRange: 'hour' | 'day' | 'week' = 'day',
    limit: number = 1000
  ): Promise<PerformanceMetric[]> {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    const cutoff = new Date(now.getTime() - timeRangeMs);

    try {
      if (type) {
        // Get specific metric type from Redis
        const metricIds = await redisClient.zRevRangeByScore(
          `metrics:${type}`,
          now.getTime(),
          cutoff.getTime(),
          { LIMIT: { offset: 0, count: limit } }
        );

        const metrics: PerformanceMetric[] = [];
        for (const metricId of metricIds) {
          const metricData = await redisClient.get(`metric:${metricId}`);
          if (metricData) {
            const metric = JSON.parse(metricData);
            // Convert timestamp string back to Date object
            metric.timestamp = new Date(metric.timestamp);
            metrics.push(metric);
          }
        }
        return metrics;
      } else {
        // Get from memory cache
        return this.metrics
          .filter(metric => metric.timestamp >= cutoff)
          .slice(0, limit);
      }
    } catch (error) {
      logger.warn('Failed to get metrics from Redis, using memory cache', { error });
      return this.metrics
        .filter(metric => (!type || metric.type === type) && metric.timestamp >= cutoff)
        .slice(0, limit);
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    responseTime: { avg: number; p95: number; p99: number };
    throughput: number;
    errorRate: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
    systemMetrics: {
      memoryUsage: number;
      cpuUsage: number;
      diskUsage: number;
    };
  }> {
    const metrics = await this.getMetrics(undefined, timeRange);
    const responseTimeMetrics = metrics.filter(m => m.type === 'response_time');
    
    // Calculate response time statistics
    const responseTimes = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b);
    const avg = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    
    // Calculate throughput (requests per minute)
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];
    const throughput = (responseTimeMetrics.length / (timeRangeMs / (60 * 1000)));

    // Calculate error rate (placeholder - would need error metrics)
    const errorRate = 0; // This would be calculated from error metrics

    // Find slowest endpoints
    const endpointTimes: Record<string, number[]> = {};
    responseTimeMetrics.forEach(metric => {
      if (metric.endpoint) {
        if (!endpointTimes[metric.endpoint]) {
          endpointTimes[metric.endpoint] = [];
        }
        endpointTimes[metric.endpoint]?.push(metric.value);
      }
    });

    const slowestEndpoints = Object.entries(endpointTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Get current system metrics
    const systemMetrics = {
      memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      cpuUsage: await this.getCpuUsage(),
      diskUsage: 0 // Placeholder - would need disk usage calculation
    };

    return {
      responseTime: {
        avg,
        p95: responseTimes[p95Index] || 0,
        p99: responseTimes[p99Index] || 0
      },
      throughput,
      errorRate,
      slowestEndpoints,
      systemMetrics
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    if (this.systemHealthCache) {
      return this.systemHealthCache;
    }

    const health: SystemHealth = {
      timestamp: new Date(),
      status: 'healthy',
      services: {
        database: 'up',
        redis: 'up',
        elasticsearch: 'up',
        storage: 'up'
      },
      metrics: {
        memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        cpuUsage: await this.getCpuUsage(),
        diskUsage: 0,
        activeConnections: 0,
        responseTime: 0
      }
    };

    // Check Redis health
    try {
      if (redisClient.isHealthy()) {
        await redisClient.ping();
        health.services.redis = 'up';
      } else {
        health.services.redis = 'down';
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.redis = 'down';
      health.status = 'degraded';
    }

    // Check database health (placeholder)
    // This would check actual database connection
    health.services.database = 'up';

    // Check Elasticsearch health (placeholder)
    // This would check actual Elasticsearch connection
    health.services.elasticsearch = 'up';

    // Check storage health (placeholder)
    // This would check S3 or file system
    health.services.storage = 'up';

    // Determine overall status
    const serviceStatuses = Object.values(health.services);
    if (serviceStatuses.some(status => status === 'down')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.some(status => status === 'degraded')) {
      health.status = 'degraded';
    }

    // Cache for 30 seconds
    this.systemHealthCache = health;
    setTimeout(() => {
      this.systemHealthCache = null;
    }, 30000);

    return health;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        // Record system metrics
        await this.recordMetric({
          type: 'memory_usage',
          value: health.metrics.memoryUsage,
          unit: 'percent'
        });

        await this.recordMetric({
          type: 'cpu_usage',
          value: health.metrics.cpuUsage,
          unit: 'percent'
        });

        // Log health status
        if (health.status !== 'healthy') {
          logger.warn('System health degraded', health);
        }
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, 60000); // Every minute
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000;
        const totalUsage = currentUsage.user + currentUsage.system;
        
        const cpuPercent = (totalUsage / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Clean up old metrics
   */
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - (this.metricRetentionDays * 24 * 60 * 60 * 1000);
    
    try {
      // Clean up Redis metrics
      const metricTypes = ['response_time', 'memory_usage', 'cpu_usage', 'database_query', 'cache_hit_rate'];
      
      for (const type of metricTypes) {
        await redisClient.zRemRangeByScore(`metrics:${type}`, 0, cutoff);
      }
      
      // Clean up memory cache
      this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoff);
      
      logger.info('Performance metrics cleanup completed', { 
        cutoff: new Date(cutoff),
        remainingMetrics: this.metrics.length 
      });
    } catch (error) {
      logger.error('Performance metrics cleanup failed', { error });
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Schedule cleanup every 6 hours
setInterval(() => {
  performanceMonitor.cleanup();
}, 6 * 60 * 60 * 1000);