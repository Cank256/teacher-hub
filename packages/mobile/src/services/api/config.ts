/**
 * API Configuration
 */

import { RetryConfig } from './types'

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.teacherhub.ug',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const

export const RETRY_CONFIG: RetryConfig = {
  maxRetries: API_CONFIG.MAX_RETRIES,
  backoffMultiplier: 2,
  initialDelay: API_CONFIG.RETRY_DELAY,
  maxDelay: 10000, // 10 seconds
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (!error.response) return true // Network error
    const status = error.response?.status
    return status >= 500 || status === 408 || status === 429
  }
}

export const SSL_PINNING_CONFIG = {
  'api.teacherhub.ug': {
    certificateFilename: 'teacherhub-cert.cer',
    includeSubdomains: true
  }
}

export const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-API-Version': '1.0',
  'X-Client-Type': 'mobile',
  'X-Platform': 'react-native'
} as const