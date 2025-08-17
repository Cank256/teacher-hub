import {Platform, Alert, Linking} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  data?: {
    type: 'post_like' | 'post_comment' | 'post_mention' | 'community_invite' | 'message';
    entityId: string;
    userId?: string;
    communityId?: string;
  };
  badge?: number;
  sound?: string;
}

export interface NotificationAction {
  id: string;
  title: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
  };
}

class PushNotificationService {
  private isInitialized = false;
  private deviceToken: string | null = null;
  private notificationHandlers: Map<string, (notification: NotificationPayload) => void> = new Map();

  async initialize(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // In a real implementation, you would initialize the push notification library here
      // For example, with @react-native-firebase/messaging or @react-native-async-storage/async-storage
      
      this.setupNotificationHandlers();
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
        return result === RESULTS.GRANTED;
      } else {
        // Android permissions are handled differently
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  private setupNotificationHandlers() {
    // Setup handlers for different notification events
    // This would integrate with your chosen push notification library
    
    // Handle notification received while app is in foreground
    this.onNotificationReceived((notification) => {
      this.handleForegroundNotification(notification);
    });

    // Handle notification tapped
    this.onNotificationTapped((notification) => {
      this.handleNotificationTap(notification);
    });
  }

  private onNotificationReceived(handler: (notification: NotificationPayload) => void) {
    // This would be implemented with your push notification library
    // For example: messaging().onMessage(handler);
  }

  private onNotificationTapped(handler: (notification: NotificationPayload) => void) {
    // This would be implemented with your push notification library
    // For example: messaging().onNotificationOpenedApp(handler);
  }

  private handleForegroundNotification(notification: NotificationPayload) {
    // Show in-app notification or update badge
    const handler = this.notificationHandlers.get(notification.data?.type || 'default');
    if (handler) {
      handler(notification);
    } else {
      // Default handling - show alert
      Alert.alert(notification.title, notification.body);
    }
  }

  private handleNotificationTap(notification: NotificationPayload) {
    // Navigate to appropriate screen based on notification type
    if (!notification.data) return;

    switch (notification.data.type) {
      case 'post_like':
      case 'post_comment':
        this.navigateToPost(notification.data.entityId);
        break;
      case 'post_mention':
        this.navigateToPost(notification.data.entityId);
        break;
      case 'community_invite':
        this.navigateToCommunity(notification.data.communityId!);
        break;
      case 'message':
        this.navigateToMessages(notification.data.userId);
        break;
    }
  }

  private navigateToPost(postId: string) {
    // This would use your navigation service
    console.log('Navigate to post:', postId);
  }

  private navigateToCommunity(communityId: string) {
    // This would use your navigation service
    console.log('Navigate to community:', communityId);
  }

  private navigateToMessages(userId?: string) {
    // This would use your navigation service
    console.log('Navigate to messages:', userId);
  }

  async getDeviceToken(): Promise<string | null> {
    if (this.deviceToken) {
      return this.deviceToken;
    }

    try {
      // This would get the device token from your push notification library
      // For example: const token = await messaging().getToken();
      const token = 'mock-device-token-' + Date.now();
      this.deviceToken = token;
      return token;
    } catch (error) {
      console.error('Failed to get device token:', error);
      return null;
    }
  }

  async registerForPostNotifications(postId: string): Promise<void> {
    // Register to receive notifications for a specific post
    const token = await this.getDeviceToken();
    if (!token) return;

    // This would call your backend API to register for notifications
    console.log('Registering for post notifications:', postId, token);
  }

  async unregisterFromPostNotifications(postId: string): Promise<void> {
    // Unregister from notifications for a specific post
    const token = await this.getDeviceToken();
    if (!token) return;

    // This would call your backend API to unregister from notifications
    console.log('Unregistering from post notifications:', postId, token);
  }

  registerNotificationHandler(
    type: string,
    handler: (notification: NotificationPayload) => void
  ) {
    this.notificationHandlers.set(type, handler);
  }

  unregisterNotificationHandler(type: string) {
    this.notificationHandlers.delete(type);
  }

  async scheduleLocalNotification(notification: NotificationPayload, delay: number = 0) {
    // Schedule a local notification
    // This would use your local notification library
    console.log('Scheduling local notification:', notification, delay);
  }

  async cancelLocalNotification(notificationId: string) {
    // Cancel a scheduled local notification
    console.log('Canceling local notification:', notificationId);
  }

  async setBadgeCount(count: number) {
    // Set the app badge count
    // This would use your push notification library
    console.log('Setting badge count:', count);
  }

  async clearAllNotifications() {
    // Clear all notifications from the notification center
    console.log('Clearing all notifications');
  }

  // Utility methods for creating notification payloads
  createPostLikeNotification(
    postTitle: string,
    likerName: string,
    postId: string
  ): NotificationPayload {
    return {
      id: `post_like_${postId}_${Date.now()}`,
      title: 'Post Liked',
      body: `${likerName} liked your post "${postTitle}"`,
      data: {
        type: 'post_like',
        entityId: postId,
      },
    };
  }

  createPostCommentNotification(
    postTitle: string,
    commenterName: string,
    postId: string
  ): NotificationPayload {
    return {
      id: `post_comment_${postId}_${Date.now()}`,
      title: 'New Comment',
      body: `${commenterName} commented on your post "${postTitle}"`,
      data: {
        type: 'post_comment',
        entityId: postId,
      },
    };
  }

  createPostMentionNotification(
    postTitle: string,
    mentionerName: string,
    postId: string
  ): NotificationPayload {
    return {
      id: `post_mention_${postId}_${Date.now()}`,
      title: 'You were mentioned',
      body: `${mentionerName} mentioned you in "${postTitle}"`,
      data: {
        type: 'post_mention',
        entityId: postId,
      },
    };
  }

  showPermissionAlert() {
    Alert.alert(
      'Enable Notifications',
      'Get notified when people interact with your posts and when you receive messages.',
      [
        {text: 'Not Now', style: 'cancel'},
        {text: 'Settings', onPress: () => Linking.openSettings()},
      ]
    );
  }
}

export const pushNotificationService = new PushNotificationService();