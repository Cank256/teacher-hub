import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ResourcesService } from '../resourcesService';
import type {
  Resource,
  ResourceFilters,
  CreateResourceRequest,
  UpdateResourceRequest,
  ResourceCategory,
  Subject,
  GradeLevel,
  YouTubeUploadResult,
  ResourceRating,
  ResourceStats,
  UploadProgress,
  PaginatedResponse,
} from '@/types/resources';

// Query Keys
export const resourcesKeys = {
  all: ['resources'] as const,
  lists: () => [...resourcesKeys.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...resourcesKeys.lists(), filters] as const,
  details: () => [...resourcesKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourcesKeys.details(), id] as const,
  search: (query: string, filters: ResourceFilters) => [...resourcesKeys.all, 'search', query, filters] as const,
  categories: () => [...resourcesKeys.all, 'categories'] as const,
  subjects: () => [...resourcesKeys.all, 'subjects'] as const,
  gradeLevels: () => [...resourcesKeys.all, 'gradeLevels'] as const,
  stats: () => [...resourcesKeys.all, 'stats'] as const,
  popular: (timeframe: string) => [...resourcesKeys.all, 'popular', timeframe] as const,
  recommended: () => [...resourcesKeys.all, 'recommended'] as const,
  userResources: (userId: string) => [...resourcesKeys.all, 'user', userId] as const,
  downloaded: () => [...resourcesKeys.all, 'downloaded'] as const,
  ratings: (resourceId: string) => [...resourcesKeys.all, 'ratings', resourceId] as const,
};

// Hooks for fetching resources
export const useResources = (filters: ResourceFilters = {}, page = 1, limit = 20) => {
  return useQuery({
    queryKey: resourcesKeys.list(filters),
    queryFn: () => ResourcesService.getResources(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInfiniteResources = (filters: ResourceFilters = {}, limit = 20) => {
  return useInfiniteQuery<PaginatedResponse<Resource>>({
    queryKey: resourcesKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => ResourcesService.getResources(filters, pageParam, limit),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasNext ? pagination.page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useResource = (id: string) => {
  return useQuery({
    queryKey: resourcesKeys.detail(id),
    queryFn: () => ResourcesService.getResource(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSearchResources = (
  query: string,
  filters: ResourceFilters = {},
  page = 1,
  limit = 20
) => {
  return useQuery({
    queryKey: resourcesKeys.search(query, filters),
    queryFn: () => ResourcesService.searchResources(query, filters, page, limit),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInfiniteSearchResources = (
  query: string,
  filters: ResourceFilters = {},
  limit = 20
) => {
  return useInfiniteQuery<PaginatedResponse<Resource>>({
    queryKey: resourcesKeys.search(query, filters),
    queryFn: ({ pageParam = 1 }) => ResourcesService.searchResources(query, filters, pageParam, limit),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasNext ? pagination.page + 1 : undefined;
    },
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};

// Hooks for resource metadata
export const useResourceCategories = () => {
  return useQuery({
    queryKey: resourcesKeys.categories(),
    queryFn: ResourcesService.getCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useSubjects = () => {
  return useQuery({
    queryKey: resourcesKeys.subjects(),
    queryFn: ResourcesService.getSubjects,
    staleTime: 30 * 60 * 1000,
  });
};

export const useGradeLevels = () => {
  return useQuery({
    queryKey: resourcesKeys.gradeLevels(),
    queryFn: ResourcesService.getGradeLevels,
    staleTime: 30 * 60 * 1000,
  });
};

// Hooks for resource statistics and recommendations
export const useResourceStats = () => {
  return useQuery({
    queryKey: resourcesKeys.stats(),
    queryFn: ResourcesService.getResourceStats,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const usePopularResources = (timeframe: 'day' | 'week' | 'month' | 'year' = 'week', limit = 10) => {
  return useQuery({
    queryKey: resourcesKeys.popular(timeframe),
    queryFn: () => ResourcesService.getPopularResources(timeframe, limit),
    staleTime: 10 * 60 * 1000,
  });
};

export const useRecommendedResources = (limit = 10) => {
  return useQuery({
    queryKey: resourcesKeys.recommended(),
    queryFn: () => ResourcesService.getRecommendedResources(limit),
    staleTime: 15 * 60 * 1000,
  });
};

// Hooks for user-specific resources
export const useUserResources = (userId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: resourcesKeys.userResources(userId),
    queryFn: () => ResourcesService.getUserResources(userId, page, limit),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDownloadedResources = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: resourcesKeys.downloaded(),
    queryFn: () => ResourcesService.getDownloadedResources(page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

// Hooks for resource ratings
export const useResourceRatings = (resourceId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: resourcesKeys.ratings(resourceId),
    queryFn: () => ResourcesService.getResourceRatings(resourceId, page, limit),
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation hooks
export const useUploadResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      request,
      onProgress,
    }: {
      request: CreateResourceRequest;
      onProgress?: (progress: UploadProgress) => void;
    }) => ResourcesService.uploadResource(request, onProgress),
    onSuccess: () => {
      // Invalidate and refetch resources lists
      queryClient.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.stats() });
    },
  });
};

export const useUploadYouTubeVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      metadata,
      onProgress,
    }: {
      file: File;
      metadata: {
        title: string;
        description: string;
        categoryId: string;
        tags: string[];
      };
      onProgress?: (progress: UploadProgress) => void;
    }) => ResourcesService.uploadYouTubeVideo(file, metadata, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.stats() });
    },
  });
};

export const useUpdateResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateResourceRequest }) =>
      ResourcesService.updateResource(id, updates),
    onSuccess: (updatedResource) => {
      // Update the specific resource in cache
      queryClient.setQueryData(resourcesKeys.detail(updatedResource.id), updatedResource);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ResourcesService.deleteResource(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: resourcesKeys.detail(deletedId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.stats() });
    },
  });
};

export const useDownloadResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      onProgress,
    }: {
      id: string;
      onProgress?: (progress: UploadProgress) => void;
    }) => ResourcesService.downloadResource(id, onProgress),
    onSuccess: (_, { id }) => {
      // Mark as downloaded and update cache
      ResourcesService.markAsDownloaded(id);
      queryClient.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.downloaded() });
    },
  });
};

export const useRateResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment?: string;
    }) => ResourcesService.rateResource(id, rating, comment),
    onSuccess: (_, { id }) => {
      // Invalidate resource details and ratings
      queryClient.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.ratings(id) });
      queryClient.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
};

export const useReportResource = () => {
  return useMutation({
    mutationFn: ({
      id,
      reason,
      description,
    }: {
      id: string;
      reason: string;
      description?: string;
    }) => ResourcesService.reportResource(id, reason, description),
  });
};

// Custom hook for file validation
export const useFileValidation = () => {
  return {
    validateFile: ResourcesService.validateFile,
  };
};