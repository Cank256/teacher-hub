import express from 'express';
import { errorTracker } from '../monitoring/errorTracker';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { userAnalytics } from '../monitoring/userAnalytics';
import { authMiddleware } from '../middleware/auth';
import { userActionTrackingMiddleware } from '../middleware/monitoring';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware);

// Middleware to check admin permissions (placeholder - would check user role)
const adminMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // In a real implementation, this would check if the user has admin role
  // For now, we'll assume all authenticated users can access admin features
  next();
};

router.use(adminMiddleware);

/**
 * Get comprehensive admin dashboard data
 */
router.get('/dashboard', userActionTrackingMiddleware('view_admin_dashboard', 'navigation'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    
    const [
      systemHealth,
      errorStats,
      performanceStats,
      analyticsStats,
      dailyActiveUsers,
      recentErrors
    ] = await Promise.all([
      performanceMonitor.getSystemHealth(),
      errorTracker.getErrorStats(timeRange),
      performanceMonitor.getPerformanceStats(timeRange),
      userAnalytics.getAnalyticsSummary(timeRange),
      userAnalytics.getDailyActiveUsers(30),
      errorTracker.getRecentErrors(20)
    ]);

    // Calculate additional admin metrics
    const adminMetrics = {
      totalUsers: analyticsStats.uniqueUsers,
      activeUsers: dailyActiveUsers[dailyActiveUsers.length - 1]?.count || 0,
      errorRate: (errorStats.total / (analyticsStats.totalEvents || 1)) * 100,
      avgResponseTime: performanceStats.responseTime.avg,
      systemStatus: systemHealth.status,
      criticalErrors: recentErrors.filter(e => e.level === 'error' && e.statusCode && e.statusCode >= 500).length
    };

    res.json({
      overview: adminMetrics,
      systemHealth,
      errors: errorStats,
      performance: performanceStats,
      analytics: analyticsStats,
      dailyActiveUsers,
      recentErrors: recentErrors.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'ADMIN_DASHBOARD_FAILED',
        message: 'Failed to retrieve admin dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get detailed error reports
 */
router.get('/reports/errors', userActionTrackingMiddleware('view_error_reports', 'navigation'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const [errorStats, recentErrors] = await Promise.all([
      errorTracker.getErrorStats(timeRange),
      errorTracker.getRecentErrors(limit, offset)
    ]);

    // Group errors by endpoint and status code for detailed analysis
    const errorAnalysis = {
      byEndpoint: {} as Record<string, { count: number; avgResponseTime: number; statusCodes: Record<string, number> }>,
      byStatusCode: errorStats.byStatusCode,
      byLevel: errorStats.byLevel,
      timeline: errorStats.trend,
      criticalIssues: recentErrors.filter(e => e.level === 'error' && e.statusCode && e.statusCode >= 500),
      frequentErrors: {} as Record<string, number>
    };

    // Analyze error patterns
    recentErrors.forEach(error => {
      // Group by endpoint
      if (error.endpoint) {
        if (!errorAnalysis.byEndpoint[error.endpoint]) {
          errorAnalysis.byEndpoint[error.endpoint] = {
            count: 0,
            avgResponseTime: 0,
            statusCodes: {}
          };
        }
        errorAnalysis.byEndpoint[error.endpoint]!.count++;
        
        if (error.statusCode) {
          const code = error.statusCode.toString();
          errorAnalysis.byEndpoint[error.endpoint]!.statusCodes[code] = 
            (errorAnalysis.byEndpoint[error.endpoint]!.statusCodes[code] || 0) + 1;
        }
      }

      // Group by error message for frequent errors
      errorAnalysis.frequentErrors[error.message] = (errorAnalysis.frequentErrors[error.message] || 0) + 1;
    });

    res.json({
      summary: errorStats,
      analysis: errorAnalysis,
      recentErrors,
      pagination: {
        limit,
        offset,
        total: errorStats.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'ERROR_REPORTS_FAILED',
        message: 'Failed to retrieve error reports',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get performance reports
 */
router.get('/reports/performance', userActionTrackingMiddleware('view_performance_reports', 'navigation'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';

    const [performanceStats, responseTimeMetrics, memoryMetrics, cpuMetrics] = await Promise.all([
      performanceMonitor.getPerformanceStats(timeRange),
      performanceMonitor.getMetrics('response_time', timeRange, 1000),
      performanceMonitor.getMetrics('memory_usage', timeRange, 100),
      performanceMonitor.getMetrics('cpu_usage', timeRange, 100)
    ]);

    // Calculate performance trends
    const performanceAnalysis = {
      responseTimeTrend: responseTimeMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        endpoint: m.endpoint
      })),
      resourceUsageTrend: {
        memory: memoryMetrics.map(m => ({ timestamp: m.timestamp, value: m.value })),
        cpu: cpuMetrics.map(m => ({ timestamp: m.timestamp, value: m.value }))
      },
      bottlenecks: performanceStats.slowestEndpoints,
      recommendations: [] as string[]
    };

    // Generate performance recommendations
    if (performanceStats.responseTime.avg > 1000) {
      performanceAnalysis.recommendations.push('Average response time is high. Consider optimizing slow endpoints.');
    }
    if (performanceStats.systemMetrics.memoryUsage > 80) {
      performanceAnalysis.recommendations.push('Memory usage is high. Consider implementing memory optimization.');
    }
    if (performanceStats.systemMetrics.cpuUsage > 80) {
      performanceAnalysis.recommendations.push('CPU usage is high. Consider scaling or optimizing CPU-intensive operations.');
    }

    res.json({
      summary: performanceStats,
      analysis: performanceAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'PERFORMANCE_REPORTS_FAILED',
        message: 'Failed to retrieve performance reports',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get user analytics reports
 */
router.get('/reports/analytics', userActionTrackingMiddleware('view_analytics_reports', 'navigation'), async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';

    const [analyticsStats, dailyActiveUsers] = await Promise.all([
      userAnalytics.getAnalyticsSummary(timeRange),
      userAnalytics.getDailyActiveUsers(30)
    ]);

    // Calculate user engagement metrics
    const engagementAnalysis = {
      userGrowth: dailyActiveUsers,
      engagementMetrics: analyticsStats.userEngagement,
      contentInteraction: {
        topEvents: analyticsStats.topEvents,
        categoryBreakdown: analyticsStats.categoryBreakdown,
        platformUsage: analyticsStats.platformBreakdown
      },
      trends: analyticsStats.trends,
      insights: [] as string[]
    };

    // Generate insights
    const recentDau = dailyActiveUsers.slice(-7);
    const avgRecentDau = recentDau.reduce((sum, day) => sum + day.count, 0) / recentDau.length;
    const previousWeekDau = dailyActiveUsers.slice(-14, -7);
    const avgPreviousDau = previousWeekDau.reduce((sum, day) => sum + day.count, 0) / previousWeekDau.length;

    if (avgRecentDau > avgPreviousDau) {
      engagementAnalysis.insights.push(`Daily active users increased by ${((avgRecentDau - avgPreviousDau) / avgPreviousDau * 100).toFixed(1)}% this week.`);
    } else if (avgRecentDau < avgPreviousDau) {
      engagementAnalysis.insights.push(`Daily active users decreased by ${((avgPreviousDau - avgRecentDau) / avgPreviousDau * 100).toFixed(1)}% this week.`);
    }

    if (analyticsStats.userEngagement.averageEventsPerUser > 10) {
      engagementAnalysis.insights.push('Users are highly engaged with an average of ' + analyticsStats.userEngagement.averageEventsPerUser.toFixed(1) + ' events per user.');
    }

    res.json({
      summary: analyticsStats,
      analysis: engagementAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'ANALYTICS_REPORTS_FAILED',
        message: 'Failed to retrieve analytics reports',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get content moderation dashboard
 */
router.get('/moderation', userActionTrackingMiddleware('view_moderation_dashboard', 'content'), async (req, res) => {
  try {
    // This would integrate with the content moderation system
    // For now, we'll return placeholder data based on error tracking
    const recentErrors = await errorTracker.getRecentErrors(100);
    const contentIssues = recentErrors.filter(error => 
      error.endpoint?.includes('/content') || 
      error.endpoint?.includes('/upload') ||
      error.message.toLowerCase().includes('content')
    );

    const moderationData = {
      pendingReviews: 0, // Would come from moderation queue
      flaggedContent: contentIssues.length,
      autoModeratedContent: 0, // Would come from automated moderation
      moderatorActions: 0, // Would come from moderation logs
      contentStats: {
        totalContent: 0, // Would come from content database
        approvedContent: 0,
        rejectedContent: 0,
        pendingContent: 0
      },
      recentIssues: contentIssues.slice(0, 20),
      moderationTrends: {
        daily: new Array(7).fill(0), // Would be calculated from moderation data
        categories: {
          spam: 0,
          inappropriate: 0,
          copyright: 0,
          other: 0
        }
      }
    };

    res.json({
      moderation: moderationData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'MODERATION_DASHBOARD_FAILED',
        message: 'Failed to retrieve moderation dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get system configuration and settings
 */
router.get('/system/config', userActionTrackingMiddleware('view_system_config', 'navigation'), async (req, res) => {
  try {
    const systemConfig = {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0', // Would come from package.json
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memoryUsage: process.memoryUsage(),
      services: {
        redis: {
          connected: true, // Would check actual Redis connection
          version: 'Unknown'
        },
        database: {
          connected: true, // Would check actual database connection
          version: 'Unknown'
        },
        elasticsearch: {
          connected: true, // Would check actual Elasticsearch connection
          version: 'Unknown'
        }
      },
      features: {
        monitoring: true,
        analytics: true,
        caching: true,
        search: true,
        offlineSync: true
      }
    };

    res.json({
      config: systemConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SYSTEM_CONFIG_FAILED',
        message: 'Failed to retrieve system configuration',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Export data for reporting
 */
router.get('/export/:type', userActionTrackingMiddleware('export_admin_data', 'navigation'), async (req, res) => {
  try {
    const { type } = req.params;
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const format = req.query.format as 'json' | 'csv' || 'json';

    let data: any;
    let filename: string;

    switch (type) {
      case 'errors':
        data = await errorTracker.getRecentErrors(1000);
        filename = `errors-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'performance':
        data = await performanceMonitor.getMetrics(undefined, timeRange, 1000);
        filename = `performance-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'analytics':
        data = await userAnalytics.getAnalyticsSummary(timeRange);
        filename = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return res.status(400).json({
          error: {
            code: 'INVALID_EXPORT_TYPE',
            message: 'Invalid export type. Supported types: errors, performance, analytics',
            timestamp: new Date().toISOString()
          }
        });
    }

    if (format === 'csv') {
      // Convert to CSV format (simplified implementation)
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.json(data);
    }
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'EXPORT_FAILED',
        message: 'Failed to export data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export default router;