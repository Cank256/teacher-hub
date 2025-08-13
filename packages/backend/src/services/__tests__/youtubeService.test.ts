import { YouTubeService } from '../youtubeService';
import { google } from 'googleapis';
import * as fs from 'fs';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('googleapis');
jest.mock('fs');
jest.mock('../../utils/logger');

const mockGoogle = google as jest.Mocked<typeof google>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;
  let mockYouTube: any;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Mock OAuth2Client
    mockOAuth2Client = {
      setCredentials: jest.fn(),
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      credentials: {},
      refreshAccessToken: jest.fn()
    };

    // Mock YouTube API
    mockYouTube = {
      videos: {
        insert: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      channels: {
        list: jest.fn()
      }
    };

    // Mock google.auth.OAuth2
    mockGoogle.auth = {
      OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client)
    } as any;

    // Mock google.youtube
    mockGoogle.youtube = jest.fn().mockReturnValue(mockYouTube);

    // Set up environment variables
    process.env.YOUTUBE_CLIENT_ID = 'test_client_id';
    process.env.YOUTUBE_CLIENT_SECRET = 'test_client_secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost:3000/auth/youtube/callback';
    process.env.YOUTUBE_ACCESS_TOKEN = 'test_access_token';
    process.env.YOUTUBE_REFRESH_TOKEN = 'test_refresh_token';

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    delete process.env.YOUTUBE_REDIRECT_URI;
    delete process.env.YOUTUBE_ACCESS_TOKEN;
    delete process.env.YOUTUBE_REFRESH_TOKEN;
  });

  describe('constructor', () => {
    it('should initialize YouTube API successfully', () => {
      youtubeService = new YouTubeService();

      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        'test_client_id',
        'test_client_secret',
        'http://localhost:3000/auth/youtube/callback'
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token'
      });
      expect(mockGoogle.youtube).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockOAuth2Client
      });
      expect(mockLogger.info).toHaveBeenCalledWith('YouTube API initialized successfully');
    });

    it('should handle initialization errors', () => {
      mockGoogle.auth.OAuth2 = jest.fn().mockImplementation(() => {
        throw new Error('OAuth2 initialization failed');
      });

      expect(() => new YouTubeService()).toThrow('YouTube API initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize YouTube API:',
        expect.any(Error)
      );
    });
  });

  describe('getAuthorizationUrl', () => {
    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should generate authorization URL', () => {
      const expectedUrl = 'https://accounts.google.com/oauth/authorize?...';
      mockOAuth2Client.generateAuthUrl.mockReturnValue(expectedUrl);

      const result = youtubeService.getAuthorizationUrl();

      expect(result).toBe(expectedUrl);
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube'
        ],
        prompt: 'consent'
      });
    });
  });

  describe('exchangeCodeForTokens', () => {
    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token'
      };
      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });

      const result = await youtubeService.exchangeCodeForTokens('auth_code');

      expect(result).toEqual(mockTokens);
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth_code');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully exchanged authorization code for tokens');
    });

    it('should handle token exchange errors', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Token exchange failed'));

      await expect(youtubeService.exchangeCodeForTokens('invalid_code'))
        .rejects.toThrow('Token exchange failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to exchange authorization code:',
        expect.any(Error)
      );
    });

    it('should handle missing tokens', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({ tokens: { access_token: 'token' } });

      await expect(youtubeService.exchangeCodeForTokens('auth_code'))
        .rejects.toThrow('Token exchange failed');
    });
  });

  describe('uploadVideo', () => {
    const videoFilePath = '/tmp/test_video.mp4';
    const metadata = {
      title: 'Test Video',
      description: 'Test video description',
      duration: 120,
      thumbnailUrl: 'http://example.com/thumb.jpg',
      privacy: 'unlisted' as const
    };

    beforeEach(() => {
      youtubeService = new YouTubeService();
      
      // Mock file system
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      mockFs.statSync = jest.fn().mockReturnValue({ size: 1024 * 1024 }); // 1MB
      mockFs.createReadStream = jest.fn().mockReturnValue({} as any);

      // Mock successful video upload
      mockYouTube.videos.insert.mockResolvedValue({
        data: { id: 'test_video_id' }
      });

      // Mock video status check
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            status: { uploadStatus: 'uploaded' },
            processingDetails: { processingStatus: 'succeeded' }
          }]
        }
      });
    });

    it('should upload video successfully', async () => {
      const result = await youtubeService.uploadVideo(videoFilePath, metadata);

      expect(result).toBe('test_video_id');
      expect(mockFs.existsSync).toHaveBeenCalledWith(videoFilePath);
      expect(mockFs.statSync).toHaveBeenCalledWith(videoFilePath);
      expect(mockYouTube.videos.insert).toHaveBeenCalledWith({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: ['education', 'teacher', 'learning'],
            categoryId: '27',
            defaultLanguage: 'en',
            defaultAudioLanguage: 'en'
          },
          status: {
            privacyStatus: 'unlisted',
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: expect.any(Object)
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Video uploaded successfully: test_video_id');
    });

    it('should reject non-existent files', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(youtubeService.uploadVideo(videoFilePath, metadata))
        .rejects.toThrow('Video file not found');
    });

    it('should reject files that are too large', async () => {
      mockFs.statSync.mockReturnValue({ size: 3 * 1024 * 1024 * 1024 }); // 3GB

      await expect(youtubeService.uploadVideo(videoFilePath, metadata))
        .rejects.toThrow('Video file too large');
    });

    it('should handle upload failures', async () => {
      mockYouTube.videos.insert.mockResolvedValue({ data: {} });

      await expect(youtubeService.uploadVideo(videoFilePath, metadata))
        .rejects.toThrow('Video upload failed - no video ID returned');
    });

    it('should handle API errors', async () => {
      mockYouTube.videos.insert.mockRejectedValue(new Error('API error'));

      await expect(youtubeService.uploadVideo(videoFilePath, metadata))
        .rejects.toThrow('Video upload failed: API error');
      expect(mockLogger.error).toHaveBeenCalledWith('Video upload failed:', expect.any(Error));
    });
  });

  describe('getVideoStatus', () => {
    const videoId = 'test_video_id';

    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should return completed status for processed video', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            status: { uploadStatus: 'uploaded' },
            processingDetails: { processingStatus: 'succeeded' }
          }]
        }
      });

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result).toEqual({
        status: 'completed',
        progress: 100
      });
    });

    it('should return processing status with progress', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            status: { uploadStatus: 'uploaded' },
            processingDetails: { 
              processingStatus: 'processing',
              processingProgress: { partsProcessed: 50 }
            }
          }]
        }
      });

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result).toEqual({
        status: 'processing',
        progress: 50
      });
    });

    it('should return failed status for failed uploads', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            status: { 
              uploadStatus: 'failed',
              rejectionReason: 'Copyright violation'
            }
          }]
        }
      });

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result).toEqual({
        status: 'failed',
        error: 'Copyright violation'
      });
    });

    it('should handle non-existent videos', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: { items: [] }
      });

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Video not found');
    });

    it('should handle API errors', async () => {
      mockYouTube.videos.list.mockRejectedValue(new Error('API error'));

      const result = await youtubeService.getVideoStatus(videoId);

      expect(result).toEqual({
        status: 'failed',
        error: 'API error'
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get video status:', expect.any(Error));
    });
  });

  describe('updateVideoMetadata', () => {
    const videoId = 'test_video_id';
    const metadata = {
      title: 'Updated Title',
      description: 'Updated description'
    };

    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should update video metadata successfully', async () => {
      mockYouTube.videos.update.mockResolvedValue({});

      await youtubeService.updateVideoMetadata(videoId, metadata);

      expect(mockYouTube.videos.update).toHaveBeenCalledWith({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: metadata.title,
            description: metadata.description
          }
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Video metadata updated: ${videoId}`);
    });

    it('should handle update errors', async () => {
      mockYouTube.videos.update.mockRejectedValue(new Error('Update failed'));

      await expect(youtubeService.updateVideoMetadata(videoId, metadata))
        .rejects.toThrow('Failed to update video metadata: Update failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update video metadata:', expect.any(Error));
    });
  });

  describe('deleteVideo', () => {
    const videoId = 'test_video_id';

    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should delete video successfully', async () => {
      mockYouTube.videos.delete.mockResolvedValue({});

      await youtubeService.deleteVideo(videoId);

      expect(mockYouTube.videos.delete).toHaveBeenCalledWith({ id: videoId });
      expect(mockLogger.info).toHaveBeenCalledWith(`Video deleted: ${videoId}`);
    });

    it('should handle deletion errors', async () => {
      mockYouTube.videos.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(youtubeService.deleteVideo(videoId))
        .rejects.toThrow('Failed to delete video: Deletion failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete video:', expect.any(Error));
    });
  });

  describe('getVideoThumbnail', () => {
    const videoId = 'test_video_id';

    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should return highest quality thumbnail', async () => {
      const thumbnailUrl = 'https://img.youtube.com/vi/test/maxresdefault.jpg';
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            snippet: {
              thumbnails: {
                maxres: { url: thumbnailUrl }
              }
            }
          }]
        }
      });

      const result = await youtubeService.getVideoThumbnail(videoId);

      expect(result).toBe(thumbnailUrl);
    });

    it('should fallback to lower quality thumbnails', async () => {
      const thumbnailUrl = 'https://img.youtube.com/vi/test/hqdefault.jpg';
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            snippet: {
              thumbnails: {
                high: { url: thumbnailUrl }
              }
            }
          }]
        }
      });

      const result = await youtubeService.getVideoThumbnail(videoId);

      expect(result).toBe(thumbnailUrl);
    });

    it('should handle videos without thumbnails', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            snippet: { thumbnails: {} }
          }]
        }
      });

      await expect(youtubeService.getVideoThumbnail(videoId))
        .rejects.toThrow('No thumbnail available');
    });
  });

  describe('getVideoDuration', () => {
    const videoId = 'test_video_id';

    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should parse duration correctly', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            contentDetails: {
              duration: 'PT4M13S' // 4 minutes 13 seconds = 253 seconds
            }
          }]
        }
      });

      const result = await youtubeService.getVideoDuration(videoId);

      expect(result).toBe(253);
    });

    it('should handle hours in duration', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            contentDetails: {
              duration: 'PT1H30M45S' // 1 hour 30 minutes 45 seconds = 5445 seconds
            }
          }]
        }
      });

      const result = await youtubeService.getVideoDuration(videoId);

      expect(result).toBe(5445);
    });

    it('should handle videos without duration', async () => {
      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            contentDetails: {}
          }]
        }
      });

      await expect(youtubeService.getVideoDuration(videoId))
        .rejects.toThrow('Duration not available');
    });
  });

  describe('validateCredentials', () => {
    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should return true for valid credentials', async () => {
      mockYouTube.channels.list.mockResolvedValue({});

      const result = await youtubeService.validateCredentials();

      expect(result).toBe(true);
      expect(mockYouTube.channels.list).toHaveBeenCalledWith({
        part: ['snippet'],
        mine: true
      });
    });

    it('should return false for invalid credentials', async () => {
      mockYouTube.channels.list.mockRejectedValue(new Error('Invalid credentials'));

      const result = await youtubeService.validateCredentials();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'YouTube API credentials validation failed:',
        expect.any(Error)
      );
    });
  });

  describe('getQuotaUsage', () => {
    beforeEach(() => {
      youtubeService = new YouTubeService();
    });

    it('should return quota usage information', async () => {
      const result = await youtubeService.getQuotaUsage();

      expect(result).toEqual({
        used: 0,
        limit: 10000
      });
    });
  });
});