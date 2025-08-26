/**
 * Sync Engine Tests
 */

import { SyncEngine } from '../syncEngine'
import { NetworkMonitor } from '../../api/networkMonitor'
import { DatabaseService, StorageService } from '../../storage/types'
import { 
  OperationType, 
  ResourceType, 
  SyncPriority,
  SyncResult,
  OfflineStatus 
} from '../types'

// Mock dependencies
const mockNetworkMonitor = {
  isOnline: jest.fn(),
  addListener: jest.fn(),
  getCurrentStatus: jest.fn()
} as jest.Mocked<Partial<NetworkMonitor>>

const mockDb: jest.Mocked<DatabaseService> = {
  query: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
  initialize: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockStorage: jest.Mocked<StorageService> = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn()
}



describe('SyncEngine', () => {
  let syncEngine: SyncEngine

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock returns
    mockNetworkMonitor.isOnline?.mockReturnValue(true)
    mockNetworkMonitor.getCurrentStatus?.mockReturnValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    })
    mockNetworkMonitor.addListener?.mockReturnValue(() => {})

    syncEngine = new SyncEngine(
      mockNetworkMonitor as NetworkMonitor,
      mockDb,
      mockStorage,
      {
        autoSyncEnabled: true,
        syncInterval: 5000,
        maxRetries: 2
      }
    )
  })

  describe('initialize', () => {
    it('should initialize database tables', async () => {
      await syncEngine.initialize()

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS offline_operations')
      )
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS file_downloads')
      )
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      )
    })

    it('should set up network listener', async () => {
      await syncEngine.initialize()

      expect(mockNetworkMonitor.addListener).toHaveBeenCalled()
    })

    it('should not initialize twice', async () => {
      await syncEngine.initialize()
      mockDb.execute.mockClear()
      
      await syncEngine.initialize()

      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  describe('queueOperation', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
      mockDb.execute.mockClear()
    })

    it('should queue a new operation', async () => {
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Test Post', content: 'Test content' },
        priority: SyncPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO offline_operations'),
        expect.arrayContaining([
          expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          OperationType.CREATE,
          ResourceType.POST,
          null,
          expect.stringContaining('Test Post'),
          SyncPriority.MEDIUM,
          0,
          3,
          expect.any(String),
          expect.any(String),
          null
        ])
      )
    })

    it('should trigger immediate sync for high priority operations when online', async () => {
      const syncSpy = jest.spyOn(syncEngine, 'syncPendingOperations')
      syncSpy.mockResolvedValue({
        success: true,
        operationsProcessed: 0,
        operationsSucceeded: 0,
        operationsFailed: 0,
        conflicts: [],
        errors: [],
        syncDuration: 0
      })

      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Urgent Post' },
        priority: SyncPriority.HIGH,
        retryCount: 0,
        maxRetries: 3
      })

      expect(syncSpy).toHaveBeenCalled()
    })

    it('should not trigger sync for high priority when offline', async () => {
      mockNetworkMonitor.isOnline?.mockReturnValue(false)
      const syncSpy = jest.spyOn(syncEngine, 'syncPendingOperations')

      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Urgent Post' },
        priority: SyncPriority.HIGH,
        retryCount: 0,
        maxRetries: 3
      })

      expect(syncSpy).not.toHaveBeenCalled()
    })
  })

  describe('syncPendingOperations', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should throw error when offline', async () => {
      mockNetworkMonitor.isOnline?.mockReturnValue(false)

      await expect(syncEngine.syncPendingOperations()).rejects.toThrow('Cannot sync while offline')
    })

    it('should return success result when no pending operations', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await syncEngine.syncPendingOperations()

      expect(result.success).toBe(true)
      expect(result.operationsProcessed).toBe(0)
      expect(result.operationsSucceeded).toBe(0)
      expect(result.operationsFailed).toBe(0)
      expect(result.conflicts).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should process pending operations', async () => {
      const mockOperations = [
        {
          id: 'op1',
          operation_type: OperationType.CREATE,
          resource_type: ResourceType.POST,
          resource_id: null,
          data: '{"title":"Test Post"}',
          priority: SyncPriority.MEDIUM,
          retry_count: 0,
          max_retries: 3,
          created_at: '2023-01-01T00:00:00Z',
          scheduled_at: '2023-01-01T00:00:00Z',
          last_attempt_at: null,
          error_message: null,
          conflict_resolution: null
        }
      ]

      mockDb.query.mockResolvedValue(mockOperations)

      const result = await syncEngine.syncPendingOperations()

      expect(result.operationsProcessed).toBe(1)
      expect(result.operationsSucceeded).toBe(1)
      expect(result.operationsFailed).toBe(0)
    })

    it('should handle operation failures', async () => {
      const mockOperations = [
        {
          id: 'op1',
          operation_type: OperationType.CREATE,
          resource_type: ResourceType.POST,
          resource_id: null,
          data: '{"title":"Test Post"}',
          priority: SyncPriority.MEDIUM,
          retry_count: 0,
          max_retries: 3,
          created_at: '2023-01-01T00:00:00Z',
          scheduled_at: '2023-01-01T00:00:00Z',
          last_attempt_at: null,
          error_message: null,
          conflict_resolution: null
        }
      ]

      mockDb.query.mockResolvedValue(mockOperations)
      
      // Mock operation processing to fail
      const originalProcessOperation = (syncEngine as any).processOperation
      ;(syncEngine as any).processOperation = jest.fn().mockRejectedValue(new Error('Network error'))

      const result = await syncEngine.syncPendingOperations()

      expect(result.operationsProcessed).toBe(1)
      expect(result.operationsSucceeded).toBe(0)
      expect(result.operationsFailed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Network error')
    })
  })

  describe('retryFailedOperations', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should reset failed operations and trigger sync', async () => {
      const mockFailedOps = [
        {
          id: 'failed_op',
          type: OperationType.CREATE,
          resourceType: ResourceType.POST,
          resourceId: null,
          data: { title: 'Failed Post' },
          priority: SyncPriority.MEDIUM,
          retryCount: 3,
          maxRetries: 3,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          scheduledAt: new Date('2023-01-01T00:00:00Z'),
          lastAttemptAt: new Date('2023-01-01T00:05:00Z'),
          errorMessage: 'Network error',
          conflictResolution: null
        }
      ]

      // Mock the operation queue methods
      const getFailedOperationsSpy = jest.spyOn((syncEngine as any).operationQueue, 'getFailedOperations')
      const updateOperationRetrySpy = jest.spyOn((syncEngine as any).operationQueue, 'updateOperationRetry')
      
      getFailedOperationsSpy.mockResolvedValue(mockFailedOps)
      updateOperationRetrySpy.mockResolvedValue(undefined)

      const syncSpy = jest.spyOn(syncEngine, 'syncPendingOperations')
      syncSpy.mockResolvedValue({
        success: true,
        operationsProcessed: 1,
        operationsSucceeded: 1,
        operationsFailed: 0,
        conflicts: [],
        errors: [],
        syncDuration: 100
      })

      await syncEngine.retryFailedOperations()

      expect(getFailedOperationsSpy).toHaveBeenCalled()
      expect(updateOperationRetrySpy).toHaveBeenCalledWith('failed_op', undefined, true)
      expect(syncSpy).toHaveBeenCalled()
    })
  })

  describe('getOfflineStatus', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should return offline status', async () => {
      // Mock queue stats
      mockDb.queryFirst
        .mockResolvedValueOnce({ count: 3 }) // pending
        .mockResolvedValueOnce({ count: 1 }) // failed
        .mockResolvedValueOnce({ count: 4 }) // total

      mockDb.query
        .mockResolvedValueOnce([]) // priority stats
        .mockResolvedValueOnce([]) // type stats

      const status = await syncEngine.getOfflineStatus()

      expect(status.pendingOperations).toBe(3)
      expect(status.failedOperations).toBe(1)
      expect(status.isOnline).toBe(true)
      expect(status.autoSyncEnabled).toBe(true)
    })
  })

  describe('downloadForOffline', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should queue download requests for resources', async () => {
      const mockResource = {
        id: 'resource1',
        title: 'Test Resource',
        resource_type: 'document',
        file_url: 'https://example.com/file.pdf',
        file_size: 1024
      }

      mockDb.queryFirst.mockResolvedValue(mockResource)

      await syncEngine.downloadForOffline(['resource1'], SyncPriority.HIGH)

      // Verify that download was initiated
      // This would be tested more thoroughly in ContentDownloadManager tests
      expect(mockDb.queryFirst).toHaveBeenCalledWith(
        'SELECT * FROM resources WHERE id = ?',
        ['resource1']
      )
    })
  })

  describe('enableAutoSync', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should enable auto sync', async () => {
      await syncEngine.enableAutoSync(true)

      // Verify configuration was updated
      expect((syncEngine as any).config.autoSyncEnabled).toBe(true)
    })

    it('should disable auto sync', async () => {
      await syncEngine.enableAutoSync(false)

      expect((syncEngine as any).config.autoSyncEnabled).toBe(false)
    })
  })

  describe('event listeners', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should add and remove sync listeners', () => {
      const listener = {
        onSyncStarted: jest.fn(),
        onSyncCompleted: jest.fn()
      }

      const unsubscribe = syncEngine.addSyncListener(listener)
      expect(typeof unsubscribe).toBe('function')

      syncEngine.removeSyncListener(listener)
      // Verify listener was removed (implementation detail)
    })
  })

  describe('pauseSync and resumeSync', () => {
    beforeEach(async () => {
      await syncEngine.initialize()
    })

    it('should pause sync', async () => {
      await syncEngine.pauseSync()

      // Verify sync was paused
      const status = await syncEngine.getOfflineStatus()
      expect(status.syncPaused).toBe(true)
    })

    it('should resume sync', async () => {
      await syncEngine.pauseSync()
      await syncEngine.resumeSync()

      const status = await syncEngine.getOfflineStatus()
      expect(status.syncPaused).toBe(false)
    })
  })
})