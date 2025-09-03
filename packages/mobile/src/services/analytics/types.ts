export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  userId: string;
}

export interface UserProperties {
  id?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  subjects?: string[];
  gradeLevels?: string[];
  schoolLocation?: string;
  yearsOfExperience?: number;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  role?: string;
  preferences?: Record<string, any>;
}

export interface PerformanceMetrics {
  metric_name: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
  screen?: string;
  action?: string;
}

export interface AnalyticsConfig {
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
  enableUserAnalytics: boolean;
  enableStructuredLogging: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  privacyMode: boolean;
}

export interface SessionInfo {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  screenViews: number;
  events: number;
  crashes: number;
}

export interface RetentionMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  sessionCount: number;
  averageSessionDuration: number;
  daysSinceInstall: number;
  daysSinceLastUse: number;
}

export interface EngagementMetrics {
  action: string;
  duration?: number;
  frequency: number;
  sessionDuration: number;
  screenTime: Record<string, number>;
  featureUsage: Record<string, number>;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: number;
  isFatal: boolean;
  breadcrumbs?: Breadcrumb[];
}

export interface Breadcrumb {
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  timestamp: number;
  data?: Record<string, any>;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: number;
  sessionId: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  structuredLoggingEnabled: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
}

export interface MonitoringAlert {
  id: string;
  type: 'crash' | 'performance' | 'error' | 'usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Event names constants
export const ANALYTICS_EVENTS = {
  // App lifecycle
  APP_START: 'app_start',
  APP_BACKGROUND: 'app_background',
  APP_FOREGROUND: 'app_foreground',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Authentication
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  REGISTRATION_START: 'registration_start',
  REGISTRATION_COMPLETE: 'registration_complete',
  BIOMETRIC_AUTH_ENABLED: 'biometric_auth_enabled',
  
  // Navigation
  SCREEN_VIEW: 'screen_view',
  NAVIGATION: 'navigation',
  DEEP_LINK_OPENED: 'deep_link_opened',
  
  // Posts
  POST_CREATED: 'post_created',
  POST_VIEWED: 'post_viewed',
  POST_LIKED: 'post_liked',
  POST_SHARED: 'post_shared',
  POST_COMMENTED: 'post_commented',
  POST_DELETED: 'post_deleted',
  
  // Communities
  COMMUNITY_JOINED: 'community_joined',
  COMMUNITY_LEFT: 'community_left',
  COMMUNITY_VIEWED: 'community_viewed',
  COMMUNITY_SEARCHED: 'community_searched',
  
  // Messaging
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  CONVERSATION_STARTED: 'conversation_started',
  
  // Resources
  RESOURCE_UPLOADED: 'resource_uploaded',
  RESOURCE_DOWNLOADED: 'resource_downloaded',
  RESOURCE_VIEWED: 'resource_viewed',
  RESOURCE_RATED: 'resource_rated',
  YOUTUBE_VIDEO_UPLOADED: 'youtube_video_uploaded',
  
  // Performance
  PERFORMANCE_METRICS: 'performance_metrics',
  SLOW_OPERATION: 'slow_operation',
  MEMORY_WARNING: 'memory_warning',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  CRASH_DETECTED: 'crash_detected',
  API_ERROR: 'api_error',
  
  // User engagement
  FEATURE_USED: 'feature_used',
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  SETTINGS_CHANGED: 'settings_changed',
  
  // Privacy and consent
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_WITHDRAWN: 'consent_withdrawn',
  PRIVACY_SETTINGS_CHANGED: 'privacy_settings_changed',
  
  // Offline functionality
  OFFLINE_MODE_ENTERED: 'offline_mode_entered',
  OFFLINE_MODE_EXITED: 'offline_mode_exited',
  OFFLINE_SYNC_COMPLETED: 'offline_sync_completed',
  
  // Accessibility
  ACCESSIBILITY_FEATURE_USED: 'accessibility_feature_used',
  VOICE_CONTROL_USED: 'voice_control_used',
  SCREEN_READER_USED: 'screen_reader_used',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  COLD_START_TIME: 2000, // 2 seconds
  SCREEN_LOAD_TIME: 1000, // 1 second
  API_RESPONSE_TIME: 5000, // 5 seconds
  MEMORY_USAGE: 200 * 1024 * 1024, // 200MB
  FRAME_RATE: 55, // FPS
  BATTERY_DRAIN: 5, // Percentage per hour
} as const;

// Privacy compliance levels
export enum PrivacyLevel {
  MINIMAL = 'minimal', // Only crash reporting
  BASIC = 'basic', // Crash reporting + basic analytics
  STANDARD = 'standard', // All features except detailed logging
  FULL = 'full', // All features enabled
}

export interface AnalyticsHook {
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackScreen: (screenName: string, properties?: Record<string, any>) => void;
  trackPerformance: (metrics: PerformanceMetrics) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
  setUserProperties: (properties: UserProperties) => void;
  isAnalyticsEnabled: boolean;
  privacySettings: PrivacySettings;
}