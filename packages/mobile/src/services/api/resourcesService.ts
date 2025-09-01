import axios, { AxiosProgressEvent } from 'axios';
import { apiClient } from './apiClient';
import type {
  Resource,
  ResourceFilters,
  CreateResourceRequest,
  UpdateResourceRequest,
  PaginatedResponse,
  ResourceCategory,
  Subject,
  GradeLevel,
  YouTubeUploadResult,
  ResourceRating,
  ResourceStats,
  UploadProgress,
} from '@/types/resources';

export class ResourcesService {
  /**
   * Get paginated list of resources with optional filters
   */
  static async getResources(
    filters: ResourceFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Resource>> {
    const params = {
      page,
      limit,
      ...filters,
    };

    const response = await apiClient.get('/resources', { params });
    return response.data;
  }

  /**
   * Get a specific resource by ID
   */
  static async getResource(id: string): Promise<Resource> {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  }

  /**
   * Search resources with advanced filtering
   */
  static async searchResources(
    query: string,
    filters: ResourceFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Resource>> {
    const params = {
      q: query,
      page,
      limit,
      ...filters,
    };

    const response = await apiClient.get('/resources/search', { params });
    return response.data;
  }

  /**
   * Upload a new resource with progress tracking
   */
  static async uploadResource(
    request: CreateResourceRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Resource> {
    const formData = new FormData();
    
    formData.append('title', request.title);
    formData.append('description', request.description);
    formData.append('type', request.type);
    formData.append('categoryId', request.categoryId);
    formData.append('tags', JSON.stringify(request.tags));

    if (request.file) {
      formData.append('file', request.file);
    }

    if (request.youtubeUrl) {
      formData.append('youtubeUrl', request.youtubeUrl);
    }

    const response = await apiClient.post('/resources', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
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
   * Upload video to YouTube and create resource
   */
  static async uploadYouTubeVideo(
    file: File,
    metadata: {
      title: string;
      description: string;
      categoryId: string;
      tags: string[];
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<YouTubeUploadResult> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('categoryId', metadata.categoryId);
    formData.append('tags', JSON.stringify(metadata.tags));

    const response = await apiClient.post('/resources/youtube/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
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
   * Update an existing resource
   */
  static async updateResource(
    id: string,
    updates: UpdateResourceRequest
  ): Promise<Resource> {
    const response = await apiClient.put(`/resources/${id}`, updates);
    return response.data;
  }

  /**
   * Delete a resource
   */
  static async deleteResource(id: string): Promise<void> {
    await apiClient.delete(`/resources/${id}`);
  }

  /**
   * Download a resource file
   */
  static async downloadResource(
    id: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Blob> {
    const response = await apiClient.get(`/resources/${id}/download`, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
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
   * Rate a resource
   */
  static async rateResource(
    id: string,
    rating: number,
    comment?: string
  ): Promise<ResourceRating> {
    const response = await apiClient.post(`/resources/${id}/rate`, {
      rating,
      comment,
    });
    return response.data;
  }

  /**
   * Get resource ratings
   */
  static async getResourceRatings(
    id: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<ResourceRating>> {
    const response = await apiClient.get(`/resources/${id}/ratings`, {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get resource categories
   */
  static async getCategories(): Promise<ResourceCategory[]> {
    const response = await apiClient.get('/resources/categories');
    return response.data;
  }

  /**
   * Get subjects
   */
  static async getSubjects(): Promise<Subject[]> {
    const response = await apiClient.get('/resources/subjects');
    return response.data;
  }

  /**
   * Get grade levels
   */
  static async getGradeLevels(): Promise<GradeLevel[]> {
    const response = await apiClient.get('/resources/grade-levels');
    return response.data;
  }

  /**
   * Get resource statistics
   */
  static async getResourceStats(): Promise<ResourceStats> {
    const response = await apiClient.get('/resources/stats');
    return response.data;
  }

  /**
   * Get user's uploaded resources
   */
  static async getUserResources(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Resource>> {
    const response = await apiClient.get(`/users/${userId}/resources`, {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get user's downloaded resources
   */
  static async getDownloadedResources(
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Resource>> {
    const response = await apiClient.get('/resources/downloaded', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Mark resource as downloaded
   */
  static async markAsDownloaded(id: string): Promise<void> {
    await apiClient.post(`/resources/${id}/downloaded`);
  }

  /**
   * Get popular resources
   */
  static async getPopularResources(
    timeframe: 'day' | 'week' | 'month' | 'year' = 'week',
    limit = 10
  ): Promise<Resource[]> {
    const response = await apiClient.get('/resources/popular', {
      params: { timeframe, limit },
    });
    return response.data;
  }

  /**
   * Get recommended resources for user
   */
  static async getRecommendedResources(limit = 10): Promise<Resource[]> {
    const response = await apiClient.get('/resources/recommended', {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Report inappropriate resource
   */
  static async reportResource(
    id: string,
    reason: string,
    description?: string
  ): Promise<void> {
    await apiClient.post(`/resources/${id}/report`, {
      reason,
      description,
    });
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, type: string): { valid: boolean; error?: string } {
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for others
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${type === 'video' ? '100MB' : '10MB'} limit`,
      };
    }

    const allowedTypes = {
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
      presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    };

    const typeKey = type as keyof typeof allowedTypes;
    if (allowedTypes[typeKey] && !allowedTypes[typeKey].includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type for ${type}`,
      };
    }

    return { valid: true };
  }
}