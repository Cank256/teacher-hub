import { v4 as uuidv4 } from 'uuid';
import { SQLiteStorage } from '../storage/sqliteStorage';
import { OperationQueue } from '../queue/operationQueue';
import { 
  OfflineOperation, 
  OfflineStorageConfig, 
  SyncStatus, 
  ConflictResolution 
} from '../types';
import logger from '../../utils/logger';

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  failedOperations: number;
  conflicts: ConflictResolution[];
  errors: string[];
}

export interface SyncOptions {
  userId?: string;
  entityType?: string;
  incremental?: boolean;
  maxOperations?: number;
}

export class SyncEngine {
  private storage: SQLiteStorage;
  private operationQueue: OperationQueue;
  private config: OfflineStorageConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    storage: SQLiteStorage, 
    operationQueue: OperationQueue, 
    config: OfflineStorageConfig
  ) {
    this.storage = storage;
    this.operationQueue = operationQueue;
    this.config = config;
  }

  /**
   * Start background synchronization
   */
  startBackgroundSync(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    this.syncInterval = setInterval(async () => {
      if (!this.isSyncing) {
        await this.performSync();
      }
    }, this.config.syncInterval);

    logger.info('Background sync started', { interval: this.config.syncInterval });
  }

  /**
   * Stop background synchronization
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Background sync stopped');
    }
  }

  /**
   * Perform manual synchronization
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    return this.performSync(options);
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(options: SyncOptions = {}): Promise<SyncResult> {
    this.isSyncing = true;
    const startTime = Date.now();

    const result: SyncResult = {
      success: false,
      syncedOperations: 0,
      failedOperations: 0,
      conflicts: [],
      errors: []
    };

    try {
      logger.info('Starting sync operation', options);

      // Get pending operations
      const pendingOperations = this.operationQueue.getPendingOperations(options.userId);
      
      if (pendingOperations.length === 0) {
        result.success = true;
        logger.debug('No pending operations to sync');
        return result;
      }

      // Filter operations if needed
      let operationsToSync = pendingOperations;
      if (options.entityType) {
        operationsToSync = pendingOperations.filter(op => op.entity === options.entityType);
      }

      if (options.maxOperations) {
        operationsToSync = operationsToSync.slice(0, options.maxOperations);
      }

      // Process operations in batches
      const batchSize = 10;
      for (let i = 0; i < operationsToSync.length; i += batchSize) {
        const batch = operationsToSync.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch);
        
        result.syncedOperations += batchResult.syncedOperations;
        result.failedOperations += batchResult.failedOperations;
        result.conflicts.push(...batchResult.conflicts);
        result.errors.push(...batchResult.errors);
      }

      result.success = result.failedOperations === 0;
      
      const duration = Date.now() - startTime;
      logger.info('Sync operation completed', {
        duration,
        syncedOperations: result.syncedOperations,
        failedOperations: result.failedOperations,
        conflicts: result.conflicts.length
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      logger.error('Sync operation failed', { error });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(operations: OfflineOperation[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedOperations: 0,
      failedOperations: 0,
      conflicts: [],
      errors: []
    };

    for (const operation of operations) {
      try {
        const syncResult = await this.syncOperation(operation);
        
        if (syncResult.success) {
          result.syncedOperations++;
          this.operationQueue.markCompleted(operation.id);
        } else {
          result.failedOperations++;
          this.operationQueue.markFailed(
            operation.id, 
            operation.retryCount + 1, 
            operation.maxRetries
          );
          
          if (syncResult.conflict) {
            result.conflicts.push(syncResult.conflict);
          }
          
          if (syncResult.error) {
            result.errors.push(syncResult.error);
          }
        }
      } catch (error) {
        result.failedOperations++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown operation error';
        result.errors.push(errorMessage);
        
        this.operationQueue.markFailed(
          operation.id, 
          operation.retryCount + 1, 
          operation.maxRetries
        );
        
        logger.error('Failed to sync operation', { 
          operationId: operation.id, 
          error: errorMessage 
        });
      }
    }

    return result;
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(operation: OfflineOperation): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
    error?: string;
  }> {
    logger.debug('Syncing operation', {
      id: operation.id,
      type: operation.type,
      entity: operation.entity
    });

    // Simulate API call to sync the operation
    // In a real implementation, this would call the appropriate service
    const apiResult = await this.callSyncAPI(operation);

    if (apiResult.conflict) {
      // Handle conflict
      const resolution = await this.resolveConflict(operation, apiResult.remoteData);
      return {
        success: resolution.resolution !== 'manual',
        conflict: resolution
      };
    }

    return {
      success: apiResult.success,
      error: apiResult.error
    };
  }

  /**
   * Simulate API call for syncing operation
   */
  private async callSyncAPI(operation: OfflineOperation): Promise<{
    success: boolean;
    conflict?: boolean;
    remoteData?: any;
    error?: string;
  }> {
    // Simulate network delay
    await this.delay(Math.random() * 500);

    // Simulate different outcomes
    const random = Math.random();
    
    if (random < 0.1) {
      // 10% chance of conflict
      return {
        success: false,
        conflict: true,
        remoteData: {
          ...operation.data,
          lastModified: new Date(),
          version: 2
        }
      };
    } else if (random < 0.15) {
      // 5% chance of error
      return {
        success: false,
        error: 'Network error or server unavailable'
      };
    } else {
      // 85% chance of success
      return {
        success: true
      };
    }
  }

  /**
   * Resolve conflicts between local and remote data
   */
  private async resolveConflict(
    operation: OfflineOperation, 
    remoteData: any
  ): Promise<ConflictResolution> {
    const conflictId = uuidv4();
    
    const conflict: ConflictResolution = {
      id: conflictId,
      entityType: operation.entity,
      entityId: operation.entityId,
      localVersion: operation.data,
      remoteVersion: remoteData,
      conflictType: this.determineConflictType(operation, remoteData),
      resolution: 'local_wins' // Default resolution strategy
    };

    // Apply conflict resolution strategy
    conflict.resolution = await this.applyConflictResolutionStrategy(conflict);
    
    if (conflict.resolution !== 'manual') {
      conflict.resolvedAt = new Date();
      conflict.resolvedBy = 'system';
    }

    // Store conflict resolution
    this.storage.addConflictResolution(conflict);

    logger.info('Conflict resolved', {
      conflictId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      resolution: conflict.resolution
    });

    return conflict;
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(
    operation: OfflineOperation, 
    remoteData: any
  ): 'update_conflict' | 'delete_conflict' | 'create_conflict' {
    if (operation.type === 'delete' && remoteData) {
      return 'delete_conflict';
    } else if (operation.type === 'create' && remoteData) {
      return 'create_conflict';
    } else {
      return 'update_conflict';
    }
  }

  /**
   * Apply conflict resolution strategy
   */
  private async applyConflictResolutionStrategy(
    conflict: ConflictResolution
  ): Promise<'local_wins' | 'remote_wins' | 'merge' | 'manual'> {
    // Simple conflict resolution strategies
    switch (conflict.conflictType) {
      case 'create_conflict':
        // For create conflicts, usually remote wins (item already exists)
        return 'remote_wins';
        
      case 'delete_conflict':
        // For delete conflicts, check if remote has newer changes
        if (this.isRemoteNewer(conflict.localVersion, conflict.remoteVersion)) {
          return 'manual'; // Require manual resolution
        }
        return 'local_wins'; // Proceed with deletion
        
      case 'update_conflict':
        // For update conflicts, try to merge if possible
        if (this.canAutoMerge(conflict.localVersion, conflict.remoteVersion)) {
          return 'merge';
        } else if (this.isRemoteNewer(conflict.localVersion, conflict.remoteVersion)) {
          return 'remote_wins';
        } else {
          return 'local_wins';
        }
        
      default:
        return 'manual';
    }
  }

  /**
   * Check if remote version is newer than local
   */
  private isRemoteNewer(localData: any, remoteData: any): boolean {
    const localTimestamp = new Date(localData.lastModified || localData.updatedAt || 0);
    const remoteTimestamp = new Date(remoteData.lastModified || remoteData.updatedAt || 0);
    
    return remoteTimestamp > localTimestamp;
  }

  /**
   * Check if local and remote changes can be automatically merged
   */
  private canAutoMerge(localData: any, remoteData: any): boolean {
    // Simple merge detection - check if changes are in different fields
    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    
    // If they modified different fields, we can potentially merge
    const commonKeys = localKeys.filter(key => remoteKeys.includes(key));
    const conflictingKeys = commonKeys.filter(key => 
      localData[key] !== remoteData[key] && 
      key !== 'lastModified' && 
      key !== 'updatedAt'
    );
    
    // Can merge if there are no conflicting keys
    return conflictingKeys.length === 0;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    const pendingOperations = this.operationQueue.getPendingOperations();
    const queueStats = this.operationQueue.getQueueStats();
    
    return {
      lastSyncAt: new Date(), // This would be stored and retrieved from storage
      pendingOperations: pendingOperations.length,
      failedOperations: queueStats.failed,
      isOnline: true, // This would be determined by network status
      syncInProgress: this.isSyncing
    };
  }

  /**
   * Force sync for specific entity
   */
  async forceSyncEntity(entityType: string, entityId: string, userId?: string): Promise<SyncResult> {
    const operations = this.operationQueue.getPendingOperations(userId)
      .filter(op => op.entity === entityType && op.entityId === entityId);

    if (operations.length === 0) {
      return {
        success: true,
        syncedOperations: 0,
        failedOperations: 0,
        conflicts: [],
        errors: []
      };
    }

    return this.processBatch(operations);
  }

  /**
   * Get incremental changes since last sync
   */
  async getIncrementalChanges(lastSyncTimestamp: Date, userId?: string): Promise<OfflineOperation[]> {
    const allOperations = this.operationQueue.getPendingOperations(userId);
    
    return allOperations.filter(op => op.timestamp > lastSyncTimestamp);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed sync operations
   */
  cleanup(): void {
    this.operationQueue.clearOldOperations(24); // Clear operations older than 24 hours
    this.storage.cleanup();
  }
}