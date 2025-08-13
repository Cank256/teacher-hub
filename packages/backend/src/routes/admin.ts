import express from 'express';
import { Pool } from 'pg';
import { AdminService } from '../services/adminService';
import { AnalyticsService } from '../services/analyticsService';
import { ModerationQueueService } from '../services/moderationQueueService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Middleware to check admin permissions
const adminMiddleware = async (req: any, res: any, next: any) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);
    
    const isAdmin = await adminService.isUserAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required' 
      });
    }

    req.userRole = await adminService.getUserRole(req.user.id);
    next();
  } catch (error) {
    logger.error('Error checking admin permissions:', error);
    res.status(500).json({ 
      error: 'PERMISSION_CHECK_FAILED',
      message: 'Failed to verify admin permissions' 
    });
  }
};

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// ===== ADMIN DASHBOARD =====

router.get('/dashboard', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);
    const analyticsService = new AnalyticsService(db);

    // Get admin stats and platform analytics
    const [adminStats, platformAnalytics] = await Promise.all([
      adminService.getAdminStats(),
      analyticsService.getPlatformAnalytics()
    ]);

    res.json({
      adminStats,
      platformAnalytics
    });
  } catch (error) {
    logger.error('Error getting admin dashboard data:', error);
    res.status(500).json({ 
      error: 'DASHBOARD_FETCH_FAILED',
      message: 'Failed to retrieve dashboard data' 
    });
  }
});

// ===== POST MANAGEMENT =====

router.get('/posts', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const filters = {
      authorId: req.query.authorId as string,
      communityId: req.query.communityId as string,
      visibility: req.query.visibility as 'public' | 'community' | 'followers',
      flagged: req.query.flagged === 'true' ? true : req.query.flagged === 'false' ? false : undefined
    };

    const posts = await adminService.getAllPosts(pagination, filters);
    res.json(posts);
  } catch (error) {
    logger.error('Error getting posts for admin:', error);
    res.status(500).json({ 
      error: 'POSTS_FETCH_FAILED',
      message: 'Failed to retrieve posts' 
    });
  }
});

router.post('/posts/:postId/moderate', async (req: any, res) => {
  try {
    const { postId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'flag', 'delete'].includes(action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'Action must be approve, flag, or delete' 
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'REASON_REQUIRED',
        message: 'Moderation reason is required' 
      });
    }

    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    await adminService.moderatePost(postId, req.user.id, action, reason);

    res.json({ 
      success: true,
      message: `Post ${action}d successfully` 
    });
  } catch (error) {
    logger.error('Error moderating post:', error);
    res.status(500).json({ 
      error: 'POST_MODERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to moderate post' 
    });
  }
});

// ===== COMMUNITY MANAGEMENT =====

router.get('/communities', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const filters = {
      ownerId: req.query.ownerId as string,
      type: req.query.type as 'subject' | 'region' | 'grade' | 'general',
      isPrivate: req.query.isPrivate === 'true' ? true : req.query.isPrivate === 'false' ? false : undefined,
      suspended: req.query.suspended === 'true' ? true : req.query.suspended === 'false' ? false : undefined
    };

    const communities = await adminService.getAllCommunities(pagination, filters);
    res.json(communities);
  } catch (error) {
    logger.error('Error getting communities for admin:', error);
    res.status(500).json({ 
      error: 'COMMUNITIES_FETCH_FAILED',
      message: 'Failed to retrieve communities' 
    });
  }
});

router.post('/communities/:communityId/moderate', async (req: any, res) => {
  try {
    const { communityId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'suspend', 'delete'].includes(action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'Action must be approve, suspend, or delete' 
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'REASON_REQUIRED',
        message: 'Moderation reason is required' 
      });
    }

    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    await adminService.moderateCommunity(communityId, req.user.id, action, reason);

    res.json({ 
      success: true,
      message: `Community ${action}d successfully` 
    });
  } catch (error) {
    logger.error('Error moderating community:', error);
    res.status(500).json({ 
      error: 'COMMUNITY_MODERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to moderate community' 
    });
  }
});

