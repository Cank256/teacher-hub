/**
 * Storage Services Index
 * Main entry point for all storage-related services
 */

// Core services
export { MMKVService, defaultStorage, cacheStorage, userStorage } from './mmkvService'
export { ExpoSecureStorageService, secureStorage } from './secureStorageService'
export { SQLiteDatabaseService, database } from './databaseService'
export { DatabaseMigrationService, migrationService } from './migrationService'

// Repositories
export { BaseRepository } from './repositories/baseRepository'
export { UserRepository, userRepository } from './repositories/userRepository'
export { PostRepository, postRepository } from './repositories/postRepository'

// Types and models
export * from './types'
export * from './models'

// Storage initialization and management
import { database } from './databaseService'
import { migrationService } from './migrationService'
import { secureStorage } from './secureStorageService'
import { defaultStorage } from './mmkvService'
import { StorageError, StorageErrorCode } from './types'

/**
 * Storage Manager
 * Centralized management of all storage services
 */
export class StorageManager {
  private static instance: StorageManager
  private initialized = false

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  /**
   * Initialize all storage services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      console.log('Initializing storage services...')

      // Initialize database
      await database.initialize()
      console.log('Database initialized')

      // Run migrations
      await migrationService.runMigrations()
      console.log('Database migrations completed')

      // Check secure storage availability
      const isSecureStorageAvailable = await secureStorage.isAvailable()
      if (!isSecureStorageAvailable) {
        console.warn('Secure storage is not available on this device')
      } else {
        console.log('Secure storage is available')
      }

      // Test MMKV storage
      await defaultStorage.setItem('storage_test', { initialized: true, timestamp: Date.now() })
      const testResult = await defaultStorage.getItem('storage_test')
      if (!testResult) {
        throw new Error('MMKV storage test failed')
      }
      console.log('MMKV storage initialized and tested')

      this.initialized = true
      console.log('All storage services initialized successfully')
    } catch (error) {
      throw new StorageError(
        'Failed to initialize storage services',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get storage health status
   */
  async getHealthStatus(): Promise<{
    database: boolean
    mmkv: boolean
    secureStorage: boolean
    totalSize: number
    errors: string[]
  }> {
    const errors: string[] = []
    let databaseHealthy = false
    let mmkvHealthy = false
    let secureStorageHealthy = false
    let totalSize = 0

    try {
      // Test database
      await database.query('SELECT 1')
      databaseHealthy = true
      totalSize += await database.getDatabaseSize()
    } catch (error) {
      errors.push(`Database error: ${(error as Error).message}`)
    }

    try {
      // Test MMKV
      await defaultStorage.setItem('health_check', Date.now())
      await defaultStorage.getItem('health_check')
      mmkvHealthy = true
      totalSize += defaultStorage.getSize()
    } catch (error) {
      errors.push(`MMKV error: ${(error as Error).message}`)
    }

    try {
      // Test secure storage
      secureStorageHealthy = await secureStorage.isAvailable()
      if (!secureStorageHealthy) {
        errors.push('Secure storage is not available')
      }
    } catch (error) {
      errors.push(`Secure storage error: ${(error as Error).message}`)
    }

    return {
      database: databaseHealthy,
      mmkv: mmkvHealthy,
      secureStorage: secureStorageHealthy,
      totalSize,
      errors
    }
  }

  /**
   * Clear all storage (for logout/reset)
   */
  async clearAllStorage(): Promise<void> {
    try {
      console.log('Clearing all storage...')

      // Clear MMKV storage
      await defaultStorage.clear()
      await (await import('./mmkvService')).cacheStorage.clear()
      await (await import('./mmkvService')).userStorage.clear()

      // Clear secure storage
      await secureStorage.clearSecureStorage()

      // Note: We don't clear the database as it contains offline data
      // that might be needed after re-authentication
      
      console.log('All storage cleared successfully')
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Clear only user-specific data (for logout)
   */
  async clearUserData(): Promise<void> {
    try {
      console.log('Clearing user-specific data...')

      // Clear user storage
      await (await import('./mmkvService')).userStorage.clear()

      // Clear authentication tokens
      await secureStorage.clearAuthTokens()

      // Clear user preferences from default storage
      const userKeys = ['user_preferences', 'biometric_enabled', 'remember_me']
      for (const key of userKeys) {
        await defaultStorage.removeItem(key)
      }

      console.log('User data cleared successfully')
    } catch (error) {
      throw new StorageError(
        'Failed to clear user data',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Optimize storage (vacuum database, clear old cache)
   */
  async optimizeStorage(): Promise<void> {
    try {
      console.log('Optimizing storage...')

      // Vacuum database
      await database.vacuum()

      // Clear old cache entries (older than 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      // This would be implemented based on cache metadata
      // For now, just log the optimization
      console.log('Storage optimization completed')
    } catch (error) {
      throw new StorageError(
        'Failed to optimize storage',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Close all storage connections
   */
  async close(): Promise<void> {
    try {
      await database.close()
      this.initialized = false
      console.log('Storage services closed')
    } catch (error) {
      throw new StorageError(
        'Failed to close storage services',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }
}

// Create singleton instance
export const storageManager = StorageManager.getInstance()

// Convenience function to initialize storage
export const initializeStorage = async (): Promise<void> => {
  await storageManager.initialize()
}

// Export default storage manager
export default storageManager