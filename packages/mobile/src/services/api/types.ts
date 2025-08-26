/**
 * API Client Types and Interfaces
 */

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
  path?: string
}

export interface RequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  requiresAuth?: boolean
}

export interface RetryConfig {
  maxRetries: number
  backoffMultiplier: number
  initialDelay: number
  maxDelay: number
  retryCondition?: (error: any) => boolean
}

export interface NetworkStatus {
  isConnected: boolean
  type: string
  isInternetReachable: boolean | null
}

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'auth_error',
  VALIDATION_ERROR = 'validation_error',
  SERVER_ERROR = 'server_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface AppError extends Error {
  type: ErrorType
  code: string
  details?: any
  timestamp: Date
  isRetryable: boolean
}