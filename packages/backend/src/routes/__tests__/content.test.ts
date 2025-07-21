import request from 'supertest';
import express from 'express';
import contentRoutes from '../content';
import { authenticateToken } from '../../middleware/auth';
import { contentCategorizationService } from '../../services/contentCategorizationService';

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  })
}));

// Mock the content categorization service
jest.mock('../../services/contentCategorizationService', () => ({
  contentCategorizationService: {
    categorizeContent: jest.fn(),
    getCategories: jest.fn(),
    getCurriculumStandards: jest.fn(),
    getContentTags: jest.fn(),
    addContentTag: jest.fn(),
    validateCurriculumAlignment: jest.fn(),
    calculateRatingData: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/content', contentRoutes);

describe('Content Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/content/categorize', () => {
    it('should categorize content successfully', async () => {
      const mockResult = {
        suggestedCategories: ['primary'],
        suggestedTags: ['Mathematics', 'Worksheet'],
        curriculumAlignments: [{
          standardId: 'p2-math-addition',
          confidence: 0.8,
          matchedKeywords: ['addition', 'worksheet'],
          alignmentType: 'direct' as const
        }],
        confidence: 0.75,
        reasoning: ['Suggested tag "Mathematics" based on content analysis']
      };

      (contentCategorizationService.categorizeContent as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/content/categorize')
        .send({
          title: 'Basic Addition Worksheet',
          description: 'Practice addition problems',
          subjects: ['Mathematics'],
          gradeLevels: ['P2']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(contentCategorizationService.categorizeContent).toHaveBeenCalledWith({
        title: 'Basic Addition Worksheet',
        description: 'Practice addition problems',
        subjects: ['Mathematics'],
        gradeLevels: ['P2'],
        tags: []
      });
    });

    it('should handle missing title', async () => {
      const response = await request(app)
        .post('/api/content/categorize')
        .send({
          description: 'Practice problems'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      (contentCategorizationService.categorizeContent as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/content/categorize')
        .send({
          title: 'Test Content'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to categorize content');
    });
  });

  describe('GET /api/content/categories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        { id: 'primary', name: 'Primary Education', description: 'Primary level content', level: 0, isActive: true },
        { id: 'secondary', name: 'Secondary Education', description: 'Secondary level content', level: 0, isActive: true }
      ];

      (contentCategorizationService.getCategories as jest.Mock).mockReturnValue(mockCategories);

      const response = await request(app)
        .get('/api/content/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategories);
      expect(contentCategorizationService.getCategories).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should fetch categories with filters', async () => {
      const mockCategories = [
        { id: 'primary-math', name: 'Primary Mathematics', description: 'Math for primary', parentId: 'primary', level: 1, isActive: true }
      ];

      (contentCategorizationService.getCategories as jest.Mock).mockReturnValue(mockCategories);

      const response = await request(app)
        .get('/api/content/categories?parentId=primary&level=1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCategories);
      expect(contentCategorizationService.getCategories).toHaveBeenCalledWith('primary', 1);
    });
  });

  describe('GET /api/content/curriculum-standards', () => {
    it('should fetch curriculum standards successfully', async () => {
      const mockStandards = [
        {
          id: 'p1-math-numbers',
          code: 'P1.MATH.NUM.001',
          title: 'Number Recognition',
          description: 'Recognize numbers 1-20',
          subject: 'Mathematics',
          gradeLevel: 'P1',
          learningOutcome: 'Recognize and count numbers',
          keywords: ['counting', 'numbers']
        }
      ];

      (contentCategorizationService.getCurriculumStandards as jest.Mock).mockReturnValue(mockStandards);

      const response = await request(app)
        .get('/api/content/curriculum-standards?subject=Mathematics&gradeLevel=P1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStandards);
      expect(contentCategorizationService.getCurriculumStandards).toHaveBeenCalledWith('Mathematics', 'P1');
    });
  });

  describe('GET /api/content/tags', () => {
    it('should fetch content tags successfully', async () => {
      const mockTags = [
        { id: 'math', name: 'Mathematics', category: 'subject', weight: 1.0, synonyms: ['maths'], isSystemGenerated: true }
      ];

      (contentCategorizationService.getContentTags as jest.Mock).mockReturnValue(mockTags);

      const response = await request(app)
        .get('/api/content/tags?category=subject');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTags);
      expect(contentCategorizationService.getContentTags).toHaveBeenCalledWith('subject');
    });
  });

  describe('POST /api/content/tags', () => {
    it('should add custom tag successfully', async () => {
      const mockTag = {
        id: 'custom-123',
        name: 'Custom Tag',
        category: 'custom',
        weight: 0.5,
        synonyms: ['custom'],
        isSystemGenerated: false
      };

      (contentCategorizationService.addContentTag as jest.Mock).mockReturnValue(mockTag);

      const response = await request(app)
        .post('/api/content/tags')
        .send({
          name: 'Custom Tag',
          category: 'custom',
          weight: 0.5,
          synonyms: ['custom'],
          isSystemGenerated: false
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTag);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/content/tags')
        .send({
          category: 'custom'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/content/validate-alignment', () => {
    it('should validate curriculum alignments successfully', async () => {
      const mockResult = {
        valid: ['p1-math-numbers', 'p2-math-addition'],
        invalid: ['invalid-alignment']
      };

      (contentCategorizationService.validateCurriculumAlignment as jest.Mock).mockReturnValue(mockResult);

      const response = await request(app)
        .post('/api/content/validate-alignment')
        .send({
          alignments: ['p1-math-numbers', 'p2-math-addition', 'invalid-alignment']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should handle missing alignments', async () => {
      const response = await request(app)
        .post('/api/content/validate-alignment')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/content/rating-data', () => {
    it('should calculate rating data successfully', async () => {
      const mockRatingData = {
        averageRating: 4.25,
        totalRatings: 4,
        ratingDistribution: { 3: 1, 4: 1, 5: 2 },
        qualityScore: 0.85,
        relevanceScore: 0.75
      };

      (contentCategorizationService.calculateRatingData as jest.Mock).mockReturnValue(mockRatingData);

      const ratings = [
        { id: '1', resourceId: 'res1', userId: 'user1', rating: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', resourceId: 'res1', userId: 'user2', rating: 4, createdAt: new Date(), updatedAt: new Date() }
      ];

      const response = await request(app)
        .post('/api/content/rating-data')
        .send({ ratings });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRatingData);
      expect(contentCategorizationService.calculateRatingData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            resourceId: 'res1',
            userId: 'user1',
            rating: 5
          }),
          expect.objectContaining({
            id: '2',
            resourceId: 'res1',
            userId: 'user2',
            rating: 4
          })
        ])
      );
    });

    it('should handle invalid ratings format', async () => {
      const response = await request(app)
        .post('/api/content/rating-data')
        .send({ ratings: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ratings must be an array');
    });
  });
});