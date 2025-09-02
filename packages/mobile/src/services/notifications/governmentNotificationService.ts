/**
 * Government Notification Service
 * Handles push notifications for government content updates
 */

import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { governmentService } from '../api/governmentService';
import { 
  GovernmentNotification, 
  NotificationType, 
  ContentPriority 
} from '../../types';

export class GovernmentNotificationService {
  private static instance: GovernmentNotificationService;
  private isInitialized = false;

  static getInstance(): GovernmentNotificationService {
    if (!GovernmentNotificationService.instance) {
      GovernmentNotificationService.instance = new GovernmentNotificationService();
    }
    return GovernmentNotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permission
      await this.requestPermission();
      
      // Create notification channels (Android)
      await this.createNotificationChannels();
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Subscribe to government content topics
      await this.subscribeToTopics();
      
      this.isInitialized = true;
      console.log('Government notification service initialized');
    } catch (error) {
      console.error('Failed to initialize government notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Government notification permission granted');
        return true;
      } else {
        console.log('Government notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Critical government notifications
      await notifee.createChannel({
        id: 'government_critical',
        name: 'Critical Government Updates',
        description: 'Urgent government announcements and policy changes',
        importance: AndroidImportance.HIGH,
        sound: 'government_alert',
        vibration: true,
        lights: true,
        lightColor: '#FF0000',
      });

      // High priority notifications
      await notifee.createChannel({
        id: 'government_high',
        name: 'Important Government Updates',
        description: 'Important curriculum updates and announcements',
        importance: AndroidImportance.DEFAULT,
        sound: 'government_notification',
        vibration: true,
      });

      // Regular notifications
      await notifee.createChannel({
        id: 'government_normal',
        name: 'Government Updates',
        description: 'Regular government content and resources',
        importance: AndroidImportance.LOW,
        sound: 'default',
      });

      console.log('Government notification channels created');
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  /**
   * Set up message handlers
   */
  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Government background message:', remoteMessage);
      await this.handleGovernmentMessage(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Government foreground message:', remoteMessage);
      await this.handleGovernmentMessage(remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Government notification opened app:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Government app opened from notification:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      });
  }

  /**
   * Handle incoming government messages
   */
  private async handleGovernmentMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      const { data, notification } = remoteMessage;
      
      if (!data?.type || !data.type.startsWith('government_')) {
        return; // Not a government notification
      }

      const governmentData = this.parseGovernmentData(data);
      
      // Display local notification
      await this.displayLocalNotification(governmentData, notification);
      
      // Track notification received
      await this.trackNotificationEvent(governmentData.contentId, 'received');
      
    } catch (error) {
      console.error('Error handling government message:', error);
    }
  }

  /**
   * Parse government notification data
   */
  private parseGovernmentData(data: { [key: string]: string }) {
    return {
      contentId: data.contentId || '',
      notificationId: data.notificationId || '',
      type: data.type as NotificationType,
      priority: data.priority as ContentPriority,
      actionRequired: data.actionRequired === 'true',
      actionUrl: data.actionUrl,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
  }

  /**
   * Display local notification
   */
  private async displayLocalNotification(
    governmentData: any,
    notification?: FirebaseMessagingTypes.Notification
  ): Promise<void> {
    try {
      const channelId = this.getChannelId(governmentData.priority);
      const notificationConfig = this.getNotificationConfig(governmentData);

      await notifee.displayNotification({
        id: governmentData.notificationId,
        title: notification?.title || 'Government Update',
        body: notification?.body || 'New government content available',
        data: governmentData,
        android: {
          channelId,
          importance: this.getAndroidImportance(governmentData.priority),
          style: {
            type: AndroidStyle.BIGTEXT,
            text: notification?.body || '',
          },
          actions: notificationConfig.actions,
          color: notificationConfig.color,
          smallIcon: 'government_icon',
          largeIcon: notificationConfig.largeIcon,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
        ios: {
          categoryId: 'government_content',
          sound: notificationConfig.sound,
          badge: 1,
          critical: governmentData.priority === ContentPriority.CRITICAL,
        },
      });
    } catch (error) {
      console.error('Error displaying local notification:', error);
    }
  }

  /**
   * Get notification channel ID based on priority
   */
  private getChannelId(priority: ContentPriority): string {
    switch (priority) {
      case ContentPriority.CRITICAL:
        return 'government_critical';
      case ContentPriority.HIGH:
        return 'government_high';
      default:
        return 'government_normal';
    }
  }

  /**
   * Get Android importance based on priority
   */
  private getAndroidImportance(priority: ContentPriority): AndroidImportance {
    switch (priority) {
      case ContentPriority.CRITICAL:
        return AndroidImportance.HIGH;
      case ContentPriority.HIGH:
        return AndroidImportance.DEFAULT;
      default:
        return AndroidImportance.LOW;
    }
  }

  /**
   * Get notification configuration
   */
  private getNotificationConfig(governmentData: any) {
    const isCritical = governmentData.priority === ContentPriority.CRITICAL;
    
    return {
      color: isCritical ? '#FF0000' : '#1976D2',
      sound: isCritical ? 'government_alert' : 'government_notification',
      largeIcon: this.getTypeIcon(governmentData.type),
      actions: governmentData.actionRequired ? [
        {
          title: 'View Details',
          pressAction: { id: 'view_details' },
        },
        {
          title: 'Mark as Read',
          pressAction: { id: 'mark_read' },
        },
      ] : [
        {
          title: 'View',
          pressAction: { id: 'view' },
        },
      ],
    };
  }

  /**
   * Get icon for notification type
   */
  private getTypeIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.CURRICULUM_UPDATE:
        return 'curriculum_icon';
      case NotificationType.POLICY_CHANGE:
        return 'policy_icon';
      case NotificationType.EMERGENCY_ALERT:
        return 'emergency_icon';
      default:
        return 'government_icon';
    }
  }

  /**
   * Handle notification press
   */
  private handleNotificationPress(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): void {
    try {
      const { data } = remoteMessage;
      
      if (data?.contentId) {
        // Navigate to government content detail
        // This would be handled by the navigation service
        console.log('Navigate to government content:', data.contentId);
        
        // Track notification opened
        this.trackNotificationEvent(data.contentId, 'opened');
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  }

  /**
   * Subscribe to government content topics
   */
  private async subscribeToTopics(): Promise<void> {
    try {
      // Subscribe to general government updates
      await messaging().subscribeToTopic('government_updates');
      
      // Subscribe to critical alerts
      await messaging().subscribeToTopic('government_critical');
      
      console.log('Subscribed to government notification topics');
    } catch (error) {
      console.error('Error subscribing to topics:', error);
    }
  }

  /**
   * Subscribe to specific government content notifications
   */
  async subscribeToGovernmentNotifications(
    subjects?: string[],
    gradeLevels?: string[],
    contentTypes?: string[],
    sources?: string[]
  ): Promise<void> {
    try {
      // Call backend service to update subscription
      await governmentService.subscribeToNotifications(
        subjects,
        gradeLevels,
        contentTypes,
        sources
      );

      // Subscribe to relevant FCM topics
      if (subjects) {
        for (const subject of subjects) {
          await messaging().subscribeToTopic(`government_subject_${subject.toLowerCase()}`);
        }
      }

      if (contentTypes) {
        for (const type of contentTypes) {
          await messaging().subscribeToTopic(`government_type_${type.toLowerCase()}`);
        }
      }

      console.log('Subscribed to government content notifications');
    } catch (error) {
      console.error('Error subscribing to government notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from government content notifications
   */
  async unsubscribeFromGovernmentNotifications(): Promise<void> {
    try {
      // Call backend service
      await governmentService.unsubscribeFromNotifications();

      // Unsubscribe from all government topics
      const topics = await this.getSubscribedTopics();
      for (const topic of topics) {
        if (topic.startsWith('government_')) {
          await messaging().unsubscribeFromTopic(topic);
        }
      }

      console.log('Unsubscribed from government notifications');
    } catch (error) {
      console.error('Error unsubscribing from government notifications:', error);
      throw error;
    }
  }

  /**
   * Get subscribed topics (mock implementation)
   */
  private async getSubscribedTopics(): Promise<string[]> {
    // This would typically be stored locally or retrieved from the backend
    return [
      'government_updates',
      'government_critical',
      'government_subject_mathematics',
      'government_type_curriculum_update',
    ];
  }

  /**
   * Track notification events
   */
  private async trackNotificationEvent(
    contentId: string,
    eventType: 'received' | 'opened'
  ): Promise<void> {
    try {
      await governmentService.trackContentEvent(
        contentId,
        eventType === 'received' ? 'notification_received' : 'notification_opened',
        { timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.warn('Failed to track notification event:', error);
    }
  }

  /**
   * Get FCM token for debugging
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Handle notification action press
   */
  async handleNotificationAction(actionId: string, notification: any): Promise<void> {
    try {
      switch (actionId) {
        case 'view_details':
        case 'view':
          // Navigate to content detail
          console.log('Navigate to content:', notification.data?.contentId);
          break;
          
        case 'mark_read':
          if (notification.data?.notificationId) {
            await governmentService.markNotificationAsRead(notification.data.notificationId);
          }
          break;
          
        default:
          console.log('Unknown notification action:', actionId);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }
}

export const governmentNotificationService = GovernmentNotificationService.getInstance();