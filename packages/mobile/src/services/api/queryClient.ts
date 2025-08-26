/**
 * React Query Configuration
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { ApiErrorHandler } from './errorHandler'
import { AppError, ErrorType } from './types'

// Global error handler for queries
const handleQueryError = (error: unknown) => {
  const appError = ApiErrorHandler.createAppError(error)
  
  if (__DEV__) {
    console.error('Query error:', appError)
  }

  // Handle authentication errors globally
  if (appError.type === ErrorType.AUTHENTICATION_ERROR) {
    // This will be handled by the auth service
    console.log('Authentication error in query, will be handled by auth service')
  }
}

// Global error handler for mutations
const handleMutationError = (error: unknown) => {
  const appError = ApiErrorHandler.createAppError(error)
  
  if (__DEV__) {
    console.error('Mutation error:', appError)
  }

  // Show user-friendly error message for mutations
  // This would typically integrate with a toast/notification system
  console.log('Mutation error:', ApiErrorHandler.getUserFriendlyMessage(appError))
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time: how long data stays in cache after becoming unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: (failureCount, error) => {
        const appError = ApiErrorHandler.createAppError(error)
        
        // Don't retry authentication or validation errors
        if (
          appError.type === ErrorType.AUTHENTICATION_ERROR ||
          appError.type === ErrorType.VALIDATION_ERROR
        ) {
          return false
        }
        
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus (when app comes to foreground)
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Background refetch interval
      refetchInterval: false, // Disabled by default, can be enabled per query
      
      // Network mode
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      // Retry configuration for mutations
      retry: (failureCount, error) => {
        const appError = ApiErrorHandler.createAppError(error)
        
        // Only retry network errors and server errors
        if (
          appError.type === ErrorType.NETWORK_ERROR ||
          appError.type === ErrorType.SERVER_ERROR
        ) {
          return failureCount < 2 // Retry up to 2 times
        }
        
        return false
      },
      
      // Retry delay for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
})

// Query key factory for consistent key generation
export const queryKeys = {
  // Auth
  auth: {
    user: () => ['auth', 'user'] as const,
    profile: () => ['auth', 'profile'] as const,
  },
  
  // Posts
  posts: {
    all: () => ['posts'] as const,
    lists: () => [...queryKeys.posts.all(), 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
  
  // Communities
  communities: {
    all: () => ['communities'] as const,
    lists: () => [...queryKeys.communities.all(), 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.communities.lists(), filters] as const,
    details: () => [...queryKeys.communities.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.communities.details(), id] as const,
    members: (id: string) => [...queryKeys.communities.detail(id), 'members'] as const,
    posts: (id: string) => [...queryKeys.communities.detail(id), 'posts'] as const,
  },
  
  // Messages
  messages: {
    all: () => ['messages'] as const,
    conversations: () => [...queryKeys.messages.all(), 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.messages.conversations(), id] as const,
    messages: (conversationId: string) => [...queryKeys.messages.conversation(conversationId), 'messages'] as const,
  },
  
  // Resources
  resources: {
    all: () => ['resources'] as const,
    lists: () => [...queryKeys.resources.all(), 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.resources.lists(), filters] as const,
    details: () => [...queryKeys.resources.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.resources.details(), id] as const,
  },
  
  // Government content
  government: {
    all: () => ['government'] as const,
    content: (type: string) => [...queryKeys.government.all(), type] as const,
    updates: () => [...queryKeys.government.all(), 'updates'] as const,
  },
} as const

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all queries for a specific feature
  invalidateFeature: (feature: keyof typeof queryKeys) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys[feature].all() })
  },
  
  // Clear all cache
  clearAll: () => {
    return queryClient.clear()
  },
  
  // Remove specific query from cache
  removeQuery: (queryKey: readonly unknown[]) => {
    return queryClient.removeQueries({ queryKey })
  },
  
  // Prefetch query
  prefetch: <T>(queryKey: readonly unknown[], queryFn: () => Promise<T>) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
    })
  },
  
  // Set query data manually
  setQueryData: <T>(queryKey: readonly unknown[], data: T) => {
    return queryClient.setQueryData(queryKey, data)
  },
  
  // Get query data
  getQueryData: <T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey)
  },
}