/**
 * Storage Manager Tests
 */

import { StorageManager } from '../index'
import { StorageError } from '../types'

// Mock all storage services
jest.mock('../databaseService', () => ({
  database: {
    initialize: jest.fn(),
    query: jest.fn(),
    getDatabaseSize: jest.fn(),
    vacuum: jest.fn(),
    close: jest.fn()
  }
}))

jest.mock('../migrationService', () => ({
  migrationService: {
    runMigrations: jest.fn()
  }
}))

jest.mock('../secureStorageService', () => ({
  secureStorage: {
    isAvailable: jest.fn(),
    clearSecureStorage: jest.fn(),
    clearAuthTokens: jest.fn()
  }
}))

jest.mock('../mmkvService', () => ({
  defaultStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    getSize: jest.fn()
  },
  cacheStorage: {
    clear: jest.fn()
  },
  userStorage: {
    clear: jest.fn()
  }
}))

import { database } from '../databaseService'
import { migrationService } from '../migrationService'
import { secureStorage } from '../secureStorageService'
import { defaultStorage, cacheStorage, userStorage } from '../mmkvService'

describe('StorageManager', () => {
  let storageManager: StorageManager

  beforeEach(() => {
    jest.clearAllMocks()
    storageManager = StorageManager.getInstance()
    // Reset initialization state
    ;(storageManager as any).initialized = false
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = StorageManager.getInstance()
      const instance2 = StorageManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('initialize', () => {
    it('should initialize all storage services successfully', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockMigrationService = migrationService as jest.Mocked<typeof migrationService>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.initialize.mockResolvedValue(undefined)
      mockMigrationService.runMigrations.mockResolvedValue(undefined)
      mockSecureStorage.isAvailable.mockResolvedValue(true)
      mockDefaultStorage.setItem.mockResolvedValue(undefined)
      mockDefaultStorage.getItem.mockResolvedValue({ initialized: true, timestamp: Date.now() })

      await storageManager.initialize()

      expect(mockDatabase.initialize).toHaveBeenCalled()
      expect(mockMigrationService.runMigrations).toHaveBeenCalled()
      expect(mockSecureStorage.isAvailable).toHaveBeenCalled()
      expect(mockDefaultStorage.setItem).toHaveBeenCalledWith(
        'storage_test',
        expect.objectContaining({ initialized: true })
      )
      expect(storageManager.isInitialized()).toBe(true)
    })

    it('should not reinitialize if already initialized', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      
      // Set as initialized
      ;(storageManager as any).initialized = true

      await storageManager.initialize()

      expect(mockDatabase.initialize).not.toHaveBeenCalled()
    })

    it('should handle secure storage unavailability gracefully', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockMigrationService = migrationService as jest.Mocked<typeof migrationService>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.initialize.mockResolvedValue(undefined)
      mockMigrationService.runMigrations.mockResolvedValue(undefined)
      mockSecureStorage.isAvailable.mockResolvedValue(false)
      mockDefaultStorage.setItem.mockResolvedValue(undefined)
      mockDefaultStorage.getItem.mockResolvedValue({ initialized: true, timestamp: Date.now() })

      await storageManager.initialize()

      expect(storageManager.isInitialized()).toBe(true)
    })

    it('should throw StorageError on initialization failure', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      mockDatabase.initialize.mockRejectedValue(new Error('Database initialization failed'))

      await expect(storageManager.initialize())
        .rejects.toThrow(StorageError)
    })

    it('should throw error if MMKV test fails', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockMigrationService = migrationService as jest.Mocked<typeof migrationService>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.initialize.mockResolvedValue(undefined)
      mockMigrationService.runMigrations.mockResolvedValue(undefined)
      mockSecureStorage.isAvailable.mockResolvedValue(true)
      mockDefaultStorage.setItem.mockResolvedValue(undefined)
      mockDefaultStorage.getItem.mockResolvedValue(null) // Test fails

      await expect(storageManager.initialize())
        .rejects.toThrow(StorageError)
    })
  })

  describe('getHealthStatus', () => {
    it('should return healthy status for all services', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.query.mockResolvedValue([])
      mockDatabase.getDatabaseSize.mockResolvedValue(1024)
      mockSecureStorage.isAvailable.mockResolvedValue(true)
      mockDefaultStorage.setItem.mockResolvedValue(undefined)
      mockDefaultStorage.getItem.mockResolvedValue(Date.now())
      mockDefaultStorage.getSize.mockReturnValue(512)

      const status = await storageManager.getHealthStatus()

      expect(status).toEqual({
        database: true,
        mmkv: true,
        secureStorage: true,
        totalSize: 1536, // 1024 + 512
        errors: []
      })
    })

    it('should return errors for failed services', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'))
      mockSecureStorage.isAvailable.mockResolvedValue(false)
      mockDefaultStorage.setItem.mockRejectedValue(new Error('MMKV write failed'))

      const status = await storageManager.getHealthStatus()

      expect(status.database).toBe(false)
      expect(status.mmkv).toBe(false)
      expect(status.secureStorage).toBe(false)
      expect(status.errors).toHaveLength(3)
      expect(status.errors[0]).toContain('Database error')
      expect(status.errors[1]).toContain('MMKV error')
      expect(status.errors[2]).toContain('Secure storage is not available')
    })
  })

  describe('clearAllStorage', () => {
    it('should clear all storage services', async () => {
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>
      const mockCacheStorage = cacheStorage as jest.Mocked<typeof cacheStorage>
      const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>

      mockDefaultStorage.clear.mockResolvedValue(undefined)
      mockCacheStorage.clear.mockResolvedValue(undefined)
      mockUserStorage.clear.mockResolvedValue(undefined)
      mockSecureStorage.clearSecureStorage.mockResolvedValue(undefined)

      await expect(storageManager.clearAllStorage()).resolves.not.toThrow()

      expect(mockDefaultStorage.clear).toHaveBeenCalled()
      expect(mockCacheStorage.clear).toHaveBeenCalled()
      expect(mockUserStorage.clear).toHaveBeenCalled()
      expect(mockSecureStorage.clearSecureStorage).toHaveBeenCalled()
    })

    it('should throw StorageError on failure', async () => {
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>
      mockDefaultStorage.clear.mockRejectedValue(new Error('Clear failed'))

      await expect(storageManager.clearAllStorage())
        .rejects.toThrow(StorageError)
    })
  })

  describe('clearUserData', () => {
    it('should clear user-specific data', async () => {
      const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockUserStorage.clear.mockResolvedValue(undefined)
      mockSecureStorage.clearAuthTokens.mockResolvedValue(undefined)
      mockDefaultStorage.removeItem.mockResolvedValue(undefined)

      await expect(storageManager.clearUserData()).resolves.not.toThrow()

      expect(mockUserStorage.clear).toHaveBeenCalled()
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled()
      expect(mockDefaultStorage.removeItem).toHaveBeenCalledTimes(3) // user_preferences, biometric_enabled, remember_me
    })
  })

  describe('optimizeStorage', () => {
    it('should optimize storage by vacuuming database', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      mockDatabase.vacuum.mockResolvedValue(undefined)

      await storageManager.optimizeStorage()

      expect(mockDatabase.vacuum).toHaveBeenCalled()
    })

    it('should throw StorageError on optimization failure', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      mockDatabase.vacuum.mockRejectedValue(new Error('Vacuum failed'))

      await expect(storageManager.optimizeStorage())
        .rejects.toThrow(StorageError)
    })
  })

  describe('close', () => {
    it('should close database connection and reset initialization', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      mockDatabase.close.mockResolvedValue(undefined)

      // Set as initialized first
      ;(storageManager as any).initialized = true

      await storageManager.close()

      expect(mockDatabase.close).toHaveBeenCalled()
      expect(storageManager.isInitialized()).toBe(false)
    })

    it('should throw StorageError on close failure', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      mockDatabase.close.mockRejectedValue(new Error('Close failed'))

      await expect(storageManager.close())
        .rejects.toThrow(StorageError)
    })
  })

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(storageManager.isInitialized()).toBe(false)
    })

    it('should return true after initialization', async () => {
      const mockDatabase = database as jest.Mocked<typeof database>
      const mockMigrationService = migrationService as jest.Mocked<typeof migrationService>
      const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>
      const mockDefaultStorage = defaultStorage as jest.Mocked<typeof defaultStorage>

      mockDatabase.initialize.mockResolvedValue(undefined)
      mockMigrationService.runMigrations.mockResolvedValue(undefined)
      mockSecureStorage.isAvailable.mockResolvedValue(true)
      mockDefaultStorage.setItem.mockResolvedValue(undefined)
      mockDefaultStorage.getItem.mockResolvedValue({ initialized: true, timestamp: Date.now() })

      await storageManager.initialize()

      expect(storageManager.isInitialized()).toBe(true)
    })
  })
})