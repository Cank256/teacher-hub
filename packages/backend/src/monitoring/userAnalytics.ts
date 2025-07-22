import { v4 as uuidv4 } from 'uuid';
import { UserAnalyticsEvent } from './types';
import logger from '../utils/logger';
import { redisClient } from '../cache/redisClient';

class UserAnalytics {
  private events: UserAnalyticsEvent[] = [];
  private readonly maxEvents = 10000;
  private readonly eventRetentionDays = 90;

  /**
   * Track a user analytics event
   */
  async trackEvent(event: Partial<UserAnalyticsEvent>): Promise<void> {
    const analyticsEvent: UserAnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      userId: event.userId || 'anonymous',
      sessionId: event.sessionId || 'unknown',
      event: event.event || 'unknown',
      category: event.category || 'navigation',
      properties: event.properties || {},
      userAgent: event.userAgent,
      ip: event.ip,
      platform: event.platform || 'web'
    };

    // Store in memory
    this.events.unshift(analyticsEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Store in Redis for persistence
    try {
      const key = `analytics:${analyticsEvent.id}`;
      await redisClient.setEx(key, 60 * 60 * 24 * this.eventRetentionDays, JSON.stringify(analyticsEvent));
      
      // Add to various indexes for querying
      await redisClient.zAdd('analytics:events', [{
        score: analyticsEvent.timestamp.getTime(),
        value: analyticsEvent.id
      }]);

      await redisClient.zAdd(`analytics:user:${analyticsEvent.userId}`, [{
        score: analyticsEvent.timestamp.getTime(),
        value: analyticsEvent.id
      }]);

      await redisClient.zAdd(`analytics:category:${analyticsEvent.category}`, [{
        score: analyticsEvent.timestamp.getTime(),
        value: analyticsEvent.id
      }]);

      // Track daily active users
      const dateKey = new Date().toISOString().split('T')[0];
      await redisClient.sAdd(`analytics:dau:${dateKey}`, analyticsEvent.userId);
      await redisClient.expire(`analytics:dau:${dateKey}`, 60 * 60 * 24 * 30); // Keep for 30 days

    } catch (error) {
      logger.warn('Failed to store analytics event in Redis', { error });
    }

    logger.debug('Analytics event tracked', {
      event: analyticsEvent.event,
      category: analyticsEvent.category,
      userId: analyticsEvent.userId
    });
  }

