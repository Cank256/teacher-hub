// Communities API service

import { apiClient } from './apiClient';
import type {
  Community,
  CommunityMember,
  CommunityPost,
  CommunityActivity,
  CommunityNotification,
  CommunityFilters,
  CommunityPostFilters,
  JoinCommunityRequest,
  CreateCommunityPostRequest,
  GetCommunitiesResponse,
  GetCommunityMembersResponse,
  GetCommunityPostsResponse,
  GetCommunityActivitiesResponse,
  GetCommunityNotificationsResponse,
  ApiResponse,
} from '@/types';

export class CommunitiesService {
  /**
   * Get list of communities with filtering and pagination
   */
  static async getCommunities(filters: CommunityFilters = {}): Promise<GetCommunitiesResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.subjects?.length) params.append('subjects', filters.subjects.join(','));
    if (filters.gradeLevels?.length) params.append('gradeLevels', filters.gradeLevels.join(','));
    if (filters.location) params.append('location', filters.location);
    if (filters.activityLevel) params.append('activityLevel', filters.activityLevel);
    if (filters.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<GetCommunitiesResponse>(`/communities?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific community by ID
   */
  static async getCommunity(id: string): Promise<Community> {
    const response = await apiClient.get<ApiResponse<Community>>(`/communities/${id}`);
    return response.data.data;
  }

  /**
   * Join a community
   */
  static async joinCommunity(request: JoinCommunityRequest): Promise<void> {
    await apiClient.post(`/communities/${request.communityId}/join`, {
      message: request.message,
    });
  }

  /**
   * Leave a community
   */
  static async leaveCommunity(communityId: string): Promise<void> {
    await apiClient.delete(`/communities/${communityId}/leave`);
  }

  /**
   * Get community members
   */
  static async getCommunityMembers(
    communityId: string,
    page = 1,
    limit = 20
  ): Promise<GetCommunityMembersResponse> {
    const response = await apiClient.get<GetCommunityMembersResponse>(
      `/communities/${communityId}/members?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get community posts
   */
  static async getCommunityPosts(filters: CommunityPostFilters): Promise<GetCommunityPostsResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.author) params.append('author', filters.author);
    if (filters.isPinned !== undefined) params.append('isPinned', filters.isPinned.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<GetCommunityPostsResponse>(
      `/communities/${filters.communityId}/posts?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Create a post in a community
   */
  static async createCommunityPost(request: CreateCommunityPostRequest): Promise<CommunityPost> {
    const formData = new FormData();
    formData.append('title', request.title);
    formData.append('content', request.content);
    
    if (request.category) {
      formData.append('category', request.category);
    }

    if (request.mediaAttachments?.length) {
      request.mediaAttachments.forEach((file, index) => {
        formData.append(`media_${index}`, file);
      });
    }

    const response = await apiClient.post<ApiResponse<CommunityPost>>(
      `/communities/${request.communityId}/posts`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Like a community post
   */
  static async likeCommunityPost(communityId: string, postId: string): Promise<void> {
    await apiClient.post(`/communities/${communityId}/posts/${postId}/like`);
  }

  /**
   * Unlike a community post
   */
  static async unlikeCommunityPost(communityId: string, postId: string): Promise<void> {
    await apiClient.delete(`/communities/${communityId}/posts/${postId}/like`);
  }

  /**
   * Get community activities
   */
  static async getCommunityActivities(
    communityId: string,
    page = 1,
    limit = 20
  ): Promise<GetCommunityActivitiesResponse> {
    const response = await apiClient.get<GetCommunityActivitiesResponse>(
      `/communities/${communityId}/activities?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get community notifications for the current user
   */
  static async getCommunityNotifications(
    page = 1,
    limit = 20
  ): Promise<GetCommunityNotificationsResponse> {
    const response = await apiClient.get<GetCommunityNotificationsResponse>(
      `/communities/notifications?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Mark community notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/communities/notifications/${notificationId}/read`);
  }

  /**
   * Search communities
   */
  static async searchCommunities(
    query: string,
    filters: Omit<CommunityFilters, 'search'> = {}
  ): Promise<GetCommunitiesResponse> {
    return this.getCommunities({ ...filters, search: query });
  }

  /**
   * Get user's joined communities
   */
  static async getMyCommunitites(page = 1, limit = 20): Promise<GetCommunitiesResponse> {
    const response = await apiClient.get<GetCommunitiesResponse>(
      `/communities/my?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get community categories
   */
  static async getCommunityCategories(): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/communities/categories');
    return response.data.data;
  }
}