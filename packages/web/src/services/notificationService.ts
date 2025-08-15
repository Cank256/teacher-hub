interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.permission = Notification.permission;
    this.initializeServiceWorker();
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    if (this.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission;
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Check if the page is visible - don't show notifications if user is actively using the app
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    try {
      if (this.registration) {
        // Use service worker to show notification (better for background)
        await this.registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          actions: options.actions,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false
        });
      } else {
        // Fallback to regular notification
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showMessageNotification(senderName: string, message: string, conversationId: string): Promise<void> {
    await this.showNotification({
      title: `New message from ${senderName}`,
      body: message.length > 100 ? `${message.substring(0, 100)}...` : message,
      icon: '/favicon.ico',
      tag: `message-${conversationId}`,
      data: {
        type: 'message',
        conversationId,
        senderName
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply'
        },
        {
          action: 'view',
          title: 'View'
        }
      ],
      requireInteraction: false
    });
  }

  async showTypingNotification(senderName: string, conversationId: string): Promise<void> {
    // Only show typing notifications for direct messages, not groups
    await this.showNotification({
      title: `${senderName} is typing...`,
      body: '',
      icon: '/favicon.ico',
      tag: `typing-${conversationId}`,
      data: {
        type: 'typing',
        conversationId,
        senderName
      },
      silent: true,
      requireInteraction: false
    });

    // Auto-dismiss typing notification after 3 seconds
    setTimeout(() => {
      this.dismissNotification(`typing-${conversationId}`);
    }, 3000);
  }

  dismissNotification(tag: string): void {
    if (this.registration) {
      this.registration.getNotifications({ tag }).then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  private async sendSubscriptionToServer(subscription: globalThis.PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
            }
          }
        })
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission status
  getPermission(): NotificationPermission {
    return this.permission;
  }

  // Setup notification click handlers
  setupNotificationHandlers(): void {
    if (this.registration) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-click') {
          const { action, data } = event.data;
          this.handleNotificationClick(action, data);
        }
      });
    }
  }

  private handleNotificationClick(action: string, data: any): void {
    switch (action) {
      case 'reply':
        // Open reply interface
        window.focus();
        window.location.hash = `#/messages/${data.conversationId}?reply=true`;
        break;
      case 'view':
        // Open conversation
        window.focus();
        window.location.hash = `#/messages/${data.conversationId}`;
        break;
      default:
        // Default action - just focus the window
        window.focus();
        break;
    }
  }

  // Enable/disable notifications based on user preference
  async setNotificationPreference(enabled: boolean): Promise<void> {
    if (enabled) {
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        await this.subscribeToPush();
      }
    } else {
      // Unsubscribe from push notifications
      if (this.registration) {
        const subscription = await this.registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }
    }

    // Save preference to localStorage
    localStorage.setItem('notificationsEnabled', enabled.toString());
  }

  // Check if notifications are enabled by user
  areNotificationsEnabled(): boolean {
    return localStorage.getItem('notificationsEnabled') === 'true' && this.permission === 'granted';
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export types
export type { NotificationOptions, NotificationAction, PushSubscription };