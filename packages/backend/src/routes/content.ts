import { Router, Request, Response } from 'express';
import { contentCategorizationService } from '../services/contentCategorizationService';
import { authMiddleware } from '../middleware/auth';
import { contentCache } from '../middleware/cache';
import Joi from 'joi';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const categorizeContentSchema = Joi.object({
  title: Joi.string().min(1).required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required'
  }),
  description: Joi.string().optional(),
  subjects: Joi.array().items(Joi.string()).default([]),
  gradeLevels: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([])
});

const addTagSchema = Joi.object({
  name: Joi.string().min(1).required().messages({
    'string.empty': 'Tag name is required',
    'any.required': 'Tag name is required'
  }),
  category: Joi.string().min(1).required().messages({
    'string.empty': 'Category is required',
    'any.required': 'Category is required'
  }),
  weight: Joi.number().min(0).max(1).default(0.5),
  synonyms: Joi.array().items(Joi.string()).default([]),
  isSystemGenerated: Joi.boolean().default(false)
});

const validateAlignmentSchema = Joi.object({
  alignments: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one alignment is required',
    'any.required': 'At least one alignment is required'
  })
});

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function): void => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Validation error'
      });
      return;
    }
    req.body = value;
    next();
  };
};

/**
 * POST /api/content/categorize
 * Automatically categorize content and suggest tags and curriculum alignments
 */
router.post('/categorize', authMiddleware, validateRequest(categorizeContentSchema), async (req: Request, res: Response) => {
  try {
    const { title, description, subjects, gradeLevels, tags } = req.body;

    const resource = {
      title,
      description,
      subjects,
      gradeLevels,
      tags
    };

    const result = await contentCategorizationService.categorizeContent(resource);

    logger.info('Content categorized successfully', {
      userId: req.user?.userId,
      title,
      suggestedTagsCount: result.suggestedTags.length,
      curriculumAlignmentsCount: result.curriculumAlignments.length,
      confidence: result.confidence
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error categorizing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to categorize content'
    });
  }
});

/**
 * GET /api/content/categories
 * Get content categories, optionally filtered by parent or level
 */
router.get('/categories', contentCache, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { parentId, level } = req.query;
    
    const categories = contentCategorizationService.getCategories(
      parentId as string,
      level ? parseInt(level as string) : undefined
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

/**
 * GET /api/content/curriculum-standards
 * Get curriculum standards, optionally filtered by subject and grade level
 */
router.get('/curriculum-standards', contentCache, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subject, gradeLevel } = req.query;
    
    const standards = contentCategorizationService.getCurriculumStandards(
      subject as string,
      gradeLevel as string
    );

    res.json({
      success: true,
      data: standards
    });
  } catch (error) {
    logger.error('Error fetching curriculum standards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch curriculum standards'
    });
  }
});

/**
 * GET /api/content/tags
 * Get content tags, optionally filtered by category
 */
router.get('/tags', contentCache, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const tags = contentCategorizationService.getContentTags(category as string);

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    logger.error('Error fetching content tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content tags'
    });
  }
});

/**
 * POST /api/content/tags
 * Add a custom content tag
 */
router.post('/tags', authMiddleware, validateRequest(addTagSchema), async (req: Request, res: Response) => {
  try {
    const tagData = req.body;
    
    const newTag = contentCategorizationService.addContentTag(tagData);

    logger.info('Custom tag added successfully', {
      userId: req.user?.userId,
      tagName: newTag.name,
      category: newTag.category
    });

    res.status(201).json({
      success: true,
      data: newTag
    });
  } catch (error) {
    logger.error('Error adding custom tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom tag'
    });
  }
});

/**
 * POST /api/content/validate-alignment
 * Validate curriculum alignment IDs
 */
router.post('/validate-alignment', authMiddleware, validateRequest(validateAlignmentSchema), async (req: Request, res: Response) => {
  try {
    const { alignments } = req.body;
    
    const result = contentCategorizationService.validateCurriculumAlignment(alignments);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error validating curriculum alignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate curriculum alignment'
    });
  }
});

/**
 * POST /api/content/rating-data
 * Calculate rating data from individual ratings
 */
router.post('/rating-data', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { ratings } = req.body;
    
    if (!Array.isArray(ratings)) {
      res.status(400).json({
        success: false,
        error: 'Ratings must be an array'
      });
      return;
    }

    const ratingData = contentCategorizationService.calculateRatingData(ratings);

    res.json({
      success: true,
      data: ratingData
    });
  } catch (error) {
    logger.error('Error calculating rating data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate rating data'
    });
  }
});

export default router;