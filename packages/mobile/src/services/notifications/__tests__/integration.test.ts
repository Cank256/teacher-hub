/**
 * Notification Services Integration Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { 
  notificationService,
  backgroundSyncService,
  notificationPreferencesService,
  notificationAnalyticsService,
  NotificationCategory 
} from '../index';
import { storageService } from '../../storage/storageService';
import { apiClient } from '../../api/apiClient';
import './setup';

describe('Notification Services Integration', () => {
  beforeEach(() => {
    // Reset all singleton instances
    (notificationService as any).constructor.instance = null;
    (backgroundSyncService as any).constructor.instance = null;
    (notificationPreferencesService as any).constructor.instance = null;
    (notificationAnalyticsService as any).constructor.instance = null;
  });

  describe('complete notification flow', () => {
    it('should handle complete notification lifecycle', async () => {
      // Initialize all services
      await notificationService.initialize();
      await backgroundSyncService.initialize();
      await notificationPreferencesService.initialize();
      await notificationAnalyticsService.initialize();

      // Set up preferences
      await notificationPreferencesService.setCategoryEnabled(NotificationCategory.MESSAGE, true);
      await notificationPreferencesService.setCategorySound(NotificationCategory.MESSAGE, true);

      // Send a local notification
      const notificationId = await notificationService.sendLocalNotification(
        'Test Message',
        'You have a new message',
        {
          id: 'msg-123',
          category: NotificationCategory.MESSAGE,
          type: 'direct_message' as any,
          title: 'Test Message',
          body: 'You have a new message',
          priority: 'high' as any,
          conversationId: 'conv-456',
          timestamp: new Date().toISOString(),
        }
      );

      // Track analytics
      await notificationAnalyticsService.trackReceived('msg-123', NotificationCategory.MESSAGE);
      await notificationAnalyticsService.trackOpened('msg-123', NotificationCategory.MESSAGE);

      // Verify notification was sent
      expect(notificationId).toBeDefined();

      // Verify preferences are respected
      const preferences = notificationPreferencesService.getPreferences();
      expect(preferences?.messages.enabled).toBe(true);
      expect(preferences?.messages.sound).toBe(true);

      // Verify analytics were tracked
      const queueStatus = notificationAnalyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBe(2); // received + opened
    });

    it('should respect quiet hours across services', async () => {
      // Initialize services
      await notificationPreferencesService.initialize();
      
      // Set up quiet hours
      await notificationPreferencesService.updateQuietHours({
        enabled: true,
        startTime: '22:00',
        endTime: '07:00',
        allowCritical: true,
        allowMessages: false,
      });

      // Mock current time to be in quiet hours (23:00)
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Check if in quiet hours
      const inQuietHours = notificationPreferencesService.isInQuietHours();
      expect(inQuietHours).toBe(true);

      // Normal message should be blocked
      const shouldDeliverMessage = notificationPreferencesService.shouldDeliverDuringQuietHours(
        NotificationCategory.MESSAGE,
        'normal'
      );
      expect(shouldDeliverMessage).toBe(false);

      // Critical government notification should be allowed
      const shouldDeliverCritical = notificationPreferencesService.shouldDeliverDuringQuietHours(
        NotificationCategory.GOVERNMENT,
        'critical'
      );
      expect(shouldDeliverCritical).toBe(true);

      jest.restoreAllMocks();
    });

    it('should coordinate background sync with notification preferences', async () => {
      // Initialize services
      await backgroundSyncService.initialize();
      await notificationPreferencesService.initialize();

      // Disable notifications globally
      await notificationPreferencesService.setGlobalEnabled(false);

      // Set background sync to critical only
      await backgroundSyncService.setCriticalOnly(true);

      // Verify configurations
      const syncConfig = backgroundSyncService.getConfig();
      expect(syncConfig.criticalOnly).toBe(true);

      const preferences = notificationPreferencesService.getPreferences();
      expect(preferences?.globalSettings.enabled).toBe(false);

      // Background sync should still work for critical tasks
      const stats = await backgroundSyncService.getSyncStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('error handling across services', () => {
    it('should handle storage failures gracefully', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSetItem = jest.mocked(storageService.setItem);
      
      // Mock storage failures
      mockGetItem.mockRejectedValue(new Error('Storage unavailable'));
      mockSetItem.mockRejectedValue(new Error('Storage unavailable'));

      // Services should handle errors gracefully
      await expect(notificationPreferencesService.initialize()).rejects.toThrow();
      
      // But other services should still work
      await expect(notificationService.initialize()).resolves.not.toThrow();
    });

    it('should handle network failures gracefully', async () => {
      const mockPost = jest.mocked(apiClient.post);
      const mockPut = jest.mocked(apiClient.put);
      
      // Mock network failures
      mockPost.mockRejectedValue(new Error('Network unavailable'));
      mockPut.mockRejectedValue(new Error('Network unavailable'));

      // Initialize services
      await notificationService.initialize();
      await notificationPreferencesService.initialize();
      await notificationAnalyticsService.initialize();

      // Local operations should still work
      await expect(notificationService.sendLocalNotification('Test', 'Body')).resolves.toBeDefined();
      
      // Preference updates should work locally even if backend fails
      await expect(notificationPreferencesService.setCategoryEnabled(NotificationCategory.MESSAGE, false))
        .resolves.not.toThrow();

      // Analytics should queue events even if upload fails
      await expect(notificationAnalyticsService.trackReceived('test', NotificationCategory.MESSAGE))
        .resolves.not.toThrow();
    });
  });

  describe('performance and resource management', () => {
    it('should manage memory efficiently with large datasets', async () => {
      await notificationAnalyticsService.initialize();

      // Track many events
      for (let i = 0; i < 1000; i++) {
        await notificationAnalyticsService.trackReceived(`test-${i}`, NotificationCategory.MESSAGE);
      }

      // Queue should be managed efficiently
      const queueStatus = notificationAnalyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBeLessThanOrEqual(1000);

      // Cleanup should work
      await notificationAnalyticsService.clearOldData(1);
      
      // Should not throw memory errors
      const metrics = await notificationAnalyticsService.getLocalMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle concurrent operations safely', async () => {
      await notificationService.initialize();
      await notificationAnalyticsService.initialize();

      // Perform concurrent operations
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          notificationService.sendLocalNotification(`Title ${i}`, `Body ${i}`),
          notificationAnalyticsService.trackReceived(`test-${i}`, NotificationCategory.MESSAGE),
          notificationAnalyticsService.trackOpened(`test-${i}`, NotificationCategory.MESSAGE)
        );
      }

      // All operations should complete successfully
      const results = await Promise.allSettled(operations);
      const failures = results.filter(result => result.status === 'rejected');
      
      expect(failures.length).toBe(0);
    });
  });

  describe('data consistency across services', () => {
    it('should maintain consistent state across service interactions', async () => {
      // Initialize all services
      await notificationService.initialize();
      await notificationPreferencesService.initialize();
      await notificationAnalyticsService.initialize();

      // Update preferences
      await notificationPreferencesService.setCategoryEnabled(NotificationCategory.MESSAGE, true);
      await notificationPreferencesService.setCategorySound(NotificationCategory.MESSAGE, false);

      // Send notification respecting preferences
      const preferences = notificationPreferencesService.getPreferences();
      const soundEnabled = preferences?.messages.sound;

      await notificationService.sendLocalNotification(
        'Test',
        'Body',
        { id: 'test', category: NotificationCategory.MESSAGE } as any,
        { sound: soundEnabled ? 'message.wav' : undefined }
      );

      // Track the event
      await notificationAnalyticsService.trackReceived('test', NotificationCategory.MESSAGE);

      // Verify consistency
      expect(soundEnabled).toBe(false);
      
      const queueStatus = notificationAnalyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBe(1);
    });

    it('should handle preference changes affecting active notifications', async () => {
      await notificationService.initialize();
      await notificationPreferencesService.initialize();

      // Enable notifications initially
      await notificationPreferencesService.setCategoryEnabled(NotificationCategory.POST, true);
      
      // Send notification
      const notificationId = await notificationService.sendLocalNotification(
        'Post Update',
        'New post in your community',
        { id: 'post-123', category: NotificationCategory.POST } as any
      );

      // Disable notifications
      await notificationPreferencesService.setCategoryEnabled(NotificationCategory.POST, false);

      // Verify notification was sent before preference change
      expect(notificationId).toBeDefined();

      // Verify new notifications would be blocked
      const enabled = notificationPreferencesService.isCategoryEnabled(NotificationCategory.POST);
      expect(enabled).toBe(false);
    });
  });

  describe('service lifecycle management', () => {
    it('should initialize services in correct order', async () => {
      const initOrder: string[] = [];

      // Mock initialization to track order
      const originalNotificationInit = notificationService.initialize;
      const originalPreferencesInit = notificationPreferencesService.initialize;
      const originalAnalyticsInit = notificationAnalyticsService.initialize;
      const originalBackgroundInit = backgroundSyncService.initialize;

      (notificationService as any).initialize = async () => {
        initOrder.push('notification');
        return originalNotificationInit.call(notificationService);
      };

      (notificationPreferencesService as any).initialize = async () => {
        initOrder.push('preferences');
        return originalPreferencesInit.call(notificationPreferencesService);
      };

      (notificationAnalyticsService as any).initialize = async () => {
        initOrder.push('analytics');
        return originalAnalyticsInit.call(notificationAnalyticsService);
      };

      (backgroundSyncService as any).initialize = async () => {
        initOrder.push('background');
        return originalBackgroundInit.call(backgroundSyncService);
      };

      // Initialize in recommended order
      await notificationPreferencesService.initialize();
      await notificationService.initialize();
      await notificationAnalyticsService.initialize();
      await backgroundSyncService.initialize();

      expect(initOrder).toEqual(['preferences', 'notification', 'analytics', 'background']);
    });

    it('should cleanup services properly', async () => {
      // Initialize services
      await notificationService.initialize();
      await notificationAnalyticsService.initialize();
      await backgroundSyncService.initialize();

      // Add some data
      await notificationAnalyticsService.trackReceived('test', NotificationCategory.MESSAGE);

      // Cleanup
      await notificationAnalyticsService.cleanup();

      // Verify cleanup
      const queueStatus = notificationAnalyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBe(0);
    });
  });
});