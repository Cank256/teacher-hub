/**
 * Sync Integration Tests
 * Tests complete sync scenarios and conflict resolution workflows
 */

import { SyncEngine } from '../syncEngine'
import { NetworkMonitor } from '../../api/networkMonitor'
import { DatabaseService, StorageService } from '../../storage/types'
import { 
  OperationType, 
  ResourceType, 
  SyncPriority,
  ConflictResolutionStrategy,
  SyncEventListener 
} from '../types'

// Mock implementations for integration testing
class MockDatabaseService implements DatabaseService {
  private tables: Map<string, any[]> = new Map()
  private nextId = 1

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    // Simple mock implementation for testing
    if (sql.includes('offline_operations')) {
      return (this.tables.get('offline_operations') || []) as T[]
    }
    if (sql.includes('file_downloads')) {
      return (this.tables.get('file_downloads') || []) as T[]
    }
    return []
  }

  async queryFirst<T>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? results[0] : null
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX')) {
      // Ignore table creation for tests
      return
    }
    
    if (sql.includes('INSERT') && sql.includes('offline_operations')) {
      const operations = this.tables.get('offline_operations') || []
      const operation = {
        id: params?.[0] || `op_${this.nextId++}`,
        operation_type: params?.[1],
        resource_type: params?.[2],
        resource_id: params?.[3],
        data: params?.[4],
        priority: params?.[5] || 1,
        retry_count: params?.[6] || 0,
        max_retries: params?.[7] || 3,
        created_at: params?.[8] || new Date().toISOString(),
        scheduled_at: params?.[9] || new Date().toISOString(),
        conflict_resolution: params?.[10]
      }
      operations.push(operation)
      this.tables.set('offline_operations', operations)
    }
    
    if (sql.includes('DELETE FROM offline_operations')) {
      const operations = this.tables.get('offline_operations') || []
      const filteredOps = operations.filter(op => op.id !== params?.[0])
      this.tables.set('offline_operations', filteredOps)
    }
  }

  async transaction(operations: () => Promise<void>): Promise<void> {
    await operations()
  }

  async close(): Promise<void> {}
  async initialize(): Promise<void> {}
  async insert(table: string, data: Record<string, any>): Promise<number> { return 1 }
  async update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<number> { return 1 }
  async delete(table: string, where: string, whereParams?: any[]): Promise<number> { return 1 }
}

class MockStorageService implements StorageService {
  private storage: Map<string, any> = new Map()

  async setItem<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value)
  }

  async getItem<T>(key: string): Promise<T | null> {
    return this.storage.get(key) || null
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async clear(): Promise<void> {
    this.storage.clear()
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys())
  }
}

class MockNetworkMonitor {
  private listeners: Set<(status: any) => void> = new Set()
  private online = true

  isOnline(): boolean {
    return this.online
  }

  setOnline(online: boolean): void {
    this.online = online
    this.notifyListeners()
  }

  getCurrentStatus() {
    return {
      isConnected: this.online,
      type: 'wifi',
      isInternetReachable: this.online
    }
  }

  addListener(listener: (status: any) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const status = this.getCurrentStatus()
    this.listeners.forEach(listener => listener(status))
  }
}

