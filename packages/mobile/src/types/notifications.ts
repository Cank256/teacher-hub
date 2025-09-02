/**
 * Notification Types
 * Type definitions for push notifications and related services
 */

export enum NotificationCategory {
  MESSAGE = 'messages',
  POST = 'posts',
  COMMUNITY = 'communities',
  GOVERNMENT = 'government',
  SYSTEM = 'system',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum NotificationType {
  DIRECT_MESSAGE = 'direct_message',
  GROUP_MESSAGE = 'group_message',
  POST_LIKE = 'post_like',
  POST_COMMENT = 'post_comment',
  POST_SHARE = 'post_share',
  COMMUNITY_INVITE = 'community_invite',
  COMMUNITY_POST = 'community_post',
  COMMUNITY_ANNOUNCEMENT = 'community_announcement',
  CURRICULUM_UPDATE = 'curriculum_update',
  POLICY_CHANGE = 'policy_change',
  EMERGENCY_ALERT = 'emergency_alert',
  SYSTEM_UPDATE = 'system_update',
  MAINTENANCE = 'maintenance',
}

export interface NotificationData {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  
  // Navigation data
  conversationId?: string;
  postId?: string;
  communityId?: string;
  contentId?: string;
  userId?: string;
  
  // Display options
  showPreview?: boolean;
  actionRequired?: boolean;
  expiresAt?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NotificationCategorySettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showPreview: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface QuietHoursSettings {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  allowCritical: boolean;
  allowMessages: boolean;
}

export interface GlobalNotificationSettings {
  enabled: boolean;
  showBadges: boolean;
  groupSimilar: boolean;
  smartDelivery: boolean;
}

export interface NotificationPreferences {
  messages: NotificationCategorySettings;
  posts: NotificationCategorySettings;
  communities: NotificationCategorySettings;
  government: NotificationCategorySettings;
  system: NotificationCategorySettings;
  quietHours: QuietHoursSettings;
  globalSettings: GlobalNotificationSettings;
}

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  appVersion: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationEvent {
  id: string;
  notificationId: string;
  eventType: 'received' | 'opened' | 'dismissed' | 'action_taken';
  actionId?: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationAnalytics {
  notificationId: string;
  eventType: 'received' | 'opened' | 'dismissed';
  timestamp: string;
  platform: string;
  appVersion: string;
  metadata?: Record<string, any>;
}

export interface NotificationMetrics {
  totalReceived: number;
  totalOpened: number;
  totalDismissed: number;
  totalActions: number;
  openRate: number;
  dismissalRate: number;
  actionRate: number;
  categoryMetrics: Record<string, {
    received: number;
    opened: number;
    openRate: number;
  }>;
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'low' | 'normal' | 'high' | 'max';
  sound?: string;
  vibration?: boolean;
  lights?: boolean;
  lightColor?: string;
  showBadge?: boolean;
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  destructive?: boolean;
  authenticationRequired?: boolean;
  foreground?: boolean;
}

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  actions?: NotificationAction[];
  sound?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ScheduledNotification {
  id: string;
  notificationData: NotificationData;
  scheduledTime: string;
  repeatInterval?: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'sent' | 'cancelled';
}

export interface NotificationSubscription {
  userId: string;
  categories: NotificationCategory[];
  topics: string[];
  preferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryReport {
  notificationId: string;
  totalTargets: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  errors: Array<{
    error: string;
    count: number;
  }>;
  timestamp: string;
}

export interface BackgroundNotificationTask {
  id: string;
  type: 'sync' | 'fetch' | 'cleanup';
  priority: 'low' | 'normal' | 'high';
  data?: Record<string, any>;
  scheduledTime?: string;
  maxExecutionTime: number;
  retryCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface NotificationPermissionStatus {
  granted: boolean;
  provisional?: boolean;
  denied?: boolean;
  restricted?: boolean;
  canAskAgain?: boolean;
  settings?: {
    alert: boolean;
    badge: boolean;
    sound: boolean;
    criticalAlert?: boolean;
    announcement?: boolean;
  };
}

export interface NotificationSound {
  id: string;
  name: string;
  filename: string;
  category: NotificationCategory;
  duration: number;
  volume: number;
}

export interface NotificationBadge {
  count: number;
  lastUpdated: string;
  breakdown: {
    messages: number;
    posts: number;
    communities: number;
    government: number;
    system: number;
  };
}

export interface NotificationHistory {
  id: string;
  notificationData: NotificationData;
  receivedAt: string;
  openedAt?: string;
  dismissedAt?: string;
  actionTaken?: string;
  read: boolean;
}

export interface NotificationFilter {
  categories?: NotificationCategory[];
  types?: NotificationType[];
  priority?: ('low' | 'normal' | 'high' | 'critical')[];
  dateRange?: {
    start: string;
    end: string;
  };
  read?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationBatch {
  id: string;
  notifications: NotificationData[];
  targetUsers: string[];
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  deliveryReport?: NotificationDeliveryReport;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
  actions: Array<{
    type: 'send_notification' | 'suppress' | 'modify_priority' | 'delay';
    parameters: Record<string, any>;
  }>;
  enabled: boolean;
  priority: number;
}

export interface NotificationQueue {
  id: string;
  notifications: NotificationData[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  batchSize: number;
  processingRate: number; // notifications per second
  status: 'idle' | 'processing' | 'paused' | 'error';
  lastProcessed?: string;
  errorCount: number;
}

export interface NotificationConfig {
  maxQueueSize: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  maxExecutionTime: number;
  enableAnalytics: boolean;
  enableBatching: boolean;
  enableCompression: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
}

export interface NotificationError {
  id: string;
  notificationId: string;
  errorType: 'delivery_failed' | 'invalid_token' | 'rate_limited' | 'service_unavailable';
  errorMessage: string;
  timestamp: string;
  retryable: boolean;
  retryCount: number;
  metadata?: Record<string, any>;
}