import { YouTubeService } from '../youtubeService';
import { jest } from '@jest/globals';

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn()
      }))
    },
    youtube: jest.fn().mockImplementation(() => ({
      videos: {
        insert: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    }))
  }
}));

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;
  let mockYouTube: any;
  let mockAuth: any;

  beforeEach(() => {
    const { google } = require('googleapis');
    
    mockAuth = {
      setCredentials: jest.fn(),
      getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
    };
    
    mockYouTube = {
      videos: {
        insert: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };

    google.auth.OAuth2.mockImplementation(() => mockAuth);
    google.youtube.mockImplementation(() => mockYouTube);

    youtubeService = new YouTubeService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadVideo', () => {
    it('should upload video successfully', async () => {
      const mockVideoFile = {
        originalname: 'lesson.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const metadata = {
        title: 'Math Lesson - Algebra Basics',
        description: 'Introduction to algebraic concepts for Grade 9 students',
        duration: 600,
        thumbnailUrl: '',
        privacy: 'unlisted' as const
      };

      const mockUploadResponse = {
        data: {
          id: 'youtube-video-123',
          snippet: {
            title: metadata.title,
            description: metadata.description,
            thumbnails: {
              maxres: {
                url: 'https://img.youtube.com/vi/youtube-video-123/maxresdefault.jpg'
              }
            }
          },
          status: {
            privacyStatus: 'unlisted',
            uploadStatus: 'uploaded'
          },
          contentDetails: {
            duration: 'PT10M'
          }
        }
      };

      mockYouTube.videos.insert.mockResolvedValue(mockUploadResponse);

      const result = await youtubeService.uploadVideo(mockVideoFile, metadata);

      expect(result).toBe('youtube-video-123');
      expect(mockYouTube.videos.insert).toHaveBeenCalledWith({
        auth: mockAuth,
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: ['education', 'teaching', 'learning'],
            categoryId: '27' // Education category
          },
          status: {
            privacyStatus: 'unlisted',
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: expect.any(Object) // Stream from buffer
        }
      });
    });

    it('should handle upload failure', async () => {
      const mockVideoFile = {
        originalname: 'lesson.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const metadata = {
        title: 'Test Video',
        description: 'Test description',
        duration: 300,
        thumbnailUrl: '',
        privacy: 'unlisted' as const
      };

      mockYouTube.videos.insert.mockRejectedValue(new Error('YouTube API error'));

      await expect(youtubeService.uploadVideo(mockVideoFile, metadata))
        .rejects.toThrow('YouTube upload failed: YouTube API error');
    });

    it('should validate video file size', async () => {
      const oversizedVideoFile = {
        originalname: 'huge-lesson.mp4',
        mimetype: 'video/mp4',
        size: 2 * 1024 * 1024 * 1024, // 2GB
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const metadata = {
        title: 'Test Video',
        description: 'Test description',
        duration: 300,
        thumbnailUrl: '',
        privacy: 'unlisted' as const
      };

      await expect(youtubeService.uploadVideo(oversizedVideoFile, metadata))
        .rejects.toThrow('Video file too large');
    });

    it('should validate video duration', async () => {
      const mockVideoFile = {
        originalname: 'long-lesson.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024,
        buffer: Buffer.alloc(1024)
      } as Express.Multer.File;

      const metadata = {
        title: 'Very Long Video',
        description: 'Test description',
        duration: 4 * 60 * 60, // 4 hours
        thumbnailUrl: '',
        privacy: 'unlisted' as const
      };

      await expect(youtubeService.uploadVideo(mockVideoFile, metadata))
        .rejects.toThrow('Video duration exceeds limit');
    });
  });

  describe('getVideoStatus', () => {
    it('should return video status successfully', async () => {
      const videoId = 'youtube-video-123';

      const mockStatusResponse = {
        data: {
          items: [{
            id: videoId,
            status: {
              uploadStatus: 'processed',
              privacyStatus: 'unlisted',
              processingStatus: 'succeeded'
            },
            snippet: {
              title: 'Math Lesson',
              description: 'Algebra basics',
              thumbnails: {
                maxres: {
                  url: 'https://img.youtube.com/vi/youtube-video-123/maxresdefault.jpg'
                }
              }
            },
            contentDetails: {
              duration: 'PT10M'
            }
          }]
        }
      };

      mockYouTube.videos.list.mockResolvedValue(mockStatusResponse);

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result).toEqual({
        uploadStatus: 'processed',
        processingStatus: 'succeeded',
        privacyStatus: 'unlisted',
        title: 'Math Lesson',
        description: 'Algebra basics',
        duration: 600, // Converted from PT10M
        thumbnailUrl: 'https://img.youtube.com/vi/youtube-video-123/maxresdefault.jpg'
      });
    });

    it('should handle video not found', async () => {
      const videoId = 'non-existent-video';

      const mockStatusResponse = {
        data: {
          items: []
        }
      };

      mockYouTube.videos.list.mockResolvedValue(mockStatusResponse);

      await expect(youtubeService.getVideoStatus(videoId))
        .rejects.toThrow('Video not found');
    });

    it('should handle API error', async () => {
      const videoId = 'youtube-video-123';

      mockYouTube.videos.list.mockRejectedValue(new Error('API quota exceeded'));

      await expect(youtubeService.getVideoStatus(videoId))
        .rejects.toThrow('Failed to get video status: API quota exceeded');
    });
  });

  describe('updateVideoMetadata', () => {
    it('should update video metadata successfully', async () => {
      const videoId = 'youtube-video-123';
      const updates = {
        title: 'Updated Math Lesson',
        description: 'Updated description with more details'
      };

      const mockUpdateResponse = {
        data: {
          id: videoId,
          snippet: {
            title: updates.title,
            description: updates.description
          }
        }
      };

      mockYouTube.videos.update.mockResolvedValue(mockUpdateResponse);

      await youtubeService.updateVideoMetadata(videoId, updates);

      expect(mockYouTube.videos.update).toHaveBeenCalledWith({
        auth: mockAuth,
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: updates.title,
            description: updates.description
          }
        }
      });
    });

    it('should handle update failure', async () => {
      const videoId = 'youtube-video-123';
      const updates = {
        title: 'Updated Title'
      };

      mockYouTube.videos.update.mockRejectedValue(new Error('Update failed'));

      await expect(youtubeService.updateVideoMetadata(videoId, updates))
        .rejects.toThrow('Failed to update video metadata: Update failed');
    });
  });

  describe('deleteVideo', () => {
    it('should delete video successfully', async () => {
      const videoId = 'youtube-video-123';

      mockYouTube.videos.delete.mockResolvedValue({ data: {} });

      await youtubeService.deleteVideo(videoId);

      expect(mockYouTube.videos.delete).toHaveBeenCalledWith({
        auth: mockAuth,
        id: videoId
      });
    });

    it('should handle deletion failure', async () => {
      const videoId = 'youtube-video-123';

      mockYouTube.videos.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(youtubeService.deleteVideo(videoId))
        .rejects.toThrow('Failed to delete video: Deletion failed');
    });

    it('should handle video not found during deletion', async () => {
      const videoId = 'non-existent-video';

      const error = new Error('Video not found');
      (error as any).code = 404;
      mockYouTube.videos.delete.mockRejectedValue(error);

      // Should not throw error for 404, as video is already gone
      await expect(youtubeService.deleteVideo(videoId)).resolves.not.toThrow();
    });
  });

  describe('parseDuration', () => {
    it('should parse ISO 8601 duration correctly', () => {
      const testCases = [
        { input: 'PT1M30S', expected: 90 },
        { input: 'PT10M', expected: 600 },
        { input: 'PT1H30M', expected: 5400 },
        { input: 'PT2H15M30S', expected: 8130 },
        { input: 'PT45S', expected: 45 }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(youtubeService.parseDuration(input)).toBe(expected);
      });
    });

    it('should handle invalid duration format', () => {
      expect(youtubeService.parseDuration('invalid')).toBe(0);
      expect(youtubeService.parseDuration('')).toBe(0);
      expect(youtubeService.parseDuration(null as any)).toBe(0);
    });
  });

  describe('validateVideoFile', () => {
    it('should accept valid video files', () => {
      const validFiles = [
        { mimetype: 'video/mp4', size: 100 * 1024 * 1024 },
        { mimetype: 'video/avi', size: 50 * 1024 * 1024 },
        { mimetype: 'video/quicktime', size: 200 * 1024 * 1024 },
        { mimetype: 'video/x-msvideo', size: 75 * 1024 * 1024 }
      ];

      validFiles.forEach(file => {
        expect(() => youtubeService.validateVideoFile(file as Express.Multer.File))
          .not.toThrow();
      });
    });

    it('should reject invalid video files', () => {
      const invalidFiles = [
        { mimetype: 'image/jpeg', size: 10 * 1024 * 1024 },
        { mimetype: 'application/pdf', size: 5 * 1024 * 1024 },
        { mimetype: 'video/mp4', size: 2 * 1024 * 1024 * 1024 } // Too large
      ];

      invalidFiles.forEach(file => {
        expect(() => youtubeService.validateVideoFile(file as Express.Multer.File))
          .toThrow();
      });
    });
  });

  describe('generateVideoTags', () => {
    it('should generate appropriate tags for educational content', () => {
      const title = 'Math Lesson - Algebra Basics for Grade 9';
      const description = 'Introduction to algebraic concepts and equations';

      const tags = youtubeService.generateVideoTags(title, description);

      expect(tags).toContain('education');
      expect(tags).toContain('teaching');
      expect(tags).toContain('learning');
      expect(tags).toContain('math');
      expect(tags).toContain('algebra');
      expect(tags.length).toBeLessThanOrEqual(10); // YouTube limit
    });

    it('should handle empty title and description', () => {
      const tags = youtubeService.generateVideoTags('', '');

      expect(tags).toContain('education');
      expect(tags).toContain('teaching');
      expect(tags).toContain('learning');
      expect(tags.length).toBeGreaterThan(0);
    });
  });
});