  /**
   * Get user events
   */
  async getUserEvents(
    userId: string,
    timeRange: 'hour' | 'day' | 'week' = 'day',
    limit: number = 100
  ): Promise<UserAnalyticsEvent[]> {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    const cutoff = new Date(now.getTime() - timeRangeMs);

    try {
      const eventIds = await redisClient.zRevRangeByScore(
        `analytics:user:${userId}`,
        now.getTime(),
        cutoff.getTime(),
        { LIMIT: { offset: 0, count: limit } }
      );

      const events: UserAnalyticsEvent[] = [];
      for (const eventId of eventIds) {
        const eventData = await redisClient.get(`analytics:${eventId}`);
        if (eventData) {
          events.push(JSON.parse(eventData));
        }
      }
      return events;
    } catch (error) {
      logger.warn('Failed to get user events from Redis, using memory cache', { error });
      return this.events
        .filter(event => event.userId === userId && event.timestamp >= cutoff)
        .slice(0, limit);
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    topEvents: Array<{ event: string; count: number }>;
    categoryBreakdown: Record<string, number>;
    platformBreakdown: Record<string, number>;
    userEngagement: {
      averageSessionDuration: number;
      averageEventsPerUser: number;
      returnUserRate: number;
    };
    trends: {
      hourly: number[];
      daily: number[];
    };
  }> {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    const cutoff = new Date(now.getTime() - timeRangeMs);
    const events = await this.getEvents(timeRange, 10000);

    const summary = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      topEvents: [] as Array<{ event: string; count: number }>,
      categoryBreakdown: {} as Record<string, number>,
      platformBreakdown: {} as Record<string, number>,
      userEngagement: {
        averageSessionDuration: 0,
        averageEventsPerUser: 0,
        returnUserRate: 0
      },
      trends: {
        hourly: [] as number[],
        daily: [] as number[]
      }
    };

    // Calculate event counts
    const eventCounts: Record<string, number> = {};
    events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
      summary.categoryBreakdown[event.category] = (summary.categoryBreakdown[event.category] || 0) + 1;
      if (event.platform) {
        summary.platformBreakdown[event.platform] = (summary.platformBreakdown[event.platform] || 0) + 1;
      }
    });

    // Top events
    summary.topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    // User engagement metrics
    if (summary.uniqueUsers > 0) {
      summary.userEngagement.averageEventsPerUser = summary.totalEvents / summary.uniqueUsers;
    }

    // Calculate session durations
    const sessionDurations = await this.calculateSessionDurations(events);
    if (sessionDurations.length > 0) {
      summary.userEngagement.averageSessionDuration = 
        sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;
    }

    // Calculate trends
    summary.trends.hourly = await this.calculateHourlyTrend(events, 24);
    summary.trends.daily = await this.calculateDailyTrend(timeRange === 'week' ? 7 : 1);

    return summary;
  }

  /**
   * Get daily active users
   */
  async getDailyActiveUsers(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    const results: Array<{ date: string; count: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      try {
        const count = await redisClient.sCard(`analytics:dau:${dateKey}`);
        results.push({ date: dateKey || '', count });
      } catch (error) {
        logger.warn('Failed to get DAU from Redis', { error, date: dateKey });
        results.push({ date: dateKey || '', count: 0 });
      }
    }
    
    return results.reverse();
  }

  /**
   * Get user journey analysis
   */
  async getUserJourney(userId: string, sessionId?: string): Promise<{
    events: UserAnalyticsEvent[];
    duration: number;
    pages: string[];
    actions: string[];
    conversionFunnel: Record<string, number>;
  }> {
    let events = await this.getUserEvents(userId, 'day', 1000);
    
    if (sessionId) {
      events = events.filter(e => e.sessionId === sessionId);
    }

    const journey = {
      events: events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      duration: 0,
      pages: [] as string[],
      actions: [] as string[],
      conversionFunnel: {} as Record<string, number>
    };

    if (journey.events.length > 0) {
      const firstEvent = journey.events[0];
      const lastEvent = journey.events[journey.events.length - 1];
      if (firstEvent && lastEvent) {
        journey.duration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
      }

      // Extract pages and actions
      journey.events.forEach(event => {
        if (event.properties?.page && !journey.pages.includes(event.properties.page)) {
          journey.pages.push(event.properties.page);
        }
        if (!journey.actions.includes(event.event)) {
          journey.actions.push(event.event);
        }
      });

      // Simple conversion funnel
      const funnelSteps = ['page_view', 'search', 'resource_view', 'download', 'share'];
      funnelSteps.forEach(step => {
        journey.conversionFunnel[step] = journey.events.filter(e => e.event === step).length;
      });
    }

    return journey;
  }

  /**
   * Get events by category and time range
   */
  private async getEvents(
    timeRange: 'hour' | 'day' | 'week' = 'day',
    limit: number = 1000
  ): Promise<UserAnalyticsEvent[]> {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    const cutoff = new Date(now.getTime() - timeRangeMs);

    try {
      const eventIds = await redisClient.zRevRangeByScore(
        'analytics:events',
        now.getTime(),
        cutoff.getTime(),
        { LIMIT: { offset: 0, count: limit } }
      );

      const events: UserAnalyticsEvent[] = [];
      for (const eventId of eventIds) {
        const eventData = await redisClient.get(`analytics:${eventId}`);
        if (eventData) {
          events.push(JSON.parse(eventData));
        }
      }
      return events;
    } catch (error) {
      logger.warn('Failed to get events from Redis, using memory cache', { error });
      return this.events
        .filter(event => event.timestamp >= cutoff)
        .slice(0, limit);
    }
  }

  /**
   * Calculate session durations from events
   */
  private async calculateSessionDurations(events: UserAnalyticsEvent[]): Promise<number[]> {
    const sessionMap: Record<string, { start: number; end: number }> = {};
    
    events.forEach(event => {
      const key = `${event.userId}:${event.sessionId}`;
      const timestamp = event.timestamp.getTime();
      
      if (!sessionMap[key]) {
        sessionMap[key] = { start: timestamp, end: timestamp };
      } else {
        sessionMap[key].start = Math.min(sessionMap[key].start, timestamp);
        sessionMap[key].end = Math.max(sessionMap[key].end, timestamp);
      }
    });

    return Object.values(sessionMap).map(session => session.end - session.start);
  }

  /**
   * Calculate hourly trend
   */
  private async calculateHourlyTrend(events: UserAnalyticsEvent[], hours: number): Promise<number[]> {
    const trend: number[] = new Array(hours).fill(0);
    const now = new Date();
    
    events.forEach(event => {
      const hoursAgo = Math.floor((now.getTime() - event.timestamp.getTime()) / (60 * 60 * 1000));
      if (hoursAgo >= 0 && hoursAgo < hours) {
        const index = hours - 1 - hoursAgo;
        if (trend[index] !== undefined) {
          trend[index]++;
        }
      }
    });

    return trend;
  }

  /**
   * Calculate daily trend
   */
  private async calculateDailyTrend(days: number): Promise<number[]> {
    const trend: number[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      try {
        const count = await redisClient.sCard(`analytics:dau:${dateKey}`);
        trend.push(count);
      } catch (error) {
        trend.push(0);
      }
    }
    
    return trend;
  }

  /**
   * Clean up old events
   */
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - (this.eventRetentionDays * 24 * 60 * 60 * 1000);
    
    try {
      // Clean up Redis events
      await redisClient.zRemRangeByScore('analytics:events', 0, cutoff);
      
      // Clean up memory cache
      this.events = this.events.filter(event => event.timestamp.getTime() > cutoff);
      
      logger.info('Analytics cleanup completed', { 
        cutoff: new Date(cutoff),
        remainingEvents: this.events.length 
      });
    } catch (error) {
      logger.error('Analytics cleanup failed', { error });
    }
  }
}

export const userAnalytics = new UserAnalytics();

// Schedule cleanup every 24 hours
setInterval(() => {
  userAnalytics.cleanup();
}, 24 * 60 * 60 * 1000);