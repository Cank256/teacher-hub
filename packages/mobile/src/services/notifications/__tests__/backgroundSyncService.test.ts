/**
 * Background Sync Service Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackgroundSyncService } from '../backgroundSyncService';
import { storageService } from '../../storage/storageService';
import { syncService } from '../../sync/syncService';
import './setup';

describe('BackgroundSyncService', () => {
  let backgroundSyncService: BackgroundSyncService;

  beforeEach(() => {
    // Reset the singleton instance for testing
    (BackgroundSyncService as any).instance = null;
    backgroundSyncService = BackgroundSyncService.getInstance();
  });

  describe('initialization', () => {
    it('should initialize successfully with default config', async () => {
      const mockDefineTask = jest.mocked(TaskManager.defineTask);
      const mockRegisterTask = jest.mocked(BackgroundFetch.registerTaskAsync);
      const mockGetStatus = jest.mocked(BackgroundFetch.getStatusAsync);
      
      mockGetStatus.mockResolvedValue(BackgroundFetch.BackgroundFetchStatus.Available);

      await backgroundSyncService.initialize();

      expect(mockDefineTask).toHaveBeenCalledTimes(2); // Two tasks registered
      expect(mockRegisterTask).toHaveBeenCalled();
    });

    it('should load existing config from storage', async () => {
      const mockConfig = {
        enabled: false,
        interval: 1800,
        maxExecutionTime: 60,
        batteryOptimized: false,
        wifiOnly: true,
        criticalOnly: true,
      };
      
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockConfig);

      await backgroundSyncService.initialize();

      const config = backgroundSyncService.getConfig();
      expect(config).toEqual(expect.objectContaining(mockConfig));
    });

    it('should handle restricted background fetch', async () => {
      const mockGetStatus = jest.mocked(BackgroundFetch.getStatusAsync);
      const mockRegisterTask = jest.mocked(BackgroundFetch.registerTaskAsync);
      
      mockGetStatus.mockResolvedValue(BackgroundFetch.BackgroundFetchStatus.Restricted);

      await backgroundSyncService.initialize();

      expect(mockRegisterTask).not.toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should update config and restart background fetch', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      const mockRegisterTask = jest.mocked(BackgroundFetch.registerTaskAsync);
      
      const newConfig = {
        enabled: true,
        interval: 600,
        batteryOptimized: false,
      };

      await backgroundSyncService.updateConfig(newConfig);

      expect(mockSetItem).toHaveBeenCalledWith('backgroundSyncConfig', expect.objectContaining(newConfig));
      expect(mockRegisterTask).toHaveBeenCalled();
    });

    it('should stop background fetch when disabled', async () => {
      const mockUnregisterTask = jest.mocked(BackgroundFetch.unregisterTaskAsync);
      
      await backgroundSyncService.updateConfig({ enabled: false });

      expect(mockUnregisterTask).toHaveBeenCalled();
    });

    it('should enable/disable background sync', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      
      await backgroundSyncService.setEnabled(false);

      expect(mockSetItem).toHaveBeenCalledWith('backgroundSyncConfig', expect.objectContaining({
        enabled: false,
      }));
    });

    it('should set battery optimization mode', async () => {
      await backgroundSyncService.setBatteryOptimized(true);

      const config = backgroundSyncService.getConfig();
      expect(config.batteryOptimized).toBe(true);
    });

    it('should set critical-only mode', async () => {
      await backgroundSyncService.setCriticalOnly(true);

      const config = backgroundSyncService.getConfig();
      expect(config.criticalOnly).toBe(true);
    });
  });

  describe('background sync execution', () => {
    it('should perform background sync with critical tasks', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSyncPendingOperations = jest.mocked(syncService.syncPendingOperations);
      
      // Mock critical tasks
      mockGetItem.mockImplementation((key) => {
        if (key === 'hasCriticalGovernmentUpdates') return Promise.resolve(true);
        if (key === 'unreadMessageCount') return Promise.resolve(5);
        if (key === 'pendingOfflineOperations') return Promise.resolve([{}, {}]);
        return Promise.resolve(null);
      });
      
      mockSyncPendingOperations.mockResolvedValue({ success: true });

      const result = await (backgroundSyncService as any).performBackgroundSync();

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBeGreaterThan(0);
      expect(mockSyncPendingOperations).toHaveBeenCalled();
    });

    it('should skip sync when battery optimization prevents it', async () => {
      // Mock battery optimization check to return false
      jest.spyOn(backgroundSyncService as any, 'shouldRunBackgroundSync').mockReturnValue(false);
      
      await backgroundSyncService.updateConfig({ batteryOptimized: true });

      const result = await (backgroundSyncService as any).performBackgroundSync();

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(0);
    });

    it('should respect execution time limits', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      
      // Mock many tasks
      mockGetItem.mockImplementation((key) => {
        if (key === 'pendingOfflineOperations') {
          return Promise.resolve(Array(100).fill({})); // 100 operations
        }
        return Promise.resolve(null);
      });

      // Set very short execution time
      await backgroundSyncService.updateConfig({ maxExecutionTime: 0.001 });

      const result = await (backgroundSyncService as any).performBackgroundSync();

      // Should complete but with limited tasks due to time constraint
      expect(result.executionTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle sync errors gracefully', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSyncPendingOperations = jest.mocked(syncService.syncPendingOperations);
      
      mockGetItem.mockImplementation((key) => {
        if (key === 'pendingOfflineOperations') return Promise.resolve([{}]);
        return Promise.resolve(null);
      });
      
      mockSyncPendingOperations.mockRejectedValue(new Error('Sync failed'));

      const result = await (backgroundSyncService as any).performBackgroundSync();

      expect(result.errors).toContain('Critical task failed: Sync failed');
    });
  });

  describe('background fetch execution', () => {
    it('should perform background fetch successfully', async () => {
      const mockCheckNotifications = jest.spyOn(backgroundSyncService as any, 'checkForNewNotifications');
      const mockCheckGovernment = jest.spyOn(backgroundSyncService as any, 'checkForGovernmentUpdates');
      const mockSyncOperations = jest.spyOn(backgroundSyncService as any, 'syncPendingOperations');
      
      mockCheckNotifications.mockResolvedValue(true);
      mockCheckGovernment.mockResolvedValue(true);
      mockSyncOperations.mockResolvedValue(3);

      const result = await (backgroundSyncService as any).performBackgroundFetch();

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(5); // 1 + 1 + 3
    });

    it('should handle fetch errors', async () => {
      const mockCheckNotifications = jest.spyOn(backgroundSyncService as any, 'checkForNewNotifications');
      mockCheckNotifications.mockRejectedValue(new Error('Fetch failed'));

      const result = await (backgroundSyncService as any).performBackgroundFetch();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Background fetch failed: Fetch failed');
    });
  });

  describe('task execution', () => {
    it('should execute government updates sync task', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await (backgroundSyncService as any).executeTask('sync_government_updates');

      expect(mockSetItem).toHaveBeenCalledWith('hasCriticalGovernmentUpdates', false);
      expect(mockSetItem).toHaveBeenCalledWith('lastGovernmentSyncTime', expect.any(String));
    });

    it('should execute messages sync task', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await (backgroundSyncService as any).executeTask('sync_messages');

      expect(mockSetItem).toHaveBeenCalledWith('lastMessageSyncTime', expect.any(String));
    });

    it('should execute offline operations sync task', async () => {
      const mockSyncPendingOperations = jest.mocked(syncService.syncPendingOperations);
      mockSyncPendingOperations.mockResolvedValue({ success: true });

      await (backgroundSyncService as any).executeTask('sync_offline_operations');

      expect(mockSyncPendingOperations).toHaveBeenCalled();
    });

    it('should handle unknown task gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (backgroundSyncService as any).executeTask('unknown_task');

      expect(consoleSpy).toHaveBeenCalledWith('Unknown sync task:', 'unknown_task');
      consoleSpy.mockRestore();
    });
  });

  describe('sync statistics', () => {
    it('should calculate sync statistics correctly', async () => {
      const mockLogs = [
        {
          timestamp: new Date().toISOString(),
          result: { success: true, executionTime: 1000, tasksCompleted: 3, errors: [] },
        },
        {
          timestamp: new Date().toISOString(),
          result: { success: false, executionTime: 500, tasksCompleted: 1, errors: ['Error'] },
        },
        {
          timestamp: new Date().toISOString(),
          result: { success: true, executionTime: 1500, tasksCompleted: 2, errors: [] },
        },
      ];

      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockLogs);

      const stats = await backgroundSyncService.getSyncStatistics();

      expect(stats.totalSyncs).toBe(3);
      expect(stats.successRate).toBe(66.67); // 2 out of 3 successful
      expect(stats.averageExecutionTime).toBe(1000); // (1000 + 500 + 1500) / 3
      expect(stats.lastSyncTime).toBe(mockLogs[2].timestamp);
    });

    it('should handle empty sync logs', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue([]);

      const stats = await backgroundSyncService.getSyncStatistics();

      expect(stats.totalSyncs).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.lastSyncTime).toBeNull();
    });
  });

  describe('critical task identification', () => {
    it('should identify critical government updates', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'hasCriticalGovernmentUpdates') return Promise.resolve(true);
        return Promise.resolve(null);
      });

      const tasks = await (backgroundSyncService as any).getCriticalSyncTasks();

      expect(tasks).toContain('sync_government_updates');
    });

    it('should identify unread messages as critical', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'unreadMessageCount') return Promise.resolve(5);
        return Promise.resolve(null);
      });

      const tasks = await (backgroundSyncService as any).getCriticalSyncTasks();

      expect(tasks).toContain('sync_messages');
    });

    it('should identify pending offline operations as critical', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'pendingOfflineOperations') return Promise.resolve([{}, {}]);
        return Promise.resolve(null);
      });

      const tasks = await (backgroundSyncService as any).getCriticalSyncTasks();

      expect(tasks).toContain('sync_offline_operations');
    });
  });

  describe('normal task identification', () => {
    it('should identify outdated post sync as normal task', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      
      mockGetItem.mockImplementation((key) => {
        if (key === 'lastPostSyncTime') return Promise.resolve(oldTime);
        return Promise.resolve(null);
      });

      const tasks = await (backgroundSyncService as any).getNormalSyncTasks();

      expect(tasks).toContain('sync_posts');
    });

    it('should not include recent syncs in normal tasks', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const recentTime = new Date().toISOString(); // Now
      
      mockGetItem.mockImplementation((key) => {
        if (key === 'lastPostSyncTime') return Promise.resolve(recentTime);
        return Promise.resolve(null);
      });

      const tasks = await (backgroundSyncService as any).getNormalSyncTasks();

      expect(tasks).not.toContain('sync_posts');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BackgroundSyncService.getInstance();
      const instance2 = BackgroundSyncService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});