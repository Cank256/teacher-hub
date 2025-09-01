import { apiClient } from './apiClient';
import type { YouTubeUploadResult, UploadProgress } from '@/types/resources';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  publishedAt: Date;
  channelTitle: string;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoCount: number;
  videos: YouTubeVideoInfo[];
}

export class YouTubeService {
  /**
   * Upload video to YouTube as unlisted
   */
  static async uploadVideo(
    file: File,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      categoryId?: string;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<YouTubeUploadResult> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('tags', JSON.stringify(metadata.tags));
    
    if (metadata.categoryId) {
      formData.append('categoryId', metadata.categoryId);
    }

    const response = await apiClient.post('/youtube/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Get video information from YouTube
   */
  static async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    const response = await apiClient.get(`/youtube/video/${videoId}`);
    return response.data;
  }

  /**
   * Get video information from YouTube URL
   */
  static async getVideoInfoFromUrl(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    return this.getVideoInfo(videoId);
  }

  /**
   * Get playlist information
   */
  static async getPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
    const response = await apiClient.get(`/youtube/playlist/${playlistId}`);
    return response.data;
  }

  /**
   * Search YouTube videos
   */
  static async searchVideos(
    query: string,
    maxResults = 25,
    pageToken?: string
  ): Promise<{
    videos: YouTubeVideoInfo[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    const response = await apiClient.get('/youtube/search', {
      params: {
        q: query,
        maxResults,
        pageToken,
      },
    });
    return response.data;
  }

  /**
   * Get video categories
   */
  static async getVideoCategories(): Promise<Array<{ id: string; title: string }>> {
    const response = await apiClient.get('/youtube/categories');
    return response.data;
  }

  /**
   * Update video metadata
   */
  static async updateVideo(
    videoId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
    }
  ): Promise<YouTubeVideoInfo> {
    const response = await apiClient.put(`/youtube/video/${videoId}`, updates);
    return response.data;
  }

  /**
   * Delete video from YouTube
   */
  static async deleteVideo(videoId: string): Promise<void> {
    await apiClient.delete(`/youtube/video/${videoId}`);
  }

  /**
   * Get video upload status
   */
  static async getUploadStatus(videoId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress?: number;
    failureReason?: string;
  }> {
    const response = await apiClient.get(`/youtube/video/${videoId}/status`);
    return response.data;
  }

  /**
   * Generate embed URL for video
   */
  static generateEmbedUrl(videoId: string, options: {
    autoplay?: boolean;
    controls?: boolean;
    start?: number;
    end?: number;
    loop?: boolean;
    mute?: boolean;
  } = {}): string {
    const params = new URLSearchParams();
    
    if (options.autoplay) params.append('autoplay', '1');
    if (options.controls === false) params.append('controls', '0');
    if (options.start) params.append('start', options.start.toString());
    if (options.end) params.append('end', options.end.toString());
    if (options.loop) params.append('loop', '1');
    if (options.mute) params.append('mute', '1');

    const queryString = params.toString();
    return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Generate thumbnail URL for video
   */
  static generateThumbnailUrl(
    videoId: string,
    quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'
  ): string {
    const qualityMap = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      standard: 'sddefault',
      maxres: 'maxresdefault',
    };

    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }

  /**
   * Extract video ID from YouTube URL
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract playlist ID from YouTube URL
   */
  static extractPlaylistId(url: string): string | null {
    const match = url.match(/[?&]list=([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * Validate YouTube URL
   */
  static isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  /**
   * Format video duration from seconds to readable format
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  static parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get video quality options
   */
  static getQualityOptions(): Array<{ label: string; value: string }> {
    return [
      { label: '144p', value: 'tiny' },
      { label: '240p', value: 'small' },
      { label: '360p', value: 'medium' },
      { label: '480p', value: 'large' },
      { label: '720p', value: 'hd720' },
      { label: '1080p', value: 'hd1080' },
    ];
  }

  /**
   * Check if video is available
   */
  static async isVideoAvailable(videoId: string): Promise<boolean> {
    try {
      await this.getVideoInfo(videoId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get video privacy status
   */
  static async getPrivacyStatus(videoId: string): Promise<'public' | 'unlisted' | 'private'> {
    const response = await apiClient.get(`/youtube/video/${videoId}/privacy`);
    return response.data.privacyStatus;
  }

  /**
   * Set video privacy status
   */
  static async setPrivacyStatus(
    videoId: string,
    privacyStatus: 'public' | 'unlisted' | 'private'
  ): Promise<void> {
    await apiClient.put(`/youtube/video/${videoId}/privacy`, { privacyStatus });
  }
}