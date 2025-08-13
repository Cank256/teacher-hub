import express from 'express';
import multer from 'multer';
import { resourceService } from '../services/resourceService';
import { youtubeService } from '../services/youtubeService';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleMiddleware';
import logger from '../utils/logger';
import Joi from 'joi';
import * as path from 'path';
import * as fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation (more detailed validation in SecurityService)
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Validation schemas
const uploadResourceSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 200 characters'
  }),
  description: Joi.string().min(1).max(2000).required().messages({
    'string.empty': 'Description is required',
    'string.max': 'Description must not exceed 2000 characters'
  }),
  subjects: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one subject is required'
  }),
  gradeLevels: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one grade level is required'
  }),
  curriculumAlignment: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

const updateResourceSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().min(1).max(2000).optional(),
  subjects: Joi.array().items(Joi.string()).min(1).optional(),
  gradeLevels: Joi.array().items(Joi.string()).min(1).optional(),
  curriculumAlignment: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

const searchResourcesSchema = Joi.object({
  q: Joi.string().optional(),
  type: Joi.string().valid('video', 'image', 'document', 'text').optional(),
  subjects: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  gradeLevels: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  verificationStatus: Joi.string().valid('verified', 'pending', 'flagged').optional(),
  hasVideo: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'title', 'rating', 'download_count').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const rateResourceSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5'
  }),
  review: Joi.string().max(1000).optional()
});