// ===== MESSAGE MANAGEMENT =====

router.get('/messages/flagged', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'timestamp',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const messages = await adminService.getFlaggedMessages(pagination);
    res.json(messages);
  } catch (error) {
    logger.error('Error getting flagged messages for admin:', error);
    res.status(500).json({ 
      error: 'MESSAGES_FETCH_FAILED',
      message: 'Failed to retrieve flagged messages' 
    });
  }
});

router.post('/messages/:messageId/moderate', async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'delete'].includes(action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'Action must be approve or delete' 
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'REASON_REQUIRED',
        message: 'Moderation reason is required' 
      });
    }

    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    await adminService.moderateMessage(messageId, req.user.id, action, reason);

    res.json({ 
      success: true,
      message: `Message ${action}d successfully` 
    });
  } catch (error) {
    logger.error('Error moderating message:', error);
    res.status(500).json({ 
      error: 'MESSAGE_MODERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to moderate message' 
    });
  }
});

// ===== RESOURCE MANAGEMENT =====

router.get('/resources', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const filters = {
      authorId: req.query.authorId as string,
      type: req.query.type as 'video' | 'image' | 'document' | 'text',
      verificationStatus: req.query.verificationStatus as 'verified' | 'pending' | 'flagged',
      securityScanStatus: req.query.securityScanStatus as 'pending' | 'passed' | 'failed'
    };

    const resources = await adminService.getAllResources(pagination, filters);
    res.json(resources);
  } catch (error) {
    logger.error('Error getting resources for admin:', error);
    res.status(500).json({ 
      error: 'RESOURCES_FETCH_FAILED',
      message: 'Failed to retrieve resources' 
    });
  }
});

router.post('/resources/:resourceId/moderate', async (req: any, res) => {
  try {
    const { resourceId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'flag', 'delete'].includes(action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'Action must be approve, flag, or delete' 
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'REASON_REQUIRED',
        message: 'Moderation reason is required' 
      });
    }

    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    await adminService.moderateResource(resourceId, req.user.id, action, reason);

    res.json({ 
      success: true,
      message: `Resource ${action}d successfully` 
    });
  } catch (error) {
    logger.error('Error moderating resource:', error);
    res.status(500).json({ 
      error: 'RESOURCE_MODERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to moderate resource' 
    });
  }
});

// ===== ANALYTICS =====

router.get('/analytics/platform', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    let dateRange;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string)
      };
    }

    const analytics = await analyticsService.getPlatformAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting platform analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve platform analytics' 
    });
  }
});

router.get('/analytics/users', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'DATE_RANGE_REQUIRED',
        message: 'Start date and end date are required' 
      });
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    const analytics = await analyticsService.getUserAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve user analytics' 
    });
  }
});

router.get('/analytics/content', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'DATE_RANGE_REQUIRED',
        message: 'Start date and end date are required' 
      });
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    const analytics = await analyticsService.getContentAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting content analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve content analytics' 
    });
  }
});

router.get('/analytics/communities', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'DATE_RANGE_REQUIRED',
        message: 'Start date and end date are required' 
      });
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    const analytics = await analyticsService.getCommunityAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting community analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve community analytics' 
    });
  }
});

router.get('/analytics/resources', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'DATE_RANGE_REQUIRED',
        message: 'Start date and end date are required' 
      });
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    const analytics = await analyticsService.getResourceAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting resource analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve resource analytics' 
    });
  }
});

router.get('/analytics/messaging', async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'DATE_RANGE_REQUIRED',
        message: 'Start date and end date are required' 
      });
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const db: Pool = req.app.locals.db;
    const analyticsService = new AnalyticsService(db);

    const analytics = await analyticsService.getMessagingAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting messaging analytics:', error);
    res.status(500).json({ 
      error: 'ANALYTICS_FETCH_FAILED',
      message: 'Failed to retrieve messaging analytics' 
    });
  }
});

