/**
 * React Query Hooks Tests
 */

import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactNode } from 'react'
import {
  useApiQuery,
  usePaginatedQuery,
  useApiMutation,
  useNetworkStatus,
  useOptimisticMutation,
  useBackgroundSync,
  useRetryFailedQueries
} from '../hooks'
import { ApiClient } from '../apiClient'
import { queryClient } from '../queryClient'

// Mock React Native modules
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true
  }))
}))

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1')
}))

// Mock ApiClient
jest.mock('../apiClient')
const mockApiClient = ApiClient.getInstance as jest.MockedFunction<typeof ApiClient.getInstance>

// Mock network monitor
const mockNetworkMonitor = {
  getCurrentStatus: jest.fn(),
  isOnline: jest.fn(),
  isOffline: jest.fn()
}

const mockApiClientInstance = {
  get: jest.fn(),
  post: jest.fn(),
  getPaginated: jest.fn(),
  getNetworkStatus: jest.fn(),
  isOnline: jest.fn()
}

mockApiClient.mockReturnValue(mockApiClientInstance as any)

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client= { queryClient } >
    { children }
    </QueryClientProvider>
  )
}

describe('API Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useApiQuery', () => {
    it('should fetch data successfully', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' }, success: true }
      mockApiClientInstance.get.mockResolvedValue(mockResponse)

      const { result } = renderHook(
        () => useApiQuery(['test'], '/test'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(mockApiClientInstance.get).toHaveBeenCalledWith('/test', undefined)
    })

    it('should handle query errors', async () => {
      const mockError = new Error('API Error')
      mockApiClientInstance.get.mockRejectedValue(mockError)

      const { result } = renderHook(
        () => useApiQuery(['test'], '/test'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })

    it('should pass query parameters', async () => {
      const mockResponse = { data: [], success: true }
      mockApiClientInstance.get.mockResolvedValue(mockResponse)

      const params = { page: 1, limit: 10 }

      renderHook(
        () => useApiQuery(['test'], '/test', params),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(mockApiClientInstance.get).toHaveBeenCalledWith('/test', params)
      })
    })
  })

  describe('usePaginatedQuery', () => {
    it('should fetch paginated data', async () => {
      const mockResponse = {
        data: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        }
      }
      mockApiClientInstance.getPaginated.mockResolvedValue(mockResponse)

      const { result } = renderHook(
        () => usePaginatedQuery(['posts'], '/posts'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(mockApiClientInstance.getPaginated).toHaveBeenCalledWith('/posts', undefined)
    })
  })

  describe('useApiMutation', () => {
    it('should execute mutation successfully', async () => {
      const mockResponse = { data: { id: 1, name: 'Created' }, success: true }
      const mutationFn = jest.fn().mockResolvedValue(mockResponse)

      const { result } = renderHook(
        () => useApiMutation(mutationFn),
        { wrapper: createWrapper() }
      )

      const variables = { name: 'Test' }
      result.current.mutate(variables)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(mutationFn).toHaveBeenCalledWith(variables)
    })

    it('should handle mutation errors', async () => {
      const mockError = new Error('Mutation Error')
      const mutationFn = jest.fn().mockRejectedValue(mockError)

      const { result } = renderHook(
        () => useApiMutation(mutationFn),
        { wrapper: createWrapper() }
      )

      result.current.mutate({ name: 'Test' })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useNetworkStatus', () => {
    it('should return network status', () => {
      const mockStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      }

      mockApiClientInstance.getNetworkStatus.mockReturnValue(mockStatus)
      mockApiClientInstance.isOnline.mockReturnValue(true)

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current).toEqual({
        isOnline: true,
        isOffline: false,
        connectionType: 'wifi',
        isWifi: true,
        isCellular: false,
        isInternetReachable: true
      })
    })

    it('should detect cellular connection', () => {
      const mockStatus = {
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true
      }

      mockApiClientInstance.getNetworkStatus.mockReturnValue(mockStatus)
      mockApiClientInstance.isOnline.mockReturnValue(true)

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isWifi).toBe(false)
      expect(result.current.isCellular).toBe(true)
    })

    it('should detect offline status', () => {
      const mockStatus = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }

      mockApiClientInstance.getNetworkStatus.mockReturnValue(mockStatus)
      mockApiClientInstance.isOnline.mockReturnValue(false)

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(false)
      expect(result.current.isOffline).toBe(true)
    })
  })

  describe('useOptimisticMutation', () => {
    it('should perform optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client= { queryClient } >
        { children }
        </QueryClientProvider>
      )

    // Set initial data
    const queryKey = ['posts']
    const initialData = [{ id: 1, title: 'Post 1' }]
    queryClient.setQueryData(queryKey, initialData)

    const mockResponse = { data: { id: 2, title: 'New Post' }, success: true }
    const mutationFn = jest.fn().mockResolvedValue(mockResponse)

    const updateFn = (oldData: any[], variables: any) => [
      ...oldData,
      { id: 'temp', title: variables.title }
    ]

    const { result } = renderHook(
      () => useOptimisticMutation(mutationFn, {
        queryKey,
        updateFn
      }),
      { wrapper }
    )

    // Execute mutation
    result.current.mutate({ title: 'New Post' })

    // Check optimistic update
    const optimisticData = queryClient.getQueryData(queryKey)
    expect(optimisticData).toEqual([
      { id: 1, title: 'Post 1' },
      { id: 'temp', title: 'New Post' }
    ])

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should rollback on error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client= { queryClient } >
      { children }
      </QueryClientProvider>
    )

  const queryKey = ['posts']
  const initialData = [{ id: 1, title: 'Post 1' }]
  queryClient.setQueryData(queryKey, initialData)

  const mockError = new Error('Mutation failed')
  const mutationFn = jest.fn().mockRejectedValue(mockError)

  const updateFn = (oldData: any[], variables: any) => [
    ...oldData,
    { id: 'temp', title: variables.title }
  ]

  const { result } = renderHook(
    () => useOptimisticMutation(mutationFn, {
      queryKey,
      updateFn
    }),
    { wrapper }
  )

  result.current.mutate({ title: 'New Post' })

  await waitFor(() => {
    expect(result.current.isError).toBe(true)
  })

  // Check rollback
  const rolledBackData = queryClient.getQueryData(queryKey)
  expect(rolledBackData).toEqual(initialData)
})
  })

describe('useBackgroundSync', () => {
  it('should provide sync functions', () => {
    const { result } = renderHook(() => useBackgroundSync(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.syncAll).toBe('function')
    expect(typeof result.current.syncFeature).toBe('function')
    expect(typeof result.current.invalidateAll).toBe('function')
    expect(typeof result.current.clearCache).toBe('function')
  })
})

describe('useRetryFailedQueries', () => {
  it('should provide retry functions', () => {
    const { result } = renderHook(() => useRetryFailedQueries(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.retryFailed).toBe('function')
    expect(typeof result.current.getFailedQueriesCount).toBe('function')
  })

  it('should count failed queries', () => {
    const { result } = renderHook(() => useRetryFailedQueries(), {
      wrapper: createWrapper()
    })

    const count = result.current.getFailedQueriesCount()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
})