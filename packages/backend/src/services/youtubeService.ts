import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { YouTubeVideoMetadata, YouTubeVideoStatus } from '../types';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.initializeYouTubeAPI();
  }

  /**
   * Initialize YouTube API with OAuth2 credentials
   */
  private initializeYouTubeAPI(): void {
    try {
      // Initialize OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
      );

      // Set credentials if available
      if (process.env.YOUTUBE_ACCESS_TOKEN && process.env.YOUTUBE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          access_token: process.env.YOUTUBE_ACCESS_TOKEN,
          refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
        });
      }

      // Initialize YouTube API
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      logger.info('YouTube API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize YouTube API:', error);
      throw new Error('YouTube API initialization failed');
    }
  }

  /**
   * Generate OAuth2 authorization URL for YouTube API access
   */
  getAuthorizationUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens');
      }

      // Set credentials for future API calls
      this.oauth2Client.setCredentials(tokens);

      logger.info('Successfully exchanged authorization code for tokens');

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      };
    } catch (error) {
      logger.error('Failed to exchange authorization code:', error);
      throw new Error('Token exchange failed');
    }
  }

  /**
   * Upload video to YouTube with unlisted privacy setting
   */
  async uploadVideo(videoFilePath: string, metadata: YouTubeVideoMetadata): Promise<string> {
    try {
      // Validate file exists
      if (!fs.existsSync(videoFilePath)) {
        throw new Error(`Video file not found: ${videoFilePath}`);
      }

      // Validate file size (YouTube limit is 128GB, but we'll use a more reasonable limit)
      const stats = fs.statSync(videoFilePath);
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      
      if (stats.size > maxSize) {
        throw new Error(`Video file too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
      }

      logger.info(`Starting video upload: ${path.basename(videoFilePath)}`);

      // Prepare video upload parameters
      const uploadParams = {
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: ['education', 'teacher', 'learning'],
            categoryId: '27', // Education category
            defaultLanguage: 'en',
            defaultAudioLanguage: 'en'
          },
          status: {
            privacyStatus: 'unlisted', // Always unlisted for security
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(videoFilePath)
        }
      };

      // Upload video
      const response = await this.youtube.videos.insert(uploadParams);

      if (!response.data.id) {
        throw new Error('Video upload failed - no video ID returned');
      }

      const videoId = response.data.id;
      logger.info(`Video uploaded successfully: ${videoId}`);

      // Wait for processing to complete
      await this.waitForProcessingComplete(videoId);

      return videoId;
    } catch (error) {
      logger.error('Video upload failed:', error);
      throw new Error(`Video upload failed: ${error.message}`);
    }
  }

  /**
   * Get video upload and processing status
   */
  async getVideoStatus(videoId: string): Promise<YouTubeVideoStatus> {
    try {
      const response = await this.youtube.videos.list({
        part: ['status', 'processingDetails'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const video = response.data.items[0];
      const uploadStatus = video.status?.uploadStatus;
      const processingStatus = video.processingDetails?.processingStatus;

      // Map YouTube statuses to our internal status
      let status: YouTubeVideoStatus['status'];
      let progress: number | undefined;

      if (uploadStatus === 'uploaded') {
        if (processingStatus === 'processing') {
          status = 'processing';
          progress = Number(video.processingDetails?.processingProgress?.partsProcessed) || 0;
        } else if (processingStatus === 'succeeded') {
          status = 'completed';
          progress = 100;
        } else if (processingStatus === 'failed') {
          status = 'failed';
        } else {
          status = 'processing';
        }
      } else if (uploadStatus === 'failed' || uploadStatus === 'rejected') {
        status = 'failed';
      } else {
        status = 'uploading';
      }

      return {
        status,
        progress,
        error: video.status?.rejectionReason || undefined
      };
    } catch (error) {
      logger.error('Failed to get video status:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Update video metadata
   */
  async updateVideoMetadata(videoId: string, metadata: Partial<YouTubeVideoMetadata>): Promise<void> {
    try {
      const updateParams = {
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...(metadata.title && { title: metadata.title }),
            ...(metadata.description && { description: metadata.description })
          }
        }
      };

      await this.youtube.videos.update(updateParams);
      logger.info(`Video metadata updated: ${videoId}`);
    } catch (error) {
      logger.error('Failed to update video metadata:', error);
      throw new Error(`Failed to update video metadata: ${error.message}`);
    }
  }

  /**
   * Delete video from YouTube
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      await this.youtube.videos.delete({
        id: videoId
      });

      logger.info(`Video deleted: ${videoId}`);
    } catch (error) {
      logger.error('Failed to delete video:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Get video thumbnail URL
   */
  async getVideoThumbnail(videoId: string): Promise<string> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const thumbnails = response.data.items[0].snippet?.thumbnails;
      
      // Return highest quality thumbnail available
      if (thumbnails?.maxres?.url) {
        return thumbnails.maxres.url;
      } else if (thumbnails?.high?.url) {
        return thumbnails.high.url;
      } else if (thumbnails?.medium?.url) {
        return thumbnails.medium.url;
      } else if (thumbnails?.default?.url) {
        return thumbnails.default.url;
      }

      throw new Error('No thumbnail available');
    } catch (error) {
      logger.error('Failed to get video thumbnail:', error);
      throw new Error(`Failed to get video thumbnail: ${error.message}`);
    }
  }

  /**
   * Get video duration
   */
  async getVideoDuration(videoId: string): Promise<number> {
    try {
      const response = await this.youtube.videos.list({
        part: ['contentDetails'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const duration = response.data.items[0].contentDetails?.duration;
      
      if (!duration) {
        throw new Error('Duration not available');
      }

      // Parse ISO 8601 duration format (PT4M13S -> 253 seconds)
      return this.parseISO8601Duration(duration);
    } catch (error) {
      logger.error('Failed to get video duration:', error);
      throw new Error(`Failed to get video duration: ${error.message}`);
    }
  }

  /**
   * Check if API credentials are valid
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Try to make a simple API call
      await this.youtube.channels.list({
        part: ['snippet'],
        mine: true
      });

      return true;
    } catch (error) {
      logger.warn('YouTube API credentials validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(): Promise<void> {
    try {
      const credentials = this.oauth2Client.credentials;
      
      if (!credentials.expiry_date) {
        return;
      }

      // Check if token expires within 5 minutes
      const expiryTime = new Date(credentials.expiry_date);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiryTime <= fiveMinutesFromNow) {
        logger.info('Refreshing YouTube API access token');
        await this.oauth2Client.refreshAccessToken();
      }
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Wait for video processing to complete
   */
  private async waitForProcessingComplete(videoId: string, maxWaitTime: number = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getVideoStatus(videoId);

      if (status.status === 'completed') {
        logger.info(`Video processing completed: ${videoId}`);
        return;
      }

      if (status.status === 'failed') {
        throw new Error(`Video processing failed: ${status.error}`);
      }

      logger.info(`Video processing status: ${status.status} (${status.progress || 0}%)`);
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video processing timeout');
  }

  /**
   * Parse ISO 8601 duration format to seconds
   */
  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get quota usage information
   */
  async getQuotaUsage(): Promise<{ used: number; limit: number }> {
    // YouTube API v3 has a default quota of 10,000 units per day
    // This is a simplified implementation - in production, you'd track actual usage
    return {
      used: 0, // Would need to implement actual tracking
      limit: 10000
    };
  }
}

export const youtubeService = new YouTubeService();