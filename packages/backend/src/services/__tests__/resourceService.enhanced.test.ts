import { ResourceService } from '../resourceService';
import { SecurityService } from '../securityService';
import { YouTubeService } from '../youtubeService';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../securityService');
jest.mock('../youtubeService');

describe('ResourceService - Enhanced Features', () => {
  let resourceService: ResourceService;
  let securityService: jest.Mocked<SecurityService>;
  let youtubeService: jest.Mocked<YouTubeService>;
  let mockDb: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    securityService = {
      scanFile: jest.fn(),
      validateFileType: jest.fn(),
      validateFileSize: jest.fn(),
    } as any;

    youtubeService = {
      uploadVideo: jest.fn(),
      getVideoStatus: jest.fn(),
      updateVideoMetadata: jest.fn(),
      deleteVideo: jest.fn(),
    } as any;

    resourceService = new ResourceService(mockDb, securityService, youtubeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadResource', () => {
    it('should upload non-video resource successfully', async () => {
      const authorId = 'user-123';
      const resourceData = {
        title: 'Math Worksheet',
        description: 'Algebra practice problems',
        subjects: ['Mathematics'],
        gradeLevels: ['Grade 9', 'Grade 10'],
        curriculumAlignment: ['Common Core']
      };
      const mockFile = {
        originalname: 'worksheet.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        buffer: Buffer.from('mock file content')
      } as Express.Multer.File;

      const mockSecurityScanResult = {
        virusFound: false,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'Clean file',
        scannedAt: new Date()
      };

      const mockResource = {
        id: 'resource-123',
        authorId,
        ...resourceData,
        type: 'document',
        format: 'pdf',
        size: mockFile.size,
        url: '/uploads/resources/worksheet.pdf',
        securityScanStatus: 'passed',
        securityScanResults: mockSecurityScanResult,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      securityService.validateFileType.mockReturnValue(true);
      securityService.validateFileSize.mockReturnValue(true);
      securityService.scanFile.mockResolvedValue(mockSecurityScanResult);
      mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

      const result = await resourceService.uploadResource(authorId, resourceData, mockFile);

      expect(result).toEqual(mockResource);
      expect(securityService.scanFile).toHaveBeenCalledWith(mockFile);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO resources'),
        expect.arrayContaining([authorId, resourceData.title])
      );
    });

    it('should reject file that fails security scan', async () => {
      const authorId = 'user-123';
      const resourceData = {
        title: 'Suspicious File',
        description: 'Test file',
        subjects: ['Test'],
        gradeLevels: ['Test'],
        curriculumAlignment: []
      };
      const mockFile = {
        originalname: 'suspicious.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('suspicious content')
      } as Express.Multer.File;

      const mockSecurityScanResult = {
        virusFound: true,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'Virus detected: Trojan.Generic',
        scannedAt: new Date()
      };

      securityService.validateFileType.mockReturnValue(true);
      securityService.validateFileSize.mockReturnValue(true);
      securityService.scanFile.mockResolvedValue(mockSecurityScanResult);

      await expect(resourceService.uploadResource(authorId, resourceData, mockFile))
        .rejects.toThrow('File failed security scan: Virus detected');
    });

    it('should reject file with invalid type', async () => {
      const authorId = 'user-123';
      const resourceData = {
        title: 'Invalid File',
        description: 'Test file',
        subjects: ['Test'],
        gradeLevels: ['Test'],
        curriculumAlignment: []
      };
      const mockFile = {
        originalname: 'script.js',
        mimetype: 'application/javascript',
        size: 1024,
        buffer: Buffer.from('console.log("test")')
      } as Express.Multer.File;

      securityService.validateFileType.mockReturnValue(false);

      await expect(resourceService.uploadResource(authorId, resourceData, mockFile))
        .rejects.toThrow('Invalid file type');
    });

    it('should reject file that exceeds size limit', async () => {
      const authorId = 'user-123';
      const resourceData = {
        title: 'Large File',
        description: 'Test file',
        subjects: ['Test'],
        gradeLevels: ['Test'],
        curriculumAlignment: []
      };
      const mockFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.alloc(11 * 1024 * 1024)
      } as Express.Multer.File;

      securityService.validateFileSize.mockReturnValue(false);

      await expect(resourceService.uploadResource(authorId, resourceData, mockFile))
        .rejects.toThrow('File size exceeds limit');
    });
  });

  describe('uploadVideoToYouTube', () => {
    it('should upload video to YouTube successfully', async () => {
      const resourceId = 'resource-123';
      const mockVideoFile = {
        originalname: 'lesson.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const mockYouTubeVideoId = 'youtube-video-123';
      const mockYouTubeVideo = {
        id: 'youtube-record-123',
        resourceId,
        youtubeVideoId: mockYouTubeVideoId,
        uploadStatus: 'completed',
        metadata: {
          title: 'Educational Video',
          description: 'Math lesson video',
          duration: 600,
          thumbnailUrl: 'https://img.youtube.com/vi/youtube-video-123/maxresdefault.jpg',
          privacy: 'unlisted'
        },
        uploadedAt: new Date()
      };

      const mockResource = {
        id: resourceId,
        title: 'Educational Video',
        description: 'Math lesson video',
        type: 'video'
      };

      youtubeService.uploadVideo.mockResolvedValue(mockYouTubeVideoId);
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockResource] }) // Get resource
        .mockResolvedValueOnce({ rows: [mockYouTubeVideo] }) // Insert YouTube record
        .mockResolvedValueOnce({ rows: [] }); // Update resource

      const result = await resourceService.uploadVideoToYouTube(resourceId, mockVideoFile);

      expect(result).toEqual(mockYouTubeVideo);
      expect(youtubeService.uploadVideo).toHaveBeenCalledWith(
        mockVideoFile,
        expect.objectContaining({
          title: mockResource.title,
          description: mockResource.description,
          privacy: 'unlisted'
        })
      );
    });

    it('should handle YouTube upload failure', async () => {
      const resourceId = 'resource-123';
      const mockVideoFile = {
        originalname: 'lesson.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const mockResource = {
        id: resourceId,
        title: 'Educational Video',
        type: 'video'
      };

      youtubeService.uploadVideo.mockRejectedValue(new Error('YouTube API error'));
      mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

      await expect(resourceService.uploadVideoToYouTube(resourceId, mockVideoFile))
        .rejects.toThrow('YouTube upload failed');
    });
  });

  describe('getYouTubeVideoStatus', () => {
    it('should return YouTube video status', async () => {
      const resourceId = 'resource-123';

      const mockYouTubeVideo = {
        id: 'youtube-record-123',
        resourceId,
        youtubeVideoId: 'youtube-video-123',
        uploadStatus: 'processing',
        metadata: {
          title: 'Educational Video',
          description: 'Math lesson',
          duration: 0,
          thumbnailUrl: '',
          privacy: 'unlisted'
        },
        uploadedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockYouTubeVideo] });

      const result = await resourceService.getYouTubeVideoStatus(resourceId);

      expect(result).toEqual(mockYouTubeVideo);
    });

    it('should throw error for non-existent video', async () => {
      const resourceId = 'non-existent';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(resourceService.getYouTubeVideoStatus(resourceId))
        .rejects.toThrow('YouTube video not found');
    });
  });

  describe('searchResources', () => {
    it('should search resources with video support', async () => {
      const query = 'math';
      const filters = {
        type: 'video',
        subjects: ['Mathematics'],
        gradeLevels: ['Grade 9'],
        page: 1,
        limit: 10
      };

      const mockResources = [
        {
          id: 'resource-1',
          title: 'Math Video Lesson',
          description: 'Algebra basics',
          type: 'video',
          subjects: ['Mathematics'],
          gradeLevels: ['Grade 9'],
          youtubeVideoId: 'youtube-123',
          authorId: 'user-456',
          rating: 4.5,
          downloadCount: 100
        },
        {
          id: 'resource-2',
          title: 'Math Practice Problems',
          description: 'Video solutions',
          type: 'video',
          subjects: ['Mathematics'],
          gradeLevels: ['Grade 9'],
          youtubeVideoId: 'youtube-456',
          authorId: 'user-789',
          rating: 4.2,
          downloadCount: 75
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockResources }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const result = await resourceService.searchResources(query, filters);

      expect(result.data).toEqual(mockResources);
      expect(result.total).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('type = $'),
        expect.arrayContaining(['video'])
      );
    });
  });

  describe('rateResource', () => {
    it('should rate resource successfully', async () => {
      const resourceId = 'resource-123';
      const userId = 'user-456';
      const rating = 5;
      const review = 'Excellent resource!';

      const mockResource = {
        id: resourceId,
        rating: 4.0,
        ratingCount: 10
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockResource] }) // Get resource
        .mockResolvedValueOnce({ rows: [] }) // Check existing rating
        .mockResolvedValueOnce({ rows: [] }) // Insert rating
        .mockResolvedValueOnce({ rows: [] }); // Update resource rating

      await resourceService.rateResource(resourceId, userId, rating, review);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should update existing rating', async () => {
      const resourceId = 'resource-123';
      const userId = 'user-456';
      const rating = 4;

      const mockResource = {
        id: resourceId,
        rating: 4.5,
        ratingCount: 5
      };

      const existingRating = {
        id: 'rating-123',
        resourceId,
        userId,
        rating: 3
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockResource] }) // Get resource
        .mockResolvedValueOnce({ rows: [existingRating] }) // Check existing rating
        .mockResolvedValueOnce({ rows: [] }) // Update rating
        .mockResolvedValueOnce({ rows: [] }); // Update resource rating

      await resourceService.rateResource(resourceId, userId, rating);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE resource_ratings'),
        expect.arrayContaining([rating, 'rating-123'])
      );
    });

    it('should validate rating range', async () => {
      const resourceId = 'resource-123';
      const userId = 'user-456';
      const invalidRating = 6; // Out of range

      await expect(resourceService.rateResource(resourceId, userId, invalidRating))
        .rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('deleteResource', () => {
    it('should delete resource and associated YouTube video', async () => {
      const resourceId = 'resource-123';
      const authorId = 'user-123';

      const mockResource = {
        id: resourceId,
        authorId,
        type: 'video',
        youtubeVideoId: 'youtube-123'
      };

      const mockYouTubeVideo = {
        id: 'youtube-record-123',
        youtubeVideoId: 'youtube-123'
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockResource] }) // Get resource
        .mockResolvedValueOnce({ rows: [mockYouTubeVideo] }) // Get YouTube video
        .mockResolvedValueOnce({ rows: [] }) // Delete YouTube record
        .mockResolvedValueOnce({ rows: [] }) // Delete resource

      youtubeService.deleteVideo.mockResolvedValue(undefined);

      await resourceService.deleteResource(resourceId, authorId);

      expect(youtubeService.deleteVideo).toHaveBeenCalledWith('youtube-123');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should throw error for unauthorized deletion', async () => {
      const resourceId = 'resource-123';
      const authorId = 'user-123';
      const wrongAuthorId = 'user-456';

      const mockResource = {
        id: resourceId,
        authorId: wrongAuthorId
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

      await expect(resourceService.deleteResource(resourceId, authorId))
        .rejects.toThrow('Unauthorized to delete this resource');
    });
  });
});