/**
 * Simple API Tests - Basic functionality without React Native dependencies
 */

import { ApiErrorHandler } from '../errorHandler'
import { ErrorType } from '../types'
import { RETRY_CONFIG, API_CONFIG } from '../config'

describe('API Configuration', () => {
  it('should have correct default configuration', () => {
    expect(API_CONFIG.TIMEOUT).toBe(30000)
    expect(API_CONFIG.MAX_RETRIES).toBe(3)
    expect(API_CONFIG.RETRY_DELAY).toBe(1000)
  })

  it('should have correct retry configuration', () => {
    expect(RETRY_CONFIG.maxRetries).toBe(3)
    expect(RETRY_CONFIG.backoffMultiplier).toBe(2)
    expect(RETRY_CONFIG.initialDelay).toBe(1000)
    expect(RETRY_CONFIG.maxDelay).toBe(10000)
  })
})

describe('Error Handler', () => {
  describe('createAppError', () => {
    it('should handle network errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: undefined,
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.isRetryable).toBe(true)
    })

    it('should handle 401 errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { code: 'UNAUTHORIZED', message: 'Invalid token' }
        },
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR)
      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle 500 errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { code: 'SERVER_ERROR', message: 'Internal error' }
        },
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.SERVER_ERROR)
      expect(result.isRetryable).toBe(true)
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate messages for different error types', () => {
      const networkError = { type: ErrorType.NETWORK_ERROR } as any
      expect(ApiErrorHandler.getUserFriendlyMessage(networkError))
        .toBe('Please check your internet connection and try again.')

      const authError = { type: ErrorType.AUTHENTICATION_ERROR, code: 'UNAUTHORIZED' } as any
      expect(ApiErrorHandler.getUserFriendlyMessage(authError))
        .toBe('Please log in to continue.')

      const serverError = { type: ErrorType.SERVER_ERROR } as any
      expect(ApiErrorHandler.getUserFriendlyMessage(serverError))
        .toBe('Server is temporarily unavailable. Please try again later.')
    })
  })
})

describe('Error Types', () => {
  it('should have all required error types', () => {
    expect(ErrorType.NETWORK_ERROR).toBe('network_error')
    expect(ErrorType.AUTHENTICATION_ERROR).toBe('auth_error')
    expect(ErrorType.VALIDATION_ERROR).toBe('validation_error')
    expect(ErrorType.SERVER_ERROR).toBe('server_error')
    expect(ErrorType.TIMEOUT_ERROR).toBe('timeout_error')
    expect(ErrorType.UNKNOWN_ERROR).toBe('unknown_error')
  })
})