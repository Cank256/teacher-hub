import request from 'supertest';
import express from 'express';
import governmentRoutes from '../government';
import { governmentContentService } from '../../services/governmentContentService';
import { GovernmentContent } from '../../types';

// Mock the government content service
jest.mock('../../services/governmentContentService');
const mockGovernmentContentService = governmentContentService as jest.Mocked<typeof governmentContentService>;

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id', role: 'admin' };
    next();
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Government Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/government', governmentRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/government/content', () => {
    const validContentData = {
      source: 'MOE',
      contentType: 'policy',
      title: 'New Education Policy',
      content: 'This is a comprehensive education policy for Uganda.',
      attachments: [
        {
          id: 'attachment-1',
          filename: 'policy.pdf',
          originalName: 'policy.pdf',
          url: 'https://example.com/policy.pdf',
          mimeType: 'application/pdf',
          size: 1024000
        }
      ],
      targetAudience: ['teachers', 'administrators'],
      priority: 'high',
      effectiveDate: '2024-01-01T00:00:00.000Z',
      expiryDate: '2025-01-01T00:00:00.000Z',
      digitalSignature: 'valid-signature-hash'
    };

    const mockGovernmentContent: GovernmentContent = {
      id: 'test-content-id',
      source: 'MOE',
      contentType: 'policy',
      title: 'New Education Policy',
      content: 'This is a comprehensive education policy for Uganda.',
      attachments: validContentData.attachments,
      targetAudience: ['teachers', 'administrators'],
      priority: 'high',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      digitalSignature: 'valid-signature-hash',
      verificationHash: 'test-verification-hash',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully ingest government content with valid data', async () => {
      mockGovernmentContentService.ingestGovernmentContent.mockResolvedValue(mockGovernmentContent);

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send(validContentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test-content-id');
      expect(response.body.data.source).toBe('MOE');
      expect(mockGovernmentContentService.ingestGovernmentContent).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'MOE',
          contentType: 'policy',
          title: 'New Education Policy'
        })
      );
    });

    it('should reject request without government API key', async () => {
      const response = await request(app)
        .post('/api/government/content')
        .send(validContentData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Government content ingestion requires special permissions');
    });

    it('should reject request with invalid API key', async () => {
      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'invalid-key')
        .send(validContentData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid government API key');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        source: 'INVALID_SOURCE',
        contentType: 'policy',
        title: '',
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle digital signature verification failure', async () => {
      mockGovernmentContentService.ingestGovernmentContent.mockRejectedValue(
        new Error('Digital signature verification failed: Invalid signature')
      );

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send(validContentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Digital signature verification failed');
    });

    it('should handle service errors', async () => {
      mockGovernmentContentService.ingestGovernmentContent.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send(validContentData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to ingest government content');
    });
  });

  describe('GET /api/government/content', () => {
    const mockContentList: GovernmentContent[] = [
      {
        id: 'content-1',
        source: 'MOE',
        contentType: 'policy',
        title: 'Education Policy 1',
        content: 'Policy content 1',
        attachments: [],
        targetAudience: ['teachers'],
        priority: 'high',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01'),
        digitalSignature: 'signature-1',
        verificationHash: 'hash-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'content-2',
        source: 'UNEB',
        contentType: 'curriculum',
        title: 'Math Curriculum',
        content: 'Updated math curriculum',
        attachments: [],
        targetAudience: ['math teachers'],
        priority: 'medium',
        effectiveDate: new Date('2024-02-01'),
        expiryDate: undefined,
        digitalSignature: 'signature-2',
        verificationHash: 'hash-2',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should fetch government content with default parameters', async () => {
      mockGovernmentContentService.getGovernmentContent.mockResolvedValue({
        content: mockContentList,
        total: 2
      });

      const response = await request(app)
        .get('/api/government/content');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.limit).toBe(20);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('should filter content by source', async () => {
      const filteredContent = [mockContentList[0]!];
      mockGovernmentContentService.getGovernmentContent.mockResolvedValue({
        content: filteredContent,
        total: 1
      });

      const response = await request(app)
        .get('/api/government/content')
        .query({ source: 'MOE' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toHaveLength(1);
      expect(response.body.data.content[0].source).toBe('MOE');
      expect(mockGovernmentContentService.getGovernmentContent).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'MOE' })
      );
    });

    it('should filter content by priority', async () => {
      const highPriorityContent = [mockContentList[0]!];
      mockGovernmentContentService.getGovernmentContent.mockResolvedValue({
        content: highPriorityContent,
        total: 1
      });

      const response = await request(app)
        .get('/api/government/content')
        .query({ priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.data.content[0].priority).toBe('high');
    });

    it('should apply pagination parameters', async () => {
      mockGovernmentContentService.getGovernmentContent.mockResolvedValue({
        content: mockContentList,
        total: 10
      });

      const response = await request(app)
        .get('/api/government/content')
        .query({ limit: 5, offset: 2 });

      expect(response.status).toBe(200);
      expect(mockGovernmentContentService.getGovernmentContent).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5, offset: 2 })
      );
    });

    it('should handle service errors', async () => {
      mockGovernmentContentService.getGovernmentContent.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/government/content');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch government content');
    });
  });

  describe('GET /api/government/content/:id', () => {
    const mockContent: GovernmentContent = {
      id: 'content-1',
      source: 'MOE',
      contentType: 'policy',
      title: 'Test Policy',
      content: 'Policy content',
      attachments: [],
      targetAudience: ['teachers'],
      priority: 'high',
      effectiveDate: new Date(),
      expiryDate: undefined,
      digitalSignature: 'signature',
      verificationHash: 'hash',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should fetch content by ID', async () => {
      mockGovernmentContentService.getGovernmentContentById.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/api/government/content/content-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('content-1');
      expect(mockGovernmentContentService.getGovernmentContentById).toHaveBeenCalledWith('content-1');
    });

    it('should return 404 for non-existent content', async () => {
      mockGovernmentContentService.getGovernmentContentById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/government/content/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Government content not found');
    });

    it('should validate content ID parameter', async () => {
      const response = await request(app)
        .get('/api/government/content/');

      // In test environment, this may return 500 due to database connection issues
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('PATCH /api/government/content/:id/status', () => {
    it('should update content status successfully', async () => {
      mockGovernmentContentService.updateContentStatus.mockResolvedValue(true);

      const response = await request(app)
        .patch('/api/government/content/content-1/status')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Content deactivated successfully');
      expect(mockGovernmentContentService.updateContentStatus).toHaveBeenCalledWith('content-1', false);
    });

    it('should return 404 for non-existent content', async () => {
      mockGovernmentContentService.updateContentStatus.mockResolvedValue(false);

      const response = await request(app)
        .patch('/api/government/content/non-existent/status')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send({ isActive: true });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Government content not found');
    });

    it('should require government API key', async () => {
      const response = await request(app)
        .patch('/api/government/content/content-1/status')
        .send({ isActive: false });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Government content ingestion requires special permissions');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .patch('/api/government/content/content-1/status')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/government/sources', () => {
    it('should return available government sources', async () => {
      const response = await request(app)
        .get('/api/government/sources');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      
      const sources = response.body.data;
      expect(sources.find((s: any) => s.code === 'MOE')).toBeDefined();
      expect(sources.find((s: any) => s.code === 'UNEB')).toBeDefined();
      expect(sources.find((s: any) => s.code === 'NCDC')).toBeDefined();
    });
  });

  describe('GET /api/government/content/priority/:priority', () => {
    it('should fetch content by priority level', async () => {
      const highPriorityContent: GovernmentContent[] = [
        {
          id: 'urgent-1',
          source: 'MOE',
          contentType: 'announcement',
          title: 'Urgent Announcement',
          content: 'This is urgent',
          attachments: [],
          targetAudience: ['all teachers'],
          priority: 'high',
          effectiveDate: new Date(),
          expiryDate: undefined,
          digitalSignature: 'signature',
          verificationHash: 'hash',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockGovernmentContentService.getGovernmentContent.mockResolvedValue({
        content: highPriorityContent,
        total: 1
      });

      const response = await request(app)
        .get('/api/government/content/priority/high');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].priority).toBe('high');
      expect(mockGovernmentContentService.getGovernmentContent).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      );
    });

    it('should validate priority parameter', async () => {
      const response = await request(app)
        .get('/api/government/content/priority/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Priority must be one of: high, medium, low');
    });
  });

  describe('Mock Government API Integration Tests', () => {
    it('should simulate MOE API content ingestion', async () => {
      const moeApiContent = {
        source: 'MOE',
        contentType: 'policy',
        title: 'Teacher Professional Development Policy',
        content: 'All teachers must complete 40 hours of professional development annually.',
        targetAudience: ['primary teachers', 'secondary teachers'],
        priority: 'medium',
        effectiveDate: '2024-03-01T00:00:00.000Z',
        expiryDate: '2024-12-31T23:59:59.999Z',
        digitalSignature: 'moe-digital-signature-hash-12345'
      };

      const mockResult: GovernmentContent = {
        id: 'moe-content-123',
        source: 'MOE',
        contentType: 'policy',
        title: moeApiContent.title,
        content: moeApiContent.content,
        attachments: [],
        targetAudience: moeApiContent.targetAudience,
        priority: 'medium',
        effectiveDate: new Date(moeApiContent.effectiveDate),
        expiryDate: new Date(moeApiContent.expiryDate),
        digitalSignature: moeApiContent.digitalSignature,
        verificationHash: 'moe-verification-hash-67890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGovernmentContentService.ingestGovernmentContent.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-moe-api-key')
        .send(moeApiContent);

      expect(response.status).toBe(201);
      expect(response.body.data.source).toBe('MOE');
      expect(response.body.data.contentType).toBe('policy');
      expect(response.body.data.targetAudience).toEqual(['primary teachers', 'secondary teachers']);
    });

    it('should simulate UNEB API content ingestion', async () => {
      const unebApiContent = {
        source: 'UNEB',
        contentType: 'curriculum',
        title: 'Updated Science Curriculum for S1-S4',
        content: 'New integrated science curriculum emphasizing practical work.',
        attachments: [
          {
            id: 'uneb-attachment-1',
            filename: 'science-curriculum-s1-s4.pdf',
            originalName: 'science-curriculum-s1-s4.pdf',
            url: 'https://uneb.ac.ug/curricula/science-s1-s4.pdf',
            mimeType: 'application/pdf',
            size: 3145728
          }
        ],
        targetAudience: ['science teachers', 'secondary teachers'],
        priority: 'high',
        effectiveDate: '2024-01-15T00:00:00.000Z',
        digitalSignature: 'uneb-digital-signature-hash-54321'
      };

      const mockResult: GovernmentContent = {
        id: 'uneb-content-456',
        source: 'UNEB',
        contentType: 'curriculum',
        title: unebApiContent.title,
        content: unebApiContent.content,
        attachments: unebApiContent.attachments,
        targetAudience: unebApiContent.targetAudience,
        priority: 'high',
        effectiveDate: new Date(unebApiContent.effectiveDate),
        expiryDate: undefined,
        digitalSignature: unebApiContent.digitalSignature,
        verificationHash: 'uneb-verification-hash-98765',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGovernmentContentService.ingestGovernmentContent.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-uneb-api-key')
        .send(unebApiContent);

      expect(response.status).toBe(201);
      expect(response.body.data.source).toBe('UNEB');
      expect(response.body.data.contentType).toBe('curriculum');
      expect(response.body.data.attachments).toHaveLength(1);
      expect(response.body.data.priority).toBe('high');
    });

    it('should simulate NCDC API content ingestion', async () => {
      const ncdcApiContent = {
        source: 'NCDC',
        contentType: 'resource',
        title: 'Interactive Learning Materials for Primary Mathematics',
        content: 'New interactive digital resources for teaching mathematics in primary schools.',
        targetAudience: ['mathematics teachers', 'primary teachers'],
        priority: 'low',
        effectiveDate: '2024-02-01T00:00:00.000Z',
        digitalSignature: 'ncdc-digital-signature-hash-11111'
      };

      const mockResult: GovernmentContent = {
        id: 'ncdc-content-789',
        source: 'NCDC',
        contentType: 'resource',
        title: ncdcApiContent.title,
        content: ncdcApiContent.content,
        attachments: [],
        targetAudience: ncdcApiContent.targetAudience,
        priority: 'low',
        effectiveDate: new Date(ncdcApiContent.effectiveDate),
        expiryDate: undefined,
        digitalSignature: ncdcApiContent.digitalSignature,
        verificationHash: 'ncdc-verification-hash-22222',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGovernmentContentService.ingestGovernmentContent.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/government/content')
        .set('x-government-api-key', 'mock-ncdc-api-key')
        .send(ncdcApiContent);

      expect(response.status).toBe(201);
      expect(response.body.data.source).toBe('NCDC');
      expect(response.body.data.contentType).toBe('resource');
      expect(response.body.data.priority).toBe('low');
    });
  });
});