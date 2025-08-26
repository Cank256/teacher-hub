/**
 * Offline Synchronization Services
 * Main exports for the sync engine and related services
 */

export { SyncEngine } from './syncEngine'
export { OperationQueue } from './operationQueue'
export { ConflictResolutionManager } from './conflictResolver'
export { BackgroundSyncService } from './backgroundSyncService'
export { OfflineStatusMonitor } from './offlineStatusMonitor'
export { ContentDownloadManager } from './contentDownloadManager'

export * from './types'

// Convenience factory function
import { NetworkMonitor } from '../api/networkMonitor'
import { DatabaseService, StorageService } from '../storage/types'
import { SyncEngine } from './syncEngine'
import { SyncConfiguration } from './types'

/**
 * Create and initialize a sync engine instance
 */
export async function createSyncEngine(
  networkMonitor: NetworkMonitor,
  db: DatabaseService,
  storage: StorageService,
  config?: Partial<SyncConfiguration>
): Promise<SyncEngine> {
  const syncEngine = new SyncEngine(networkMonitor, db, storage, config)
  await syncEngine.initialize()
  return syncEngine
}

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfiguration = {
  autoSyncEnabled: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  backoffMultiplier: 2,
  initialRetryDelay: 1000,
  maxRetryDelay: 300000, // 5 minutes
  batchSize: 10,
  storageQuotaMB: 100,
  priorityWeights: {
    0: 1,  // LOW
    1: 2,  // MEDIUM
    2: 4,  // HIGH
    3: 8   // CRITICAL
  },
  conflictResolutionDefaults: {
    post: 'last_modified_wins',
    comment: 'client_wins',
    message: 'client_wins',
    resource: 'server_wins',
    community: 'server_wins',
    user_profile: 'merge',
    media_attachment: 'server_wins'
  }
}