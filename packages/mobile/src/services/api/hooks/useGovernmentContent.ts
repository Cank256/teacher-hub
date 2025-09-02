/**
 * React Query hooks for Government Content
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { governmentService } from '../governmentService';
import {
  GovernmentContent,
  GovernmentContentFilters,
  GovernmentNotification,
  GovernmentContentSyncStatus,
  OfflineGovernmentContent,
  TrackingEventType,
} from '../../../types';

// Query Keys
export const GOVERNMENT_QUERY_KEYS = {
  all: ['government'] as const,
  content: () => [...GOVERNMENT_QUERY_KEYS.all, 'content'] as const,
  contentList: (filters?: GovernmentContentFilters) => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'list', filters] as const,
  contentDetail: (id: string) => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'detail', id] as const,
  contentSearch: (query: string, filters?: GovernmentContentFilters) => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'search', query, filters] as const,
  contentPrioritized: (subjects?: string[], gradeLevels?: string[]) => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'prioritized', subjects, gradeLevels] as const,
  contentRecommended: () => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'recommended'] as const,
  contentBookmarks: () => 
    [...GOVERNMENT_QUERY_KEYS.content(), 'bookmarks'] as const,
  notifications: () => [...GOVERNMENT_QUERY_KEYS.all, 'notifications'] as const,
  notificationsList: (unreadOnly?: boolean) => 
    [...GOVERNMENT_QUERY_KEYS.notifications(), 'list', unreadOnly] as const,
  offline: () => [...GOVERNMENT_QUERY_KEYS.all, 'offline'] as const,
  offlineStatus: () => [...GOVERNMENT_QUERY_KEYS.offline(), 'status'] as const,
  offlineContent: () => [...GOVERNMENT_QUERY_KEYS.offline(), 'content'] as const,
  analytics: (contentId?: string, dateFrom?: Date, dateTo?: Date) => 
    [...GOVERNMENT_QUERY_KEYS.all, 'analytics', contentId, dateFrom, dateTo] as const,
};

/**
 * Hook to get government content with pagination
 */
