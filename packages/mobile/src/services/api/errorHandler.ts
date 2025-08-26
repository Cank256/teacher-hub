/**
 * API Error Handler
 */

import { AxiosError } from 'axios'
import { AppError, ErrorType, ApiError } from './types'

export class ApiErrorHandler {
  static createAppError(error: any): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error.isAxiosError) {
      return this.handleAxiosError(error as AxiosError)
    }

    return this.createGenericError(error)
  }

  private static handleAxiosError(error: AxiosError): AppError {
    const appError = new Error() as AppError
    appError.timestamp = new Date()

    // Network error (no response)
    if (!error.response) {
      appError.type = ErrorType.NETWORK_ERROR
      appError.code = 'NETWORK_ERROR'
      appError.message = 'Network connection failed. Please check your internet connection.'
      appError.isRetryable = true
      return appError
    }

    const { status, data } = error.response
    const apiError = data as ApiError

    // Set error type based on status code
    if (status >= 500) {
      appError.type = ErrorType.SERVER_ERROR
      appError.code = apiError?.code || 'SERVER_ERROR'
      appError.message = 'Server error occurred. Please try again later.'
      appError.isRetryable = true
    } else if (status === 401) {
      appError.type = ErrorType.AUTHENTICATION_ERROR
      appError.code = 'UNAUTHORIZED'
      appError.message = 'Authentication failed. Please log in again.'
      appError.isRetryable = false
    } else if (status === 403) {
      appError.type = ErrorType.AUTHENTICATION_ERROR
      appError.code = 'FORBIDDEN'
      appError.message = 'Access denied. You do not have permission to perform this action.'
      appError.isRetryable = false
    } else if (status >= 400 && status < 500) {
      appError.type = ErrorType.VALIDATION_ERROR
      appError.code = apiError?.code || 'VALIDATION_ERROR'
      appError.message = apiError?.message || 'Invalid request. Please check your input.'
      appError.isRetryable = false
    } else {
      appError.type = ErrorType.UNKNOWN_ERROR
      appError.code = 'UNKNOWN_ERROR'
      appError.message = 'An unexpected error occurred.'
      appError.isRetryable = false
    }

    appError.details = {
      status,
      url: error.config?.url,
      method: error.config?.method,
      data: apiError
    }

    return appError
  }

  private static createGenericError(error: any): AppError {
    const appError = new Error() as AppError
    appError.type = ErrorType.UNKNOWN_ERROR
    appError.code = 'UNKNOWN_ERROR'
    appError.message = error.message || 'An unexpected error occurred.'
    appError.timestamp = new Date()
    appError.isRetryable = false
    appError.details = error

    return appError
  }

  static getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return 'Please check your internet connection and try again.'
      case ErrorType.AUTHENTICATION_ERROR:
        return error.code === 'UNAUTHORIZED' 
          ? 'Please log in to continue.'
          : 'You do not have permission to perform this action.'
      case ErrorType.VALIDATION_ERROR:
        return error.message || 'Please check your input and try again.'
      case ErrorType.SERVER_ERROR:
        return 'Server is temporarily unavailable. Please try again later.'
      case ErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  static shouldRetry(error: AppError): boolean {
    return error.isRetryable
  }
}