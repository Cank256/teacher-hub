/**
 * Offline Synchronization Types and Interfaces
 */

export interface SyncService {
  // Operation queue management
  queueOperation(operation: OfflineOperation): Promise<void>
  syncPendingOperations(): Promise<SyncResult>
  retryFailedOperations(): Promise<void>
  clearOperationQueue(): Promise<void>
  
  // Content management
  downloadForOffline(resourceIds: string[], priority?: SyncPriority): Promise<void>
  removeOfflineContent(resourceIds: string[]): Promise<void>
  getOfflineStatus(): Promise<OfflineStatus>
  
  // Sync control
  enableAutoSync(enabled: boolean): Promise<void>
  forceSyncNow(): Promise<SyncResult>
  pauseSync(): Promise<void>
  resumeSync(): Promise<void>
  
  // Event listeners
  addSyncListener(listener: SyncEventListener): () => void
  removeSyncListener(listener: SyncEventListener): void
}

export interface OfflineOperation {
  id: string
  type: OperationType
  resourceType: ResourceType
  resourceId?: string
  data: any
  priority: SyncPriority
  retryCount: number
  maxRetries: number
  createdAt: Date
  scheduledAt: Date
  lastAttemptAt?: Date
  errorMessage?: string
  conflictResolution?: ConflictResolutionStrategy
}

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD'
}

export enum ResourceType {
  POST = 'post',
  COMMENT = 'comment',
  MESSAGE = 'message',
  RESOURCE = 'resource',
  COMMUNITY = 'community',
  USER_PROFILE = 'user_profile',
  MEDIA_ATTACHMENT = 'media_attachment'
}

export enum SyncPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum ConflictResolutionStrategy {
  CLIENT_WINS = 'client_wins',
  SERVER_WINS = 'server_wins',
  MERGE = 'merge',
  PROMPT_USER = 'prompt_user',
  LAST_MODIFIED_WINS = 'last_modified_wins'
}

export interface SyncResult {
  success: boolean
  operationsProcessed: number
  operationsSucceeded: number
  operationsFailed: number
  conflicts: SyncConflict[]
  errors: SyncError[]
  nextSyncTime?: Date
  syncDuration: number
}

export interface SyncConflict {
  operationId: string
  resourceType: ResourceType
  resourceId: string
  clientData: any
  serverData: any
  conflictType: ConflictType
  resolutionStrategy: ConflictResolutionStrategy
  resolvedData?: any
  timestamp: Date
}

export enum ConflictType {
  CONCURRENT_MODIFICATION = 'concurrent_modification',
  DELETED_ON_SERVER = 'deleted_on_server',
  CREATED_ON_BOTH = 'created_on_both',
  VERSION_MISMATCH = 'version_mismatch'
}

export interface SyncError {
  operationId: string
  errorType: SyncErrorType
  message: string
  isRetryable: boolean
  retryAfter?: Date
  details?: any
}

export enum SyncErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'auth_error',
  VALIDATION_ERROR = 'validation_error',
  CONFLICT_ERROR = 'conflict_error',
  STORAGE_ERROR = 'storage_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface OfflineStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingOperations: number
  failedOperations: number
  lastSyncTime?: Date
  nextSyncTime?: Date
  storageUsed: number
  storageLimit: number
  autoSyncEnabled: boolean
  syncPaused: boolean
  conflicts: number
}

export interface SyncEventListener {
  onSyncStarted?: () => void
  onSyncCompleted?: (result: SyncResult) => void
  onSyncFailed?: (error: SyncError) => void
  onOperationQueued?: (operation: OfflineOperation) => void
  onOperationCompleted?: (operationId: string) => void
  onOperationFailed?: (operationId: string, error: SyncError) => void
  onConflictDetected?: (conflict: SyncConflict) => void
  onStorageQuotaExceeded?: (usage: number, limit: number) => void
  onNetworkStatusChanged?: (isOnline: boolean) => void
}

export interface SyncConfiguration {
  autoSyncEnabled: boolean
  syncInterval: number // milliseconds
  maxRetries: number
  backoffMultiplier: number
  initialRetryDelay: number
  maxRetryDelay: number
  batchSize: number
  storageQuotaMB: number
  priorityWeights: Record<SyncPriority, number>
  conflictResolutionDefaults: Record<ResourceType, ConflictResolutionStrategy>
}

export interface ContentDownloadRequest {
  resourceId: string
  resourceType: ResourceType
  priority: SyncPriority
  url: string
  expectedSize?: number
  metadata?: any
}

export interface DownloadProgress {
  resourceId: string
  progress: number // 0-100
  downloadedBytes: number
  totalBytes: number
  status: DownloadStatus
  error?: string
}

export enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface SyncMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageSyncTime: number
  dataTransferred: number
  conflictsResolved: number
  lastSyncDuration: number
  syncFrequency: number
}

export interface BackgroundSyncTask {
  id: string
  type: 'sync' | 'download' | 'cleanup'
  priority: SyncPriority
  scheduledAt: Date
  estimatedDuration: number
  batteryOptimized: boolean
  wifiOnly: boolean
}

// Utility types for type safety
export type SyncableResource = {
  id: string
  lastModified: Date
  version?: number
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'failed'
}

export type ConflictResolver<T = any> = (
  clientData: T,
  serverData: T,
  conflict: SyncConflict
) => Promise<T | null>

export type SyncFilter = {
  resourceTypes?: ResourceType[]
  priorities?: SyncPriority[]
  dateRange?: {
    from: Date
    to: Date
  }
  maxOperations?: number
}