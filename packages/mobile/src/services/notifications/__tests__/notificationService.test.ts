/**
 * Notification Service Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../notificationService';
import { storageService } from '../../storage/storageService';
import { apiClient } from '../../api/apiClient';
import { NotificationCategory } from '../../../types/notifications';
import './setup';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    // Reset the singleton instance for testing
    (NotificationService as any).instance = null;
    notificationService = NotificationService.getInstance();
  });

  describe('initialization', () => {
    it('should initialize successfully with permissions', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      const mockGetPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);
      
      mockGetPermissions.mockResolvedValue({ status: 'undetermined' } as any);
      mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);
      mockGetPushToken.mockResolvedValue({ data: 'test-push-token' } as any);

      await notificationService.initialize();

      expect(mockRequestPermissions).toHaveBeenCalled();
      expect(mockGetPushToken).toHaveBeenCalled();
      expect(storageService.setItem).toHaveBeenCalledWith('pushToken', 'test-push-token');
    });

    it('should handle permission denial gracefully', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      
      mockGetPermissions.mockResolvedValue({ status: 'undetermined' } as any);
      mockRequestPermissions.mockResolvedValue({ status: 'denied' } as any);

      await notificationService.initialize();

      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('should create notification channels on Android', async () => {
      const mockSetChannel = jest.mocked(Notifications.setNotificationChannelAsync);
      
      // Mock Platform.OS to be 'android'
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' },
      }));

      await notificationService.initialize();

      expect(mockSetChannel).toHaveBeenCalledWith('default', expect.objectContaining({
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      }));
      
      expect(mockSetChannel).toHaveBeenCalledWith('messages', expect.objectContaining({
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
      }));
    });
  });

  describe('push token management', () => {
    it('should register for push notifications and get token', async () => {
      const mockGetPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);
      mockGetPushToken.mockResolvedValue({ data: 'test-push-token' } as any);

      const token = await notificationService.registerForPushNotifications();

      expect(token).toBe('test-push-token');
      expect(storageService.setItem).toHaveBeenCalledWith('pushToken', 'test-push-token');
      expect(apiClient.post).toHaveBeenCalledWith('/notifications/register-token', expect.objectContaining({
        token: 'test-push-token',
        platform: 'ios',
      }));
    });

    it('should handle push token registration failure', async () => {
      const mockGetPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);
      mockGetPushToken.mockRejectedValue(new Error('Token registration failed'));

      const token = await notificationService.registerForPushNotifications();

      expect(token).toBeNull();
    });

    it('should return cached push token', () => {
      // Set up the service with a token
      (notificationService as any).pushToken = 'cached-token';

      const token = notificationService.getPushToken();

      expect(token).toBe('cached-token');
    });
  });

  describe('notification preferences', () => {
    it('should load default preferences when none exist', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(null);

      const preferences = await notificationService.loadNotificationPreferences();

      expect(preferences).toEqual(expect.objectContaining({
        messages: expect.objectContaining({ enabled: true }),
        posts: expect.objectContaining({ enabled: true }),
        government: expect.objectContaining({ enabled: true }),
      }));
      
      expect(storageService.setItem).toHaveBeenCalledWith('notificationPreferences', preferences);
    });

    it('should load existing preferences from storage', async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);

      const preferences = await notificationService.loadNotificationPreferences();

      expect(preferences).toEqual(mockPreferences);
    });

    it('should update preferences and sync to backend', async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      
      await notificationService.updateNotificationPreferences(mockPreferences);

      expect(storageService.setItem).toHaveBeenCalledWith('notificationPreferences', mockPreferences);
      expect(apiClient.put).toHaveBeenCalledWith('/notifications/preferences', mockPreferences);
    });
  });

  describe('local notifications', () => {
    it('should send local notification successfully', async () => {
      const mockScheduleNotification = jest.mocked(Notifications.scheduleNotificationAsync);
      mockScheduleNotification.mockResolvedValue('notification-id');

      const notificationId = await notificationService.sendLocalNotification(
        'Test Title',
        'Test Body',
        { id: 'test-id', category: NotificationCategory.MESSAGE } as any
      );

      expect(notificationId).toBe('notification-id');
      expect(mockScheduleNotification).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Test Title',
          body: 'Test Body',
          data: expect.objectContaining({ id: 'test-id' }),
        }),
        trigger: null,
      });
    });

    it('should cancel notification successfully', async () => {
      const mockCancelNotification = jest.mocked(Notifications.cancelScheduledNotificationAsync);

      await notificationService.cancelNotification('test-notification-id');

      expect(mockCancelNotification).toHaveBeenCalledWith('test-notification-id');
    });

    it('should cancel all notifications', async () => {
      const mockCancelAll = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);
      const mockDismissAll = jest.mocked(Notifications.dismissAllNotificationsAsync);

      await notificationService.cancelAllNotifications();

      expect(mockCancelAll).toHaveBeenCalled();
      expect(mockDismissAll).toHaveBeenCalled();
    });
  });

  describe('badge management', () => {
    it('should update badge count correctly', async () => {
      const mockSetBadge = jest.mocked(Notifications.setBadgeCountAsync);
      const mockGetItem = jest.mocked(storageService.getItem);
      
      mockGetItem.mockImplementation((key) => {
        if (key === 'unreadMessageCount') return Promise.resolve(5);
        if (key === 'unreadNotificationCount') return Promise.resolve(3);
        return Promise.resolve(null);
      });

      await notificationService.updateBadgeCount();

      expect(mockSetBadge).toHaveBeenCalledWith(8);
    });

    it('should handle badge count errors gracefully', async () => {
      const mockSetBadge = jest.mocked(Notifications.setBadgeCountAsync);
      const mockGetItem = jest.mocked(storageService.getItem);
      
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      await notificationService.updateBadgeCount();

      expect(mockSetBadge).toHaveBeenCalledWith(0);
    });
  });

  describe('notification handling', () => {
    it('should handle notification received event', async () => {
      const mockNotification = global.mockNotification;
      const mockUpdateBadge = jest.spyOn(notificationService as any, 'updateBadgeCount');
      mockUpdateBadge.mockResolvedValue(undefined);

      await (notificationService as any).handleNotificationReceived(mockNotification);

      expect(mockUpdateBadge).toHaveBeenCalled();
    });

    it('should handle notification response event', async () => {
      const mockResponse = global.mockNotificationResponse;
      const mockNavigate = jest.spyOn(notificationService as any, 'navigateFromNotification');
      mockNavigate.mockResolvedValue(undefined);

      await (notificationService as any).handleNotificationResponse(mockResponse);

      expect(mockNavigate).toHaveBeenCalledWith(mockResponse.notification.request.content.data);
    });

    it('should handle message notification correctly', async () => {
      const notificationData = {
        id: 'test-id',
        category: NotificationCategory.MESSAGE,
        conversationId: 'conv-123',
      };

      await (notificationService as any).handleMessageNotification(notificationData);

      // Should log the conversation update
      expect(console.log).toHaveBeenCalledWith('Updating message cache for conversation:', 'conv-123');
    });
  });

  describe('permission checks', () => {
    it('should check if notifications are enabled', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({ status: 'granted' } as any);

      const enabled = await notificationService.areNotificationsEnabled();

      expect(enabled).toBe(true);
    });

    it('should return false when permissions are denied', async () => {
      const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
      mockGetPermissions.mockResolvedValue({ status: 'denied' } as any);

      const enabled = await notificationService.areNotificationsEnabled();

      expect(enabled).toBe(false);
    });

    it('should open notification settings', async () => {
      const mockOpenSettings = jest.mocked(Notifications.openSettingsAsync);

      await notificationService.openNotificationSettings();

      expect(mockOpenSettings).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const mockRequestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
      mockRequestPermissions.mockRejectedValue(new Error('Permission error'));

      await expect(notificationService.initialize()).rejects.toThrow('Permission error');
    });

    it('should handle notification sending errors', async () => {
      const mockScheduleNotification = jest.mocked(Notifications.scheduleNotificationAsync);
      mockScheduleNotification.mockRejectedValue(new Error('Send error'));

      await expect(
        notificationService.sendLocalNotification('Title', 'Body')
      ).rejects.toThrow('Send error');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});