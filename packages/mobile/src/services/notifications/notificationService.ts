/**
 * Push Notification Service
 * Handles FCM (Android) and APNs (iOS) push notifications with proper targeting and permissions
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { storageService } from '../storage/storageService';
import { apiClient } from '../api/apiClient';
import { 
  NotificationData, 
  NotificationCategory, 
  NotificationPreferences,
  PushNotificationToken,
  NotificationAnalytics
} from '../../types/notifications';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const category = notification.request.content.categoryIdentifier;
    const priority = notification.request.content.data?.priority || 'normal';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === 'high' || priority === 'critical',
      shouldSetBadge: true,
      priority: priority === 'critical' 
        ? Notifications.AndroidNotificationPriority.MAX 
        : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private pushToken: string | null = null;
  private preferences: NotificationPreferences | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register background task
      this.registerBackgroundTask();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return;
      }

      // Get push token
      await this.registerForPushNotifications();
      
      // Create notification channels
      await this.createNotificationChannels();
      
      // Load user preferences
      await this.loadNotificationPreferences();
      
      // Set up notification handlers
      this.setupNotificationHandlers();
      
      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
            provideAppNotificationSettings: true,
            allowProvisional: false,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = pushTokenData.data;
      console.log('Push token obtained:', this.pushToken);

      // Store token locally
      await storageService.setItem('pushToken', this.pushToken);
      
      // Send token to backend
      await this.sendTokenToBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const tokenData: PushNotificationToken = {
        token,
        platform: Platform.OS,
        deviceId: Device.osInternalBuildId || 'unknown',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        createdAt: new Date().toISOString(),
      };

      await apiClient.post('/notifications/register-token', tokenData);
      console.log('Push token sent to backend successfully');
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
      // Don't throw - this shouldn't prevent app from working
    }
  }

  /**
   * Create notification channels for Android
   */
  async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'notification.wav',
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Direct messages and conversations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'message.wav',
        showBadge: true,
      });

      // Posts channel
      await Notifications.setNotificationChannelAsync('posts', {
        name: 'Posts & Communities',
        description: 'New posts and community activities',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF9800',
        sound: 'notification.wav',
      });

      // Government content channel
      await Notifications.setNotificationChannelAsync('government', {
        name: 'Government Updates',
        description: 'Official government content and announcements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F44336',
        sound: 'government_alert.wav',
        showBadge: true,
      });

      // System channel
      await Notifications.setNotificationChannelAsync('system', {
        name: 'System Notifications',
        description: 'App updates and system messages',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250],
        lightColor: '#9E9E9E',
        sound: 'notification.wav',
      });

      console.log('Notification channels created successfully');
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  /**
   * Set up notification event handlers
   */
  private setupNotificationHandlers(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      this.handleNotificationResponse(response);
    });

    // Handle notification dropped (iOS only)
    if (Platform.OS === 'ios') {
      Notifications.addNotificationDroppedListener((notification) => {
        console.log('Notification dropped:', notification);
      });
    }
  }

  /**
   * Handle notification received
   */
  private async handleNotificationReceived(
    notification: Notifications.Notification
  ): Promise<void> {
    try {
      const data = notification.request.content.data as NotificationData;
      
      // Track analytics
      await this.trackNotificationEvent(data.id || 'unknown', 'received');
      
      // Update badge count
      await this.updateBadgeCount();
      
      // Handle specific notification types
      switch (data.category) {
        case NotificationCategory.MESSAGE:
          await this.handleMessageNotification(data);
          break;
        case NotificationCategory.POST:
          await this.handlePostNotification(data);
          break;
        case NotificationCategory.GOVERNMENT:
          await this.handleGovernmentNotification(data);
          break;
        default:
          console.log('Unknown notification category:', data.category);
      }
    } catch (error) {
      console.error('Error handling notification received:', error);
    }
  }

  /**
   * Handle notification response (user interaction)
   */
  private async handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): Promise<void> {
    try {
      const data = response.notification.request.content.data as NotificationData;
      const actionIdentifier = response.actionIdentifier;
      
      // Track analytics
      await this.trackNotificationEvent(data.id || 'unknown', 'opened');
      
      // Handle different actions
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Default tap action - navigate to relevant screen
        await this.navigateFromNotification(data);
      } else {
        // Handle custom actions
        await this.handleNotificationAction(actionIdentifier, data);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  /**
   * Handle message notifications
   */
  private async handleMessageNotification(data: NotificationData): Promise<void> {
    try {
      // Update local message cache if needed
      if (data.conversationId) {
        // This would integrate with the messaging service
        console.log('Updating message cache for conversation:', data.conversationId);
      }
    } catch (error) {
      console.error('Error handling message notification:', error);
    }
  }

  /**
   * Handle post notifications
   */
  private async handlePostNotification(data: NotificationData): Promise<void> {
    try {
      // Update local post cache if needed
      if (data.postId) {
        console.log('Updating post cache for post:', data.postId);
      }
    } catch (error) {
      console.error('Error handling post notification:', error);
    }
  }

  /**
   * Handle government notifications
   */
  private async handleGovernmentNotification(data: NotificationData): Promise<void> {
    try {
      // Mark as high priority and ensure it's stored for offline access
      if (data.contentId) {
        console.log('Processing government notification for content:', data.contentId);
      }
    } catch (error) {
      console.error('Error handling government notification:', error);
    }
  }

  /**
   * Navigate from notification
   */
  private async navigateFromNotification(data: NotificationData): Promise<void> {
    try {
      // This would integrate with the navigation service
      switch (data.category) {
        case NotificationCategory.MESSAGE:
          if (data.conversationId) {
            console.log('Navigate to conversation:', data.conversationId);
            // NavigationService.navigate('Messages', { conversationId: data.conversationId });
          }
          break;
        case NotificationCategory.POST:
          if (data.postId) {
            console.log('Navigate to post:', data.postId);
            // NavigationService.navigate('PostDetail', { postId: data.postId });
          }
          break;
        case NotificationCategory.GOVERNMENT:
          if (data.contentId) {
            console.log('Navigate to government content:', data.contentId);
            // NavigationService.navigate('GovernmentContent', { contentId: data.contentId });
          }
          break;
        default:
          console.log('Navigate to main screen');
          // NavigationService.navigate('Main');
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  }

  /**
   * Handle notification actions
   */
  private async handleNotificationAction(
    actionIdentifier: string,
    data: NotificationData
  ): Promise<void> {
    try {
      switch (actionIdentifier) {
        case 'reply':
          if (data.conversationId) {
            console.log('Quick reply to conversation:', data.conversationId);
            // Open quick reply interface
          }
          break;
        case 'mark_read':
          if (data.conversationId) {
            console.log('Mark conversation as read:', data.conversationId);
            // Mark conversation as read
          }
          break;
        case 'like':
          if (data.postId) {
            console.log('Like post:', data.postId);
            // Like the post
          }
          break;
        case 'view_details':
          await this.navigateFromNotification(data);
          break;
        default:
          console.log('Unknown action identifier:', actionIdentifier);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      // Get unread counts from various sources
      const unreadMessages = await this.getUnreadMessageCount();
      const unreadNotifications = await this.getUnreadNotificationCount();
      
      const totalBadgeCount = unreadMessages + unreadNotifications;
      
      await Notifications.setBadgeCountAsync(totalBadgeCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Get unread message count
   */
  private async getUnreadMessageCount(): Promise<number> {
    try {
      // This would integrate with the messaging service
      const count = await storageService.getItem<number>('unreadMessageCount') || 0;
      return count;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  private async getUnreadNotificationCount(): Promise<number> {
    try {
      const count = await storageService.getItem<number>('unreadNotificationCount') || 0;
      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Load notification preferences
   */
  async loadNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const preferences = await storageService.getItem<NotificationPreferences>('notificationPreferences');
      
      if (!preferences) {
        // Set default preferences
        const defaultPreferences: NotificationPreferences = {
          messages: { enabled: true, sound: true, vibration: true },
          posts: { enabled: true, sound: false, vibration: true },
          communities: { enabled: true, sound: false, vibration: false },
          government: { enabled: true, sound: true, vibration: true },
          system: { enabled: true, sound: false, vibration: false },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '07:00',
          },
        };
        
        await this.updateNotificationPreferences(defaultPreferences);
        this.preferences = defaultPreferences;
      } else {
        this.preferences = preferences;
      }
      
      return this.preferences;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await storageService.setItem('notificationPreferences', preferences);
      this.preferences = preferences;
      
      // Update backend preferences
      await apiClient.put('/notifications/preferences', preferences);
      
      console.log('Notification preferences updated');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Register background task for notification processing
   */
  private registerBackgroundTask(): void {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
      if (error) {
        console.error('Background notification task error:', error);
        return;
      }

      if (data) {
        console.log('Processing background notification:', data);
        // Process notification in background
        this.processBackgroundNotification(data as any);
      }
    });
  }

  /**
   * Process notification in background
   */
  private async processBackgroundNotification(data: any): Promise<void> {
    try {
      // Minimal processing to avoid battery drain
      console.log('Background notification processed:', data);
      
      // Update badge count
      await this.updateBadgeCount();
      
      // Sync critical data if needed
      if (data.category === NotificationCategory.GOVERNMENT && data.priority === 'critical') {
        // Trigger background sync for critical government content
        console.log('Triggering background sync for critical content');
      }
    } catch (error) {
      console.error('Error processing background notification:', error);
    }
  }

  /**
   * Track notification analytics
   */
  private async trackNotificationEvent(
    notificationId: string,
    eventType: 'received' | 'opened' | 'dismissed'
  ): Promise<void> {
    try {
      const analytics: NotificationAnalytics = {
        notificationId,
        eventType,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || '1.0.0',
      };

      // Store locally for batch upload
      const existingAnalytics = await storageService.getItem<NotificationAnalytics[]>('notificationAnalytics') || [];
      existingAnalytics.push(analytics);
      
      // Keep only last 100 events to avoid storage bloat
      if (existingAnalytics.length > 100) {
        existingAnalytics.splice(0, existingAnalytics.length - 100);
      }
      
      await storageService.setItem('notificationAnalytics', existingAnalytics);
      
      // Try to send to backend (don't wait or throw on failure)
      apiClient.post('/notifications/analytics', analytics).catch((error) => {
        console.warn('Failed to send notification analytics:', error);
      });
    } catch (error) {
      console.warn('Error tracking notification event:', error);
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    options?: {
      categoryIdentifier?: string;
      sound?: string;
      badge?: number;
      priority?: 'low' | 'normal' | 'high' | 'critical';
    }
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          categoryIdentifier: options?.categoryIdentifier || 'default',
          sound: options?.sound || 'notification.wav',
          badge: options?.badge,
          priority: this.getNotificationPriority(options?.priority || 'normal'),
        },
        trigger: null, // Send immediately
      });

      console.log('Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      throw error;
    }
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(priority: string): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'critical':
        return Notifications.AndroidNotificationPriority.MAX;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Open notification settings
   */
  async openNotificationSettings(): Promise<void> {
    try {
      await Notifications.openSettingsAsync();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();