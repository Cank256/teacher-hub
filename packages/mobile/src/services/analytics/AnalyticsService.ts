import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import * as Sentry from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';
import { AnalyticsEvent, UserProperties, PerformanceMetrics, AnalyticsConfig } from './types';

class AnalyticsService {
  private static instance: AnalyticsService;
  private storage: MMKV;
  private config: AnalyticsConfig;
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStartTime: number;
  private userOptedIn = false;

  private constructor() {
    this.storage = new MMKV({ id: 'analytics' });
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.config = {
      enableCrashReporting: true,
      enablePerformanceMonitoring: true,
      enableUserAnalytics: false, // Requires user consent
      enableStructuredLogging: false, // Requires user consent
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      privacyMode: true,
    };
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(config?: Partial<AnalyticsConfig>): Promise<void> {
    if (this.isInitialized) return;

    this.config = { ...this.config, ...config };
    
    // Load user preferences
    this.userOptedIn = this.storage.getBoolean('analytics_opted_in') ?? false;
    
    // Initialize Sentry for crash reporting (always enabled for stability)
    if (this.config.enableCrashReporting) {
      await this.initializeSentry();
    }

    // Set up performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }

    // Start session tracking
    this.startSession();

    // Set up periodic flush
    this.setupPeriodicFlush();

    this.isInitialized = true;
    console.log('Analytics service initialized');
  }

  private async initializeSentry(): Promise<void> {
    const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
    
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      enableNativeCrashHandling: true,
      enableNativeNdk: Platform.OS === 'android',
      attachStacktrace: true,
      attachScreenshot: true,
      attachViewHierarchy: true,
      maxBreadcrumbs: 100,
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation,
          enableNativeFramesTracking: true,
          enableStallTracking: true,
          enableAppStartTracking: true,
          enableUserInteractionTracing: true,
        }),
      ],
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
      profilesSampleRate: __DEV__ ? 1.0 : 0.1,
      beforeSend: (event) => {
        // Filter out sensitive information
        if (event.user?.email) {
          event.user.email = this.hashEmail(event.user.email);
        }
        return event;
      },
    });

    // Set user context
    const deviceInfo = await this.getDeviceInfo();
    Sentry.setUser({
      id: deviceInfo.deviceId,
      username: 'anonymous',
    });

    Sentry.setContext('device', deviceInfo);
  }

  private initializePerformanceMonitoring(): void {
    // Monitor app start performance
    this.trackAppStart();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor frame rate
    this.startFrameRateMonitoring();
  }

  private startSession(): void {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    
    if (this.userOptedIn) {
      this.trackEvent('session_start', {
        session_id: this.sessionId,
        timestamp: this.sessionStartTime,
      });
    }
  }

  private setupPeriodicFlush(): void {
    setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  // User consent management
  async setUserConsent(
    analyticsConsent: boolean,
    loggingConsent: boolean = false
  ): Promise<void> {
    this.userOptedIn = analyticsConsent;
    this.storage.set('analytics_opted_in', analyticsConsent);
    this.storage.set('logging_opted_in', loggingConsent);
    
    this.config.enableUserAnalytics = analyticsConsent;
    this.config.enableStructuredLogging = loggingConsent;

    if (analyticsConsent) {
      this.trackEvent('consent_granted', {
        analytics: analyticsConsent,
        logging: loggingConsent,
      });
    } else {
      // Clear existing data if consent withdrawn
      await this.clearUserData();
    }
  }

  getUserConsent(): { analytics: boolean; logging: boolean } {
    return {
      analytics: this.storage.getBoolean('analytics_opted_in') ?? false,
      logging: this.storage.getBoolean('logging_opted_in') ?? false,
    };
  }

  // Event tracking
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.config.enableUserAnalytics && !this.isSystemEvent(eventName)) {
      return;
    }

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name: eventName,
      properties: {
        ...properties,
        session_id: this.sessionId,
        timestamp: Date.now(),
        platform: Platform.OS,
        app_version: DeviceInfo.getVersion(),
      },
      timestamp: Date.now(),
      userId: this.getAnonymousUserId(),
    };

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(eventName)) {
      this.flushEvents();
    }

    // Auto-flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  // Screen tracking
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });

    // Also track with Sentry for performance monitoring
    Sentry.addBreadcrumb({
      message: `Screen: ${screenName}`,
      category: 'navigation',
      level: 'info',
      data: properties,
    });
  }

  // User properties
  setUserProperties(properties: UserProperties): void {
    if (!this.config.enableUserAnalytics) return;

    // Hash sensitive information
    const sanitizedProperties = this.sanitizeUserProperties(properties);
    
    Sentry.setUser({
      id: this.getAnonymousUserId(),
      ...sanitizedProperties,
    });

    this.trackEvent('user_properties_updated', sanitizedProperties);
  }

  // Performance tracking
  trackPerformance(metrics: PerformanceMetrics): void {
    const performanceEvent: AnalyticsEvent = {
      id: this.generateEventId(),
      name: 'performance_metrics',
      properties: {
        ...metrics,
        session_id: this.sessionId,
      },
      timestamp: Date.now(),
      userId: this.getAnonymousUserId(),
    };

    this.eventQueue.push(performanceEvent);

    // Also send to Sentry for performance monitoring
    Sentry.addBreadcrumb({
      message: 'Performance Metrics',
      category: 'performance',
      level: 'info',
      data: metrics,
    });
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>): void {
    // Always track errors for app stability
    Sentry.captureException(error, {
      contexts: {
        error_context: context,
      },
      tags: {
        session_id: this.sessionId,
      },
    });

    if (this.config.enableUserAnalytics) {
      this.trackEvent('error_occurred', {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      });
    }
  }

  // Structured logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableStructuredLogging) {
      // Only log to console in development
      if (__DEV__) {
        console[level](`[${level.toUpperCase()}] ${message}`, data);
      }
      return;
    }

    const logEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    // Add to Sentry breadcrumbs
    Sentry.addBreadcrumb({
      message,
      category: 'log',
      level: level as any,
      data,
    });

    // Track as event if user opted in
    this.trackEvent('log_entry', logEntry);
  }

  // Retention and engagement tracking
  trackRetention(): void {
    const lastActiveDate = this.storage.getString('last_active_date');
    const today = new Date().toDateString();
    
    if (lastActiveDate !== today) {
      this.storage.set('last_active_date', today);
      
      if (this.config.enableUserAnalytics) {
        this.trackEvent('daily_active_user', {
          date: today,
          days_since_install: this.getDaysSinceInstall(),
        });
      }
    }
  }

  trackEngagement(action: string, duration?: number): void {
    if (!this.config.enableUserAnalytics) return;

    this.trackEvent('user_engagement', {
      action,
      duration,
      session_duration: Date.now() - this.sessionStartTime,
    });
  }

  // App lifecycle tracking
  trackAppStateChange(state: 'active' | 'background' | 'inactive'): void {
    this.trackEvent('app_state_change', {
      state,
      session_duration: Date.now() - this.sessionStartTime,
    });

    if (state === 'background') {
      this.flushEvents();
    }
  }

  // Private methods
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, you would send these to your analytics backend
      // For now, we'll store them locally and log them
      await this.sendEventsToBackend(events);
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      console.error('Failed to flush analytics events:', error);
    }
  }

  private async sendEventsToBackend(events: AnalyticsEvent[]): Promise<void> {
    // This would be replaced with actual API call to your analytics backend
    if (__DEV__) {
      console.log('Analytics events:', events);
    }
    
    // Store events locally for now
    const storedEvents = this.storage.getString('stored_events');
    const existingEvents = storedEvents ? JSON.parse(storedEvents) : [];
    const allEvents = [...existingEvents, ...events];
    
    // Keep only last 1000 events to prevent storage bloat
    const recentEvents = allEvents.slice(-1000);
    this.storage.set('stored_events', JSON.stringify(recentEvents));
  }

  private async clearUserData(): Promise<void> {
    this.eventQueue = [];
    this.storage.delete('stored_events');
    this.storage.delete('last_active_date');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAnonymousUserId(): string {
    let userId = this.storage.getString('anonymous_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.storage.set('anonymous_user_id', userId);
    }
    return userId;
  }

  private async getDeviceInfo(): Promise<Record<string, any>> {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      brand: DeviceInfo.getBrand(),
      model: DeviceInfo.getModel(),
      systemName: DeviceInfo.getSystemName(),
      systemVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      bundleId: DeviceInfo.getBundleId(),
      isEmulator: await DeviceInfo.isEmulator(),
      hasNotch: DeviceInfo.hasNotch(),
      isTablet: DeviceInfo.isTablet(),
    };
  }

  private hashEmail(email: string): string {
    // Simple hash for privacy - in production use a proper hashing algorithm
    return email.split('@')[0].substring(0, 3) + '***@' + email.split('@')[1];
  }

  private sanitizeUserProperties(properties: UserProperties): Record<string, any> {
    const sanitized = { ...properties };
    
    // Remove or hash sensitive information
    if (sanitized.email) {
      sanitized.email = this.hashEmail(sanitized.email);
    }
    
    if (sanitized.phone) {
      sanitized.phone = sanitized.phone.substring(0, 3) + '***';
    }
    
    return sanitized;
  }

  private isSystemEvent(eventName: string): boolean {
    const systemEvents = [
      'session_start',
      'session_end',
      'app_state_change',
      'performance_metrics',
      'error_occurred',
      'consent_granted',
      'consent_withdrawn',
    ];
    return systemEvents.includes(eventName);
  }

  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = [
      'error_occurred',
      'crash_detected',
      'security_violation',
      'consent_withdrawn',
    ];
    return criticalEvents.includes(eventName);
  }

  private getDaysSinceInstall(): number {
    const installDate = this.storage.getString('install_date');
    if (!installDate) {
      const now = new Date().toISOString();
      this.storage.set('install_date', now);
      return 0;
    }
    
    const install = new Date(installDate);
    const now = new Date();
    return Math.floor((now.getTime() - install.getTime()) / (1000 * 60 * 60 * 24));
  }

  private trackAppStart(): void {
    const startTime = Date.now();
    
    // Track cold start time
    setTimeout(() => {
      const coldStartTime = Date.now() - startTime;
      this.trackPerformance({
        metric_name: 'cold_start_time',
        value: coldStartTime,
        unit: 'milliseconds',
      });
    }, 0);
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    setInterval(async () => {
      try {
        const memoryInfo = await DeviceInfo.getUsedMemory();
        this.trackPerformance({
          metric_name: 'memory_usage',
          value: memoryInfo,
          unit: 'bytes',
        });
      } catch (error) {
        console.warn('Failed to get memory info:', error);
      }
    }, 30000);
  }

  private startFrameRateMonitoring(): void {
    // This would be implemented with a native module or React Native performance API
    // For now, we'll simulate frame rate monitoring
    let frameCount = 0;
    let lastTime = Date.now();
    
    const measureFrameRate = () => {
      frameCount++;
      const currentTime = Date.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        this.trackPerformance({
          metric_name: 'frame_rate',
          value: fps,
          unit: 'fps',
        });
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }
}

export default AnalyticsService.getInstance();