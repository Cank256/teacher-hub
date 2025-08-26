/**
 * Error Handler Tests
 */

import { ApiErrorHandler } from '../errorHandler'
import { ErrorType } from '../types'

describe('ApiErrorHandler', () => {
  describe('createAppError', () => {
    it('should return existing AppError unchanged', () => {
      const existingError = new Error('Test error') as any
      existingError.type = ErrorType.NETWORK_ERROR
      existingError.code = 'TEST_ERROR'
      existingError.timestamp = new Date()
      existingError.isRetryable = true

      const result = ApiErrorHandler.createAppError(existingError)

      expect(result).toBe(existingError)
    })

    it('should handle network errors (no response)', () => {
      const axiosError = {
        isAxiosError: true,
        response: undefined,
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.message).toContain('Network connection failed')
      expect(result.isRetryable).toBe(true)
    })

    it('should handle 401 unauthorized errors', () => {
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
      expect(result.message).toContain('Authentication failed')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle 403 forbidden errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { code: 'FORBIDDEN', message: 'Access denied' }
        },
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR)
      expect(result.code).toBe('FORBIDDEN')
      expect(result.message).toContain('Access denied')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle 400 validation errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
        },
        config: { url: '/test', method: 'POST' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.VALIDATION_ERROR)
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.message).toBe('Invalid input')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle 500 server errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { code: 'SERVER_ERROR', message: 'Internal server error' }
        },
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.SERVER_ERROR)
      expect(result.code).toBe('SERVER_ERROR')
      expect(result.message).toContain('Server error occurred')
      expect(result.isRetryable).toBe(true)
    })

    it('should handle unknown status codes', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 418, // I'm a teapot
          data: { code: 'TEAPOT', message: "I'm a teapot" }
        },
        config: { url: '/test', method: 'GET' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR)
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong')

      const result = ApiErrorHandler.createAppError(genericError)

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR)
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Something went wrong')
      expect(result.isRetryable).toBe(false)
    })

    it('should include error details', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'email' } }
        },
        config: { url: '/users', method: 'POST' }
      }

      const result = ApiErrorHandler.createAppError(axiosError)

      expect(result.details).toEqual({
        status: 400,
        url: '/users',
        method: 'POST',
        data: axiosError.response.data
      })
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('should return network error message', () => {
      const error = new Error() as any
      error.type = ErrorType.NETWORK_ERROR

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Please check your internet connection and try again.')
    })

    it('should return unauthorized message', () => {
      const error = new Error() as any
      error.type = ErrorType.AUTHENTICATION_ERROR
      error.code = 'UNAUTHORIZED'

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Please log in to continue.')
    })

    it('should return forbidden message', () => {
      const error = new Error() as any
      error.type = ErrorType.AUTHENTICATION_ERROR
      error.code = 'FORBIDDEN'

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('You do not have permission to perform this action.')
    })

    it('should return validation error message', () => {
      const error = new Error() as any
      error.type = ErrorType.VALIDATION_ERROR
      error.message = 'Email is required'

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Email is required')
    })

    it('should return server error message', () => {
      const error = new Error() as any
      error.type = ErrorType.SERVER_ERROR

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Server is temporarily unavailable. Please try again later.')
    })

    it('should return timeout error message', () => {
      const error = new Error() as any
      error.type = ErrorType.TIMEOUT_ERROR

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Request timed out. Please try again.')
    })

    it('should return generic error message', () => {
      const error = new Error() as any
      error.type = ErrorType.UNKNOWN_ERROR

      const message = ApiErrorHandler.getUserFriendlyMessage(error)

      expect(message).toBe('Something went wrong. Please try again.')
    })
  })

  describe('shouldRetry', () => {
    it('should return true for retryable errors', () => {
      const error = new Error() as any
      error.isRetryable = true

      const shouldRetry = ApiErrorHandler.shouldRetry(error)

      expect(shouldRetry).toBe(true)
    })

    it('should return false for non-retryable errors', () => {
      const error = new Error() as any
      error.isRetryable = false

      const shouldRetry = ApiErrorHandler.shouldRetry(error)

      expect(shouldRetry).toBe(false)
    })
  })
})