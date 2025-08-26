/**
 * Storage Types Tests
 * Basic tests for storage types and enums
 */

import { 
  StorageKeys, 
  SecureStorageKeys, 
  TableNames, 
  StorageError, 
  StorageErrorCode 
} from '../types'

describe('Storage Types', () => {
  describe('StorageKeys', () => {
    it('should have all required storage keys', () => {
      expect(StorageKeys.USER_PREFERENCES).toBe('user_preferences')
      expect(StorageKeys.THEME_MODE).toBe('theme_mode')
      expect(StorageKeys.LANGUAGE).toBe('language')
      expect(StorageKeys.ONBOARDING_COMPLETED).toBe('onboarding_completed')
      expect(StorageKeys.LAST_SYNC_TIME).toBe('last_sync_time')
      expect(StorageKeys.OFFLINE_MODE).toBe('offline_mode')
      expect(StorageKeys.POSTS_CACHE).toBe('posts_cache')
      expect(StorageKeys.COMMUNITIES_CACHE).toBe('communities_cache')
      expect(StorageKeys.RESOURCES_CACHE).toBe('resources_cache')
      expect(StorageKeys.PENDING_OPERATIONS).toBe('pending_operations')
      expect(StorageKeys.FAILED_OPERATIONS).toBe('failed_operations')
    })
  })

  describe('SecureStorageKeys', () => {
    it('should have all required secure storage keys', () => {
      expect(SecureStorageKeys.ACCESS_TOKEN).toBe('access_token')
      expect(SecureStorageKeys.REFRESH_TOKEN).toBe('refresh_token')
      expect(SecureStorageKeys.BIOMETRIC_KEY).toBe('biometric_key')
      expect(SecureStorageKeys.ENCRYPTION_KEY).toBe('encryption_key')
      expect(SecureStorageKeys.USER_CREDENTIALS).toBe('user_credentials')
    })
  })

  describe('TableNames', () => {
    it('should have all required table names', () => {
      expect(TableNames.USERS).toBe('users')
      expect(TableNames.POSTS).toBe('posts')
      expect(TableNames.COMMUNITIES).toBe('communities')
      expect(TableNames.MESSAGES).toBe('messages')
      expect(TableNames.RESOURCES).toBe('resources')
      expect(TableNames.OFFLINE_OPERATIONS).toBe('offline_operations')
      expect(TableNames.SYNC_STATUS).toBe('sync_status')
    })
  })

  describe('StorageError', () => {
    it('should create storage error with message and code', () => {
      const error = new StorageError(
        'Test error message',
        StorageErrorCode.DATABASE_ERROR
      )

      expect(error.message).toBe('Test error message')
      expect(error.code).toBe(StorageErrorCode.DATABASE_ERROR)
      expect(error.name).toBe('StorageError')
      expect(error.originalError).toBeUndefined()
    })

    it('should create storage error with original error', () => {
      const originalError = new Error('Original error')
      const error = new StorageError(
        'Test error message',
        StorageErrorCode.DATABASE_ERROR,
        originalError
      )

      expect(error.message).toBe('Test error message')
      expect(error.code).toBe(StorageErrorCode.DATABASE_ERROR)
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('StorageErrorCode', () => {
    it('should have all required error codes', () => {
      expect(StorageErrorCode.ITEM_NOT_FOUND).toBe('ITEM_NOT_FOUND')
      expect(StorageErrorCode.STORAGE_FULL).toBe('STORAGE_FULL')
      expect(StorageErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
      expect(StorageErrorCode.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED')
      expect(StorageErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR')
      expect(StorageErrorCode.MIGRATION_FAILED).toBe('MIGRATION_FAILED')
    })
  })
})