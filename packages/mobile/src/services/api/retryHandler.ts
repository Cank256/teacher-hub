/**
 * Request Retry Handler
 */

import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { RetryConfig, AppError } from './types'
import { ApiErrorHandler } from './errorHandler'

export class RetryHandler {
  private retryConfig: RetryConfig

  constructor(retryConfig: RetryConfig) {
    this.retryConfig = retryConfig
  }

  async executeWithRetry<T>(
    axiosInstance: AxiosInstance,
    config: AxiosRequestConfig
  ): Promise<T> {
    let lastError: AppError
    const maxAttempts = this.retryConfig.maxRetries + 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axiosInstance.request(config)
        return response.data
      } catch (error) {
        lastError = ApiErrorHandler.createAppError(error)

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break
        }

        // Check if error should be retried
        if (!this.shouldRetry(lastError, attempt)) {
          break
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt)
        
        if (__DEV__) {
          console.log(`🔄 Retrying request (attempt ${attempt}/${maxAttempts}) after ${delay}ms:`, {
            url: config.url,
            method: config.method,
            error: lastError.message
          })
        }

        await this.delay(delay)
      }
    }

    throw lastError!
  }

  private shouldRetry(error: AppError, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.retryConfig.maxRetries) {
      return false
    }

    // Use custom retry condition if provided
    if (this.retryConfig.retryCondition) {
      return this.retryConfig.retryCondition(error)
    }

    // Default retry logic
    return ApiErrorHandler.shouldRetry(error)
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelay * 
      Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
    
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}