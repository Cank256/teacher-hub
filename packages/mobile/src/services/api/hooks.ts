/**
 * Custom React Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { ApiClient } from './apiClient'
import { queryKeys, cacheUtils } from './queryClient'
import { ApiResponse, PaginatedResponse, AppError } from './types'
import { ApiErrorHandler } from './errorHandler'

const apiClient = ApiClient.getInstance()

// Generic hook for API queries
export function useApiQuery<T = any>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<ApiResponse<T>, AppError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<T>, AppError>({
    queryKey,
    queryFn: () => apiClient.get<T>(url, params),
    ...options,
  })
}

// Generic hook for paginated queries
export function usePaginatedQuery<T = any>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<T>, AppError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<T>, AppError>({
    queryKey,
    queryFn: () => apiClient.getPaginated<T>(url, params),
    ...options,
  })
}

// Generic hook for API mutations
export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: UseMutationOptions<ApiResponse<TData>, AppError, TVariables>
) {
  return useMutation<ApiResponse<TData>, AppError, TVariables>({
    mutationFn,
    ...options,
  })
}

// Network status hook
export function useNetworkStatus() {
  const networkStatus = apiClient.getNetworkStatus()
  
  return {
    isOnline: apiClient.isOnline(),
    isOffline: !apiClient.isOnline(),
    connectionType: networkStatus.type,
    isWifi: networkStatus.type === 'wifi',
    isCellular: networkStatus.type === 'cellular',
    isInternetReachable: networkStatus.isInternetReachable,
  }
}

// Hook for optimistic updates
export function useOptimisticMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: {
    queryKey: readonly unknown[]
    updateFn: (oldData: any, variables: TVariables) => any
    onSuccess?: (data: ApiResponse<TData>, variables: TVariables) => void
    onError?: (error: AppError, variables: TVariables, context: any) => void
  }
) {
  const queryClient = useQueryClient()
  
  return useMutation<ApiResponse<TData>, AppError, TVariables>({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey })
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.queryKey)
      
      // Optimistically update
      queryClient.setQueryData(options.queryKey, (oldData: any) => 
        options.updateFn(oldData, variables)
      )
      
      return { previousData }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData)
      }
      
      options.onError?.(error, variables, context)
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: options.queryKey })
    },
  })
}

// Hook for infinite queries (pagination)
export function useInfiniteApiQuery<T = any>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, any>,
  options?: any
) {
  return useQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getPaginated<T>(url, { ...params, page: pageParam }),
    getNextPageParam: (lastPage: PaginatedResponse<T>) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam: (firstPage: PaginatedResponse<T>) => 
      firstPage.pagination.hasPrev ? firstPage.pagination.page - 1 : undefined,
    ...options,
  })
}

// Hook for background sync
export function useBackgroundSync() {
  const queryClient = useQueryClient()
  
  const syncAll = async () => {
    try {
      // Refetch all active queries
      await queryClient.refetchQueries({ type: 'active' })
      return true
    } catch (error) {
      console.error('Background sync failed:', error)
      return false
    }
  }
  
  const syncFeature = async (feature: keyof typeof queryKeys) => {
    try {
      await queryClient.refetchQueries({ queryKey: queryKeys[feature].all() })
      return true
    } catch (error) {
      console.error(`Background sync failed for ${feature}:`, error)
      return false
    }
  }
  
  return {
    syncAll,
    syncFeature,
    invalidateAll: () => queryClient.invalidateQueries(),
    clearCache: cacheUtils.clearAll,
  }
}

// Hook for retry failed queries
export function useRetryFailedQueries() {
  const queryClient = useQueryClient()
  
  const retryFailed = async () => {
    const queries = queryClient.getQueryCache().getAll()
    const failedQueries = queries.filter(query => query.state.status === 'error')
    
    const retryPromises = failedQueries.map(query => 
      queryClient.refetchQueries({ queryKey: query.queryKey })
    )
    
    try {
      await Promise.allSettled(retryPromises)
      return true
    } catch (error) {
      console.error('Failed to retry queries:', error)
      return false
    }
  }
  
  return {
    retryFailed,
    getFailedQueriesCount: () => {
      const queries = queryClient.getQueryCache().getAll()
      return queries.filter(query => query.state.status === 'error').length
    }
  }
}