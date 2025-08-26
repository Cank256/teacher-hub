/**
 * API Client Integration Tests
 */

import { ApiClient } from '../apiClient'
import { NetworkMonitor } from '../networkMonitor'
import { ApiErrorHandler } from '../errorHandler'
import { ErrorType } from '../types'

// Mock dependencies
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

jest.mock('../../auth/authService', () => ({
  AuthService: {
    getStoredToken: jest.fn(() => Promise.resolve('test-token')),
    refreshToken: jest.fn(() => Promise.resolve('new-token')),
    logout: jest.fn()
  }
}))

// Mock axios
const mockAxios = {
  create: jest.fn(() => mockAxiosInstance),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}

const mockAxiosInstance = {
  request: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}

jest.mock('axios', () => mockAxios)

describe('ApiClient', () => {
  let apiClient: ApiClient
  let networkMonitor: NetworkMonitor

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset singleton instances
    ;(ApiClient as any).instance = undefined
    ;(NetworkMonitor as any).instance = undefined
    
    // Mock network as online
    networkMonitor = NetworkMonitor.getInstance()
    jest.spyOn(networkMonitor, 'isOnline').mockReturnValue(true)
    jest.spyOn(networkMonitor, 'isOffline').mockReturnValue(false)
    
    apiClient = ApiClient.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiClient.getInstance()
      const instance2 = ApiClient.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('Network Connectivity', () => {
    it('should throw error when offline', async () => {
      jest.spyOn(networkMonitor, 'isOnline').mockReturnValue(false)
      jest.spyOn(networkMonitor, 'isOffline').mockReturnValue(true)
      
      await expect(apiClient.get('/test')).rejects.toThrow('No internet connection')
    })

    it('should proceed when online', async () => {
      const mockResponse = { data: { success: true, data: 'test' } }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)
      
      const result = await apiClient.get('/test')
      
      expect(result).toEqual(mockResponse.data)
      expect(mockAxiosInstance.request).toHaveBeenCalled()
    })
  })

  describe('HTTP Methods', () => {
    beforeEach(() => {
      const mockResponse = { data: { success: true, data: 'test' } }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)
    })

    it('should make GET request', async () => {
      await apiClient.get('/test', { param: 'value' })
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test',
          method: 'GET',
          params: { param: 'value' }
        })
      )
    })

    it('should make POST request', async () => {
      const data = { name: 'test' }
      await apiClient.post('/test', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test',
          method: 'POST',
          data
        })
      )
    })

    it('should make PUT request', async () => {
      const data = { id: 1, name: 'updated' }
      await apiClient.put('/test/1', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test/1',
          method: 'PUT',
          data
        })
      )
    })

    it('should make PATCH request', async () => {
      const data = { name: 'patched' }
      await apiClient.patch('/test/1', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test/1',
          method: 'PATCH',
          data
        })
      )
    })

    it('should make DELETE request', async () => {
      await apiClient.delete('/test/1')
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test/1',
          method: 'DELETE'
        })
      )
    })
  })

  describe('Paginated Requests', () => {
    it('should handle paginated response', async () => {
      const mockPaginatedResponse = {
        data: {
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
      }
      
      mockAxiosInstance.request.mockResolvedValue(mockPaginatedResponse)
      
      const result = await apiClient.getPaginated('/posts')
      
      expect(result).toEqual(mockPaginatedResponse.data)
      expect(result.pagination.hasNext).toBe(true)
    })
  })

  describe('File Upload', () => {
    it('should upload file with correct headers', async () => {
      const mockFormData = new FormData()
      mockFormData.append('file', 'test-file')
      
      const mockResponse = { data: { success: true, data: { fileId: '123' } } }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)
      
      await apiClient.uploadFile('/upload', mockFormData)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/upload',
          method: 'POST',
          data: mockFormData,
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          }),
          timeout: 60000
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error')
      networkError.isAxiosError = true
      networkError.response = undefined
      
      mockAxiosInstance.request.mockRejectedValue(networkError)
      
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        message: expect.stringContaining('Network connection failed')
      })
    })

    it('should handle 401 authentication errors', async () => {
      const authError = new Error('Unauthorized')
      authError.isAxiosError = true
      authError.response = {
        status: 401,
        data: { code: 'UNAUTHORIZED', message: 'Invalid token' }
      }
      
      mockAxiosInstance.request.mockRejectedValue(authError)
      
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION_ERROR,
        code: 'UNAUTHORIZED'
      })
    })

    it('should handle 400 validation errors', async () => {
      const validationError = new Error('Bad Request')
      validationError.isAxiosError = true
      validationError.response = {
        status: 400,
        data: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
      }
      
      mockAxiosInstance.request.mockRejectedValue(validationError)
      
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: ErrorType.VALIDATION_ERROR,
        code: 'VALIDATION_ERROR'
      })
    })

    it('should handle 500 server errors', async () => {
      const serverError = new Error('Internal Server Error')
      serverError.isAxiosError = true
      serverError.response = {
        status: 500,
        data: { code: 'SERVER_ERROR', message: 'Internal error' }
      }
      
      mockAxiosInstance.request.mockRejectedValue(serverError)
      
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: ErrorType.SERVER_ERROR,
        isRetryable: true
      })
    })
  })

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const serverError = new Error('Server Error')
      serverError.isAxiosError = true
      serverError.response = { status: 500 }
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({ data: { success: true, data: 'success' } })
      
      const result = await apiClient.get('/test')
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
      expect(result.data).toBe('success')
    })

    it('should not retry on non-retryable errors', async () => {
      const validationError = new Error('Bad Request')
      validationError.isAxiosError = true
      validationError.response = { status: 400 }
      
      mockAxiosInstance.request.mockRejectedValue(validationError)
      
      await expect(apiClient.get('/test')).rejects.toThrow()
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1)
    })

    it('should respect custom retry count', async () => {
      const serverError = new Error('Server Error')
      serverError.isAxiosError = true
      serverError.response = { status: 500 }
      
      mockAxiosInstance.request.mockRejectedValue(serverError)
      
      await expect(apiClient.get('/test', undefined, { retries: 1 })).rejects.toThrow()
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2) // 1 initial + 1 retry
    })
  })

  describe('Health Check', () => {
    it('should return true for successful health check', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { status: 'ok' } })
      
      const isHealthy = await apiClient.healthCheck()
      
      expect(isHealthy).toBe(true)
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/health',
          requiresAuth: false,
          timeout: 5000
        })
      )
    })

    it('should return false for failed health check', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('Health check failed'))
      
      const isHealthy = await apiClient.healthCheck()
      
      expect(isHealthy).toBe(false)
    })
  })

  describe('Network Status Integration', () => {
    it('should return current network status', () => {
      const mockStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      }
      
      jest.spyOn(networkMonitor, 'getCurrentStatus').mockReturnValue(mockStatus)
      
      const status = apiClient.getNetworkStatus()
      
      expect(status).toEqual(mockStatus)
    })

    it('should check online status', () => {
      jest.spyOn(networkMonitor, 'isOnline').mockReturnValue(true)
      
      const isOnline = apiClient.isOnline()
      
      expect(isOnline).toBe(true)
    })

    it('should add network listener', () => {
      const mockListener = jest.fn()
      const mockUnsubscribe = jest.fn()
      
      jest.spyOn(networkMonitor, 'addListener').mockReturnValue(mockUnsubscribe)
      
      const unsubscribe = apiClient.addNetworkListener(mockListener)
      
      expect(networkMonitor.addListener).toHaveBeenCalledWith(mockListener)
      expect(unsubscribe).toBe(mockUnsubscribe)
    })
  })
})