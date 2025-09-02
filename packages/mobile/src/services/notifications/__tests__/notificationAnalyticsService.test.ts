/**
 * Notification Analytics Service Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NotificationAnalyticsService } from '../notificationAnalyticsService';
import { storageService } from '../../storage/storageService';
import { apiClient } from '../../api/apiClient';
import { NotificationCategory, DeliveryStatus } from '../../../types/notifications';
import './setup';

describe('NotificationAnalyticsService', () => {
  let analyticsService: NotificationAnalyticsService;
  let mockSetInterval: jest.SpyInstance;
  let mockClearInterval: jest.SpyInstance;

  beforeEach(() => {
    // Reset the singleton instance for testing
    (NotificationAnalyticsService as any).instance = null;
    analyticsService = NotificationAnalyticsService.getInstance();
    
    // Mock timers
    mockSetInterval = jest.spyOn(global, 'setInterval').mockImplementation((fn, delay) => {
      return setTimeout(fn, 0) as any; // Execute immediately for testing
    });
    mockClearInterval = jest.spyOn(global, 'clearInterval').mockImplementation();
  });

  afterEach(() => {
    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
  });

  describe('initialization', () => {
    it('should initialize and load queued events', async () => {
      const mockEvents = [
        {
          notificationId: 'test-1',
          category: NotificationCategory.MESSAGE,
          eventType: 'received' as const,
          timestamp: new Date().toISOString(),
        },
      ];
      
      const mockDeliveries = [
        {
          notificationId: 'test-1',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.DELIVERED,
          deliveryTime: new Date().toISOString(),
        },
      ];

      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'queuedNotificationEvents') return Promise.resolve(mockEvents);
        if (key === 'queuedNotificationDeliveries') return Promise.resolve(mockDeliveries);
        return Promise.resolve(null);
      });

      await analyticsService.initialize();

      expect(mockGetItem).toHaveBeenCalledWith('queuedNotificationEvents');
      expect(mockGetItem).toHaveBeenCalledWith('queuedNotificationDeliveries');
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it('should handle empty queues during initialization', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(null);

      await analyticsService.initialize();

      const queueStatus = analyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBe(0);
      expect(queueStatus.deliveryQueueSize).toBe(0);
    });
  });

  describe('event tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize();
    });

    it('should track notification received event', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackReceived('test-notification', NotificationCategory.MESSAGE);

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationEvents', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.MESSAGE,
          eventType: 'received',
        }),
      ]));
    });

    it('should track notification opened event', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackOpened('test-notification', NotificationCategory.POST, { source: 'push' });

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationEvents', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.POST,
          eventType: 'opened',
          metadata: { source: 'push' },
        }),
      ]));
    });

    it('should track notification dismissed event', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackDismissed('test-notification', NotificationCategory.GOVERNMENT);

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationEvents', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.GOVERNMENT,
          eventType: 'dismissed',
        }),
      ]));
    });

    it('should track notification action taken', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackActionTaken('test-notification', NotificationCategory.MESSAGE, 'reply');

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationEvents', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.MESSAGE,
          eventType: 'action_taken',
          actionId: 'reply',
        }),
      ]));
    });

    it('should trigger immediate upload when queue is large', async () => {
      const mockPost = jest.mocked(apiClient.post);
      mockPost.mockResolvedValue({ data: {} });

      // Add 10 events to trigger immediate upload
      for (let i = 0; i < 10; i++) {
        await analyticsService.trackReceived(`test-${i}`, NotificationCategory.MESSAGE);
      }

      // Wait for async upload
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPost).toHaveBeenCalledWith('/notifications/analytics/batch', expect.any(Object));
    });
  });

  describe('delivery tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize();
    });

    it('should track successful delivery', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackDeliverySuccess('test-notification', NotificationCategory.MESSAGE);

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationDeliveries', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.DELIVERED,
        }),
      ]));
    });

    it('should track delivery failure', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);

      await analyticsService.trackDeliveryFailure(
        'test-notification',
        NotificationCategory.MESSAGE,
        'Network error',
        2
      );

      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationDeliveries', expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'test-notification',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.FAILED,
          errorMessage: 'Network error',
          retryCount: 2,
        }),
      ]));
    });
  });

  describe('analytics upload', () => {
    beforeEach(async () => {
      await analyticsService.initialize();
    });

    it('should upload events to backend successfully', async () => {
      const mockPost = jest.mocked(apiClient.post);
      const mockSetItem = jest.mocked(storageService.setItem);
      
      mockPost.mockResolvedValue({ data: {} });

      // Add some events
      await analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE);
      await analyticsService.trackDeliverySuccess('test-1', NotificationCategory.MESSAGE);

      await analyticsService.forceUpload();

      expect(mockPost).toHaveBeenCalledWith('/notifications/analytics/batch', expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ notificationId: 'test-1' }),
        ]),
        deliveries: expect.arrayContaining([
          expect.objectContaining({ notificationId: 'test-1' }),
        ]),
        platform: 'ios',
      }));

      // Queues should be cleared after successful upload
      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationEvents', []);
      expect(mockSetItem).toHaveBeenCalledWith('queuedNotificationDeliveries', []);
    });

    it('should handle upload failures gracefully', async () => {
      const mockPost = jest.mocked(apiClient.post);
      mockPost.mockRejectedValue(new Error('Upload failed'));

      // Add an event
      await analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE);

      await analyticsService.forceUpload();

      // Queue should still contain the event after failed upload
      const queueStatus = analyticsService.getQueueStatus();
      expect(queueStatus.eventQueueSize).toBe(1);
    });

    it('should not upload when queues are empty', async () => {
      const mockPost = jest.mocked(apiClient.post);

      await analyticsService.forceUpload();

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should not upload when already uploading', async () => {
      const mockPost = jest.mocked(apiClient.post);
      
      // Mock a slow upload
      mockPost.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      // Add an event
      await analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE);

      // Start two uploads simultaneously
      const upload1 = analyticsService.forceUpload();
      const upload2 = analyticsService.forceUpload();

      await Promise.all([upload1, upload2]);

      // Should only be called once
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('local metrics calculation', () => {
    beforeEach(async () => {
      // Set up historical events
      const mockEvents = [
        {
          notificationId: 'test-1',
          category: NotificationCategory.MESSAGE,
          eventType: 'received' as const,
          timestamp: new Date().toISOString(),
        },
        {
          notificationId: 'test-1',
          category: NotificationCategory.MESSAGE,
          eventType: 'opened' as const,
          timestamp: new Date().toISOString(),
        },
        {
          notificationId: 'test-2',
          category: NotificationCategory.POST,
          eventType: 'received' as const,
          timestamp: new Date().toISOString(),
        },
        {
          notificationId: 'test-2',
          category: NotificationCategory.POST,
          eventType: 'dismissed' as const,
          timestamp: new Date().toISOString(),
        },
        {
          notificationId: 'test-3',
          category: NotificationCategory.MESSAGE,
          eventType: 'received' as const,
          timestamp: new Date().toISOString(),
        },
        {
          notificationId: 'test-3',
          category: NotificationCategory.MESSAGE,
          eventType: 'action_taken' as const,
          timestamp: new Date().toISOString(),
        },
      ];

      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'historicalNotificationEvents') return Promise.resolve(mockEvents);
        return Promise.resolve([]);
      });

      await analyticsService.initialize();
    });

    it('should calculate metrics correctly', async () => {
      const metrics = await analyticsService.getLocalMetrics();

      expect(metrics.totalReceived).toBe(3);
      expect(metrics.totalOpened).toBe(1);
      expect(metrics.totalDismissed).toBe(1);
      expect(metrics.totalActions).toBe(1);
      expect(metrics.openRate).toBe(33.33); // 1/3 * 100
      expect(metrics.dismissalRate).toBe(33.33); // 1/3 * 100
      expect(metrics.actionRate).toBe(33.33); // 1/3 * 100
    });

    it('should calculate category metrics', async () => {
      const metrics = await analyticsService.getLocalMetrics();

      expect(metrics.categoryMetrics[NotificationCategory.MESSAGE]).toEqual({
        received: 2,
        opened: 1,
        openRate: 50, // 1/2 * 100
      });

      expect(metrics.categoryMetrics[NotificationCategory.POST]).toEqual({
        received: 1,
        opened: 0,
        openRate: 0,
      });
    });

    it('should filter metrics by date range', async () => {
      const startDate = new Date(Date.now() + 1000); // Future date
      const endDate = new Date(Date.now() + 2000);

      const metrics = await analyticsService.getLocalMetrics(startDate, endDate);

      expect(metrics.totalReceived).toBe(0);
      expect(metrics.totalOpened).toBe(0);
    });

    it('should handle empty metrics gracefully', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue([]);

      const metrics = await analyticsService.getLocalMetrics();

      expect(metrics.totalReceived).toBe(0);
      expect(metrics.openRate).toBe(0);
      expect(metrics.dismissalRate).toBe(0);
      expect(metrics.actionRate).toBe(0);
    });
  });

  describe('delivery metrics calculation', () => {
    beforeEach(async () => {
      const mockDeliveries = [
        {
          notificationId: 'test-1',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.DELIVERED,
          deliveryTime: new Date().toISOString(),
          retryCount: 0,
        },
        {
          notificationId: 'test-2',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.FAILED,
          deliveryTime: new Date().toISOString(),
          errorMessage: 'Network error',
          retryCount: 2,
        },
        {
          notificationId: 'test-3',
          category: NotificationCategory.POST,
          deliveryStatus: DeliveryStatus.DELIVERED,
          deliveryTime: new Date().toISOString(),
          retryCount: 1,
        },
      ];

      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockImplementation((key) => {
        if (key === 'historicalNotificationDeliveries') return Promise.resolve(mockDeliveries);
        return Promise.resolve([]);
      });

      await analyticsService.initialize();
    });

    it('should calculate delivery metrics correctly', async () => {
      const metrics = await analyticsService.getDeliveryMetrics();

      expect(metrics.totalAttempts).toBe(3);
      expect(metrics.successful).toBe(2);
      expect(metrics.failed).toBe(1);
      expect(metrics.deliveryRate).toBe(66.67); // 2/3 * 100
      expect(metrics.averageRetries).toBe(1); // (0 + 2 + 1) / 3
    });

    it('should calculate error breakdown', async () => {
      const metrics = await analyticsService.getDeliveryMetrics();

      expect(metrics.errorBreakdown).toEqual({
        'Network error': 1,
      });
    });

    it('should handle empty delivery data', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue([]);

      const metrics = await analyticsService.getDeliveryMetrics();

      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
      expect(metrics.averageRetries).toBe(0);
    });
  });

  describe('data cleanup', () => {
    it('should clear old analytics data', async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const mockEvents = [
        {
          notificationId: 'old-event',
          category: NotificationCategory.MESSAGE,
          eventType: 'received' as const,
          timestamp: oldDate.toISOString(),
        },
        {
          notificationId: 'recent-event',
          category: NotificationCategory.MESSAGE,
          eventType: 'received' as const,
          timestamp: recentDate.toISOString(),
        },
      ];

      const mockDeliveries = [
        {
          notificationId: 'old-delivery',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.DELIVERED,
          deliveryTime: oldDate.toISOString(),
        },
        {
          notificationId: 'recent-delivery',
          category: NotificationCategory.MESSAGE,
          deliveryStatus: DeliveryStatus.DELIVERED,
          deliveryTime: recentDate.toISOString(),
        },
      ];

      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSetItem = jest.mocked(storageService.setItem);
      
      mockGetItem.mockImplementation((key) => {
        if (key === 'historicalNotificationEvents') return Promise.resolve(mockEvents);
        if (key === 'historicalNotificationDeliveries') return Promise.resolve(mockDeliveries);
        return Promise.resolve([]);
      });

      await analyticsService.clearOldData(30); // Clear data older than 30 days

      expect(mockSetItem).toHaveBeenCalledWith('historicalNotificationEvents', [
        expect.objectContaining({ notificationId: 'recent-event' }),
      ]);
      
      expect(mockSetItem).toHaveBeenCalledWith('historicalNotificationDeliveries', [
        expect.objectContaining({ notificationId: 'recent-delivery' }),
      ]);
    });
  });

  describe('queue status', () => {
    beforeEach(async () => {
      await analyticsService.initialize();
    });

    it('should return correct queue status', async () => {
      await analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE);
      await analyticsService.trackDeliverySuccess('test-1', NotificationCategory.MESSAGE);

      const status = analyticsService.getQueueStatus();

      expect(status.eventQueueSize).toBe(1);
      expect(status.deliveryQueueSize).toBe(1);
      expect(status.isUploading).toBe(false);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await analyticsService.initialize();
    });

    it('should cleanup service properly', async () => {
      const mockPost = jest.mocked(apiClient.post);
      mockPost.mockResolvedValue({ data: {} });

      // Add some events
      await analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE);

      await analyticsService.cleanup();

      expect(mockClearInterval).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled(); // Should upload remaining events
    });
  });

  describe('error handling', () => {
    it('should handle tracking errors gracefully', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      mockSetItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(analyticsService.trackReceived('test-1', NotificationCategory.MESSAGE))
        .resolves.not.toThrow();
    });

    it('should handle metrics calculation errors', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      await expect(analyticsService.getLocalMetrics()).rejects.toThrow('Storage error');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationAnalyticsService.getInstance();
      const instance2 = NotificationAnalyticsService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});