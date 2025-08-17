import { YouTubeService } from '../../services/youtubeService';
import { SecurityService } from '../../services/securityService';
import { ResourceService } from '../../services/resourceService';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock dependencies
jest.mock('../../services/youtubeService');
jest.mock('../../services/securityService');
jest.mock('../../database/connection');

describe('Video Processing Performance Tests', () => {
  let resourceService: ResourceService;
  let youtubeService: jest.Mocked<YouTubeService>;
  let securityService: jest.Mocked<SecurityService>;
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

  describe('Large Video File Processing', () => {
    it('should handle 100MB video file within acceptable time', async () => {
      const authorId = 'user-123';
      const resourceData = {
        title: 'Large Video Lesson',
        description: 'High quality educational video',
        subjects: ['Mathematics'],
        gradeLevels: ['Grade 10'],
        curriculumAlignment: []
      };

      // Simulate 100MB video file
      const largeVideoFile = {
        originalname: 'large-lesson.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024, // 100MB
        buffer: Buffer.alloc(1024) // Small buffer for testing
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
        type: 'video',
        format: 'mp4',
        size: largeVideoFile.size,
        url: '/uploads/resources/large-lesson.mp4',
        securityScanStatus: 'passed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock security scan with realistic delay
      securityService.validateFileType.mockReturnValue(true);
      securityService.validateFileSize.mockReturnValue(true);
      securityService.scanFile.mockImplementation(async () => {
        // Simulate realistic scan time for large file
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
        return mockSecurityScanResult;
      });

      mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

      const startTime = performance.now();
      const result = await resourceService.uploadResource(authorId, resourceData, largeVideoFile);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(result).toEqual(mockResource);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(securityService.scanFile).toHaveBeenCalledWith(largeVideoFile);
    });

    it('should handle concurrent video uploads efficiently', async () => {
      const authorId = 'user-123';
      const concurrentUploads = 5;
      
      const videoFiles = Array.from({ length: concurrentUploads }, (_, index) => ({
        originalname: `video-${index}.mp4`,
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB each
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File));

      const resourceData = {
        title: 'Concurrent Video Test',
        description: 'Testing concurrent uploads',
        subjects: ['Test'],
        gradeLevels: ['Test'],
        curriculumAlignment: []
      };

      const mockSecurityScanResult = {
        virusFound: false,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'Clean file',
        scannedAt: new Date()
      };

      securityService.validateFileType.mockReturnValue(true);
      securityService.validateFileSize.mockReturnValue(true);
      securityService.scanFile.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second per scan
        return mockSecurityScanResult;
      });

      mockDb.query.mockImplementation(async () => ({
        rows: [{
          id: `resource-${Math.random()}`,
          authorId,
          ...resourceData,
          type: 'video',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      }));

      const startTime = performance.now();
      
      const uploadPromises = videoFiles.map(file => 
        resourceService.uploadResource(authorId, resourceData, file)
      );

      const results = await Promise.all(uploadPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTimePerUpload = totalTime / concurrentUploads;

      expect(results).toHaveLength(concurrentUploads);
      expect(averageTimePerUpload).toBeLessThan(2000); // Average should be under 2 seconds
      expect(totalTime).toBeLessThan(8000); // Total should be under 8 seconds (with concurrency)
    });
  });

  describe('YouTube Upload Performance', () => {
    it('should upload video to YouTube within acceptable time', async () => {
      const resourceId = 'resource-123';
      const videoFile = {
        originalname: 'lesson.mp4',
        mimetype: 'video/mp4',
        size: 75 * 1024 * 1024, // 75MB
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const mockResource = {
        id: resourceId,
        title: 'Educational Video',
        description: 'Math lesson video',
        type: 'video'
      };

      const mockYouTubeVideo = {
        id: 'youtube-record-123',
        resourceId,
        youtubeVideoId: 'youtube-video-123',
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

      // Mock YouTube upload with realistic delay
      youtubeService.uploadVideo.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds
        return 'youtube-video-123';
      });

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockResource] })
        .mockResolvedValueOnce({ rows: [mockYouTubeVideo] })
        .mockResolvedValueOnce({ rows: [] });

      const startTime = performance.now();
      const result = await resourceService.uploadVideoToYouTube(resourceId, videoFile);
      const endTime = performance.now();

      const uploadTime = endTime - startTime;

      expect(result).toEqual(mockYouTubeVideo);
      expect(uploadTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(youtubeService.uploadVideo).toHaveBeenCalledTimes(1);
    });

    it('should handle YouTube upload timeout gracefully', async () => {
      const resourceId = 'resource-123';
      const videoFile = {
        originalname: 'timeout-test.mp4',
        mimetype: 'video/mp4',
        size: 200 * 1024 * 1024, // 200MB
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const mockResource = {
        id: resourceId,
        title: 'Large Video',
        type: 'video'
      };

      // Mock YouTube upload that times out
      youtubeService.uploadVideo.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds (timeout)
        throw new Error('Upload timeout');
      });

      mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

      const startTime = performance.now();
      
      await expect(resourceService.uploadVideoToYouTube(resourceId, videoFile))
        .rejects.toThrow('YouTube upload failed');
      
      const endTime = performance.now();
      const timeElapsed = endTime - startTime;

      // Should fail quickly, not wait for full timeout
      expect(timeElapsed).toBeLessThan(20000);
    });
  });

  describe('Security Scanning Performance', () => {
    it('should scan large files efficiently', async () => {
      const largeFiles = [
        {
          originalname: 'document1.pdf',
          mimetype: 'application/pdf',
          size: 8 * 1024 * 1024, // 8MB
          buffer: Buffer.alloc(8 * 1024 * 1024, 'a')
        },
        {
          originalname: 'presentation.pptx',
          mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          size: 15 * 1024 * 1024, // 15MB
          buffer: Buffer.alloc(15 * 1024 * 1024, 'b')
        },
        {
          originalname: 'video.mp4',
          mimetype: 'video/mp4',
          size: 50 * 1024 * 1024, // 50MB
          buffer: Buffer.alloc(1024, 'c') // Small buffer for testing
        }
      ] as Express.Multer.File[];

      const mockScanResult = {
        virusFound: false,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'Clean file',
        scannedAt: new Date()
      };

      securityService.scanFile.mockImplementation(async (file) => {
        // Simulate scan time proportional to file size
        const scanTime = Math.min(file.size / (1024 * 1024) * 100, 2000); // Max 2 seconds
        await new Promise(resolve => setTimeout(resolve, scanTime));
        return mockScanResult;
      });

      const scanPromises = largeFiles.map(async (file) => {
        const startTime = performance.now();
        const result = await securityService.scanFile(file);
        const endTime = performance.now();
        
        return {
          file: file.originalname,
          size: file.size,
          scanTime: endTime - startTime,
          result
        };
      });

      const results = await Promise.all(scanPromises);

      results.forEach(({ file, size, scanTime, result }) => {
        expect(result).toEqual(mockScanResult);
        expect(scanTime).toBeLessThan(3000); // Each scan should be under 3 seconds
        
        // Larger files should take longer, but not excessively
        const expectedMaxTime = Math.min(size / (1024 * 1024) * 200, 3000);
        expect(scanTime).toBeLessThan(expectedMaxTime);
      });
    });

    it('should handle memory efficiently during large file processing', async () => {
      const memoryBefore = process.memoryUsage();
      
      // Process multiple large files sequentially
      const largeFileCount = 10;
      const fileSize = 20 * 1024 * 1024; // 20MB each
      
      for (let i = 0; i < largeFileCount; i++) {
        const largeFile = {
          originalname: `large-file-${i}.pdf`,
          mimetype: 'application/pdf',
          size: fileSize,
          buffer: Buffer.alloc(1024) // Small buffer for testing
        } as Express.Multer.File;

        securityService.scanFile.mockResolvedValueOnce({
          virusFound: false,
          malwareFound: false,
          suspiciousContent: false,
          scanDetails: 'Clean file',
          scannedAt: new Date()
        });

        await securityService.scanFile(largeFile);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Database Performance with Large Data', () => {
    it('should handle bulk resource queries efficiently', async () => {
      const query = 'education';
      const filters = {
        type: 'video',
        subjects: ['Mathematics'],
        page: 1,
        limit: 100 // Large page size
      };

      // Mock large result set
      const mockResources = Array.from({ length: 100 }, (_, index) => ({
        id: `resource-${index}`,
        title: `Educational Video ${index}`,
        description: `Math lesson ${index}`,
        type: 'video',
        subjects: ['Mathematics'],
        authorId: `user-${index % 10}`,
        rating: 4.0 + (index % 5) * 0.2,
        downloadCount: index * 10,
        createdAt: new Date()
      }));

      mockDb.query
        .mockResolvedValueOnce({ rows: mockResources })
        .mockResolvedValueOnce({ rows: [{ count: '1000' }] });

      const startTime = performance.now();
      const result = await resourceService.searchResources(query, filters);
      const endTime = performance.now();

      const queryTime = endTime - startTime;

      expect(result.data).toHaveLength(100);
      expect(result.total).toBe(1000);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 20;
      const operationPromises = [];

      // Create multiple concurrent database operations
      for (let i = 0; i < concurrentOperations; i++) {
        const mockResource = {
          id: `resource-${i}`,
          title: `Resource ${i}`,
          type: 'document',
          authorId: `user-${i}`,
          createdAt: new Date()
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockResource] });

        const promise = resourceService.getResource(`resource-${i}`, `user-${i}`);
        operationPromises.push(promise);
      }

      const startTime = performance.now();
      const results = await Promise.all(operationPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentOperations;

      expect(results).toHaveLength(concurrentOperations);
      expect(averageTime).toBeLessThan(100); // Average should be under 100ms
      expect(totalTime).toBeLessThan(2000); // Total should be under 2 seconds
    });
  });
});