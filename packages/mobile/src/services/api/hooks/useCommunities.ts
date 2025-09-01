// React Query hooks for communities

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { CommunitiesService } from '../communitiesService';
import type {
  Community,
  CommunityFilters,
  CommunityPostFilters,
  JoinCommunityRequest,
  CreateCommunityPostRequest,
} from '@/types';

// Query Keys
export const communityKeys = {
  all: ['communities'] as const,
  lists: () => [...communityKeys.all, 'list'] as const,
  list: (filters: CommunityFilters) => [...communityKeys.lists(), filters] as const,
  details: () => [...communityKeys.all, 'detail'] as const,
  detail: (id: string) => [...communityKeys.details(), id] as const,
  members: (id: string) => [...communityKeys.detail(id), 'members'] as const,
  posts: (id: string) => [...communityKeys.detail(id), 'posts'] as const,
  postsList: (filters: CommunityPostFilters) => [...communityKeys.posts(filters.communityId), filters] as const,
  activities: (id: string) => [...communityKeys.detail(id), 'activities'] as const,
  notifications: () => [...communityKeys.all, 'notifications'] as const,
  categories: () => [...communityKeys.all, 'categories'] as const,
  my: () => [...communityKeys.all, 'my'] as const,
};

/**
 * Hook to get communities with filtering and pagination
 */
export function useCommunities(filters: CommunityFilters = {}) {
  return useQuery({
    queryKey: communityKeys.list(filters),
    queryFn: () => CommunitiesService.getCommunities(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get communities with infinite scrolling
 */
export function useInfiniteCommunities(filters: Omit<CommunityFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: communityKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      CommunitiesService.getCommunities({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get a specific community
 */
export function useCommunity(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => CommunitiesService.getCommunity(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get community members
 */
export function useCommunityMembers(communityId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...communityKeys.members(communityId), page, limit],
    queryFn: () => CommunitiesService.getCommunityMembers(communityId, page, limit),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get community posts with infinite scrolling
 */
export function useInfiniteCommunityPosts(filters: Omit<CommunityPostFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: communityKeys.postsList(filters),
    queryFn: ({ pageParam = 1 }) =>
      CommunitiesService.getCommunityPosts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!filters.communityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get community activities
 */
export function useCommunityActivities(communityId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...communityKeys.activities(communityId), page, limit],
    queryFn: () => CommunitiesService.getCommunityActivities(communityId, page, limit),
    enabled: !!communityId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get community notifications
 */
export function useCommunityNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...communityKeys.notifications(), page, limit],
    queryFn: () => CommunitiesService.getCommunityNotifications(page, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get user's joined communities
 */
export function useMyCommunities(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...communityKeys.my(), page, limit],
    queryFn: () => CommunitiesService.getMyCommunitites(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get community categories
 */
export function useCommunityCategories() {
  return useQuery({
    queryKey: communityKeys.categories(),
    queryFn: () => CommunitiesService.getCommunityCategories(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Mutation hook to join a community
 */
export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: JoinCommunityRequest) => CommunitiesService.joinCommunity(request),
    onSuccess: (_, variables) => {
      // Invalidate and refetch community data
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(variables.communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.my() });
    },
  });
}

/**
 * Mutation hook to leave a community
 */
export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => CommunitiesService.leaveCommunity(communityId),
    onSuccess: (_, communityId) => {
      // Invalidate and refetch community data
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.my() });
    },
  });
}

/**
 * Mutation hook to create a community post
 */
export function useCreateCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCommunityPostRequest) => CommunitiesService.createCommunityPost(request),
    onSuccess: (_, variables) => {
      // Invalidate community posts
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(variables.communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.activities(variables.communityId) });
    },
  });
}

/**
 * Mutation hook to like a community post
 */
export function useLikeCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ communityId, postId }: { communityId: string; postId: string }) =>
      CommunitiesService.likeCommunityPost(communityId, postId),
    onSuccess: (_, variables) => {
      // Invalidate community posts to refresh like counts
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(variables.communityId) });
    },
  });
}

/**
 * Mutation hook to unlike a community post
 */
export function useUnlikeCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ communityId, postId }: { communityId: string; postId: string }) =>
      CommunitiesService.unlikeCommunityPost(communityId, postId),
    onSuccess: (_, variables) => {
      // Invalidate community posts to refresh like counts
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(variables.communityId) });
    },
  });
}

/**
 * Mutation hook to mark notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => CommunitiesService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications
      queryClient.invalidateQueries({ queryKey: communityKeys.notifications() });
    },
  });
}