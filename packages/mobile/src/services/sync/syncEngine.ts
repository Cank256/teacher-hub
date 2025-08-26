/**
 * Main Sync Engine
 * Orchestrates offline synchronization with conflict resolution
 */

import { NetworkMonitor } from '../api/networkMonitor'
import { DatabaseService, StorageService } from '../storage/types'
import { OperationQueue } from './operationQueue'
import { ConflictResolutionManager } from './conflictResolver'
import { BackgroundSyncService } from './backgroundSyncService'
import { OfflineStatusMonitor } from './offlineStatusMonitor'
import { ContentDownloadManager } from './contentDownloadManager'
import { 
  SyncService,
  OfflineOperation,
  OperationType,
  ResourceType,
  SyncPriority,
  SyncResult,
  SyncError,
  SyncErrorType,
  SyncConflict,
  OfflineStatus,
  SyncEventListener,
  SyncConfiguration,
  ContentDownloadRequest,
  ConflictResolutionStrategy
} from './types'

export class SyncEngine implements SyncService {
  private networkMonitor: NetworkMonitor
  private db: DatabaseService
  private storage: StorageService
  private operationQueue: OperationQueue
  private conflictResolver: ConflictResolutionManager
  private backgroundSync: BackgroundSyncService
  private statusMonitor: OfflineStatusMonitor
  private downloadManager: ContentDownloadManager
  private config: SyncConfiguration
  private isInitialized = false

  constructor(
    networkMonitor: NetworkMonitor,
    db: DatabaseService,
    storage: StorageService,
    config?: Partial<SyncConfiguration>
  ) {
    this.networkMonitor = networkMonitor
    this.db = db
    this.storage = storage

    // Initialize configuration with defaults
    this.config = {
      autoSyncEnabled: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      backoffMultiplier: 2,
      initialRetryDelay: 1000,
      maxRetryDelay: 300000, // 5 minutes
      batchSize: 10,
      storageQuotaMB: 100,
      priorityWeights: {
        [SyncPriority.LOW]: 1,
        [SyncPriority.MEDIUM]: 2,
        [SyncPriority.HIGH]: 4,
        [SyncPriority.CRITICAL]: 8
      },
      conflictResolutionDefaults: {
        [ResourceType.POST]: ConflictResolutionStrategy.LAST_MODIFIED_WINS,
        [ResourceType.COMMENT]: ConflictResolutionStrategy.CLIENT_WINS,
        [ResourceType.MESSAGE]: ConflictResolutionStrategy.CLIENT_WINS,
        [ResourceType.RESOURCE]: ConflictResolutionStrategy.SERVER_WINS,
        [ResourceType.COMMUNITY]: ConflictResolutionStrategy.SERVER_WINS,
        [ResourceType.USER_PROFILE]: ConflictResolutionStrategy.MERGE,
        [ResourceType.MEDIA_ATTACHMENT]: ConflictResolutionStrategy.SERVER_WINS
      },
      ...config
    }

    // Initialize components
    this.operationQueue = new OperationQueue(db, storage)
    this.conflictResolver = new ConflictResolutionManager()
    this.statusMonitor = new OfflineStatusMonitor(networkMonitor, storage)
    this.downloadManager = new ContentDownloadManager(db, storage)
    this.backgroundSync = new BackgroundSyncService(networkMonitor, this.config)
  }

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize database tables if needed
      await this.initializeTables()

      // Start background sync service
      await this.backgroundSync.start()

