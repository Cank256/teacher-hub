/**
 * Background Sync Service
 * Handles background tasks with minimal battery impact
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { storageService } from '../storage/storageService';
import { apiClient } from '../api/apiClient';
import { syncService } from '../sync/syncService';

const BACKGROUND_SYNC_TASK = 'background-sync-task';
const BACKGROUND_FETCH_TASK = 'background-fetch-task';

export interface BackgroundSyncConfig {
  enabled: boolean;
  interval: number; // in seconds
  maxExecutionTime: number; // in seconds
  batteryOptimized: boolean;
  wifiOnly: boolean;
  criticalOnly: boolean;
}

export interface BackgroundSyncResult {
  success: boolean;
  tasksCompleted: number;
  errors: string[];
  executionTime: number;
  batteryUsage?: number;
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isInitialized = false;
  private config: BackgroundSyncConfig = {
    enabled: true,
    interval: 900, // 15 minutes
    maxExecutionTime: 30, // 30 seconds
    batteryOptimized: true,
    wifiOnly: false,
    criticalOnly: false,
  };

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Initialize background sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load configuration
      await this.loadConfig();
      
      // Register background tasks
      this.registerBackgroundTasks();
      
      // Start background fetch if enabled
      if (this.config.enabled) {
        await this.startBackgroundFetch();
      }
      
      this.isInitialized = true;
      console.log('Background sync service initialized');
    } catch (error) {
      console.error('Failed to initialize background sync service:', error);
      throw error;
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await storageService.getItem<BackgroundSyncConfig>('backgroundSyncConfig');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.warn('Failed to load background sync config:', error);
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<BackgroundSyncConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await storageService.setItem('backgroundSyncConfig', this.config);
      
      // Restart background fetch with new config
      if (this.config.enabled) {
        await this.startBackgroundFetch();
      } else {
        await this.stopBackgroundFetch();
      }
      
      console.log('Background sync config updated:', this.config);
    } catch (error) {
      console.error('Failed to update background sync config:', error);
      throw error;
    }
  }

  /**
   * Register background tasks
   */
  private registerBackgroundTasks(): void {
    // Register background sync task
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background sync task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      try {
        const result = await this.performBackgroundSync();
        console.log('Background sync completed:', result);
        
        return result.success 
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.Failed;
      } catch (error) {
        console.error('Background sync execution error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register background fetch task
    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        const result = await this.performBackgroundFetch();
        console.log('Background fetch completed:', result);
        
        return result.success 
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('Background fetch execution error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Start background fetch
   */
  private async startBackgroundFetch(): Promise<void> {
    try {
      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.warn('Background fetch is restricted');
        return;
      }

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: this.config.interval,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background fetch registered with interval:', this.config.interval);
    } catch (error) {
      console.error('Failed to start background fetch:', error);
    }
  }

  /**
   * Stop background fetch
   */
  private async stopBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Background fetch unregistered');
    } catch (error) {
      console.error('Failed to stop background fetch:', error);
    }
  }

  /**
   * Perform background sync with battery optimization
   */
  private async performBackgroundSync(): Promise<BackgroundSyncResult> {
    const startTime = Date.now();
    const result: BackgroundSyncResult = {
      success: false,
      tasksCompleted: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      // Check battery optimization settings
      if (this.config.batteryOptimized && !this.shouldRunBackgroundSync()) {
        console.log('Skipping background sync due to battery optimization');
        result.success = true;
        return result;
      }

      // Perform critical tasks first
      const criticalTasks = await this.getCriticalSyncTasks();
      for (const task of criticalTasks) {
        try {
          await this.executeTask(task);
          result.tasksCompleted++;
        } catch (error) {
          console.error('Critical task failed:', error);
          result.errors.push(`Critical task failed: ${error.message}`);
        }

        // Check execution time limit
        if (Date.now() - startTime > this.config.maxExecutionTime * 1000) {
          console.warn('Background sync time limit reached');
          break;
        }
      }

      // Perform non-critical tasks if time allows and not in critical-only mode
      if (!this.config.criticalOnly && Date.now() - startTime < this.config.maxExecutionTime * 800) {
        const normalTasks = await this.getNormalSyncTasks();
        for (const task of normalTasks) {
          try {
            await this.executeTask(task);
            result.tasksCompleted++;
          } catch (error) {
            console.warn('Normal task failed:', error);
            result.errors.push(`Normal task failed: ${error.message}`);
          }

          // Check execution time limit
          if (Date.now() - startTime > this.config.maxExecutionTime * 1000) {
            break;
          }
        }
      }

      result.success = result.errors.length === 0 || result.tasksCompleted > 0;
    } catch (error) {
      console.error('Background sync failed:', error);
      result.errors.push(`Background sync failed: ${error.message}`);
    } finally {
      result.executionTime = Date.now() - startTime;
      
      // Log sync result
      await this.logSyncResult(result);
    }

    return result;
  }

  /**
   * Perform background fetch
   */
  private async performBackgroundFetch(): Promise<BackgroundSyncResult> {
    const startTime = Date.now();
    const result: BackgroundSyncResult = {
      success: false,
      tasksCompleted: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      // Check for new notifications
      const hasNewNotifications = await this.checkForNewNotifications();
      if (hasNewNotifications) {
        result.tasksCompleted++;
      }

      // Check for critical government updates
      const hasGovernmentUpdates = await this.checkForGovernmentUpdates();
      if (hasGovernmentUpdates) {
        result.tasksCompleted++;
      }

      // Sync pending offline operations (limited)
      const syncedOperations = await this.syncPendingOperations(5); // Limit to 5 operations
      result.tasksCompleted += syncedOperations;

      result.success = true;
    } catch (error) {
      console.error('Background fetch failed:', error);
      result.errors.push(`Background fetch failed: ${error.message}`);
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Check if background sync should run based on battery optimization
   */
  private shouldRunBackgroundSync(): boolean {
    // Check battery level (if available)
    // Check if device is charging
    // Check network conditions
    // For now, return true - would implement actual battery checks
    return true;
  }

  /**
   * Get critical sync tasks
   */
  private async getCriticalSyncTasks(): Promise<string[]> {
    const tasks: string[] = [];

    try {
      // Check for critical government notifications
      const hasGovernmentUpdates = await storageService.getItem<boolean>('hasCriticalGovernmentUpdates');
      if (hasGovernmentUpdates) {
        tasks.push('sync_government_updates');
      }

      // Check for unread messages
      const unreadMessages = await storageService.getItem<number>('unreadMessageCount') || 0;
      if (unreadMessages > 0) {
        tasks.push('sync_messages');
      }

      // Check for pending offline operations
      const pendingOperations = await storageService.getItem<any[]>('pendingOfflineOperations') || [];
      if (pendingOperations.length > 0) {
        tasks.push('sync_offline_operations');
      }
    } catch (error) {
      console.error('Error getting critical sync tasks:', error);
    }

    return tasks;
  }

  /**
   * Get normal sync tasks
   */
  private async getNormalSyncTasks(): Promise<string[]> {
    const tasks: string[] = [];

    try {
      // Check for new posts
      const lastPostSync = await storageService.getItem<string>('lastPostSyncTime');
      if (!lastPostSync || Date.now() - new Date(lastPostSync).getTime() > 3600000) { // 1 hour
        tasks.push('sync_posts');
      }

      // Check for community updates
      const lastCommunitySync = await storageService.getItem<string>('lastCommunitySyncTime');
      if (!lastCommunitySync || Date.now() - new Date(lastCommunitySync).getTime() > 7200000) { // 2 hours
        tasks.push('sync_communities');
      }

      // Check for resource updates
      const lastResourceSync = await storageService.getItem<string>('lastResourceSyncTime');
      if (!lastResourceSync || Date.now() - new Date(lastResourceSync).getTime() > 14400000) { // 4 hours
        tasks.push('sync_resources');
      }
    } catch (error) {
      console.error('Error getting normal sync tasks:', error);
    }

    return tasks;
  }

  /**
   * Execute a sync task
   */
  private async executeTask(taskName: string): Promise<void> {
    switch (taskName) {
      case 'sync_government_updates':
        await this.syncGovernmentUpdates();
        break;
      case 'sync_messages':
        await this.syncMessages();
        break;
      case 'sync_offline_operations':
        await this.syncOfflineOperations();
        break;
      case 'sync_posts':
        await this.syncPosts();
        break;
      case 'sync_communities':
        await this.syncCommunities();
        break;
      case 'sync_resources':
        await this.syncResources();
        break;
      default:
        console.warn('Unknown sync task:', taskName);
    }
  }

  /**
   * Sync government updates
   */
  private async syncGovernmentUpdates(): Promise<void> {
    try {
      // This would integrate with the government service
      console.log('Syncing government updates in background');
      
      // Mark as synced
      await storageService.setItem('hasCriticalGovernmentUpdates', false);
      await storageService.setItem('lastGovernmentSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync government updates:', error);
      throw error;
    }
  }

  /**
   * Sync messages
   */
  private async syncMessages(): Promise<void> {
    try {
      // This would integrate with the messaging service
      console.log('Syncing messages in background');
      
      // Update sync time
      await storageService.setItem('lastMessageSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync messages:', error);
      throw error;
    }
  }

  /**
   * Sync offline operations
   */
  private async syncOfflineOperations(): Promise<void> {
    try {
      // Use the existing sync service
      await syncService.syncPendingOperations();
      console.log('Synced offline operations in background');
    } catch (error) {
      console.error('Failed to sync offline operations:', error);
      throw error;
    }
  }

  /**
   * Sync posts
   */
  private async syncPosts(): Promise<void> {
    try {
      console.log('Syncing posts in background');
      
      // Update sync time
      await storageService.setItem('lastPostSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync posts:', error);
      throw error;
    }
  }

  /**
   * Sync communities
   */
  private async syncCommunities(): Promise<void> {
    try {
      console.log('Syncing communities in background');
      
      // Update sync time
      await storageService.setItem('lastCommunitySyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync communities:', error);
      throw error;
    }
  }

  /**
   * Sync resources
   */
  private async syncResources(): Promise<void> {
    try {
      console.log('Syncing resources in background');
      
      // Update sync time
      await storageService.setItem('lastResourceSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync resources:', error);
      throw error;
    }
  }

  /**
   * Check for new notifications
   */
  private async checkForNewNotifications(): Promise<boolean> {
    try {
      // This would check with the backend for new notifications
      console.log('Checking for new notifications');
      return false; // Placeholder
    } catch (error) {
      console.error('Failed to check for new notifications:', error);
      return false;
    }
  }

  /**
   * Check for government updates
   */
  private async checkForGovernmentUpdates(): Promise<boolean> {
    try {
      // This would check for critical government updates
      console.log('Checking for government updates');
      return false; // Placeholder
    } catch (error) {
      console.error('Failed to check for government updates:', error);
      return false;
    }
  }

  /**
   * Sync pending operations with limit
   */
  private async syncPendingOperations(limit: number): Promise<number> {
    try {
      const pendingOperations = await storageService.getItem<any[]>('pendingOfflineOperations') || [];
      const operationsToSync = pendingOperations.slice(0, limit);
      
      let syncedCount = 0;
      for (const operation of operationsToSync) {
        try {
          // Sync individual operation
          await syncService.syncOperation(operation);
          syncedCount++;
        } catch (error) {
          console.warn('Failed to sync operation:', error);
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
      return 0;
    }
  }

  /**
   * Log sync result for analytics
   */
  private async logSyncResult(result: BackgroundSyncResult): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        result,
        config: this.config,
      };

      // Store locally
      const syncLogs = await storageService.getItem<any[]>('backgroundSyncLogs') || [];
      syncLogs.push(logEntry);
      
      // Keep only last 50 logs
      if (syncLogs.length > 50) {
        syncLogs.splice(0, syncLogs.length - 50);
      }
      
      await storageService.setItem('backgroundSyncLogs', syncLogs);
      
      // Send to backend for analytics (don't wait)
      apiClient.post('/analytics/background-sync', logEntry).catch((error) => {
        console.warn('Failed to send sync analytics:', error);
      });
    } catch (error) {
      console.warn('Failed to log sync result:', error);
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    totalSyncs: number;
    successRate: number;
    averageExecutionTime: number;
    lastSyncTime: string | null;
  }> {
    try {
      const syncLogs = await storageService.getItem<any[]>('backgroundSyncLogs') || [];
      
      if (syncLogs.length === 0) {
        return {
          totalSyncs: 0,
          successRate: 0,
          averageExecutionTime: 0,
          lastSyncTime: null,
        };
      }

      const totalSyncs = syncLogs.length;
      const successfulSyncs = syncLogs.filter(log => log.result.success).length;
      const successRate = (successfulSyncs / totalSyncs) * 100;
      const averageExecutionTime = syncLogs.reduce((sum, log) => sum + log.result.executionTime, 0) / totalSyncs;
      const lastSyncTime = syncLogs[syncLogs.length - 1]?.timestamp || null;

      return {
        totalSyncs,
        successRate,
        averageExecutionTime,
        lastSyncTime,
      };
    } catch (error) {
      console.error('Failed to get sync statistics:', error);
      return {
        totalSyncs: 0,
        successRate: 0,
        averageExecutionTime: 0,
        lastSyncTime: null,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): BackgroundSyncConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable background sync
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ enabled });
  }

  /**
   * Set battery optimization mode
   */
  async setBatteryOptimized(optimized: boolean): Promise<void> {
    await this.updateConfig({ batteryOptimized: optimized });
  }

  /**
   * Set critical-only mode
   */
  async setCriticalOnly(criticalOnly: boolean): Promise<void> {
    await this.updateConfig({ criticalOnly });
  }
}

export const backgroundSyncService = BackgroundSyncService.getInstance();