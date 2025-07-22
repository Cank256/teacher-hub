import express from 'express';
import { errorTracker } from '../monitoring/errorTracker';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { userAnalytics } from '../monitoring/userAnalytics';
import { authMiddleware } from '../middleware/auth';
import { userActionTrackingMiddleware } from '../middleware/monitoring';

const router = express.Router();

// Apply authentication middleware to all monitoring routes
router.use(authMiddleware);

/**
 * Get system health status
 */
router.get('/health', userActionTrackingMiddleware('view_system_health', 'monitoring'), async (req, res) => {
  try {
    const health = await performanceMonitor.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to retrieve system health',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get error statistics
 */
router.get('/errors/stats', userActionTrackingMiddleware('view_error_stats', 'monitoring'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const stats = await errorTracker.getErrorStats(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'ERROR_STATS_FAILED',
        message: 'Failed to retrieve error statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get recent errors
 */
router.get('/errors', userActionTrackingMiddleware('view_errors', 'monitoring'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const errors = await errorTracker.getRecentErrors(limit, offset);
    res.json(errors);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'GET_ERRORS_FAILED',
        message: 'Failed to retrieve errors',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get performance statistics
 */
router.get('/performance/stats', userActionTrackingMiddleware('view_performance_stats', 'monitoring'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const stats = await performanceMonitor.getPerformanceStats(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'PERFORMANCE_STATS_FAILED',
        message: 'Failed to retrieve performance statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get performance metrics
 */
router.get('/performance/metrics', userActionTrackingMiddleware('view_performance_metrics', 'monitoring'), async (req, res) => {
  try {
    const type = req.query.type as string;
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const limit = parseInt(req.query.limit as string) || 1000;
    
    const metrics = await performanceMonitor.getMetrics(type, timeRange, limit);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'GET_METRICS_FAILED',
        message: 'Failed to retrieve performance metrics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get analytics summary
 */
router.get('/analytics/summary', userActionTrackingMiddleware('view_analytics_summary', 'monitoring'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const summary = await userAnalytics.getAnalyticsSummary(timeRange);
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'ANALYTICS_SUMMARY_FAILED',
        message: 'Failed to retrieve analytics summary',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get daily active users
 */
router.get('/analytics/dau', userActionTrackingMiddleware('view_dau', 'monitoring'), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const dau = await userAnalytics.getDailyActiveUsers(days);
    res.json(dau);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DAU_FAILED',
        message: 'Failed to retrieve daily active users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get user journey analysis
 */
router.get('/analytics/user/:userId/journey', userActionTrackingMiddleware('view_user_journey', 'monitoring'), async (req, res) => {
  try {
    const { userId } = req.params;
    const sessionId = req.query.sessionId as string;
    const journey = await userAnalytics.getUserJourney(userId, sessionId);
    res.json(journey);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_JOURNEY_FAILED',
        message: 'Failed to retrieve user journey',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get user events
 */
router.get('/analytics/user/:userId/events', userActionTrackingMiddleware('view_user_events', 'monitoring'), async (req, res) => {
  try {
    const { userId } = req.params;
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const limit = parseInt(req.query.limit as string) || 100;
    
    const events = await userAnalytics.getUserEvents(userId, timeRange, limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_EVENTS_FAILED',
        message: 'Failed to retrieve user events',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Track custom analytics event
 */
router.post('/analytics/track', userActionTrackingMiddleware('track_custom_event', 'monitoring'), async (req, res) => {
  try {
    const { event, category, properties } = req.body;
    
    await userAnalytics.trackEvent({
      userId: req.userId,
      sessionId: req.sessionId,
      event,
      category,
      properties,
      userAgent: req.headers['user-agent'] as string,
      ip: req.ip,
      platform: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web'
    });

    res.json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'TRACK_EVENT_FAILED',
        message: 'Failed to track analytics event',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get monitoring dashboard data
 */
router.get('/dashboard', userActionTrackingMiddleware('view_monitoring_dashboard', 'monitoring'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    
    const [health, errorStats, performanceStats, analyticsStats, dau] = await Promise.all([
      performanceMonitor.getSystemHealth(),
      errorTracker.getErrorStats(timeRange),
      performanceMonitor.getPerformanceStats(timeRange),
      userAnalytics.getAnalyticsSummary(timeRange),
      userAnalytics.getDailyActiveUsers(7)
    ]);

    res.json({
      health,
      errors: errorStats,
      performance: performanceStats,
      analytics: analyticsStats,
      dailyActiveUsers: dau,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DASHBOARD_FAILED',
        message: 'Failed to retrieve dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;