/**
 * @route POST /api/resources/upload
 * @desc Upload a new resource with security scanning and optional video processing
 * @access Private
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    // Validate request body
    const { error, value } = uploadResourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const userId = req.user!.userId;
    const resourceData = value;

    logger.info(`Resource upload started by user ${userId}: ${req.file.originalname}`);

    // Upload resource using service
    const resource = await resourceService.uploadResource(userId, resourceData, req.file);

    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        format: resource.format,
        size: resource.size,
        url: resource.url,
        thumbnailUrl: resource.thumbnailUrl,
        subjects: resource.subjects,
        gradeLevels: resource.gradeLevels,
        tags: resource.tags,
        youtubeVideoId: resource.youtubeVideoId,
        securityScanStatus: resource.securityScanStatus,
        verificationStatus: resource.verificationStatus,
        createdAt: resource.createdAt
      }
    });

  } catch (error) {
    logger.error('Resource upload failed:', error);
    res.status(500).json({
      error: 'Resource upload failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/search
 * @desc Search resources with filters and pagination
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = searchResourcesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { q, type, subjects, gradeLevels, verificationStatus, hasVideo, page, limit, sortBy, sortOrder } = value;

    // Normalize array parameters
    const normalizeArray = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      return Array.isArray(param) ? param : [param];
    };

    const filters = {
      type,
      subjects: normalizeArray(subjects),
      gradeLevels: normalizeArray(gradeLevels),
      verificationStatus,
      hasVideo
    };

    const pagination = { page, limit, sortBy, sortOrder };

    const result = await resourceService.searchResources(q || '', filters, pagination);

    res.json({
      message: 'Resources retrieved successfully',
      ...result
    });

  } catch (error) {
    logger.error('Resource search failed:', error);
    res.status(500).json({
      error: 'Resource search failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/:id
 * @desc Get a single resource by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const resourceId = req.params.id;
    const viewerId = req.user?.userId;

    const resource = await resourceService.getResource(resourceId, viewerId);

    res.json({
      message: 'Resource retrieved successfully',
      resource
    });

  } catch (error) {
    logger.error('Failed to get resource:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.status(500).json({
      error: 'Failed to get resource',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/resources/:id
 * @desc Update a resource
 * @access Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateResourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const resourceId = req.params.id;
    const userId = req.user!.userId;
    const updates = value;

    const resource = await resourceService.updateResource(resourceId, userId, updates);

    res.json({
      message: 'Resource updated successfully',
      resource
    });

  } catch (error) {
    logger.error('Resource update failed:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    res.status(500).json({
      error: 'Resource update failed',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/resources/:id
 * @desc Delete a resource
 * @access Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user!.userId;

    await resourceService.deleteResource(resourceId, userId);

    res.json({
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    logger.error('Resource deletion failed:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    res.status(500).json({
      error: 'Resource deletion failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/:id/download
 * @desc Download a resource (increments download count)
 * @access Private
 */
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user!.userId;

    const downloadUrl = await resourceService.downloadResource(resourceId, userId);

    // In production, you might redirect to a CDN URL or serve the file directly
    res.json({
      message: 'Download URL generated',
      downloadUrl
    });

  } catch (error) {
    logger.error('Resource download failed:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.status(500).json({
      error: 'Resource download failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/resources/:id/rate
 * @desc Rate a resource
 * @access Private
 */
router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = rateResourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const resourceId = req.params.id;
    const userId = req.user!.userId;
    const { rating, review } = value;

    await resourceService.rateResource(resourceId, userId, rating, review);

    res.json({
      message: 'Resource rated successfully'
    });

  } catch (error) {
    logger.error('Resource rating failed:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }

    res.status(500).json({
      error: 'Resource rating failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/:id/youtube-status
 * @desc Get YouTube video status for a resource
 * @access Private
 */
router.get('/:id/youtube-status', authMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;

    const youtubeVideo = await resourceService.getYouTubeVideoStatus(resourceId);

    if (!youtubeVideo) {
      return res.status(404).json({
        error: 'No YouTube video found for this resource'
      });
    }

    // Get current status from YouTube API
    const currentStatus = await youtubeService.getVideoStatus(youtubeVideo.youtubeVideoId);

    res.json({
      message: 'YouTube video status retrieved',
      video: {
        id: youtubeVideo.id,
        youtubeVideoId: youtubeVideo.youtubeVideoId,
        uploadStatus: youtubeVideo.uploadStatus,
        metadata: youtubeVideo.metadata,
        uploadedAt: youtubeVideo.uploadedAt,
        currentStatus
      }
    });

  } catch (error) {
    logger.error('Failed to get YouTube video status:', error);
    res.status(500).json({
      error: 'Failed to get YouTube video status',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/youtube/auth-url
 * @desc Get YouTube OAuth authorization URL
 * @access Private (Admin only)
 */
router.get('/youtube/auth-url', authMiddleware, requireAdmin, async (req, res) => {
  try {

    const authUrl = youtubeService.getAuthorizationUrl();

    res.json({
      message: 'YouTube authorization URL generated',
      authUrl
    });

  } catch (error) {
    logger.error('Failed to generate YouTube auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate YouTube auth URL',
      message: error.message
    });
  }
});

/**
 * @route POST /api/resources/youtube/callback
 * @desc Handle YouTube OAuth callback
 * @access Private (Admin only)
 */
router.post('/youtube/callback', authMiddleware, requireAdmin, async (req, res) => {
  try {

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        error: 'Authorization code is required'
      });
    }

    const tokens = await youtubeService.exchangeCodeForTokens(code);

    // In production, you'd save these tokens securely
    logger.info('YouTube tokens obtained successfully');

    res.json({
      message: 'YouTube authorization successful',
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token
      }
    });

  } catch (error) {
    logger.error('YouTube authorization failed:', error);
    res.status(500).json({
      error: 'YouTube authorization failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/analytics/overview
 * @desc Get resource analytics overview
 * @access Private (Admin only)
 */
router.get('/analytics/overview', authMiddleware, requireAdmin, async (req, res) => {
  try {

    // This would be implemented with proper analytics service
    const analytics = {
      totalResources: 0,
      totalDownloads: 0,
      totalVideoResources: 0,
      averageRating: 0,
      topSubjects: [] as string[],
      recentUploads: [] as any[],
      storageUsed: '0 MB',
      youtubeQuotaUsage: await youtubeService.getQuotaUsage()
    };

    res.json({
      message: 'Resource analytics retrieved',
      analytics
    });

  } catch (error) {
    logger.error('Failed to get resource analytics:', error);
    res.status(500).json({
      error: 'Failed to get resource analytics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/resources/my-resources
 * @desc Get current user's resources
 * @access Private
 */
router.get('/my-resources', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 20 } = req.query;

    const result = await resourceService.searchResources('', {}, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    // Filter to only user's resources (this should be done in the service)
    const userResources = result.data.filter(resource => resource.authorId === userId);

    res.json({
      message: 'User resources retrieved',
      data: userResources,
      pagination: {
        ...result.pagination,
        total: userResources.length
      }
    });

  } catch (error) {
    logger.error('Failed to get user resources:', error);
    res.status(500).json({
      error: 'Failed to get user resources',
      message: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must not exceed 100MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time'
      });
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    });
  }

  next(error);
});

export default router;