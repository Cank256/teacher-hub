import express from 'express';
import { CommunityService } from '../services/communityService';
import { CommunityMembershipService } from '../services/communityMembershipService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const communityService = new CommunityService();
const membershipService = new CommunityMembershipService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ===== COMMUNITY MANAGEMENT ROUTES =====

// Create a new community
router.post('/', async (req, res) => {
  try {
    const { name, description, type, isPrivate = false, requiresApproval = false, rules = [], imageUrl } = req.body;
    const ownerId = req.user.userId;

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

    const community = await communityService.createCommunity(ownerId, {
      name,
      description,
      type,
      isPrivate,
      requiresApproval,
      rules,
      imageUrl
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
    const viewerId = req.user.userId;
    
    const community = await communityService.getCommunityById(communityId, viewerId);

    if (!community) {
      return res.status(404).json({
        error: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'Community not found or access denied',
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
    const { name, description, isPrivate, requiresApproval, rules, imageUrl } = req.body;

    const community = await communityService.updateCommunity(communityId, userId, {
      name,
      description,
      isPrivate,
      requiresApproval,
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

// ===== COMMUNITY SEARCH AND DISCOVERY ROUTES =====

// Search communities with enhanced filters
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      type,
      isPrivate,
      subjects,
      regions,
      page = '1',
      limit = '20',
      sortBy = 'member_count',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      type: type as 'subject' | 'region' | 'grade' | 'general' | undefined,
      isPrivate: isPrivate === 'true' ? true : isPrivate === 'false' ? false : undefined,
      subjects: subjects ? (subjects as string).split(',') : undefined,
      regions: regions ? (regions as string).split(',') : undefined
    };

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await communityService.searchCommunities(q as string, filters, pagination);

    res.json(result);
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

// ===== MEMBERSHIP MANAGEMENT ROUTES =====

// Join community (create membership request)
router.post('/:communityId/join', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    const membership = await membershipService.createMembershipRequest(communityId, userId);

    res.status(201).json({ 
      membership,
      message: membership.status === 'pending' ? 'Membership request submitted for approval' : 'Successfully joined community'
    });
  } catch (error) {
    logger.error('Error joining community:', error);
    const statusCode = error.message.includes('already a member') || error.message.includes('already pending') ? 409 : 
                      error.message.includes('banned') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 409 ? 'ALREADY_MEMBER_OR_PENDING' : 
              statusCode === 403 ? 'BANNED_FROM_COMMUNITY' : 'JOIN_COMMUNITY_ERROR',
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
    const statusCode = error.message.includes('not a member') ? 404 : 
                      error.message.includes('owner cannot leave') ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_MEMBER' : 
              statusCode === 400 ? 'OWNER_CANNOT_LEAVE' : 'LEAVE_COMMUNITY_ERROR',
        message: error.message || 'Failed to leave community',
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
    const { page = '1', limit = '20' } = req.query;

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await communityService.getCommunityMembers(communityId, userId, pagination);

    res.json(result);
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

// Get pending membership requests
router.get('/:communityId/members/pending', async (req, res) => {
  try {
    const { communityId } = req.params;
    const moderatorId = req.user.userId;
    const { page = '1', limit = '20' } = req.query;

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await communityService.getPendingMemberships(communityId, moderatorId, pagination);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching pending memberships:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'FETCH_PENDING_MEMBERSHIPS_ERROR',
        message: error.message || 'Failed to fetch pending memberships',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Approve membership request
router.post('/:communityId/members/:membershipId/approve', async (req, res) => {
  try {
    const { communityId, membershipId } = req.params;
    const moderatorId = req.user.userId;

    await membershipService.approveMembershipRequest(communityId, membershipId, moderatorId);

    res.json({ success: true, message: 'Membership request approved' });
  } catch (error) {
    logger.error('Error approving membership:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBERSHIP_REQUEST_NOT_FOUND' : 'APPROVE_MEMBERSHIP_ERROR',
        message: error.message || 'Failed to approve membership',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Reject membership request
router.post('/:communityId/members/:membershipId/reject', async (req, res) => {
  try {
    const { communityId, membershipId } = req.params;
    const moderatorId = req.user.userId;

    await membershipService.rejectMembershipRequest(communityId, membershipId, moderatorId);

    res.json({ success: true, message: 'Membership request rejected' });
  } catch (error) {
    logger.error('Error rejecting membership:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBERSHIP_REQUEST_NOT_FOUND' : 'REJECT_MEMBERSHIP_ERROR',
        message: error.message || 'Failed to reject membership',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== MEMBER MANAGEMENT ROUTES =====

// Promote member to moderator
router.post('/:communityId/members/:memberId/promote', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const ownerId = req.user.userId;

    await membershipService.promoteMember(communityId, memberId, ownerId, 'moderator');

    res.json({ success: true, message: 'Member promoted to moderator' });
  } catch (error) {
    logger.error('Error promoting member:', error);
    const statusCode = error.message.includes('Only') || error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBER_NOT_FOUND' : 'PROMOTE_MEMBER_ERROR',
        message: error.message || 'Failed to promote member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Demote moderator to member
router.post('/:communityId/members/:memberId/demote', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const ownerId = req.user.userId;

    await membershipService.demoteMember(communityId, memberId, ownerId);

    res.json({ success: true, message: 'Moderator demoted to member' });
  } catch (error) {
    logger.error('Error demoting member:', error);
    const statusCode = error.message.includes('Only') || error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBER_NOT_FOUND' : 'DEMOTE_MEMBER_ERROR',
        message: error.message || 'Failed to demote member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Remove member from community
router.delete('/:communityId/members/:memberId', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const moderatorId = req.user.userId;

    await membershipService.removeMember(communityId, memberId, moderatorId);

    res.json({ success: true, message: 'Member removed from community' });
  } catch (error) {
    logger.error('Error removing member:', error);
    const statusCode = error.message.includes('not authorized') || error.message.includes('Insufficient') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBER_NOT_FOUND' : 'REMOVE_MEMBER_ERROR',
        message: error.message || 'Failed to remove member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Ban member from community
router.post('/:communityId/members/:memberId/ban', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const moderatorId = req.user.userId;

    await membershipService.banMember(communityId, memberId, moderatorId);

    res.json({ success: true, message: 'Member banned from community' });
  } catch (error) {
    logger.error('Error banning member:', error);
    const statusCode = error.message.includes('not authorized') || error.message.includes('Insufficient') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBER_NOT_FOUND' : 'BAN_MEMBER_ERROR',
        message: error.message || 'Failed to ban member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Unban member from community
router.post('/:communityId/members/:memberId/unban', async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const moderatorId = req.user.userId;

    await membershipService.unbanMember(communityId, memberId, moderatorId);

    res.json({ success: true, message: 'Member unbanned from community' });
  } catch (error) {
    logger.error('Error unbanning member:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') || error.message.includes('not banned') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'MEMBER_NOT_BANNED' : 'UNBAN_MEMBER_ERROR',
        message: error.message || 'Failed to unban member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Invite member to community
router.post('/:communityId/invite', async (req, res) => {
  try {
    const { communityId } = req.params;
    const inviterId = req.user.userId;
    const { userId: inviteeId } = req.body;

    if (!inviteeId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    await membershipService.inviteMember(communityId, inviteeId, inviterId);

    res.json({ success: true, message: 'Invitation sent successfully' });
  } catch (error) {
    logger.error('Error inviting member:', error);
    const statusCode = error.message.includes('not authorized') || error.message.includes('not a member') ? 403 : 
                      error.message.includes('already') ? 409 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 409 ? 'ALREADY_MEMBER_OR_PENDING' : 'INVITE_MEMBER_ERROR',
        message: error.message || 'Failed to invite member',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== COMMUNITY ANALYTICS ROUTES =====

// Get member activity summary (for owners/moderators)
router.get('/:communityId/analytics/members', async (req, res) => {
  try {
    const { communityId } = req.params;
    const moderatorId = req.user.userId;
    const { page = '1', limit = '20' } = req.query;

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await membershipService.getMemberActivitySummary(communityId, moderatorId, pagination);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching member activity:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'FETCH_MEMBER_ACTIVITY_ERROR',
        message: error.message || 'Failed to fetch member activity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get community settings (for owners/moderators)
router.get('/:communityId/settings', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    // Check if user is owner or moderator
    const membership = await membershipService.getMembershipStatus(communityId, userId);
    
    if (!membership || membership.status !== 'active' || !['owner', 'moderator'].includes(membership.role)) {
      return res.status(403).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authorized to view community settings',
          timestamp: new Date().toISOString()
        }
      });
    }

    const community = await communityService.getCommunityById(communityId, userId);
    
    if (!community) {
      return res.status(404).json({
        error: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'Community not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Return community settings with user's role
    res.json({
      community,
      userRole: membership.role,
      permissions: membership.permissions
    });
  } catch (error) {
    logger.error('Error fetching community settings:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_COMMUNITY_SETTINGS_ERROR',
        message: 'Failed to fetch community settings',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user's membership status in a community
router.get('/:communityId/membership/status', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    const membership = await membershipService.getMembershipStatus(communityId, userId);

    res.json({ membership });
  } catch (error) {
    logger.error('Error fetching membership status:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MEMBERSHIP_STATUS_ERROR',
        message: 'Failed to fetch membership status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;