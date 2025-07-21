import express from 'express';
import multer from 'multer';
import { profileService } from '../services/profileService';
import { authenticateToken, requireOwnership } from '../middleware/auth';
import { validateProfileUpdate } from '../utils/validation';
import logger from '../utils/logger';

const router = express.Router();

// Configure multer for profile image uploads
const upload = multer({
  dest: 'uploads/profiles/',
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG and PNG files are allowed.'));
    }
  }
});

/**
 * GET /profile/:id
 * Get user profile by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await profileService.getProfile(id);
    
    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Profile retrieved successfully',
      data: profile
    });

  } catch (error) {
    logger.error('Profile fetch failed', { 
      profileId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch profile',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /profile/:id
 * Update user profile (requires authentication and ownership)
 */
router.put('/:id', authenticateToken, requireOwnership, upload.single('profileImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Parse JSON fields if they exist
    if (updateData.subjects && typeof updateData.subjects === 'string') {
      updateData.subjects = JSON.parse(updateData.subjects);
    }
    if (updateData.gradeLevels && typeof updateData.gradeLevels === 'string') {
      updateData.gradeLevels = JSON.parse(updateData.gradeLevels);
    }
    if (updateData.schoolLocation && typeof updateData.schoolLocation === 'string') {
      updateData.schoolLocation = JSON.parse(updateData.schoolLocation);
    }
    if (updateData.preferences && typeof updateData.preferences === 'string') {
      updateData.preferences = JSON.parse(updateData.preferences);
    }

    // Validate the update data
    const validationResult = validateProfileUpdate(updateData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile data',
          details: validationResult.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle profile image upload
    if (req.file) {
      updateData.profileImageUrl = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedProfile = await profileService.updateProfile(id, updateData);

    if (!updatedProfile) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Profile updated successfully',
      data: updatedProfile
    });

  } catch (error) {
    logger.error('Profile update failed', { 
      profileId: req.params.id,
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update profile',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /profile/search
 * Search and filter teacher profiles
 */
router.get('/search', async (req, res) => {
  try {
    const {
      query,
      subject,
      gradeLevel,
      district,
      region,
      verificationStatus,
      minExperience,
      maxExperience,
      page = '1',
      limit = '10'
    } = req.query;

    const searchParams = {
      query: query as string,
      subject: subject as string,
      gradeLevel: gradeLevel as string,
      district: district as string,
      region: region as string,
      verificationStatus: verificationStatus as 'pending' | 'verified' | 'rejected',
      minExperience: minExperience ? parseInt(minExperience as string) : undefined,
      maxExperience: maxExperience ? parseInt(maxExperience as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const results = await profileService.searchProfiles(searchParams);

    res.json({
      message: 'Search completed successfully',
      data: results
    });

  } catch (error) {
    logger.error('Profile search failed', { 
      query: req.query,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'SEARCH_FAILED',
        message: 'Failed to search profiles',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /profile/:id/verification-status
 * Update profile verification status (admin/moderator only)
 */
router.put('/:id/verification-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: pending, verified, rejected',
          timestamp: new Date().toISOString()
        }
      });
    }

    // TODO: Add admin/moderator role check here
    // For now, any authenticated user can update verification status

    const updatedProfile = await profileService.updateVerificationStatus(id, status, notes);

    if (!updatedProfile) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Verification status updated successfully',
      data: updatedProfile
    });

  } catch (error) {
    logger.error('Verification status update failed', { 
      profileId: req.params.id,
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'VERIFICATION_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update verification status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /profile/:id/connections
 * Get user connections (followers/following)
 */
router.get('/:id/connections', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'both' } = req.query;

    if (!['followers', 'following', 'both'].includes(type as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: 'Type must be one of: followers, following, both',
          timestamp: new Date().toISOString()
        }
      });
    }

    const connections = await profileService.getConnections(id, type as 'followers' | 'following' | 'both');

    res.json({
      message: 'Connections retrieved successfully',
      data: connections
    });

  } catch (error) {
    logger.error('Connections fetch failed', { 
      profileId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'CONNECTIONS_FETCH_FAILED',
        message: 'Failed to fetch connections',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /profile/:id/follow
 * Follow/unfollow a user
 */
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'follow' or 'unfollow'

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!action || !['follow', 'unfollow'].includes(action)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "follow" or "unfollow"',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (id === req.user.userId) {
      return res.status(400).json({
        error: {
          code: 'SELF_FOLLOW_NOT_ALLOWED',
          message: 'Cannot follow yourself',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await profileService.updateFollowStatus(req.user.userId, id, action);

    res.json({
      message: `Successfully ${action}ed user`,
      data: result
    });

  } catch (error) {
    logger.error('Follow action failed', { 
      targetId: req.params.id,
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'FOLLOW_ACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update follow status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /profile/stats/overview
 * Get platform statistics overview
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await profileService.getProfileStatistics();

    res.json({
      message: 'Statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Statistics fetch failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;