export const useGovernmentContent = (
  filters?: GovernmentContentFilters,
  page: number = 1,
  limit: number = 20,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentList(filters),
    queryFn: () => governmentService.getGovernmentContent(filters, page, limit),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get government content with infinite scroll
 */
export const useInfiniteGovernmentContent = (
  filters?: GovernmentContentFilters,
  limit: number = 20,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentList(filters),
    queryFn: ({ pageParam = 1 }) => 
      governmentService.getGovernmentContent(filters, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to get specific government content by ID
 */
export const useGovernmentContentDetail = (
  id: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentDetail(id),
    queryFn: () => governmentService.getGovernmentContentById(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to search government content
 */
export const useGovernmentContentSearch = (
  query: string,
  filters?: GovernmentContentFilters,
  page: number = 1,
  limit: number = 20,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentSearch(query, filters),
    queryFn: () => governmentService.searchGovernmentContent(query, filters, page, limit),
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get prioritized government content
 */
export const usePrioritizedGovernmentContent = (
  subjects?: string[],
  gradeLevels?: string[],
  limit: number = 10,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentPrioritized(subjects, gradeLevels),
    queryFn: () => governmentService.getPrioritizedContent(subjects, gradeLevels, limit),
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to get recommended government content
 */
export const useRecommendedGovernmentContent = (
  limit: number = 10,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentRecommended(),
    queryFn: () => governmentService.getRecommendedContent(limit),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Hook to get government notifications
 */
export const useGovernmentNotifications = (
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.notificationsList(unreadOnly),
    queryFn: () => governmentService.getGovernmentNotifications(page, limit, unreadOnly),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get infinite government notifications
 */
export const useInfiniteGovernmentNotifications = (
  limit: number = 20,
  unreadOnly: boolean = false,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.notificationsList(unreadOnly),
    queryFn: ({ pageParam = 1 }) => 
      governmentService.getGovernmentNotifications(pageParam, limit, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to get bookmarked government content
 */
export const useBookmarkedGovernmentContent = (
  page: number = 1,
  limit: number = 20,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.contentBookmarks(),
    queryFn: () => governmentService.getBookmarkedContent(page, limit),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to get offline content status
 */
export const useOfflineContentStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.offlineStatus(),
    queryFn: () => governmentService.getOfflineContentStatus(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get offline content list
 */
export const useOfflineGovernmentContent = (enabled: boolean = true) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.offlineContent(),
    queryFn: () => governmentService.getOfflineContent(),
    enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to get content analytics
 */
export const useContentAnalytics = (
  contentId?: string,
  dateFrom?: Date,
  dateTo?: Date,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: GOVERNMENT_QUERY_KEYS.analytics(contentId, dateFrom, dateTo),
    queryFn: () => governmentService.getContentAnalytics(contentId, dateFrom, dateTo),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// Mutations

/**
 * Mutation to mark notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      governmentService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.notifications()
      });
    },
  });
};

/**
 * Mutation to mark multiple notifications as read
 */
export const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) => 
      governmentService.markNotificationsAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.notifications()
      });
    },
  });
};

/**
 * Mutation to subscribe to notifications
 */
export const useSubscribeToNotifications = () => {
  return useMutation({
    mutationFn: (params: {
      subjects?: string[];
      gradeLevels?: string[];
      contentTypes?: string[];
      sources?: string[];
    }) => governmentService.subscribeToNotifications(
      params.subjects,
      params.gradeLevels,
      params.contentTypes,
      params.sources
    ),
  });
};

/**
 * Mutation to unsubscribe from notifications
 */
export const useUnsubscribeFromNotifications = () => {
  return useMutation({
    mutationFn: () => governmentService.unsubscribeFromNotifications(),
  });
};

/**
 * Mutation to download content for offline
 */
export const useDownloadContentForOffline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) => 
      governmentService.downloadContentForOffline(contentId),
    onSuccess: () => {
      // Invalidate offline content queries
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.offline()
      });
    },
  });
};

/**
 * Mutation to sync offline content
 */
export const useSyncOfflineContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentIds?: string[]) => 
      governmentService.syncOfflineContent(contentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.offline()
      });
    },
  });
};

/**
 * Mutation to remove offline content
 */
export const useRemoveOfflineContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentIds: string[]) => 
      governmentService.removeOfflineContent(contentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.offline()
      });
    },
  });
};

/**
 * Mutation to bookmark content
 */
export const useBookmarkContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) => 
      governmentService.bookmarkContent(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.contentBookmarks()
      });
    },
  });
};

/**
 * Mutation to remove bookmark
 */
export const useRemoveBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) => 
      governmentService.removeBookmark(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GOVERNMENT_QUERY_KEYS.contentBookmarks()
      });
    },
  });
};

/**
 * Mutation to share content
 */
export const useShareContent = () => {
  return useMutation({
    mutationFn: (params: {
      contentId: string;
      shareMethod: 'link' | 'email' | 'whatsapp' | 'copy';
      recipients?: string[];
    }) => governmentService.shareContent(
      params.contentId,
      params.shareMethod,
      params.recipients
    ),
  });
};

/**
 * Mutation to track content event
 */
export const useTrackContentEvent = () => {
  return useMutation({
    mutationFn: (params: {
      contentId: string;
      eventType: TrackingEventType;
      metadata?: Record<string, any>;
    }) => governmentService.trackContentEvent(
      params.contentId,
      params.eventType,
      params.metadata
    ),
  });
};

/**
 * Mutation to report content issue
 */
export const useReportContentIssue = () => {
  return useMutation({
    mutationFn: (params: {
      contentId: string;
      issueType: string;
      description: string;
    }) => governmentService.reportContentIssue(
      params.contentId,
      params.issueType,
      params.description
    ),
  });
};