/**
 * Axios Request and Response Interceptors
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import DeviceInfo from 'react-native-device-info'
import { REQUEST_HEADERS } from './config'
import { ApiErrorHandler } from './errorHandler'
import { AuthService } from '../auth'

export class ApiInterceptors {
  static setupRequestInterceptors(axiosInstance: AxiosInstance): void {
    axiosInstance.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        // Add default headers
        config.headers = {
          ...REQUEST_HEADERS,
          ...config.headers
        }

        // Add device information
        try {
          const deviceId = await DeviceInfo.getUniqueId()
          const appVersion = DeviceInfo.getVersion()
          const buildNumber = DeviceInfo.getBuildNumber()
          
          config.headers['X-Device-ID'] = deviceId
          config.headers['X-App-Version'] = appVersion
          config.headers['X-Build-Number'] = buildNumber
        } catch (error) {
          console.warn('Failed to get device info:', error)
        }

        // Add authentication token if required
        if (config.requiresAuth !== false) {
          try {
            const token = await AuthService.getStoredToken()
            if (token) {
              config.headers['Authorization'] = `Bearer ${token}`
            }
          } catch (error) {
            console.warn('Failed to get auth token:', error)
          }
        }

        // Log request in development
        if (__DEV__) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
            params: config.params
          })
        }

        return config
      },
      (error) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(ApiErrorHandler.createAppError(error))
      }
    )
  }

  static setupResponseInterceptors(axiosInstance: AxiosInstance): void {
    axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (__DEV__) {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data
          })
        }

        return response
      },
      async (error) => {
        const appError = ApiErrorHandler.createAppError(error)

        // Log error in development
        if (__DEV__) {
          console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            message: appError.message,
            details: appError.details
          })
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && error.config?.requiresAuth !== false) {
          try {
            const newToken = await AuthService.refreshToken()
            if (newToken && error.config) {
              // Retry the original request with new token
              error.config.headers['Authorization'] = `Bearer ${newToken}`
              return axiosInstance.request(error.config)
            }
          } catch (refreshError) {
            // Token refresh failed, redirect to login
            AuthService.logout()
          }
        }

        return Promise.reject(appError)
      }
    )
  }
}