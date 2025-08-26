/**
 * Offline Status Monitor
 * Monitors and provides feedback on offline status and sync progress
 */

import { EventEmitter } from 'events'
import { NetworkMonitor } from '../api/networkMonitor'
import { StorageService } from '../storage/types'
import { 
  OfflineStatus, 
  SyncResult, 
  SyncError,
  SyncEventListener,
  SyncMetrics 
} from './types'

export class OfflineStatusMonitor extends EventEmitter {
  private networkMonitor: NetworkMonitor
  private storage: StorageService
  private currentStatus: OfflineStatus
  private listeners: Set<SyncEventListener> = new Set()
  private metrics: SyncMetrics
  private statusUpdateInterval: NodeJS.Timeout | null = null

  constructor(networkMonitor: NetworkMonitor, storage: StorageService) {
    super()
    this.networkMonitor = networkMonitor
    this.storage = storage
    
    this.currentStatus = {
      isOnline: false,
      isSyncing: false,
      pendingOperations: 0,
      failedOperations: 0,
      storageUsed: 0,
      storageLimit: 100 * 1024 * 1024, // 100MB default
      autoSyncEnabled: true,
      syncPaused: false,
      conflicts: 0
    }

    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageSyncTime: 0,
      dataTransferred: 0,
      conflictsResolved: 0,
      lastSyncDuration: 0,
      syncFrequency: 0
    }

