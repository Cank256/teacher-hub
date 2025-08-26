/**
 * Main API Client
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { API_CONFIG, RETRY_CONFIG } from './config'
import { ApiInterceptors } from './interceptors'
import { RetryHandler } from './retryHandler'
import { NetworkMonitor } from './networkMonitor'
import { RequestConfig, ApiResponse, PaginatedResponse, AppError } from './types'
import { ApiErrorHandler } from './errorHandler'

export class ApiClient {
  private static instance: ApiClient
  private axiosInstance: AxiosInstance
  private retryHandler: RetryHandler
  private networkMonitor: NetworkMonitor

  private constructor() {
    this.axiosInstance = this.createAxiosInstance()
    this.retryHandler = new RetryHandler(RETRY_CONFIG)
    this.networkMonitor = NetworkMonitor.getInstance()
    this.setupInterceptors()
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors
    })
  }

  private setupInterceptors(): void {
    ApiInterceptors.setupRequestInterceptors(this.axiosInstance)
    ApiInterceptors.setupResponseInterceptors(this.axiosInstance)
  }

  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Check network connectivity
    if (this.networkMonitor.isOffline()) {
      throw ApiErrorHandler.createAppError({
        message: 'No internet connection',
        isAxiosError: false
      })
    }

    const axiosConfig: AxiosRequestConfig = {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
      headers: config.headers,
      timeout: config.timeout || API_CONFIG.TIMEOUT,
      requiresAuth: config.requiresAuth
    }

    try {
      // Use retry handler if retries are specified
      if (config.retries && config.retries > 0) {
        const customRetryConfig = {
          ...RETRY_CONFIG,
          maxRetries: config.retries
        }
        const customRetryHandler = new RetryHandler(customRetryConfig)
        return await customRetryHandler.executeWithRetry<ApiResponse<T>>(
          this.axiosInstance,
          axiosConfig
        )
      }

      // Execute request with default retry logic
      return await this.retryHandler.executeWithRetry<ApiResponse<T>>(
        this.axiosInstance,
        axiosConfig
      )
    } catch (error) {
      throw ApiErrorHandler.createAppError(error)
    }
  }

  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      params,
      ...config
    })
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      ...config
    })
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      data,
      ...config
    })
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PATCH',
      data,
      ...config
    })
  }

  async delete<T = any>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      ...config
    })
  }

  // Paginated requests helper
  async getPaginated<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: Partial<RequestConfig>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.get<PaginatedResponse<T>>(url, params, config)
    return response.data
  }

  // Upload file helper
  async uploadFile<T = any>(
    url: string,
    file: FormData,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data: file,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000, // 60 seconds for file uploads
      ...config
    })
  }

  // Download file helper
  async downloadFile(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<Blob> {
    const response = await this.request<Blob>({
      url,
      method: 'GET',
      headers: {
        'Accept': '*/*'
      },
      ...config
    })
    return response.data
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', undefined, { 
        requiresAuth: false,
        timeout: 5000 
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Get network status
  getNetworkStatus() {
    return this.networkMonitor.getCurrentStatus()
  }

  // Check if online
  isOnline(): boolean {
    return this.networkMonitor.isOnline()
  }

  // Add network status listener
  addNetworkListener(listener: (status: any) => void): () => void {
    return this.networkMonitor.addListener(listener)
  }
}