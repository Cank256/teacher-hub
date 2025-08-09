import { Router, Request, Response } from 'express';
import { governmentContentService, GovernmentContentIngestionRequest } from '../services/governmentContentService';
import { authMiddleware } from '../middleware/auth';
import Joi from 'joi';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const ingestContentSchema = Joi.object({
  source: Joi.string().valid('MOE', 'UNEB', 'NCDC').required().messages({
    'any.only': 'Source must be one of: MOE, UNEB, NCDC',
    'any.required': 'Source is required'
  }),
  contentType: Joi.string().valid('curriculum', 'policy', 'resource', 'announcement').required().messages({
    'any.only': 'Content type must be one of: curriculum, policy, resource, announcement',
    'any.required': 'Content type is required'
  }),
  title: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().min(1).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  attachments: Joi.array().items(
    Joi.object({
      id: Joi.string().optional(),
      filename: Joi.string().required(),
      originalName: Joi.string().optional(),
      url: Joi.string().uri().required(),
      mimeType: Joi.string().required(),
      size: Joi.number().integer().min(0).required(),
      thumbnailUrl: Joi.string().uri().optional()
    })
  ).default([]),
  targetAudience: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one target audience is required',
    'any.required': 'Target audience is required'
  }),
  priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
  effectiveDate: Joi.date().iso().required().messages({
    'date.format': 'Effective date must be in ISO format',
    'any.required': 'Effective date is required'
  }),
  expiryDate: Joi.date().iso().greater(Joi.ref('effectiveDate')).optional().messages({
    'date.format': 'Expiry date must be in ISO format',
    'date.greater': 'Expiry date must be after effective date'
  }),
  digitalSignature: Joi.string().min(1).required().messages({
    'string.empty': 'Digital signature is required',
    'any.required': 'Digital signature is required'
  })
});

const getContentSchema = Joi.object({
  source: Joi.string().valid('MOE', 'UNEB', 'NCDC').optional(),
  contentType: Joi.string().valid('curriculum', 'policy', 'resource', 'announcement').optional(),
  priority: Joi.string().valid('high', 'medium', 'low').optional(),
  targetAudience: Joi.array().items(Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'any.required': 'Active status is required'
  })
});

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function): void => {
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    const { error, value } = schema.validate(dataToValidate);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Validation error'
      });
      return;
    }
    if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
};

// Middleware to check if user has government content ingestion permissions
const requireGovernmentAccess = (req: Request, res: Response, next: Function): void => {
  // In a real implementation, this would check if the user has government API access
  // For now, we'll check if the request has a special header
  const apiKey = req.headers['x-government-api-key'] as string;

  if (!apiKey) {
    res.status(403).json({
      success: false,
      error: 'Government content ingestion requires special permissions'
    });
    return;
  }

  // Validate API key (in production, this would be more sophisticated)
  const validApiKeys = [
    process.env.MOE_API_KEY || 'mock-moe-api-key',
    process.env.UNEB_API_KEY || 'mock-uneb-api-key',
    process.env.NCDC_API_KEY || 'mock-ncdc-api-key'
  ];

  if (!validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      error: 'Invalid government API key'
    });
    return;
  }

  next();
};

/**
 * POST /api/government/content
 * Ingest government content with digital signature verification
 */
router.post('/content', 
  authMiddleware, 
  requireGovernmentAccess,
  validateRequest(ingestContentSchema), 
  async (req: Request, res: Response) => {
    try {
      const contentData: GovernmentContentIngestionRequest = req.body;

      const governmentContent = await governmentContentService.ingestGovernmentContent(contentData);

      logger.info('Government content ingested via API', {
        contentId: governmentContent.id,
        source: contentData.source,
        contentType: contentData.contentType,
        priority: contentData.priority,
        userId: req.user?.userId
      });

      res.status(201).json({
        success: true,
        data: governmentContent
      });
    } catch (error) {
      logger.error('Error ingesting government content via API:', error);
      
      if (error instanceof Error && error.message.includes('Digital signature verification failed')) {
        res.status(400).json({
          success: false,
          error: 'Digital signature verification failed'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to ingest government content'
      });
    }
  }
);

/**
 * GET /api/government/content
 * Get government content with filtering and prioritization
 */
router.get('/content',
  authMiddleware,
  validateRequest(getContentSchema),
  async (req: Request, res: Response) => {
    try {
      const options = {
        source: req.query.source as 'MOE' | 'UNEB' | 'NCDC' | undefined,
        contentType: req.query.contentType as 'curriculum' | 'policy' | 'resource' | 'announcement' | undefined,
        priority: req.query.priority as 'high' | 'medium' | 'low' | undefined,
        targetAudience: req.query.targetAudience as string[] | undefined,
        limit: Number(req.query.limit),
        offset: Number(req.query.offset),
        isActive: true
      };

      const result = await governmentContentService.getGovernmentContent(options);

      res.json({
        success: true,
        data: {
          content: result.content,
          pagination: {
            total: result.total,
            limit: options.limit,
            offset: options.offset,
            hasMore: result.total > (options.offset + options.limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching government content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch government content'
      });
    }
  }
);

/**
 * GET /api/government/content/:id
 * Get specific government content by ID
 */
router.get('/content/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Valid content ID is required'
        });
        return;
      }

      const content = await governmentContentService.getGovernmentContentById(id);

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Government content not found'
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      logger.error('Error fetching government content by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch government content'
      });
    }
  }
);

/**
 * PATCH /api/government/content/:id/status
 * Update government content status (activate/deactivate)
 */
router.patch('/content/:id/status',
  authMiddleware,
  requireGovernmentAccess,
  validateRequest(updateStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Valid content ID is required'
        });
        return;
      }

      const updated = await governmentContentService.updateContentStatus(id, isActive);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Government content not found'
        });
        return;
      }

      logger.info('Government content status updated via API', {
        contentId: id,
        isActive,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        message: `Content ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      logger.error('Error updating government content status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update content status'
      });
    }
  }
);

/**
 * GET /api/government/sources
 * Get available government content sources
 */
router.get('/sources',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const sources = [
        {
          code: 'MOE',
          name: 'Ministry of Education and Sports',
          description: 'Official policies, announcements, and educational directives',
          contentTypes: ['policy', 'announcement', 'resource']
        },
        {
          code: 'UNEB',
          name: 'Uganda National Examinations Board',
          description: 'Examination guidelines, syllabi, and assessment resources',
          contentTypes: ['curriculum', 'resource', 'announcement']
        },
        {
          code: 'NCDC',
          name: 'National Curriculum Development Centre',
          description: 'Curriculum standards, teaching materials, and educational resources',
          contentTypes: ['curriculum', 'resource', 'policy']
        }
      ];

      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error('Error fetching government sources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch government sources'
      });
    }
  }
);

/**
 * GET /api/government/content/priority/:priority
 * Get government content by priority level
 */
router.get('/content/priority/:priority',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { priority } = req.params;

      if (!priority || !['high', 'medium', 'low'].includes(priority)) {
        res.status(400).json({
          success: false,
          error: 'Priority must be one of: high, medium, low'
        });
        return;
      }

      const result = await governmentContentService.getGovernmentContent({
        priority: priority as 'high' | 'medium' | 'low',
        isActive: true,
        limit: 50
      });

      res.json({
        success: true,
        data: result.content
      });
    } catch (error) {
      logger.error('Error fetching government content by priority:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch government content'
      });
    }
  }
);

export default router;