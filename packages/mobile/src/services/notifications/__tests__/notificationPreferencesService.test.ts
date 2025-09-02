/**
 * Notification Preferences Service Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NotificationPreferencesService } from '../notificationPreferencesService';
import { storageService } from '../../storage/storageService';
import { apiClient } from '../../api/apiClient';
import { NotificationCategory } from '../../../types/notifications';
import './setup';

describe('NotificationPreferencesService', () => {
  let preferencesService: NotificationPreferencesService;

  beforeEach(() => {
    // Reset the singleton instance for testing
    (NotificationPreferencesService as any).instance = null;
    preferencesService = NotificationPreferencesService.getInstance();
  });

  describe('initialization', () => {
    it('should initialize and load preferences', async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);

      await preferencesService.initialize();

      expect(mockGetItem).toHaveBeenCalledWith('notificationPreferences');
    });

    it('should create default preferences when none exist', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSetItem = jest.mocked(storageService.setItem);
      
      mockGetItem.mockResolvedValue(null);
      jest.mocked(apiClient.get).mockRejectedValue(new Error('No backend preferences'));

      await preferencesService.initialize();

      expect(mockSetItem).toHaveBeenCalledWith('notificationPreferences', expect.objectContaining({
        messages: expect.objectContaining({ enabled: true }),
        posts: expect.objectContaining({ enabled: true }),
        government: expect.objectContaining({ enabled: true }),
      }));
    });

    it('should load preferences from backend when local storage is empty', async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      const mockSetItem = jest.mocked(storageService.setItem);
      
      mockGetItem.mockResolvedValue(null);
      jest.mocked(apiClient.get).mockResolvedValue({ data: mockPreferences });

      await preferencesService.initialize();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications/preferences');
      expect(mockSetItem).toHaveBeenCalledWith('notificationPreferences', mockPreferences);
    });
  });

  describe('preference management', () => {
    beforeEach(async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);
      await preferencesService.initialize();
    });

    it('should update category settings', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      
      await preferencesService.updateCategorySettings(NotificationCategory.MESSAGE, {
        enabled: false,
        sound: false,
      });

      expect(mockSetItem).toHaveBeenCalledWith('notificationPreferences', expect.objectContaining({
        messages: expect.objectContaining({
          enabled: false,
          sound: false,
        }),
      }));
      
      expect(apiClient.put).toHaveBeenCalledWith('/notifications/preferences', expect.any(Object));
    });

    it('should update quiet hours settings', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      
      await preferencesService.updateQuietHours({
        enabled: true,
        startTime: '23:00',
        endTime: '06:00',
      });

      expect(mockSetItem).toHaveBeenCalledWith('notificationPreferences', expect.objectContaining({
        quietHours: expect.objectContaining({
          enabled: true,
          startTime: '23:00',
          endTime: '06:00',
        }),
      }));
    });

    it('should enable/disable category', async () => {
      await preferencesService.setCategoryEnabled(NotificationCategory.POST, false);

      const preferences = preferencesService.getPreferences();
      expect(preferences?.posts.enabled).toBe(false);
    });

    it('should set category sound', async () => {
      await preferencesService.setCategorySound(NotificationCategory.GOVERNMENT, false);

      const preferences = preferencesService.getPreferences();
      expect(preferences?.government.sound).toBe(false);
    });

    it('should set category vibration', async () => {
      await preferencesService.setCategoryVibration(NotificationCategory.COMMUNITY, true);

      const preferences = preferencesService.getPreferences();
      expect(preferences?.communities.vibration).toBe(true);
    });

    it('should set category priority', async () => {
      await preferencesService.setCategoryPriority(NotificationCategory.SYSTEM, 'high');

      const preferences = preferencesService.getPreferences();
      expect(preferences?.system.priority).toBe('high');
    });

    it('should set global enabled state', async () => {
      await preferencesService.setGlobalEnabled(false);

      const preferences = preferencesService.getPreferences();
      expect(preferences?.globalSettings.enabled).toBe(false);
    });
  });

  describe('preference queries', () => {
    beforeEach(async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);
      await preferencesService.initialize();
    });

    it('should check if category is enabled', () => {
      const enabled = preferencesService.isCategoryEnabled(NotificationCategory.MESSAGE);
      expect(enabled).toBe(true);
    });

    it('should return false for disabled global settings', async () => {
      await preferencesService.setGlobalEnabled(false);
      
      const enabled = preferencesService.isCategoryEnabled(NotificationCategory.MESSAGE);
      expect(enabled).toBe(false);
    });

    it('should check if category sound is enabled', () => {
      const soundEnabled = preferencesService.isCategorySoundEnabled(NotificationCategory.MESSAGE);
      expect(soundEnabled).toBe(true);
    });

    it('should check if category vibration is enabled', () => {
      const vibrationEnabled = preferencesService.isCategoryVibrationEnabled(NotificationCategory.MESSAGE);
      expect(vibrationEnabled).toBe(true);
    });

    it('should get category settings', () => {
      const settings = preferencesService.getCategorySettings(NotificationCategory.MESSAGE);
      
      expect(settings).toEqual(expect.objectContaining({
        enabled: true,
        sound: true,
        vibration: true,
        priority: 'high',
      }));
    });

    it('should return null for category settings when no preferences loaded', () => {
      const newService = new (NotificationPreferencesService as any)();
      const settings = newService.getCategorySettings(NotificationCategory.MESSAGE);
      
      expect(settings).toBeNull();
    });
  });

  describe('quiet hours', () => {
    beforeEach(async () => {
      const mockPreferences = global.createMockNotificationPreferences({
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          allowCritical: true,
          allowMessages: false,
        },
      });
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);
      await preferencesService.initialize();
    });

    it('should detect quiet hours correctly for overnight period', () => {
      // Mock current time to be 23:30 (within quiet hours)
      const mockDate = new Date();
      mockDate.setHours(23, 30, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const inQuietHours = preferencesService.isInQuietHours();
      expect(inQuietHours).toBe(true);

      jest.restoreAllMocks();
    });

    it('should detect quiet hours correctly for early morning', () => {
      // Mock current time to be 06:30 (within quiet hours)
      const mockDate = new Date();
      mockDate.setHours(6, 30, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const inQuietHours = preferencesService.isInQuietHours();
      expect(inQuietHours).toBe(true);

      jest.restoreAllMocks();
    });

    it('should detect when not in quiet hours', () => {
      // Mock current time to be 14:00 (not in quiet hours)
      const mockDate = new Date();
      mockDate.setHours(14, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const inQuietHours = preferencesService.isInQuietHours();
      expect(inQuietHours).toBe(false);

      jest.restoreAllMocks();
    });

    it('should allow critical notifications during quiet hours', () => {
      // Mock to be in quiet hours
      jest.spyOn(preferencesService, 'isInQuietHours').mockReturnValue(true);

      const shouldDeliver = preferencesService.shouldDeliverDuringQuietHours(
        NotificationCategory.GOVERNMENT,
        'critical'
      );
      
      expect(shouldDeliver).toBe(true);
    });

    it('should block normal notifications during quiet hours', () => {
      // Mock to be in quiet hours
      jest.spyOn(preferencesService, 'isInQuietHours').mockReturnValue(true);

      const shouldDeliver = preferencesService.shouldDeliverDuringQuietHours(
        NotificationCategory.POST,
        'normal'
      );
      
      expect(shouldDeliver).toBe(false);
    });

    it('should allow messages during quiet hours if configured', async () => {
      await preferencesService.updateQuietHours({ allowMessages: true });
      
      // Mock to be in quiet hours
      jest.spyOn(preferencesService, 'isInQuietHours').mockReturnValue(true);

      const shouldDeliver = preferencesService.shouldDeliverDuringQuietHours(
        NotificationCategory.MESSAGE,
        'normal'
      );
      
      expect(shouldDeliver).toBe(true);
    });
  });

  describe('preference utilities', () => {
    beforeEach(async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);
      await preferencesService.initialize();
    });

    it('should reset preferences to defaults', async () => {
      const mockSetItem = jest.mocked(storageService.setItem);
      
      await preferencesService.resetToDefaults();

      expect(mockSetItem).toHaveBeenCalledWith('notificationPreferences', expect.objectContaining({
        messages: expect.objectContaining({ enabled: true }),
        posts: expect.objectContaining({ enabled: true }),
      }));
    });

    it('should export preferences as JSON', async () => {
      const exported = await preferencesService.exportPreferences();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('messages');
      expect(parsed).toHaveProperty('posts');
      expect(parsed).toHaveProperty('quietHours');
    });

    it('should import preferences from JSON', async () => {
      const mockPreferences = global.createMockNotificationPreferences({
        messages: { enabled: false, sound: false, vibration: false, showPreview: false, priority: 'low' },
      });
      
      const preferencesJson = JSON.stringify(mockPreferences);
      
      await preferencesService.importPreferences(preferencesJson);

      const preferences = preferencesService.getPreferences();
      expect(preferences?.messages.enabled).toBe(false);
    });

    it('should reject invalid preference imports', async () => {
      const invalidJson = '{"invalid": "structure"}';

      await expect(preferencesService.importPreferences(invalidJson)).rejects.toThrow('Invalid preferences format');
    });

    it('should get notification summary', () => {
      const summary = preferencesService.getNotificationSummary();

      expect(summary).toEqual(expect.objectContaining({
        totalEnabled: expect.any(Number),
        totalDisabled: expect.any(Number),
        soundEnabled: expect.any(Number),
        vibrationEnabled: expect.any(Number),
        quietHoursEnabled: expect.any(Boolean),
      }));
    });

    it('should handle empty preferences in summary', () => {
      const newService = new (NotificationPreferencesService as any)();
      const summary = newService.getNotificationSummary();

      expect(summary).toEqual({
        totalEnabled: 0,
        totalDisabled: 0,
        soundEnabled: 0,
        vibrationEnabled: 0,
        quietHoursEnabled: false,
      });
    });
  });

  describe('error handling', () => {
    it('should handle storage errors during initialization', async () => {
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      await expect(preferencesService.initialize()).rejects.toThrow('Storage error');
    });

    it('should handle backend sync errors gracefully', async () => {
      const mockPreferences = global.createMockNotificationPreferences();
      const mockGetItem = jest.mocked(storageService.getItem);
      mockGetItem.mockResolvedValue(mockPreferences);
      await preferencesService.initialize();

      jest.mocked(apiClient.put).mockRejectedValue(new Error('Backend error'));

      // Should not throw, just warn
      await expect(preferencesService.updateCategorySettings(NotificationCategory.MESSAGE, { enabled: false }))
        .resolves.not.toThrow();
    });

    it('should handle malformed JSON in import', async () => {
      const malformedJson = '{"invalid": json}';

      await expect(preferencesService.importPreferences(malformedJson)).rejects.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationPreferencesService.getInstance();
      const instance2 = NotificationPreferencesService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});