describe('Sync Integration Tests', () => {
  let syncEngine: SyncEngine
  let mockDb: MockDatabaseService
  let mockStorage: MockStorageService
  let mockNetwork: MockNetworkMonitor

  beforeEach(async () => {
    mockDb = new MockDatabaseService()
    mockStorage = new MockStorageService()
    mockNetwork = new MockNetworkMonitor()

    syncEngine = new SyncEngine(
      mockNetwork as any,
      mockDb,
      mockStorage,
      {
        autoSyncEnabled: true,
        syncInterval: 1000,
        maxRetries: 2,
        batchSize: 5
      }
    )

    await syncEngine.initialize()
  })

  afterEach(async () => {
    await syncEngine.destroy()
  })

  describe('Complete Sync Workflow', () => {
    it('should queue operations and sync when online', async () => {
      const syncListener: SyncEventListener = {
        onSyncStarted: jest.fn(),
        onSyncCompleted: jest.fn(),
        onOperationQueued: jest.fn(),
        onOperationCompleted: jest.fn()
      }

      syncEngine.addSyncListener(syncListener)

      // Queue multiple operations
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Post 1', content: 'Content 1' },
        priority: SyncPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3
      })

      await syncEngine.queueOperation({
        type: OperationType.UPDATE,
        resourceType: ResourceType.POST,
        resourceId: 'post123',
        data: { id: 'post123', title: 'Updated Post' },
        priority: SyncPriority.HIGH,
        retryCount: 0,
        maxRetries: 3
      })

      // Verify operations are queued
      const status = await syncEngine.getOfflineStatus()
      expect(status.pendingOperations).toBe(2)

      // Sync operations
      const result = await syncEngine.syncPendingOperations()

      expect(result.success).toBe(true)
      expect(result.operationsProcessed).toBe(2)
      expect(result.operationsSucceeded).toBe(2)
      expect(result.operationsFailed).toBe(0)

      // Verify status updated
      const finalStatus = await syncEngine.getOfflineStatus()
      expect(finalStatus.pendingOperations).toBe(0)
    })

    it('should handle offline to online transition', async () => {
      // Start offline
      mockNetwork.setOnline(false)

      // Queue operations while offline
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Offline Post' },
        priority: SyncPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3
      })

      // Verify sync fails when offline
      await expect(syncEngine.syncPendingOperations()).rejects.toThrow('Cannot sync while offline')

      // Go online
      mockNetwork.setOnline(true)

      // Wait for network change to trigger sync
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify operations can now be synced
      const result = await syncEngine.syncPendingOperations()
      expect(result.success).toBe(true)
      expect(result.operationsProcessed).toBe(1)
    })

    it('should retry failed operations with exponential backoff', async () => {
      // Mock operation to fail initially
      const originalProcessOperation = (syncEngine as any).processOperation
      let attemptCount = 0
      
      ;(syncEngine as any).processOperation = jest.fn().mockImplementation(async (operation) => {
        attemptCount++
        if (attemptCount <= 2) {
          throw new Error('Temporary network error')
        }
        return { success: true }
      })

      // Queue operation
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Retry Test' },
        priority: SyncPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3
      })

      // First sync attempt - should fail
      let result = await syncEngine.syncPendingOperations()
      expect(result.operationsFailed).toBe(1)

      // Second sync attempt - should still fail
      result = await syncEngine.syncPendingOperations()
      expect(result.operationsFailed).toBe(1)

      // Third sync attempt - should succeed
      result = await syncEngine.syncPendingOperations()
      expect(result.operationsSucceeded).toBe(1)
    })
  })

  describe('Conflict Resolution Scenarios', () => {
    it('should resolve conflicts using last modified wins', async () => {
      const conflictResolver = (syncEngine as any).conflictResolver

      // Create a conflict scenario
      const conflict = conflictResolver.createConflict(
        'op1',
        ResourceType.POST,
        'post123',
        { 
          id: 'post123', 
          title: 'Client Version', 
          updated_at: '2023-01-01T10:00:00Z' 
        },
        { 
          id: 'post123', 
          title: 'Server Version', 
          updated_at: '2023-01-01T09:00:00Z' 
        },
        ConflictResolutionStrategy.LAST_MODIFIED_WINS
      )

      const resolved = await conflictResolver.resolveConflict(conflict)

      expect(resolved.title).toBe('Client Version') // Client has later timestamp
      expect(resolved.updated_at).toBe('2023-01-01T10:00:00Z')
    })

    it('should merge user profile conflicts', async () => {
      const conflictResolver = (syncEngine as any).conflictResolver

      const conflict = conflictResolver.createConflict(
        'op1',
        ResourceType.USER_PROFILE,
        'user123',
        {
          id: 'user123',
          first_name: 'John',
          last_name: 'Doe',
          bio: 'Updated bio',
          updated_at: '2023-01-01T10:00:00Z'
        },
        {
          id: 'user123',
          first_name: 'Jane',
          last_name: 'Smith',
          verification_status: 'verified',
          updated_at: '2023-01-01T09:00:00Z'
        },
        ConflictResolutionStrategy.MERGE
      )

      const resolved = await conflictResolver.resolveConflict(conflict)

      // Should prefer client data for personal fields
      expect(resolved.first_name).toBe('John')
      expect(resolved.last_name).toBe('Doe')
      expect(resolved.bio).toBe('Updated bio')
      
      // Should preserve server data for system fields
      expect(resolved.verification_status).toBe('verified')
      
      // Should use latest timestamp
      expect(resolved.updated_at).toBe('2023-01-01T10:00:00Z')
    })
  })

  describe('Storage Management', () => {
    it('should track storage usage and enforce limits', async () => {
      const statusMonitor = (syncEngine as any).statusMonitor

      // Set storage limit
      statusMonitor.setStorageLimit(50 * 1024 * 1024) // 50MB

      // Simulate storage usage update
      await statusMonitor.updateStorageUsage()

      const status = await syncEngine.getOfflineStatus()
      expect(status.storageLimit).toBe(50 * 1024 * 1024)
    })

    it('should clean up failed downloads', async () => {
      const downloadManager = (syncEngine as any).downloadManager

      // This would be tested more thoroughly in ContentDownloadManager tests
      await downloadManager.cleanupFailedDownloads()

      // Verify cleanup occurred
      const downloads = await downloadManager.getAllDownloads()
      const failedDownloads = downloads.filter(d => d.status === 'failed')
      expect(failedDownloads).toHaveLength(0)
    })
  })

  describe('Event Handling', () => {
    it('should notify listeners of sync events', async () => {
      const listener: SyncEventListener = {
        onSyncStarted: jest.fn(),
        onSyncCompleted: jest.fn(),
        onOperationCompleted: jest.fn(),
        onNetworkStatusChanged: jest.fn()
      }

      syncEngine.addSyncListener(listener)

      // Queue and sync operation
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Event Test' },
        priority: SyncPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3
      })

      await syncEngine.syncPendingOperations()

      // Verify events were fired
      expect(listener.onSyncStarted).toHaveBeenCalled()
      expect(listener.onSyncCompleted).toHaveBeenCalled()

      // Test network status change
      mockNetwork.setOnline(false)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(listener.onNetworkStatusChanged).toHaveBeenCalledWith(false)
    })
  })

  describe('Performance and Batching', () => {
    it('should process operations in batches', async () => {
      // Queue more operations than batch size
      const operations = []
      for (let i = 0; i < 12; i++) {
        operations.push(syncEngine.queueOperation({
          type: OperationType.CREATE,
          resourceType: ResourceType.POST,
          data: { title: `Post ${i}` },
          priority: SyncPriority.MEDIUM,
          retryCount: 0,
          maxRetries: 3
        }))
      }

      await Promise.all(operations)

      // Sync should process in batches (batch size is 5)
      const result = await syncEngine.syncPendingOperations()
      
      // Should process first batch
      expect(result.operationsProcessed).toBe(5)
      
      // Sync again to process remaining
      const result2 = await syncEngine.syncPendingOperations()
      expect(result2.operationsProcessed).toBe(5)
      
      // Final sync for remaining operations
      const result3 = await syncEngine.syncPendingOperations()
      expect(result3.operationsProcessed).toBe(2)
    })

    it('should prioritize high priority operations', async () => {
      // Queue operations with different priorities
      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Low Priority' },
        priority: SyncPriority.LOW,
        retryCount: 0,
        maxRetries: 3
      })

      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'High Priority' },
        priority: SyncPriority.HIGH,
        retryCount: 0,
        maxRetries: 3
      })

      await syncEngine.queueOperation({
        type: OperationType.CREATE,
        resourceType: ResourceType.POST,
        data: { title: 'Critical Priority' },
        priority: SyncPriority.CRITICAL,
        retryCount: 0,
        maxRetries: 3
      })

      // Mock processOperation to track order
      const processedOperations: any[] = []
      ;(syncEngine as any).processOperation = jest.fn().mockImplementation(async (operation) => {
        processedOperations.push(operation)
        return { success: true }
      })

      await syncEngine.syncPendingOperations()

      // Verify operations were processed in priority order
      expect(processedOperations[0].priority).toBe(SyncPriority.CRITICAL)
      expect(processedOperations[1].priority).toBe(SyncPriority.HIGH)
      expect(processedOperations[2].priority).toBe(SyncPriority.LOW)
    })
  })
})