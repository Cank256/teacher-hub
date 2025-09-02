/**
 * Government Notification Service Tests
 */

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { governmentNotificationService } from '../../../services/notifications/governmentNotificationService';
import { governmentService } from '../../../services/api/governmentService';
import { ContentPriority, NotificationType } from '../../../types';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({
    requestPermission: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
    getToken: jest.fn(),
    AuthorizationStatus: {
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  }),
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
  },
  AndroidStyle: {
    BIGTEXT: 1,
  },
}));

jest.mock('../../../services/api/governmentService', () => ({
  governmentService: {
    subscribeToNotifications: jest.fn(),
    unsubscribeFromNotifications: jest.fn(),
    trackContentEvent: jest.fn(),
  },
}));

const mockMessaging = messaging();
const mockNotifee = notifee;
const mockGovernmentService = governmentService as jest.Mocked<typeof governmentService>;

describe('GovernmentNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize notification service successfully', async () => {
      mockMessaging.requestPermission.mockResolvedValue(1); // AUTHORIZED
      mockNotifee.createChannel.mockResolvedValue();
      mockMessaging.subscribeToTopic.mockResolvedValue();

      await governmentNotificationService.initialize();

      expect(mockMessaging.requestPermission).toHaveBeenCalled();
      expect(mockNotifee.createChannel).toHaveBeenCalledTimes(3); // 3 channels
      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('government_updates');
      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('government_critical');
    });

    it('should create notification channels for Android', async () => {
      Platform.OS = 'android';
      mockMessaging.requestPermission.mockResolvedValue(1);
      mockNotifee.createChannel.mockResolvedValue();

      await governmentNotificationService.initialize();

      expect(mockNotifee.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'government_critical',
          name: 'Critical Government Updates',
          importance: 4, // HIGH
        })
      );

      expect(mockNotifee.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'government_high',
          name: 'Important Government Updates',
          importance: 3, // DEFAULT
        })
      );

      expect(mockNotifee.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'government_normal',
          name: 'Government Updates',
          importance: 2, // LOW
        })
      );
    });

    it('should handle permission denial gracefully', async () => {
      mockMessaging.requestPermission.mockResolvedValue(0); // DENIED
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await governmentNotificationService.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('Government notification permission denied');
      consoleSpy.mockRestore();
    });
  });

  describe('subscribeToGovernmentNotifications', () => {
    it('should subscribe to notifications with preferences', async () => {
      mockGovernmentService.subscribeToNotifications.mockResolvedValue();
      mockMessaging.subscribeToTopic.mockResolvedValue();

      const subjects = ['Mathematics', 'Science'];
      const contentTypes = ['curriculum_update'];

      await governmentNotificationService.subscribeToGovernmentNotifications(
        subjects,
        undefined,
        contentTypes,
        undefined
      );

      expect(mockGovernmentService.subscribeToNotifications).toHaveBeenCalledWith(
        subjects,
        undefined,
        contentTypes,
        undefined
      );

      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('government_subject_mathematics');
      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('government_subject_science');
      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('government_type_curriculum_update');
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Subscription failed');
      mockGovernmentService.subscribeToNotifications.mockRejectedValue(error);

      await expect(
        governmentNotificationService.subscribeToGovernmentNotifications(['Mathematics'])
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('unsubscribeFromGovernmentNotifications', () => {
    it('should unsubscribe from all government notifications', async () => {
      mockGovernmentService.unsubscribeFromNotifications.mockResolvedValue();
      mockMessaging.unsubscribeFromTopic.mockResolvedValue();

      // Mock getSubscribedTopics to return some topics
      const getSubscribedTopicsSpy = jest
        .spyOn(governmentNotificationService as any, 'getSubscribedTopics')
        .mockResolvedValue([
          'government_updates',
          'government_critical',
          'government_subject_mathematics',
          'other_topic',
        ]);

      await governmentNotificationService.unsubscribeFromGovernmentNotifications();

      expect(mockGovernmentService.unsubscribeFromNotifications).toHaveBeenCalled();
      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith('government_updates');
      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith('government_critical');
      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith('government_subject_mathematics');
      expect(mockMessaging.unsubscribeFromTopic).not.toHaveBeenCalledWith('other_topic');

      getSubscribedTopicsSpy.mockRestore();
    });
  });

  describe('handleGovernmentMessage', () => {
    it('should handle government messages and display notifications', async () => {
      const mockMessage = {
        data: {
          type: 'government_curriculum_update',
          contentId: 'content-1',
          notificationId: 'notif-1',
          priority: ContentPriority.HIGH,
          actionRequired: 'false',
        },
        notification: {
          title: 'New Curriculum Update',
          body: 'Mathematics curriculum has been updated',
        },
      };

      mockNotifee.displayNotification.mockResolvedValue();
      mockGovernmentService.trackContentEvent.mockResolvedValue();

      await (governmentNotificationService as any).handleGovernmentMessage(mockMessage);

      expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notif-1',
          title: 'New Curriculum Update',
          body: 'Mathematics curriculum has been updated',
          data: expect.objectContaining({
            contentId: 'content-1',
            priority: ContentPriority.HIGH,
          }),
        })
      );

      expect(mockGovernmentService.trackContentEvent).toHaveBeenCalledWith(
        'content-1',
        'notification_received',
        expect.any(Object)
      );
    });

    it('should ignore non-government messages', async () => {
      const mockMessage = {
        data: {
          type: 'regular_notification',
        },
        notification: {
          title: 'Regular Notification',
          body: 'This is not a government notification',
        },
      };

      await (governmentNotificationService as any).handleGovernmentMessage(mockMessage);

      expect(mockNotifee.displayNotification).not.toHaveBeenCalled();
    });

    it('should handle critical priority notifications correctly', async () => {
      const mockMessage = {
        data: {
          type: 'government_emergency_alert',
          contentId: 'content-1',
          notificationId: 'notif-1',
          priority: ContentPriority.CRITICAL,
          actionRequired: 'true',
        },
        notification: {
          title: 'URGENT: Emergency Alert',
          body: 'Immediate action required',
        },
      };

      mockNotifee.displayNotification.mockResolvedValue();

      await (governmentNotificationService as any).handleGovernmentMessage(mockMessage);

      expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            channelId: 'government_critical',
            importance: 4, // HIGH
            color: '#FF0000',
          }),
          ios: expect.objectContaining({
            critical: true,
          }),
        })
      );
    });
  });

  describe('getFCMToken', () => {
    it('should return FCM token', async () => {
      const mockToken = 'mock-fcm-token';
      mockMessaging.getToken.mockResolvedValue(mockToken);

      const token = await governmentNotificationService.getFCMToken();

      expect(mockMessaging.getToken).toHaveBeenCalled();
      expect(token).toBe(mockToken);
    });

    it('should handle token retrieval errors', async () => {
      const error = new Error('Token error');
      mockMessaging.getToken.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const token = await governmentNotificationService.getFCMToken();

      expect(token).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error getting FCM token:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('handleNotificationAction', () => {
    it('should handle view action', async () => {
      const notification = {
        data: {
          contentId: 'content-1',
        },
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await governmentNotificationService.handleNotificationAction('view', notification);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to content:', 'content-1');
      consoleSpy.mockRestore();
    });

    it('should handle mark as read action', async () => {
      const notification = {
        data: {
          notificationId: 'notif-1',
        },
      };

      mockGovernmentService.markNotificationAsRead = jest.fn().mockResolvedValue();

      await governmentNotificationService.handleNotificationAction('mark_read', notification);

      expect(mockGovernmentService.markNotificationAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should handle unknown actions gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await governmentNotificationService.handleNotificationAction('unknown_action', {});

      expect(consoleSpy).toHaveBeenCalledWith('Unknown notification action:', 'unknown_action');
      consoleSpy.mockRestore();
    });
  });

  describe('notification configuration', () => {
    it('should get correct channel ID for different priorities', () => {
      const getChannelId = (governmentNotificationService as any).getChannelId;

      expect(getChannelId(ContentPriority.CRITICAL)).toBe('government_critical');
      expect(getChannelId(ContentPriority.HIGH)).toBe('government_high');
      expect(getChannelId(ContentPriority.MEDIUM)).toBe('government_normal');
      expect(getChannelId(ContentPriority.LOW)).toBe('government_normal');
    });

    it('should get correct type icon for different notification types', () => {
      const getTypeIcon = (governmentNotificationService as any).getTypeIcon;

      expect(getTypeIcon(NotificationType.CURRICULUM_UPDATE)).toBe('curriculum_icon');
      expect(getTypeIcon(NotificationType.POLICY_CHANGE)).toBe('policy_icon');
      expect(getTypeIcon(NotificationType.EMERGENCY_ALERT)).toBe('emergency_icon');
      expect(getTypeIcon('unknown_type')).toBe('government_icon');
    });
  });
});