    this.initialize()
  }

  /**
   * Get current offline status
   */
  getOfflineStatus(): OfflineStatus {
    return { ...this.currentStatus }
  }

  /**
   * Get sync metrics
   */
  getSyncMetrics(): SyncMetrics {
    return { ...this.metrics }
  }

  /**
   * Add sync event listener
   */
  addSyncListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Remove sync event listener
   */
  removeSyncListener(listener: SyncEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Update sync status
   */
  updateSyncStatus(updates: Partial<OfflineStatus>): void {
    const previousStatus = { ...this.currentStatus }
    this.currentStatus = { ...this.currentStatus, ...updates }

    // Emit status change event
    this.emit('statusChanged', this.currentStatus, previousStatus)

    // Notify listeners of specific changes
    if (updates.isSyncing !== undefined && updates.isSyncing !== previousStatus.isSyncing) {
      if (updates.isSyncing) {
        this.notifyListeners('onSyncStarted')
      }
    }

    if (updates.isOnline !== undefined && updates.isOnline !== previousStatus.isOnline) {
      this.notifyListeners('onNetworkStatusChanged', updates.isOnline)
    }
  }

  /**
   * Record sync completion
   */
  recordSyncCompletion(result: SyncResult): void {
    // Update metrics
    this.metrics.totalOperations += result.operationsProcessed
    this.metrics.successfulOperations += result.operationsSucceeded
    this.metrics.failedOperations += result.operationsFailed
    this.metrics.lastSyncDuration = result.syncDuration
    this.metrics.conflictsResolved += result.conflicts.length

    // Update average sync time
    const totalSyncs = this.metrics.successfulOperations + this.metrics.failedOperations
    if (totalSyncs > 0) {
      this.metrics.averageSyncTime = (
        (this.metrics.averageSyncTime * (totalSyncs - 1)) + result.syncDuration
      ) / totalSyncs
    }

    // Update status
    this.updateSyncStatus({
      isSyncing: false,
      lastSyncTime: new Date(),
      nextSyncTime: result.nextSyncTime,
      conflicts: result.conflicts.length
    })

    // Notify listeners
    this.notifyListeners('onSyncCompleted', result)

    // Save metrics to storage
    this.saveMetrics()
  }

  /**
   * Record sync failure
   */
  recordSyncFailure(error: SyncError): void {
    this.metrics.failedOperations++

    this.updateSyncStatus({
      isSyncing: false
    })

    this.notifyListeners('onSyncFailed', error)
  }

  /**
   * Record operation queued
   */
  recordOperationQueued(): void {
    this.updateSyncStatus({
      pendingOperations: this.currentStatus.pendingOperations + 1
    })
  }

  /**
   * Record operation completed
   */
  recordOperationCompleted(operationId: string): void {
    this.updateSyncStatus({
      pendingOperations: Math.max(0, this.currentStatus.pendingOperations - 1)
    })

    this.notifyListeners('onOperationCompleted', operationId)
  }

  /**
   * Record operation failed
   */
  recordOperationFailed(operationId: string, error: SyncError): void {
    this.updateSyncStatus({
      pendingOperations: Math.max(0, this.currentStatus.pendingOperations - 1),
      failedOperations: this.currentStatus.failedOperations + 1
    })

    this.notifyListeners('onOperationFailed', operationId, error)
  }

  /**
   * Record storage usage
   */
  async updateStorageUsage(): Promise<void> {
    try {
      const usage = await this.calculateStorageUsage()
      
      this.updateSyncStatus({
        storageUsed: usage
      })

      // Check if quota exceeded
      if (usage > this.currentStatus.storageLimit) {
        this.notifyListeners('onStorageQuotaExceeded', usage, this.currentStatus.storageLimit)
      }
    } catch (error) {
      console.error('Failed to update storage usage:', error)
    }
  }

  /**
   * Set storage limit
   */
  setStorageLimit(limitBytes: number): void {
    this.updateSyncStatus({
      storageLimit: limitBytes
    })
  }

  /**
   * Pause sync
   */
  pauseSync(): void {
    this.updateSyncStatus({
      syncPaused: true
    })
  }

  /**
   * Resume sync
   */
  resumeSync(): void {
    this.updateSyncStatus({
      syncPaused: false
    })
  }

  /**
   * Enable/disable auto sync
   */
  setAutoSyncEnabled(enabled: boolean): void {
    this.updateSyncStatus({
      autoSyncEnabled: enabled
    })
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(): string {
    if (!this.currentStatus.isOnline) {
      return 'Offline - Changes will sync when connected'
    }

    if (this.currentStatus.isSyncing) {
      return 'Syncing...'
    }

    if (this.currentStatus.syncPaused) {
      return 'Sync paused'
    }

    if (this.currentStatus.pendingOperations > 0) {
      return `${this.currentStatus.pendingOperations} changes pending sync`
    }

    if (this.currentStatus.failedOperations > 0) {
      return `${this.currentStatus.failedOperations} sync errors - tap to retry`
    }

    if (this.currentStatus.conflicts > 0) {
      return `${this.currentStatus.conflicts} conflicts need resolution`
    }

    if (this.currentStatus.lastSyncTime) {
      const timeSince = Date.now() - this.currentStatus.lastSyncTime.getTime()
      const minutes = Math.floor(timeSince / 60000)
      
      if (minutes < 1) {
        return 'Synced just now'
      } else if (minutes < 60) {
        return `Synced ${minutes} minutes ago`
      } else {
        const hours = Math.floor(minutes / 60)
        return `Synced ${hours} hours ago`
      }
    }

    return 'Ready to sync'
  }

  /**
   * Get storage usage percentage
   */
  getStorageUsagePercentage(): number {
    if (this.currentStatus.storageLimit === 0) return 0
    return (this.currentStatus.storageUsed / this.currentStatus.storageLimit) * 100
  }

  /**
   * Check if storage is nearly full
   */
  isStorageNearlyFull(threshold = 0.8): boolean {
    return this.getStorageUsagePercentage() / 100 > threshold
  }

  /**
   * Initialize the monitor
   */
  private initialize(): void {
    // Set up network monitoring
    this.networkMonitor.addListener((networkStatus) => {
      this.updateSyncStatus({
        isOnline: networkStatus.isConnected && networkStatus.isInternetReachable !== false
      })
    })

    // Set initial network status
    const networkStatus = this.networkMonitor.getCurrentStatus()
    this.updateSyncStatus({
      isOnline: networkStatus.isConnected && networkStatus.isInternetReachable !== false
    })

    // Start periodic status updates
    this.startStatusUpdates()

    // Load saved metrics
    this.loadMetrics()
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    this.statusUpdateInterval = setInterval(() => {
      this.updateStorageUsage()
    }, 30000) // Update every 30 seconds
  }

  /**
   * Stop periodic status updates
   */
  private stopStatusUpdates(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval)
      this.statusUpdateInterval = null
    }
  }

  /**
   * Calculate current storage usage
   */
  private async calculateStorageUsage(): Promise<number> {
    try {
      // This would calculate actual storage usage
      // For now, return a mock value
      return 0
    } catch (error) {
      console.error('Failed to calculate storage usage:', error)
      return 0
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(eventName: keyof SyncEventListener, ...args: any[]): void {
    this.listeners.forEach(listener => {
      try {
        const handler = listener[eventName] as Function
        if (handler) {
          handler(...args)
        }
      } catch (error) {
        console.error(`Error in sync listener ${eventName}:`, error)
      }
    })
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await this.storage.setItem('sync_metrics', this.metrics)
    } catch (error) {
      console.error('Failed to save sync metrics:', error)
    }
  }

  /**
   * Load metrics from storage
   */
  private async loadMetrics(): Promise<void> {
    try {
      const savedMetrics = await this.storage.getItem<SyncMetrics>('sync_metrics')
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...savedMetrics }
      }
    } catch (error) {
      console.error('Failed to load sync metrics:', error)
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStatusUpdates()
    this.listeners.clear()
    this.removeAllListeners()
  }
}