import express from 'express';
import { CommunityService } from '../services/communityService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const communityService = new CommunityService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a new community
router.post('/', async (req, res) => {
  try {
    const { name, description, type, isPrivate = false, rules = [], imageUrl } = req.body;
    const creatorId = req.user.userId;

    if (!name || !description || !type) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, description, and type are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['subject', 'region', 'grade', 'general'].includes(type)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type must be one of: subject, region, grade, general',
          timestamp: new Date().toISOString()
        }
      });
    }

    const community = await communityService.createCommunity({
      name,
      description,
      type,
      isPrivate,
      rules,
      imageUrl,
      creatorId
    });

    res.status(201).json({ community });
  } catch (error) {
    logger.error('Error creating community:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_COMMUNITY_ERROR',
        message: 'Failed to create community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get community by ID
router.get('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await communityService.getCommunityById(communityId);

    if (!community) {
      return res.status(404).json({
        error: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'Community not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ community });
  } catch (error) {
    logger.error('Error fetching community:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_COMMUNITY_ERROR',
        message: 'Failed to fetch community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Update community
router.put('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;
    const { name, description, rules, imageUrl } = req.body;

    const community = await communityService.updateCommunity(communityId, userId, {
      name,
      description,
      rules,
      imageUrl
    });

    res.json({ community });
  } catch (error) {
    logger.error('Error updating community:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'UPDATE_COMMUNITY_ERROR',
        message: error.message || 'Failed to update community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Delete community
router.delete('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    await communityService.deleteCommunity(communityId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting community:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'DELETE_COMMUNITY_ERROR',
        message: error.message || 'Failed to delete community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Join community
router.post('/:communityId/join', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    await communityService.joinCommunity(communityId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error joining community:', error);
    const statusCode = error.message.includes('already a member') ? 409 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 409 ? 'ALREADY_MEMBER' : 'JOIN_COMMUNITY_ERROR',
        message: error.message || 'Failed to join community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Leave community
router.post('/:communityId/leave', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    await communityService.leaveCommunity(communityId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error leaving community:', error);
    const statusCode = error.message.includes('not a member') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_MEMBER' : 'LEAVE_COMMUNITY_ERROR',
        message: error.message || 'Failed to leave community',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Promote member
router.post('/:communityId/members/:memberId/promote', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const adminUserId = req.user.userId;
    const { role } = req.body;

    if (!role || !['moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be either moderator or admin',
          timestamp: new Date().toISOString()
        }
      });
    }

    await communityService.promoteMember(communityId, adminUserId, memberId, role);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error promoting member:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'PROMOTE_MEMBER_ERROR',
        message: error.message || 'Failed to promote member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get community members
router.get('/:communityId/members', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    const members = await communityService.getCommunityMembers(communityId, userId);

    res.json({ members });
  } catch (error) {
    logger.error('Error fetching community members:', error);
    const statusCode = error.message.includes('not a member') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'FETCH_MEMBERS_ERROR',
        message: error.message || 'Failed to fetch community members',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Search communities
router.get('/', async (req, res) => {
  try {
    const {
      type,
      isPrivate,
      searchTerm,
      limit = '20',
      offset = '0'
    } = req.query;

    const filters = {
      type: type as 'subject' | 'region' | 'grade' | 'general' | undefined,
      isPrivate: isPrivate === 'true' ? true : isPrivate === 'false' ? false : undefined,
      searchTerm: searchTerm as string | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const communities = await communityService.searchCommunities(filters);

    res.json({
      communities,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: communities.length === filters.limit
      }
    });
  } catch (error) {
    logger.error('Error searching communities:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_COMMUNITIES_ERROR',
        message: 'Failed to search communities',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user's communities
router.get('/user/my-communities', async (req, res) => {
  try {
    const userId = req.user.userId;
    const communities = await communityService.getUserCommunities(userId);

    res.json({ communities });
  } catch (error) {
    logger.error('Error fetching user communities:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_USER_COMMUNITIES_ERROR',
        message: 'Failed to fetch user communities',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;