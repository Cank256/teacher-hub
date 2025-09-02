/**
 * Government Content Service
 * Handles API interactions for government content, notifications, and tracking
 */

import { ApiClient } from './apiClient';
import {
  GovernmentContent,
  GovernmentContentFilters,
  GovernmentNotification,
  ContentTrackingEvent,
  GovernmentContentSearchResult,
  OfflineGovernmentContent,
  GovernmentContentSyncStatus,
  TrackingEventType,
  PaginatedResponse,
  ApiResponse
} from '../../types';

export class GovernmentService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  /**
   * Get government content with filters and pagination
   */
  async getGovernmentContent(
    filters?: GovernmentContentFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<GovernmentContent>> {
    const params = {
      page,
      limit,
      ...filters,
      // Convert date filters to ISO strings
      dateFrom: filters?.dateFrom?.toISOString(),
      dateTo: filters?.dateTo?.toISOString(),
    };

    const response = await this.apiClient.getPaginated<GovernmentContent>(
      '/government/content',
      params,
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Get specific government content by ID
   */
  async getGovernmentContentById(id: string): Promise<GovernmentContent> {
    const response = await this.apiClient.get<GovernmentContent>(
      `/government/content/${id}`,
      undefined,
      { requiresAuth: true }
    );

    // Track view event
    await this.trackContentEvent(id, TrackingEventType.VIEW);

    return response.data;
  }

  /**
   * Search government content with advanced filtering
   */
  async searchGovernmentContent(
    query: string,
    filters?: GovernmentContentFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<GovernmentContentSearchResult> {
    const params = {
      q: query,
      page,
      limit,
      ...filters,
      dateFrom: filters?.dateFrom?.toISOString(),
      dateTo: filters?.dateTo?.toISOString(),
    };

    const response = await this.apiClient.get<GovernmentContentSearchResult>(
      '/government/content/search',
      params,
      { requiresAuth: true }
    );

    // Track search event
    await this.trackSearchEvent(query, filters);

    return response.data;
  }

  /**
   * Get prioritized government content for user
   */
  async getPrioritizedContent(
    subjects?: string[],
    gradeLevels?: string[],
    limit: number = 10
  ): Promise<GovernmentContent[]> {
    const params = {
      subjects: subjects?.join(','),
      gradeLevels: gradeLevels?.join(','),
      limit,
    };

    const response = await this.apiClient.get<GovernmentContent[]>(
      '/government/content/prioritized',
      params,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Get government notifications for user
   */
  async getGovernmentNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<PaginatedResponse<GovernmentNotification>> {
    const params = {
      page,
      limit,
      unreadOnly,
    };

    const response = await this.apiClient.getPaginated<GovernmentNotification>(
      '/government/notifications',
      params,
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.apiClient.patch(
      `/government/notifications/${notificationId}/read`,
      {},
      { requiresAuth: true }
    );
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    await this.apiClient.patch(
      '/government/notifications/mark-read',
      { notificationIds },
      { requiresAuth: true }
    );
  }

  /**
   * Subscribe to government content notifications
   */
  async subscribeToNotifications(
    subjects?: string[],
    gradeLevels?: string[],
    contentTypes?: string[],
    sources?: string[]
  ): Promise<void> {
    const subscriptionData = {
      subjects,
      gradeLevels,
      contentTypes,
      sources,
    };

    await this.apiClient.post(
      '/government/notifications/subscribe',
      subscriptionData,
      { requiresAuth: true }
    );
  }

  /**
   * Unsubscribe from government content notifications
   */
  async unsubscribeFromNotifications(): Promise<void> {
    await this.apiClient.delete(
      '/government/notifications/subscribe',
      { requiresAuth: true }
    );
  }

  /**
   * Download government content for offline access
   */
  async downloadContentForOffline(contentId: string): Promise<Blob> {
    const blob = await this.apiClient.downloadFile(
      `/government/content/${contentId}/download`,
      { requiresAuth: true }
    );

    // Track download event
    await this.trackContentEvent(contentId, TrackingEventType.DOWNLOAD);

    return blob;
  }

  /**
   * Get offline government content status
   */
  async getOfflineContentStatus(): Promise<GovernmentContentSyncStatus> {
    const response = await this.apiClient.get<GovernmentContentSyncStatus>(
      '/government/content/offline/status',
      undefined,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Get list of offline available content
   */
  async getOfflineContent(): Promise<OfflineGovernmentContent[]> {
    const response = await this.apiClient.get<OfflineGovernmentContent[]>(
      '/government/content/offline',
      undefined,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Sync offline government content
   */
  async syncOfflineContent(
    contentIds?: string[]
  ): Promise<GovernmentContentSyncStatus> {
    const response = await this.apiClient.post<GovernmentContentSyncStatus>(
      '/government/content/offline/sync',
      { contentIds },
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Remove content from offline storage
   */
  async removeOfflineContent(contentIds: string[]): Promise<void> {
    await this.apiClient.delete(
      '/government/content/offline',
      {
        requiresAuth: true,
        data: { contentIds }
      }
    );
  }

  /**
   * Track content interaction event
   */
  async trackContentEvent(
    contentId: string,
    eventType: TrackingEventType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const trackingData = {
      contentId,
      eventType,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Fire and forget - don't wait for response
    this.apiClient.post(
      '/government/content/track',
      trackingData,
      { requiresAuth: true }
    ).catch(error => {
      console.warn('Failed to track content event:', error);
    });
  }

  /**
   * Track search event
   */
  private async trackSearchEvent(
    query: string,
    filters?: GovernmentContentFilters
  ): Promise<void> {
    const metadata = {
      query,
      filters: filters || {},
    };

    await this.trackContentEvent('', TrackingEventType.SEARCH, metadata);
  }

  /**
   * Get content tracking analytics (for institutional reporting)
   */
  async getContentAnalytics(
    contentId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const params = {
      contentId,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
    };

    const response = await this.apiClient.get(
      '/government/content/analytics',
      params,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Share government content
   */
  async shareContent(
    contentId: string,
    shareMethod: 'link' | 'email' | 'whatsapp' | 'copy',
    recipients?: string[]
  ): Promise<void> {
    const shareData = {
      contentId,
      shareMethod,
      recipients,
    };

    await this.apiClient.post(
      '/government/content/share',
      shareData,
      { requiresAuth: true }
    );

    // Track share event
    await this.trackContentEvent(contentId, TrackingEventType.SHARE, {
      shareMethod,
      recipientCount: recipients?.length || 0,
    });
  }

  /**
   * Bookmark government content
   */
  async bookmarkContent(contentId: string): Promise<void> {
    await this.apiClient.post(
      `/government/content/${contentId}/bookmark`,
      {},
      { requiresAuth: true }
    );

    // Track bookmark event
    await this.trackContentEvent(contentId, TrackingEventType.BOOKMARK);
  }

  /**
   * Remove bookmark from government content
   */
  async removeBookmark(contentId: string): Promise<void> {
    await this.apiClient.delete(
      `/government/content/${contentId}/bookmark`,
      { requiresAuth: true }
    );
  }

  /**
   * Get bookmarked government content
   */
  async getBookmarkedContent(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<GovernmentContent>> {
    const params = { page, limit };

    const response = await this.apiClient.getPaginated<GovernmentContent>(
      '/government/content/bookmarks',
      params,
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Get content recommendations based on user profile
   */
  async getRecommendedContent(limit: number = 10): Promise<GovernmentContent[]> {
    const response = await this.apiClient.get<GovernmentContent[]>(
      '/government/content/recommendations',
      { limit },
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Report content issue
   */
  async reportContentIssue(
    contentId: string,
    issueType: string,
    description: string
  ): Promise<void> {
    const reportData = {
      contentId,
      issueType,
      description,
    };

    await this.apiClient.post(
      '/government/content/report',
      reportData,
      { requiresAuth: true }
    );
  }
}

export const governmentService = new GovernmentService();