import { ResourceService } from '../resourceService';
import { securityService } from '../securityService';
import { youtubeService } from '../youtubeService';
import { db } from '../../database/connection';
import logger from '../../utils/logger';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../securityService');
jest.mock('../youtubeService');
jest.mock('../../database/connection');
jest.mock('../../utils/logger');
jest.mock('fs');

const mockSecurityService = securityService as jest.Mocked<typeof securityService>;
const mockYoutubeService = youtubeService as jest.Mocked<typeof youtubeService>;
const mockDb = db as jest.Mocked<typeof db>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockClient: any;

  beforeEach(() => {
    resourceService = new ResourceService();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockDb.getClient = jest.fn().mockResolvedValue(mockClient);

    // Mock fs.promises
    mockFs.promises = {
      copyFile: jest.fn(),
      writeFile: jest.fn(),
      unlink: jest.fn()
    } as any;

    jest.clearAllMocks();
  });

  describe('uploadResource', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      destination: '/tmp',
      filename: 'test.pdf',
      path: '/tmp/test.pdf',
      buffer: Buffer.from('test content'),
      stream: {} as any
    };

    const mockResourceData = {
      title: 'Test Resource',
      description: 'Test description',
      subjects: ['Mathematics'],
      gradeLevels: ['Grade 10'],
      curriculumAlignment: ['NCDC'],
      tags: ['algebra']
    };

    const mockScanResult = {
      virusFound: false,
      malwareFound: false,
      suspiciousContent: false,
      scanDetails: 'Clean scan',
      scannedAt: new Date()
    };

    beforeEach(() => {
      // Mock security service
      mockSecurityService.validateFileType.mockReturnValue(true);
      mockSecurityService.validateFileSize.mockReturnValue(true);
      mockSecurityService.getSecureStoragePath.mockReturnValue('/secure/path/test.pdf');
      mockSecurityService.scanFile.mockResolvedValue(mockScanResult);
      mockSecurityService.isFileSafe.mockReturnValue(true);

      // Mock database operations
      mockClient.query.mockResolvedValue({ rows: [] });
    });

    it('should upload a document resource successfully', async () => {
      const result = await resourceService.uploadResource('user123', mockResourceData, mockFile);

      expect(result.title).toBe(mockResourceData.title);
      expect(result.type).toBe('document');
      expect(result.authorId).toBe('user123');
      expect(result.securityScanStatus).toBe('passed');
      
      expect(mockSecurityService.validateFileType).toHaveBeenCalledWith(mockFile);
      expect(mockSecurityService.validateFileSize).toHaveBeenCalledWith(mockFile);
      expect(mockSecurityService.scanFile).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should upload a video resource with YouTube integration', async () => {
      const videoFile = {
        ...mockFile,
        originalname: 'test.mp4',
        mimetype: 'video/mp4'
      };

      // Mock YouTube service
      mockYoutubeService.uploadVideo.mockResolvedValue('youtube_video_id');
      mockYoutubeService.getVideoThumbnail.mockResolvedValue('https://img.youtube.com/vi/test/maxresdefault.jpg');
      mockYoutubeService.getVideoDuration.mockResolvedValue(120);

      const result = await resourceService.uploadResource('user123', mockResourceData, videoFile);

      expect(result.type).toBe('video');
      expect(result.youtubeVideoId).toBe('youtube_video_id');
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/test/maxresdefault.jpg');
      
      expect(mockYoutubeService.uploadVideo).toHaveBeenCalled();
      expect(mockYoutubeService.getVideoThumbnail).toHaveBeenCalledWith('youtube_video_id');
      expect(mockYoutubeService.getVideoDuration).toHaveBeenCalledWith('youtube_video_id');
    });

    it('should reject files with invalid type', async () => {
      mockSecurityService.validateFileType.mockReturnValue(false);

      await expect(resourceService.uploadResource('user123', mockResourceData, mockFile))
        .rejects.toThrow('Invalid file type');

      expect(mockSecurityService.scanFile).not.toHaveBeenCalled();
    });

    it('should reject files that are too large', async () => {
      mockSecurityService.validateFileSize.mockReturnValue(false);

      await expect(resourceService.uploadResource('user123', mockResourceData, mockFile))
        .rejects.toThrow('File size exceeds limit');

      expect(mockSecurityService.scanFile).not.toHaveBeenCalled();
    });

    it('should reject files that fail security scan', async () => {
      const unsafeScanResult = {
        ...mockScanResult,
        virusFound: true,
        scanDetails: 'Virus detected'
      };
      
      mockSecurityService.scanFile.mockResolvedValue(unsafeScanResult);
      mockSecurityService.isFileSafe.mockReturnValue(false);

      await expect(resourceService.uploadResource('user123', mockResourceData, mockFile))
        .rejects.toThrow('File failed security scan');

      expect(mockSecurityService.cleanupTempFile).toHaveBeenCalled();
    });

    it('should handle YouTube upload failures gracefully', async () => {
      const videoFile = {
        ...mockFile,
        originalname: 'test.mp4',
        mimetype: 'video/mp4'
      };

      mockYoutubeService.uploadVideo.mockRejectedValue(new Error('YouTube upload failed'));

      const result = await resourceService.uploadResource('user123', mockResourceData, videoFile);

      expect(result.type).toBe('video');
      expect(result.youtubeVideoId).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith('YouTube upload failed:', expect.any(Error));
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(resourceService.uploadResource('user123', mockResourceData, mockFile))
        .rejects.toThrow('Resource upload failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockSecurityService.cleanupTempFile).toHaveBeenCalled();
    });
  });

  describe('updateResource', () => {
    const resourceId = 'resource123';
    const authorId = 'user123';
    const updates = {
      title: 'Updated Title',
      description: 'Updated description',
      tags: ['updated', 'tags']
    };

    const mockExistingResource = {
      id: resourceId,
      authorId,
      title: 'Original Title',
      description: 'Original description',
      type: 'document' as const,
      format: 'pdf',
      size: 1024,
      url: '/path/to/file',
      subjects: ['Math'],
      gradeLevels: ['Grade 10'],
      curriculumAlignment: [] as string[],
      isGovernmentContent: false,
      verificationStatus: 'verified' as const,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      tags: ['original'],
      attachments: [] as any[],
      securityScanStatus: 'passed' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      // Mock getResource to return existing resource
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM resources WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: resourceId,
              author_id: authorId,
              title: 'Original Title',
              description: 'Original description',
              type: 'document',
              format: 'pdf',
              size: 1024,
              url: '/path/to/file',
              subjects: '["Math"]',
              grade_levels: '["Grade 10"]',
              curriculum_alignment: '[]',
              is_government_content: false,
              verification_status: 'verified',
              download_count: 0,
              rating: 0,
              rating_count: 0,
              tags: '["original"]',
              attachments: '[]',
              security_scan_status: 'passed',
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should update resource successfully', async () => {
      const result = await resourceService.updateResource(resourceId, authorId, updates);

      expect(result.title).toBe(updates.title);
      expect(result.description).toBe(updates.description);
      expect(result.tags).toEqual(updates.tags);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE resources SET'),
        expect.arrayContaining([resourceId, updates.title, updates.description])
      );
    });

    it('should update YouTube video metadata for video resources', async () => {
      // Mock video resource
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM resources WHERE id')) {
          return Promise.resolve({
            rows: [{
              ...mockClient.query.mock.results[0].value.rows[0],
              type: 'video',
              youtube_video_id: 'youtube123'
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await resourceService.updateResource(resourceId, authorId, updates);

      expect(mockYoutubeService.updateVideoMetadata).toHaveBeenCalledWith(
        'youtube123',
        {
          title: updates.title,
          description: updates.description
        }
      );
    });

    it('should reject updates from unauthorized users', async () => {
      await expect(resourceService.updateResource(resourceId, 'other_user', updates))
        .rejects.toThrow('Unauthorized: You can only update your own resources');
    });

    it('should handle non-existent resources', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(resourceService.updateResource('nonexistent', authorId, updates))
        .rejects.toThrow('Resource not found');
    });
  });

  describe('deleteResource', () => {
    const resourceId = 'resource123';
    const authorId = 'user123';

    beforeEach(() => {
      // Mock getResource to return existing resource
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM resources WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: resourceId,
              author_id: authorId,
              title: 'Test Resource',
              type: 'video',
              url: '/path/to/file',
              youtube_video_id: 'youtube123',
              subjects: '["Math"]',
              grade_levels: '["Grade 10"]',
              curriculum_alignment: '[]',
              tags: '[]',
              attachments: '[]',
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should delete resource successfully', async () => {
      await resourceService.deleteResource(resourceId, authorId);

      expect(mockYoutubeService.deleteVideo).toHaveBeenCalledWith('youtube123');
      expect(mockSecurityService.cleanupTempFile).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE resources SET is_active = false WHERE id = $1',
        [resourceId]
      );
    });

    it('should reject deletion from unauthorized users', async () => {
      await expect(resourceService.deleteResource(resourceId, 'other_user'))
        .rejects.toThrow('Unauthorized: You can only delete your own resources');
    });

    it('should handle YouTube deletion failures gracefully', async () => {
      mockYoutubeService.deleteVideo.mockRejectedValue(new Error('YouTube deletion failed'));

      await resourceService.deleteResource(resourceId, authorId);

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to delete YouTube video:', expect.any(Error));
      // Should still delete from database
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE resources SET is_active = false WHERE id = $1',
        [resourceId]
      );
    });
  });

  describe('getResource', () => {
    const resourceId = 'resource123';
    const authorId = 'user123';

    it('should return resource for authorized user', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: resourceId,
          author_id: authorId,
          title: 'Test Resource',
          verification_status: 'verified',
          subjects: '["Math"]',
          grade_levels: '["Grade 10"]',
          curriculum_alignment: '[]',
          tags: '[]',
          attachments: '[]',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const result = await resourceService.getResource(resourceId, authorId);

      expect(result.id).toBe(resourceId);
      expect(result.title).toBe('Test Resource');
    });

    it('should throw error for non-existent resource', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(resourceService.getResource('nonexistent'))
        .rejects.toThrow('Resource not found');
    });
  });

  describe('searchResources', () => {
    const mockSearchResults = [
      {
        id: 'resource1',
        title: 'Math Resource',
        subjects: '["Mathematics"]',
        grade_levels: '["Grade 10"]',
        curriculum_alignment: '[]',
        tags: '[]',
        attachments: '[]',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should search resources with query and filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockSearchResults }); // Data query

      const result = await resourceService.searchResources(
        'math',
        { type: 'document', subjects: ['Mathematics'] },
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should handle empty search results', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await resourceService.searchResources(
        'nonexistent',
        {},
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('rateResource', () => {
    const resourceId = 'resource123';
    const userId = 'user123';

    it('should create new rating', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing rating
        .mockResolvedValueOnce({ rows: [] }) // Create rating
        .mockResolvedValueOnce({ rows: [] }); // Update average

      await resourceService.rateResource(resourceId, userId, 5, 'Great resource!');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO resource_ratings'),
        expect.arrayContaining([expect.any(String), resourceId, userId, 5, 'Great resource!'])
      );
    });

    it('should update existing rating', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 'rating123' }] }) // Existing rating
        .mockResolvedValueOnce({ rows: [] }) // Update rating
        .mockResolvedValueOnce({ rows: [] }); // Update average

      await resourceService.rateResource(resourceId, userId, 4);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE resource_ratings SET'),
        expect.arrayContaining([resourceId, userId, 4])
      );
    });

    it('should reject invalid ratings', async () => {
      await expect(resourceService.rateResource(resourceId, userId, 6))
        .rejects.toThrow('Rating must be between 1 and 5');

      await expect(resourceService.rateResource(resourceId, userId, 0))
        .rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('downloadResource', () => {
    const resourceId = 'resource123';
    const userId = 'user123';

    it('should return download URL and increment count', async () => {
      mockClient.query
        .mockResolvedValueOnce({ // getResource
          rows: [{
            id: resourceId,
            author_id: 'author123',
            url: '/path/to/resource',
            verification_status: 'verified',
            subjects: '[]',
            grade_levels: '[]',
            curriculum_alignment: '[]',
            tags: '[]',
            attachments: '[]',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // incrementDownloadCount

      const result = await resourceService.downloadResource(resourceId, userId);

      expect(result).toBe('/path/to/resource');
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE resources SET download_count = download_count + 1 WHERE id = $1',
        [resourceId]
      );
    });
  });
});