/**
 * Retry Handler Tests
 */

import { RetryHandler } from '../retryHandler'
import { RETRY_CONFIG } from '../config'
import { ErrorType } from '../types'

// Mock axios instance
const mockAxiosInstance = {
  request: jest.fn()
}

describe('RetryHandler', () => {
  let retryHandler: RetryHandler

  beforeEach(() => {
    jest.clearAllMocks()
    retryHandler = new RetryHandler(RETRY_CONFIG)
  })

  describe('Successful Requests', () => {
    it('should return response on first attempt', async () => {
      const mockResponse = { data: { success: true, data: 'test' } }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const config = { url: '/test', method: 'GET' }
      const result = await retryHandler.executeWithRetry(mockAxiosInstance as any, config)

      expect(result).toEqual(mockResponse.data)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1)
    })
  })

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const networkError = new Error('Network Error') as any
      networkError.type = ErrorType.NETWORK_ERROR
      networkError.isRetryable = true

      const mockResponse = { data: { success: true, data: 'success' } }

      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue(mockResponse)

      const config = { url: '/test', method: 'GET' }
      const result = await retryHandler.executeWithRetry(mockAxiosInstance as any, config)

      expect(result).toEqual(mockResponse.data)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const validationError = new Error('Validation Error') as any
      validationError.type = ErrorType.VALIDATION_ERROR
      validationError.isRetryable = false

      mockAxiosInstance.request.mockRejectedValue(validationError)

      const config = { url: '/test', method: 'POST' }

      await expect(
        retryHandler.executeWithRetry(mockAxiosInstance as any, config)
      ).rejects.toThrow('Validation Error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1)
    })

    it('should respect max retry limit', async () => {
      const serverError = new Error('Server Error') as any
      serverError.type = ErrorType.SERVER_ERROR
      serverError.isRetryable = true

      mockAxiosInstance.request.mockRejectedValue(serverError)

      const config = { url: '/test', method: 'GET' }

      await expect(
        retryHandler.executeWithRetry(mockAxiosInstance as any, config)
      ).rejects.toThrow('Server Error')

      // Should try initial + 3 retries = 4 total attempts
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4)
    })

    it('should use custom retry condition', async () => {
      const customRetryConfig = {
        ...RETRY_CONFIG,
        retryCondition: (error: any) => error.message.includes('Custom')
      }

      const customRetryHandler = new RetryHandler(customRetryConfig)

      const customError = new Error('Custom Error') as any
      customError.isRetryable = false // This would normally not retry

      const nonCustomError = new Error('Regular Error') as any
      nonCustomError.isRetryable = true // This would normally retry

      // Test custom error (should retry due to custom condition)
      mockAxiosInstance.request.mockRejectedValue(customError)

      const config1 = { url: '/test1', method: 'GET' }

      await expect(
        customRetryHandler.executeWithRetry(mockAxiosInstance as any, config1)
      ).rejects.toThrow('Custom Error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4) // 1 + 3 retries

      // Reset mock
      mockAxiosInstance.request.mockClear()

      // Test non-custom error (should not retry due to custom condition)
      mockAxiosInstance.request.mockRejectedValue(nonCustomError)

      const config2 = { url: '/test2', method: 'GET' }

      await expect(
        customRetryHandler.executeWithRetry(mockAxiosInstance as any, config2)
      ).rejects.toThrow('Regular Error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1) // No retries
    })
  })

  describe('Delay Calculation', () => {
    it('should calculate exponential backoff delay', () => {
      const retryHandler = new RetryHandler({
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 10000
      })

      // Access private method for testing
      const calculateDelay = (retryHandler as any).calculateDelay.bind(retryHandler)

      expect(calculateDelay(1)).toBe(1000) // 1000 * 2^0
      expect(calculateDelay(2)).toBe(2000) // 1000 * 2^1
      expect(calculateDelay(3)).toBe(4000) // 1000 * 2^2
    })

    it('should respect max delay limit', () => {
      const retryHandler = new RetryHandler({
        maxRetries: 10,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 5000
      })

      const calculateDelay = (retryHandler as any).calculateDelay.bind(retryHandler)

      expect(calculateDelay(5)).toBe(5000) // Should be capped at maxDelay
      expect(calculateDelay(10)).toBe(5000) // Should be capped at maxDelay
    })
  })

  describe('Delay Function', () => {
    it('should delay for specified time', async () => {
      const startTime = Date.now()
      const delayTime = 100

      const delay = (retryHandler as any).delay.bind(retryHandler)
      await delay(delayTime)

      const endTime = Date.now()
      const actualDelay = endTime - startTime

      // Allow some tolerance for timing
      expect(actualDelay).toBeGreaterThanOrEqual(delayTime - 10)
      expect(actualDelay).toBeLessThan(delayTime + 50)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle errors thrown during retry attempts', async () => {
      const error1 = new Error('First error') as any
      error1.isRetryable = true

      const error2 = new Error('Second error') as any
      error2.isRetryable = true

      const finalError = new Error('Final error') as any
      finalError.isRetryable = true

      mockAxiosInstance.request
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(finalError)
        .mockRejectedValue(finalError)

      const config = { url: '/test', method: 'GET' }

      await expect(
        retryHandler.executeWithRetry(mockAxiosInstance as any, config)
      ).rejects.toThrow('Final error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4)
    })

    it('should handle mixed retryable and non-retryable errors', async () => {
      const retryableError = new Error('Retryable error') as any
      retryableError.isRetryable = true

      const nonRetryableError = new Error('Non-retryable error') as any
      nonRetryableError.isRetryable = false

      mockAxiosInstance.request
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValue(nonRetryableError)

      const config = { url: '/test', method: 'GET' }

      await expect(
        retryHandler.executeWithRetry(mockAxiosInstance as any, config)
      ).rejects.toThrow('Non-retryable error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2)
    })
  })
})