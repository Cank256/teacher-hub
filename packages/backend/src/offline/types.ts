// Types for offline storage and synchronization

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'resource' | 'message' | 'profile' | 'community';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: string;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt?: Date;
  priority: 'high' | 'medium' | 'low';
  size: number;
}

export interface SyncStatus {
  lastSyncAt: Date;
  pendingOperations: number;
  failedOperations: number;
  isOnline: boolean;
  syncInProgress: boolean;
}

export interface OfflineStorageConfig {
  dbPath: string;
  maxCacheSize: number; // in MB
  maxRetries: number;
  retryDelay: number; // in milliseconds
  syncInterval: number; // in milliseconds
  priorityLevels: {
    high: number; // retention time in hours
    medium: number;
    low: number;
  };
}

export interface StorageQuota {
  total: number;
  used: number;
  available: number;
  critical: boolean; // true when less than 10% available
}

export interface OfflineResource {
  id: string;
  title: string;
  description: string;
  type: string;
  localPath: string;
  originalUrl: string;
  size: number;
  downloadedAt: Date;
  lastAccessedAt: Date;
  priority: 'high' | 'medium' | 'low';
  isComplete: boolean;
}

export interface OfflineMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: string;
  timestamp: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  localOnly: boolean;
}

export interface ConflictResolution {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict';
  resolution: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}