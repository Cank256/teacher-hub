import express from 'express';
import { errorTracker } from '../monitoring/errorTracker';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { userAnalytics } from '../monitoring/userAnalytics';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin, requirePermission, loadUserRole } from '../middleware/roleMiddleware';
import { userActionTrackingMiddleware } from '../middleware/monitoring';
import { db } from '../database/connection';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware);
router.use(loadUserRole);

// All admin routes require admin role
router.use(requireAdmin);

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
 * Get all users with pagination and filtering
 */
router.get('/users', userActionTrackingMiddleware('view_admin_users', 'navigation'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

    let query = `
      SELECT 
        id, email, full_name as name, 'teacher' as role,
        CASE 
          WHEN is_active = false THEN 'archived'
          WHEN verification_status = 'pending' THEN 'pending'
          WHEN verification_status = 'verified' THEN 'active'
          ELSE 'inactive'
        END as status,
        created_at as join_date,
        last_login_at as last_login,
        verification_status = 'verified' as verified,
        subjects_json as subjects,
        grade_levels_json as grade_levels,
        school_location_json as school_location,
        years_experience
      FROM users 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role && role !== 'all') {
      // For now, all users are teachers, but we can extend this
      if (role !== 'teacher') {
        query += ` AND false`; // No results for non-teacher roles
      }
    }

    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          query += ` AND is_active = true AND verification_status = 'verified'`;
          break;
        case 'inactive':
          query += ` AND is_active = true AND verification_status != 'verified'`;
          break;
        case 'pending':
          query += ` AND is_active = true AND verification_status = 'pending'`;
          break;
        case 'archived':
          query += ` AND is_active = false`;
          break;
      }
    }

    // Count total records
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);
    
    const users = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      joinDate: row.join_date,
      lastLogin: row.last_login || 'Never',
      verified: row.verified,
      subjects: Array.isArray(row.subjects) ? row.subjects : JSON.parse(row.subjects || '[]'),
      gradeLevels: Array.isArray(row.grade_levels) ? row.grade_levels : JSON.parse(row.grade_levels || '[]'),
      schoolLocation: typeof row.school_location === 'object' ? row.school_location : JSON.parse(row.school_location || '{}'),
      yearsExperience: row.years_experience
    }));

    res.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USERS_FETCH_FAILED',
        message: 'Failed to fetch users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Create a new user
 */
router.post('/users', userActionTrackingMiddleware('create_admin_user', 'navigation'), async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;

    // Basic validation
    if (!name || !email || !role) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, email, and role are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create user
    const verificationStatus = status === 'active' ? 'verified' : 'pending';
    const isActive = status !== 'archived';

    const result = await db.query(`
      INSERT INTO users (
        email, full_name, verification_status, is_active,
        subjects_json, grade_levels_json, school_location_json,
        preferences_json, credentials_json, auth_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      email, name, verificationStatus, isActive,
      JSON.stringify([]), JSON.stringify([]), JSON.stringify({}),
      JSON.stringify({}), JSON.stringify([]), 'local'
    ]);

    const newUser = {
      id: result.rows[0].id,
      name: result.rows[0].full_name,
      email: result.rows[0].email,
      role: 'teacher',
      status: isActive ? (verificationStatus === 'verified' ? 'active' : 'pending') : 'archived',
      joinDate: result.rows[0].created_at,
      lastLogin: 'Never',
      verified: verificationStatus === 'verified'
    };

    res.status(201).json({ data: newUser });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_CREATE_FAILED',
        message: 'Failed to create user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Update a user
 */
router.put('/users/:id', userActionTrackingMiddleware('update_admin_user', 'navigation'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`full_name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (email) {
      updates.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }

    if (status) {
      switch (status) {
        case 'active':
          updates.push(`is_active = true, verification_status = 'verified'`);
          break;
        case 'inactive':
          updates.push(`is_active = true, verification_status = 'rejected'`);
          break;
        case 'pending':
          updates.push(`is_active = true, verification_status = 'pending'`);
          break;
        case 'archived':
          updates.push(`is_active = false`);
          break;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No valid updates provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updatedUser = {
      id: result.rows[0].id,
      name: result.rows[0].full_name,
      email: result.rows[0].email,
      role: 'teacher',
      status: result.rows[0].is_active ? 
        (result.rows[0].verification_status === 'verified' ? 'active' : 
         result.rows[0].verification_status === 'pending' ? 'pending' : 'inactive') : 'archived',
      joinDate: result.rows[0].created_at,
      lastLogin: result.rows[0].last_login_at || 'Never',
      verified: result.rows[0].verification_status === 'verified'
    };

    res.json({ data: updatedUser });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_UPDATE_FAILED',
        message: 'Failed to update user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Archive a user
 */
router.put('/users/:id/archive', userActionTrackingMiddleware('archive_admin_user', 'navigation'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ message: 'User archived successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_ARCHIVE_FAILED',
        message: 'Failed to archive user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get user statistics
 */
router.get('/users/statistics', userActionTrackingMiddleware('view_user_statistics', 'navigation'), async (req, res) => {
  try {
    const [totalResult, statusResult, growthResult] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM users'),
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true AND verification_status = 'verified') as active,
          COUNT(*) FILTER (WHERE is_active = true AND verification_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE is_active = false) as archived
        FROM users
      `),
      db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `)
    ]);

    const stats = statusResult.rows[0];
    const growth = growthResult.rows;

    res.json({
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      pending: parseInt(stats.pending),
      archived: parseInt(stats.archived),
      byRole: { teacher: parseInt(stats.total) }, // All users are teachers for now
      byStatus: {
        active: parseInt(stats.active),
        pending: parseInt(stats.pending),
        archived: parseInt(stats.archived)
      },
      growth: growth.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_STATISTICS_FAILED',
        message: 'Failed to fetch user statistics',
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
 * Get all content with pagination and filtering
 */
router.get('/content', userActionTrackingMiddleware('view_admin_content', 'navigation'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const author = req.query.author as string;
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

    // For now, we'll create mock content data since we don't have a content table yet
    // In a real implementation, this would query the resources table
    let query = `
      SELECT 
        r.id, r.title, 'article' as type, u.full_name as author, r.author_id,
        CASE 
          WHEN r.is_active = false THEN 'archived'
          WHEN r.verification_status = 'verified' THEN 'published'
          WHEN r.verification_status = 'pending' THEN 'pending'
          ELSE 'draft'
        END as status,
        'General' as category,
        r.subjects_json as subjects,
        r.grade_levels_json as grade_levels,
        r.created_at as created_date,
        r.updated_at as last_modified,
        r.download_count as views,
        0 as likes,
        r.download_count,
        r.rating,
        r.rating_count
      FROM resources r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (type && type !== 'all') {
      // For now, all content is 'article' type
      if (type !== 'article') {
        query += ` AND false`; // No results for non-article types
      }
    }

    if (status && status !== 'all') {
      switch (status) {
        case 'published':
          query += ` AND r.is_active = true AND r.verification_status = 'verified'`;
          break;
        case 'draft':
          query += ` AND r.is_active = true AND r.verification_status != 'verified' AND r.verification_status != 'pending'`;
          break;
        case 'pending':
          query += ` AND r.is_active = true AND r.verification_status = 'pending'`;
          break;
        case 'archived':
          query += ` AND r.is_active = false`;
          break;
      }
    }

    if (author) {
      query += ` AND u.full_name ILIKE $${paramIndex}`;
      params.push(`%${author}%`);
      paramIndex++;
    }

    // Count total records
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    const sortColumn = sortBy === 'created_date' ? 'r.created_at' : 
                      sortBy === 'last_modified' ? 'r.updated_at' :
                      sortBy === 'title' ? 'r.title' : 'r.created_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);
    
    const content = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      author: row.author || 'Unknown',
      authorId: row.author_id,
      status: row.status,
      category: row.category,
      subjects: Array.isArray(row.subjects) ? row.subjects : JSON.parse(row.subjects || '[]'),
      gradeLevels: Array.isArray(row.grade_levels) ? row.grade_levels : JSON.parse(row.grade_levels || '[]'),
      createdDate: row.created_date,
      lastModified: row.last_modified,
      views: row.views || 0,
      likes: row.likes || 0,
      downloadCount: row.download_count || 0,
      rating: row.rating || 0,
      ratingCount: row.rating_count || 0
    }));

    res.json({
      content,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_FETCH_FAILED',
        message: 'Failed to fetch content',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Create new content
 */
router.post('/content', userActionTrackingMiddleware('create_admin_content', 'content'), async (req, res) => {
  try {
    const { title, type, author, status, category, subjects, gradeLevels, description } = req.body;

    // Basic validation
    if (!title || !type || !author) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title, type, and author are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find author by name
    const authorResult = await db.query('SELECT id FROM users WHERE full_name = $1 LIMIT 1', [author]);
    const authorId = authorResult.rows.length > 0 ? authorResult.rows[0].id : null;

    if (!authorId) {
      return res.status(400).json({
        error: {
          code: 'AUTHOR_NOT_FOUND',
          message: 'Author not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create content in resources table
    const verificationStatus = status === 'published' ? 'verified' : 
                              status === 'pending' ? 'pending' : 'draft';
    const isActive = status !== 'archived';

    const result = await db.query(`
      INSERT INTO resources (
        title, description, type, format, size, url, thumbnail_url,
        subjects_json, grade_levels_json, curriculum_alignment_json,
        author_id, is_government_content, verification_status,
        download_count, rating, rating_count, tags_json,
        attachments_json, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      title, description || '', 'document', 'text', 0, '', '',
      JSON.stringify(subjects || []), JSON.stringify(gradeLevels || []), JSON.stringify([]),
      authorId, false, verificationStatus,
      0, 0, 0, JSON.stringify([]),
      JSON.stringify([]), isActive
    ]);

    const newContent = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      type: 'article',
      author: author,
      authorId: authorId,
      status: isActive ? (verificationStatus === 'verified' ? 'published' : 
                         verificationStatus === 'pending' ? 'pending' : 'draft') : 'archived',
      category: category || 'General',
      subjects: subjects || [],
      gradeLevels: gradeLevels || [],
      createdDate: result.rows[0].created_at,
      lastModified: result.rows[0].updated_at,
      views: 0,
      likes: 0,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0
    };

    res.status(201).json({ data: newContent });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_CREATE_FAILED',
        message: 'Failed to create content',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Update content
 */
router.put('/content/:id', userActionTrackingMiddleware('update_admin_content', 'content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, author, status, category, subjects, gradeLevels } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (subjects) {
      updates.push(`subjects_json = $${paramIndex}`);
      params.push(JSON.stringify(subjects));
      paramIndex++;
    }

    if (gradeLevels) {
      updates.push(`grade_levels_json = $${paramIndex}`);
      params.push(JSON.stringify(gradeLevels));
      paramIndex++;
    }

    if (status) {
      switch (status) {
        case 'published':
          updates.push(`is_active = true, verification_status = 'verified'`);
          break;
        case 'draft':
          updates.push(`is_active = true, verification_status = 'draft'`);
          break;
        case 'pending':
          updates.push(`is_active = true, verification_status = 'pending'`);
          break;
        case 'archived':
          updates.push(`is_active = false`);
          break;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No valid updates provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `UPDATE resources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get author name
    const authorResult = await db.query('SELECT full_name FROM users WHERE id = $1', [result.rows[0].author_id]);
    const authorName = authorResult.rows.length > 0 ? authorResult.rows[0].full_name : 'Unknown';

    const updatedContent = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      type: 'article',
      author: authorName,
      authorId: result.rows[0].author_id,
      status: result.rows[0].is_active ? 
        (result.rows[0].verification_status === 'verified' ? 'published' : 
         result.rows[0].verification_status === 'pending' ? 'pending' : 'draft') : 'archived',
      category: category || 'General',
      subjects: Array.isArray(result.rows[0].subjects_json) ? result.rows[0].subjects_json : JSON.parse(result.rows[0].subjects_json || '[]'),
      gradeLevels: Array.isArray(result.rows[0].grade_levels_json) ? result.rows[0].grade_levels_json : JSON.parse(result.rows[0].grade_levels_json || '[]'),
      createdDate: result.rows[0].created_at,
      lastModified: result.rows[0].updated_at,
      views: result.rows[0].download_count || 0,
      likes: 0,
      downloadCount: result.rows[0].download_count || 0,
      rating: result.rows[0].rating || 0,
      ratingCount: result.rows[0].rating_count || 0
    };

    res.json({ data: updatedContent });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_UPDATE_FAILED',
        message: 'Failed to update content',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Archive content
 */
router.put('/content/:id/archive', userActionTrackingMiddleware('archive_admin_content', 'content'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE resources SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ message: 'Content archived successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_ARCHIVE_FAILED',
        message: 'Failed to archive content',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Publish content
 */
router.put('/content/:id/publish', userActionTrackingMiddleware('publish_admin_content', 'content'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE resources SET verification_status = \'verified\', is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ message: 'Content published successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_PUBLISH_FAILED',
        message: 'Failed to publish content',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get content statistics
 */
router.get('/content/statistics', userActionTrackingMiddleware('view_content_statistics', 'navigation'), async (req, res) => {
  try {
    const [totalResult, statusResult, engagementResult] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM resources'),
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true AND verification_status = 'verified') as published,
          COUNT(*) FILTER (WHERE is_active = true AND verification_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE is_active = true AND verification_status != 'verified' AND verification_status != 'pending') as draft,
          COUNT(*) FILTER (WHERE is_active = false) as archived
        FROM resources
      `),
      db.query(`
        SELECT 
          SUM(download_count) as total_views,
          SUM(download_count) as total_downloads,
          AVG(rating) as average_rating,
          COUNT(*) FILTER (WHERE rating > 0) as rated_content
        FROM resources
        WHERE is_active = true
      `)
    ]);

    const stats = statusResult.rows[0];
    const engagement = engagementResult.rows[0];

    res.json({
      total: parseInt(stats.total),
      published: parseInt(stats.published),
      pending: parseInt(stats.pending),
      draft: parseInt(stats.draft),
      archived: parseInt(stats.archived),
      byType: { article: parseInt(stats.total) }, // All content is articles for now
      byCategory: { General: parseInt(stats.total) }, // All content is General category for now
      engagement: {
        totalViews: parseInt(engagement.total_views) || 0,
        totalLikes: 0, // Not implemented yet
        totalDownloads: parseInt(engagement.total_downloads) || 0,
        averageRating: parseFloat(engagement.average_rating) || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CONTENT_STATISTICS_FAILED',
        message: 'Failed to fetch content statistics',
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