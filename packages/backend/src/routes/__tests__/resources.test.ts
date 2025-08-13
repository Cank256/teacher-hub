import request from 'supertest';
import express from 'express';
import resourceRoutes from '../resources';
import { resourceService } from '../../services/resourceService';
import { youtubeService } from '../../services/youtubeService';
import { authMiddleware } from '../../middleware/auth';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/resourceService');
jest.mock('../../services/youtubeService');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger');

const mockResourceService = resourceService as jest.Mocked<typeof resourceService>;
const mockYoutubeService = youtubeService as jest.Mocked<typeof youtubeService>;
const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/resources', resourceRoutes);

// Mock user for authenticated requests
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  role: 'teacher'
};

const mockAdminUser = {
  id: 'admin123',
  email: 'admin@example.com',
  role: 'admin'
};

describe('Resource Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/resources/upload', () => {
    const mockResource = {
      id: 'resource123',
      title: 'Test Resource',
      description: 'Test description',
      type: 'document' as const,
      format: 'pdf',
      size: 1024,
      url: '/path/to/resource',
      subjects: ['Mathematics'],
      gradeLevels: ['Grade 10'],
      tags: ['algebra'],
      securityScanStatus: 'passed' as const,
      verificationStatus: 'pending' as const,
      createdAt: new Date()
    };

    beforeEach(() => {
      mockResourceService.uploadResource.mockResolvedValue(mockResource as any);
    });

    it('should upload resource successfully', async () => {
      const response = await request(app)
        .post('/api/resources/upload')
        .field('title', 'Test Resource')
        .field('description', 'Test description')
        .field('subjects', JSON.stringify(['Mathematics']))
        .field('gradeLevels', JSON.stringify(['Grade 10']))
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Resource uploaded successfully');
      expect(response.body.resource.id).toBe('resource123');
      expect(mockResourceService.uploadResource).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          title: 'Test Resource',
          description: 'Test description'
        }),
        expect.any(Object)
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/resources/upload')
        .field('title', '')
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/resources/upload')
        .field('title', 'Test Resource')
        .field('description', 'Test description')
        .field('subjects', JSON.stringify(['Mathematics']))
        .field('gradeLevels', JSON.stringify(['Grade 10']));

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should handle upload errors', async () => {
      mockResourceService.uploadResource.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/resources/upload')
        .field('title', 'Test Resource')
        .field('description', 'Test description')
        .field('subjects', JSON.stringify(['Mathematics']))
        .field('gradeLevels', JSON.stringify(['Grade 10']))
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Resource upload failed');
    });
  });

  describe('GET /api/resources/search', () => {
    const mockSearchResult = {
      data: [
        {
          id: 'resource1',
          title: 'Math Resource',
          type: 'document',
          subjects: ['Mathematics'],
          gradeLevels: ['Grade 10']
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    };

    beforeEach(() => {
      mockResourceService.searchResources.mockResolvedValue(mockSearchResult as any);
    });

    it('should search resources successfully', async () => {
      const response = await request(app)
        .get('/api/resources/search')
        .query({
          q: 'math',
          type: 'document',
          subjects: 'Mathematics',
          page: 1,
          limit: 20
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resources retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      expect(mockResourceService.searchResources).toHaveBeenCalledWith(
        'math',
        expect.objectContaining({
          type: 'document',
          subjects: ['Mathematics']
        }),
        expect.objectContaining({
          page: 1,
          limit: 20
        })
      );
    });

    it('should handle search with default parameters', async () => {
      const response = await request(app)
        .get('/api/resources/search');

      expect(response.status).toBe(200);
      expect(mockResourceService.searchResources).toHaveBeenCalledWith(
        '',
        expect.any(Object),
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
      );
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/resources/search')
        .query({
          page: 0, // Invalid page
          limit: 200 // Exceeds max limit
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/resources/:id', () => {
    const mockResource = {
      id: 'resource123',
      title: 'Test Resource',
      authorId: 'user123',
      type: 'document',
      subjects: ['Mathematics'],
      gradeLevels: ['Grade 10']
    };

    beforeEach(() => {
      mockResourceService.getResource.mockResolvedValue(mockResource as any);
    });

    it('should get resource successfully', async () => {
      const response = await request(app)
        .get('/api/resources/resource123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resource retrieved successfully');
      expect(response.body.resource.id).toBe('resource123');
      expect(mockResourceService.getResource).toHaveBeenCalledWith('resource123', undefined);
    });

    it('should handle resource not found', async () => {
      mockResourceService.getResource.mockRejectedValue(new Error('Resource not found'));

      const response = await request(app)
        .get('/api/resources/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Resource not found');
    });

    it('should handle access denied', async () => {
      mockResourceService.getResource.mockRejectedValue(new Error('Access denied'));

      const response = await request(app)
        .get('/api/resources/resource123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/resources/:id', () => {
    const mockUpdatedResource = {
      id: 'resource123',
      title: 'Updated Resource',
      description: 'Updated description',
      authorId: 'user123'
    };

    beforeEach(() => {
      mockResourceService.updateResource.mockResolvedValue(mockUpdatedResource as any);
    });

    it('should update resource successfully', async () => {
      const response = await request(app)
        .put('/api/resources/resource123')
        .send({
          title: 'Updated Resource',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resource updated successfully');
      expect(response.body.resource.title).toBe('Updated Resource');
      expect(mockResourceService.updateResource).toHaveBeenCalledWith(
        'resource123',
        'user123',
        expect.objectContaining({
          title: 'Updated Resource',
          description: 'Updated description'
        })
      );
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put('/api/resources/resource123')
        .send({
          title: '', // Invalid empty title
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle unauthorized update', async () => {
      mockResourceService.updateResource.mockRejectedValue(new Error('Unauthorized'));

      const response = await request(app)
        .put('/api/resources/resource123')
        .send({
          title: 'Updated Resource'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/resources/:id', () => {
    beforeEach(() => {
      mockResourceService.deleteResource.mockResolvedValue();
    });

    it('should delete resource successfully', async () => {
      const response = await request(app)
        .delete('/api/resources/resource123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resource deleted successfully');
      expect(mockResourceService.deleteResource).toHaveBeenCalledWith('resource123', 'user123');
    });

    it('should handle resource not found', async () => {
      mockResourceService.deleteResource.mockRejectedValue(new Error('Resource not found'));

      const response = await request(app)
        .delete('/api/resources/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Resource not found');
    });

    it('should handle unauthorized deletion', async () => {
      mockResourceService.deleteResource.mockRejectedValue(new Error('Unauthorized'));

      const response = await request(app)
        .delete('/api/resources/resource123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/resources/:id/download', () => {
    beforeEach(() => {
      mockResourceService.downloadResource.mockResolvedValue('/path/to/resource');
    });

    it('should generate download URL successfully', async () => {
      const response = await request(app)
        .get('/api/resources/resource123/download');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Download URL generated');
      expect(response.body.downloadUrl).toBe('/path/to/resource');
      expect(mockResourceService.downloadResource).toHaveBeenCalledWith('resource123', 'user123');
    });

    it('should handle resource not found', async () => {
      mockResourceService.downloadResource.mockRejectedValue(new Error('Resource not found'));

      const response = await request(app)
        .get('/api/resources/nonexistent/download');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Resource not found');
    });
  });

  describe('POST /api/resources/:id/rate', () => {
    beforeEach(() => {
      mockResourceService.rateResource.mockResolvedValue();
    });

    it('should rate resource successfully', async () => {
      const response = await request(app)
        .post('/api/resources/resource123/rate')
        .send({
          rating: 5,
          review: 'Excellent resource!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resource rated successfully');
      expect(mockResourceService.rateResource).toHaveBeenCalledWith(
        'resource123',
        'user123',
        5,
        'Excellent resource!'
      );
    });

    it('should validate rating value', async () => {
      const response = await request(app)
        .post('/api/resources/resource123/rate')
        .send({
          rating: 6 // Invalid rating
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle rating errors', async () => {
      mockResourceService.rateResource.mockRejectedValue(new Error('Rating failed'));

      const response = await request(app)
        .post('/api/resources/resource123/rate')
        .send({
          rating: 4
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Resource rating failed');
    });
  });

  describe('GET /api/resources/:id/youtube-status', () => {
    const mockYouTubeVideo = {
      id: 'youtube123',
      resourceId: 'resource123',
      youtubeVideoId: 'abc123',
      uploadStatus: 'completed' as const,
      metadata: {
        title: 'Test Video',
        description: 'Test description',
        duration: 120,
        thumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
        privacy: 'unlisted' as const
      },
      uploadedAt: new Date()
    };

    const mockCurrentStatus = {
      status: 'completed' as const,
      progress: 100
    };

    beforeEach(() => {
      mockResourceService.getYouTubeVideoStatus.mockResolvedValue(mockYouTubeVideo);
      mockYoutubeService.getVideoStatus.mockResolvedValue(mockCurrentStatus);
    });

    it('should get YouTube video status successfully', async () => {
      const response = await request(app)
        .get('/api/resources/resource123/youtube-status');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('YouTube video status retrieved');
      expect(response.body.video.youtubeVideoId).toBe('abc123');
      expect(response.body.video.currentStatus.status).toBe('completed');
    });

    it('should handle resource without YouTube video', async () => {
      mockResourceService.getYouTubeVideoStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/resources/resource123/youtube-status');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No YouTube video found for this resource');
    });
  });

  describe('GET /api/resources/youtube/auth-url', () => {
    beforeEach(() => {
      // Mock admin user
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockAdminUser;
        next();
      });
      
      mockYoutubeService.getAuthorizationUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?...');
    });

    it('should generate YouTube auth URL for admin', async () => {
      const response = await request(app)
        .get('/api/resources/youtube/auth-url');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('YouTube authorization URL generated');
      expect(response.body.authUrl).toContain('https://accounts.google.com');
    });

    it('should deny access to non-admin users', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockUser; // Regular user
        next();
      });

      const response = await request(app)
        .get('/api/resources/youtube/auth-url');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('POST /api/resources/youtube/callback', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockAdminUser;
        next();
      });
      
      mockYoutubeService.exchangeCodeForTokens.mockResolvedValue({
        access_token: 'access_token',
        refresh_token: 'refresh_token'
      });
    });

    it('should handle YouTube callback for admin', async () => {
      const response = await request(app)
        .post('/api/resources/youtube/callback')
        .send({
          code: 'auth_code_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('YouTube authorization successful');
      expect(response.body.tokens.hasAccessToken).toBe(true);
      expect(response.body.tokens.hasRefreshToken).toBe(true);
    });

    it('should require authorization code', async () => {
      const response = await request(app)
        .post('/api/resources/youtube/callback')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Authorization code is required');
    });

    it('should deny access to non-admin users', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .post('/api/resources/youtube/callback')
        .send({
          code: 'auth_code_123'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('GET /api/resources/analytics/overview', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockAdminUser;
        next();
      });
      
      mockYoutubeService.getQuotaUsage.mockResolvedValue({
        used: 1000,
        limit: 10000
      });
    });

    it('should get analytics overview for admin', async () => {
      const response = await request(app)
        .get('/api/resources/analytics/overview');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resource analytics retrieved');
      expect(response.body.analytics).toHaveProperty('totalResources');
      expect(response.body.analytics).toHaveProperty('youtubeQuotaUsage');
    });

    it('should deny access to non-admin users', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get('/api/resources/analytics/overview');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('GET /api/resources/my-resources', () => {
    const mockUserResources = {
      data: [
        {
          id: 'resource1',
          title: 'My Resource',
          authorId: 'user123'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    };

    beforeEach(() => {
      mockResourceService.searchResources.mockResolvedValue(mockUserResources as any);
    });

    it('should get user resources successfully', async () => {
      const response = await request(app)
        .get('/api/resources/my-resources');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User resources retrieved');
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/resources/my-resources')
        .query({
          page: 2,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(mockResourceService.searchResources).toHaveBeenCalledWith(
        '',
        {},
        expect.objectContaining({
          page: 2,
          limit: 10
        })
      );
    });
  });
});