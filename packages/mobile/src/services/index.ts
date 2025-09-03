/**
 * Services Index
 * 
 * Centralized exports for all mobile app services
 */

// Device Integration Services
export * from './device'

// Authentication Services
export * from './auth'

// API Services
export * from './api'

// Storage Services
export * from './storage'

// Security Services
export * from './security'

// Performance Services
export * from './performance'

// Messaging Services
export * from './messaging'

// Notifications Services
export {
    notificationService,
    NotificationService,
    notificationPreferencesService,
    NotificationPreferencesService,
    notificationAnalyticsService,
    NotificationAnalyticsService,
    governmentNotificationService,
    GovernmentNotificationService,
    BackgroundSyncService as NotificationBackgroundSyncService,
    backgroundSyncService as notificationBackgroundSyncService
} from './notifications'

// Sync Services
export {
    SyncEngine,
    OperationQueue,
    ConflictResolutionManager,
    BackgroundSyncService as SyncBackgroundSyncService,
    OfflineStatusMonitor,
    ContentDownloadManager,
    createSyncEngine,
    DEFAULT_SYNC_CONFIG
} from './sync'

// Export types from both modules
export * from '../types/notifications'

// Export sync types with explicit naming to avoid conflicts
export type {
    SyncConfiguration,
    OfflineOperation,
    SyncPriority,
    ConflictResolutionStrategy,
    SyncResult as SyncEngineResult,
    SyncError,
    SyncEventListener,
    OfflineStatus,
    SyncConflict,
    SyncMetrics,
    BackgroundSyncTask
} from './sync/types'

// Analytics Services
export * from './analytics'

// Individual service exports
export { HapticService as haptics } from './haptics'
export { default as monitoring } from './monitoring'