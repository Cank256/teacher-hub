/**
 * API Services Export
 */

// Core API client
export { ApiClient } from './apiClient'
export { queryClient, queryKeys, cacheUtils } from './queryClient'

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RequestConfig,
  RetryConfig,
  NetworkStatus,
  AppError
} from './types'
export { ErrorType } from './types'

// Error handling
export { ApiErrorHandler } from './errorHandler'

// Network monitoring
export { NetworkMonitor } from './networkMonitor'

// React Query hooks
export {
  useApiQuery,
  usePaginatedQuery,
  useApiMutation,
  useNetworkStatus,
  useOptimisticMutation,
  useInfiniteApiQuery,
  useBackgroundSync,
  useRetryFailedQueries
} from './hooks'

// Configuration
export { API_CONFIG, RETRY_CONFIG, SSL_PINNING_CONFIG } from './config'

// Posts service
export { postsService } from './postsService'
export * from './hooks/usePosts'

// Communities service
export { CommunitiesService } from './communitiesService'
export * from './hooks/useCommunities'

// Messaging service
export { MessagingService } from './messagingService'
export * from './hooks/useMessaging'

// Government service
export { governmentService } from './governmentService'
export * from './hooks/useGovernmentContent'