// ===== MODERATION QUEUE =====

router.get('/moderation-queue', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const moderationService = new ModerationQueueService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const filters = {
      itemType: req.query.itemType as 'post' | 'comment' | 'resource' | 'community' | 'message',
      status: req.query.status as 'pending' | 'reviewed' | 'resolved',
      assignedTo: req.query.assignedTo as string
    };

    const queue = await moderationService.getQueue(pagination, filters);
    res.json(queue);
  } catch (error) {
    logger.error('Error getting moderation queue:', error);
    res.status(500).json({ 
      error: 'QUEUE_FETCH_FAILED',
      message: 'Failed to retrieve moderation queue' 
    });
  }
});

router.post('/moderation-queue/:itemId/assign', async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const { moderatorId } = req.body;

    // If no moderatorId provided, assign to current user
    const assigneeId = moderatorId || req.user.id;

    const db: Pool = req.app.locals.db;
    const moderationService = new ModerationQueueService(db);

    await moderationService.assignToModerator(itemId, assigneeId);

    res.json({ 
      success: true,
      message: 'Queue item assigned successfully' 
    });
  } catch (error) {
    logger.error('Error assigning moderation queue item:', error);
    res.status(500).json({ 
      error: 'ASSIGNMENT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to assign queue item' 
    });
  }
});

router.post('/moderation-queue/:itemId/resolve', async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const { action, reason, notes } = req.body;

    if (!['approve', 'reject', 'escalate'].includes(action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'Action must be approve, reject, or escalate' 
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'REASON_REQUIRED',
        message: 'Resolution reason is required' 
      });
    }

    const resolution = { action, reason, notes };

    const db: Pool = req.app.locals.db;
    const moderationService = new ModerationQueueService(db);

    await moderationService.resolveItem(itemId, req.user.id, resolution);

    res.json({ 
      success: true,
      message: `Queue item ${action}d successfully` 
    });
  } catch (error) {
    logger.error('Error resolving moderation queue item:', error);
    res.status(500).json({ 
      error: 'RESOLUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to resolve queue item' 
    });
  }
});

router.get('/moderation-queue/stats', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const moderationService = new ModerationQueueService(db);

    const stats = await moderationService.getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting moderation queue stats:', error);
    res.status(500).json({ 
      error: 'STATS_FETCH_FAILED',
      message: 'Failed to retrieve queue statistics' 
    });
  }
});

// ===== ADMIN ACTIONS LOG =====

router.get('/actions', async (req: any, res) => {
  try {
    const db: Pool = req.app.locals.db;
    const adminService = new AdminService(db);

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'timestamp',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const adminId = req.query.adminId as string;

    const actions = await adminService.getAdminActions(pagination, adminId);
    res.json(actions);
  } catch (error) {
    logger.error('Error getting admin actions:', error);
    res.status(500).json({ 
      error: 'ACTIONS_FETCH_FAILED',
      message: 'Failed to retrieve admin actions' 
    });
  }
});

// ===== REPORTING =====

router.post('/report', async (req: any, res) => {
  try {
    const { itemType, itemId, reason, additionalDetails } = req.body;

    if (!['post', 'comment', 'resource', 'community', 'message'].includes(itemType)) {
      return res.status(400).json({ 
        error: 'INVALID_ITEM_TYPE',
        message: 'Invalid item type for reporting' 
      });
    }

    if (!itemId || !reason) {
      return res.status(400).json({ 
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Item ID and reason are required' 
      });
    }

    const db: Pool = req.app.locals.db;
    const moderationService = new ModerationQueueService(db);

    const queueItem = await moderationService.reportContent(
      itemType,
      itemId,
      reason,
      req.user.id,
      additionalDetails
    );

    res.status(201).json({
      success: true,
      message: 'Content reported successfully',
      queueItem
    });
  } catch (error) {
    logger.error('Error reporting content:', error);
    res.status(500).json({ 
      error: 'REPORT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to report content' 
    });
  }
});

export default router;