      // Set up network change handling
      this.networkMonitor.addListener((networkStatus) => {
        if (networkStatus.isConnected && networkStatus.isInternetReachable) {
          // Network became available - trigger sync
          this.syncPendingOperations()
        }
      })

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize sync engine:', error)
      throw error
    }
  }

  /**
   * Queue an offline operation
   */
  async queueOperation(operation: Omit<OfflineOperation, 'id' | 'createdAt' | 'scheduledAt'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const operationId = await this.operationQueue.queueOperation(
      operation.type,
      operation.resourceType,
      operation.data,
      {
        resourceId: operation.resourceId,
        priority: operation.priority,
        maxRetries: operation.maxRetries,
        conflictResolution: operation.conflictResolution
      }
    )

    // Notify status monitor
    this.statusMonitor.recordOperationQueued()

    // Trigger immediate sync if online and high priority
    if (operation.priority >= SyncPriority.HIGH && this.networkMonitor.isOnline()) {
      this.syncPendingOperations()
    }
  }

  /**
   * Sync all pending operations
   */
  async syncPendingOperations(): Promise<SyncResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.networkMonitor.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    const startTime = Date.now()
    this.statusMonitor.updateSyncStatus({ isSyncing: true })

    try {
      const pendingOperations = await this.operationQueue.getPendingOperations(this.config.batchSize)
      
      if (pendingOperations.length === 0) {
        const result: SyncResult = {
          success: true,
          operationsProcessed: 0,
          operationsSucceeded: 0,
          operationsFailed: 0,
          conflicts: [],
          errors: [],
          syncDuration: Date.now() - startTime
        }

        this.statusMonitor.recordSyncCompletion(result)
        return result
      }

      const results = await Promise.allSettled(
        pendingOperations.map(operation => this.processOperation(operation))
      )

      // Analyze results
      let operationsSucceeded = 0
      let operationsFailed = 0
      const conflicts: SyncConflict[] = []
      const errors: SyncError[] = []

      results.forEach((result, index) => {
        const operation = pendingOperations[index]
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            operationsSucceeded++
            this.statusMonitor.recordOperationCompleted(operation.id)
          } else {
            operationsFailed++
            if (result.value.conflict) {
              conflicts.push(result.value.conflict)
            }
            if (result.value.error) {
              errors.push(result.value.error)
              this.statusMonitor.recordOperationFailed(operation.id, result.value.error)
            }
          }
        } else {
          operationsFailed++
          const error: SyncError = {
            operationId: operation.id,
            errorType: SyncErrorType.UNKNOWN_ERROR,
            message: result.reason?.message || 'Unknown error',
            isRetryable: true
          }
          errors.push(error)
          this.statusMonitor.recordOperationFailed(operation.id, error)
        }
      })

      const syncResult: SyncResult = {
        success: operationsFailed === 0,
        operationsProcessed: pendingOperations.length,
        operationsSucceeded,
        operationsFailed,
        conflicts,
        errors,
        syncDuration: Date.now() - startTime
      }

      this.statusMonitor.recordSyncCompletion(syncResult)
      return syncResult

    } catch (error) {
      const syncError: SyncError = {
        operationId: 'sync_engine',
        errorType: SyncErrorType.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Sync failed',
        isRetryable: true
      }

      this.statusMonitor.recordSyncFailure(syncError)
      throw error
    }
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<void> {
    const failedOperations = await this.operationQueue.getFailedOperations()
    
    for (const operation of failedOperations) {
      // Reset retry count and reschedule
      await this.operationQueue.updateOperationRetry(operation.id, undefined, true)
    }

    // Trigger sync
    if (this.networkMonitor.isOnline()) {
      await this.syncPendingOperations()
    }
  }

  /**
   * Clear operation queue
   */
  async clearOperationQueue(): Promise<void> {
    await this.operationQueue.clearQueue()
    this.statusMonitor.updateSyncStatus({ 
      pendingOperations: 0, 
      failedOperations: 0 
    })
  }

  /**
   * Download content for offline access
   */
  async downloadForOffline(resourceIds: string[], priority: SyncPriority = SyncPriority.MEDIUM): Promise<void> {
    const requests: ContentDownloadRequest[] = []

    for (const resourceId of resourceIds) {
      // Get resource info from database
      const resource = await this.getResourceInfo(resourceId)
      if (resource && resource.file_url) {
        requests.push({
          resourceId,
          resourceType: resource.resource_type as ResourceType,
          priority,
          url: resource.file_url,
          expectedSize: resource.file_size,
          metadata: { title: resource.title, type: resource.resource_type }
        })
      }
    }

    await this.downloadManager.downloadContent(requests)
  }

  /**
   * Remove offline content
   */
  async removeOfflineContent(resourceIds: string[]): Promise<void> {
    await this.downloadManager.removeDownloadedContent(resourceIds)
    await this.statusMonitor.updateStorageUsage()
  }

  /**
   * Get offline status
   */
  async getOfflineStatus(): Promise<OfflineStatus> {
    const queueStats = await this.operationQueue.getQueueStats()
    const storageUsage = await this.downloadManager.getStorageUsage()

    return {
      ...this.statusMonitor.getOfflineStatus(),
      pendingOperations: queueStats.pending,
      failedOperations: queueStats.failed,
      storageUsed: storageUsage.totalSize
    }
  }

  /**
   * Enable/disable auto sync
   */
  async enableAutoSync(enabled: boolean): Promise<void> {
    this.config.autoSyncEnabled = enabled
    this.statusMonitor.setAutoSyncEnabled(enabled)
    this.backgroundSync.updateConfiguration({ autoSyncEnabled: enabled })
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<SyncResult> {
    return await this.syncPendingOperations()
  }

  /**
   * Pause sync
   */
  async pauseSync(): Promise<void> {
    this.statusMonitor.pauseSync()
    await this.backgroundSync.stop()
  }

  /**
   * Resume sync
   */
  async resumeSync(): Promise<void> {
    this.statusMonitor.resumeSync()
    await this.backgroundSync.start()
  }

  /**
   * Add sync event listener
   */
  addSyncListener(listener: SyncEventListener): () => void {
    return this.statusMonitor.addSyncListener(listener)
  }

  /**
   * Remove sync event listener
   */
  removeSyncListener(listener: SyncEventListener): void {
    this.statusMonitor.removeSyncListener(listener)
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    try {
      switch (operation.type) {
        case OperationType.CREATE:
          return await this.processCreateOperation(operation)
        case OperationType.UPDATE:
          return await this.processUpdateOperation(operation)
        case OperationType.DELETE:
          return await this.processDeleteOperation(operation)
        case OperationType.UPLOAD:
          return await this.processUploadOperation(operation)
        case OperationType.DOWNLOAD:
          return await this.processDownloadOperation(operation)
        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }
    } catch (error) {
      const syncError: SyncError = {
        operationId: operation.id,
        errorType: this.categorizeError(error),
        message: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: this.isRetryableError(error)
      }

      // Update retry count if retryable
      if (syncError.isRetryable) {
        await this.operationQueue.updateOperationRetry(operation.id, syncError.message)
      } else {
        await this.operationQueue.removeOperation(operation.id)
      }

      return { success: false, error: syncError }
    }
  }

  /**
   * Process create operation
   */
  private async processCreateOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    // This would make API call to create resource
    // For now, simulate success
    await this.operationQueue.removeOperation(operation.id)
    return { success: true }
  }

  /**
   * Process update operation
   */
  private async processUpdateOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    // This would make API call to update resource
    // Check for conflicts by comparing versions
    
    // Simulate conflict detection
    const hasConflict = Math.random() < 0.1 // 10% chance of conflict for demo
    
    if (hasConflict) {
      const conflict = this.conflictResolver.createConflict(
        operation.id,
        operation.resourceType,
        operation.resourceId || '',
        operation.data,
        { ...operation.data, updated_at: new Date().toISOString() }, // Simulate server data
        operation.conflictResolution
      )

      try {
        const resolvedData = await this.conflictResolver.resolveConflict(conflict)
        if (resolvedData) {
          // Apply resolved data
          conflict.resolvedData = resolvedData
          await this.operationQueue.removeOperation(operation.id)
          return { success: true, conflict }
        } else {
          // User intervention needed
          return { success: false, conflict }
        }
      } catch (error) {
        const syncError: SyncError = {
          operationId: operation.id,
          errorType: SyncErrorType.CONFLICT_ERROR,
          message: 'Failed to resolve conflict',
          isRetryable: false
        }
        return { success: false, error: syncError }
      }
    }

    await this.operationQueue.removeOperation(operation.id)
    return { success: true }
  }

  /**
   * Process delete operation
   */
  private async processDeleteOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    // This would make API call to delete resource
    await this.operationQueue.removeOperation(operation.id)
    return { success: true }
  }

  /**
   * Process upload operation
   */
  private async processUploadOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    // This would upload file to server
    await this.operationQueue.removeOperation(operation.id)
    return { success: true }
  }

  /**
   * Process download operation
   */
  private async processDownloadOperation(operation: OfflineOperation): Promise<{
    success: boolean
    conflict?: SyncConflict
    error?: SyncError
  }> {
    // This would download file from server
    await this.operationQueue.removeOperation(operation.id)
    return { success: true }
  }

  /**
   * Get resource info from database
   */
  private async getResourceInfo(resourceId: string): Promise<any | null> {
    const sql = 'SELECT * FROM resources WHERE id = ?'
    return await this.db.queryFirst<any>(sql, [resourceId])
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: any): SyncErrorType {
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return SyncErrorType.NETWORK_ERROR
    }
    if (error?.code === 'UNAUTHORIZED' || error?.status === 401) {
      return SyncErrorType.AUTHENTICATION_ERROR
    }
    if (error?.code === 'VALIDATION_ERROR' || error?.status === 400) {
      return SyncErrorType.VALIDATION_ERROR
    }
    if (error?.code === 'CONFLICT' || error?.status === 409) {
      return SyncErrorType.CONFLICT_ERROR
    }
    if (error?.code === 'STORAGE_ERROR') {
      return SyncErrorType.STORAGE_ERROR
    }
    if (error?.code === 'QUOTA_EXCEEDED' || error?.status === 413) {
      return SyncErrorType.QUOTA_EXCEEDED
    }
    
    return SyncErrorType.UNKNOWN_ERROR
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorType = this.categorizeError(error)
    
    switch (errorType) {
      case SyncErrorType.NETWORK_ERROR:
      case SyncErrorType.UNKNOWN_ERROR:
        return true
      case SyncErrorType.AUTHENTICATION_ERROR:
      case SyncErrorType.VALIDATION_ERROR:
      case SyncErrorType.CONFLICT_ERROR:
      case SyncErrorType.QUOTA_EXCEEDED:
        return false
      case SyncErrorType.STORAGE_ERROR:
        return true
      default:
        return false
    }
  }

  /**
   * Initialize database tables
   */
  private async initializeTables(): Promise<void> {
    // Create offline operations table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS offline_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        data TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        last_attempt_at TEXT,
        error_message TEXT,
        conflict_resolution TEXT
      )
    `)

    // Create file downloads table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS file_downloads (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL UNIQUE,
        file_url TEXT NOT NULL,
        local_path TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        downloaded_size INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        progress REAL NOT NULL DEFAULT 0,
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        metadata TEXT
      )
    `)

    // Create indexes for performance
    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_offline_operations_priority_created 
      ON offline_operations(priority DESC, created_at ASC)
    `)

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_offline_operations_scheduled 
      ON offline_operations(scheduled_at)
    `)

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_file_downloads_status 
      ON file_downloads(status)
    `)
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.backgroundSync.stop()
    this.statusMonitor.destroy()
  }
}