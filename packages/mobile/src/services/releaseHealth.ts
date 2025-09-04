/**
 * Release Health Monitoring Service
 * Tracks crash-free sessions, performance metrics, and release health
 */

import * as Sentry from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';
import DeviceInfo from 'react-native-device-info';
import { AppState, AppStateStatus } from 'react-native';

// Storage for health metrics
const healthStorage = new MMKV({
  id: 'release-health',
  encryptionKey: 'release-health-key'
});

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  crashed: boolean;
  crashReason?: string;
  appVersion: string;
  buildNumber: string;
  platform: string;
  deviceModel: string;
  osVersion: string;
  memoryUsage?: number;
  batteryLevel?: number;
  networkType?: string;
}

export interface PerformanceMetrics {
  appStartTime: number;
  timeToInteractive: number;
  coldStartDuration: number;
  warmStartDuration: number;
  averageFrameRate: number;
  slowFrames: number;
  frozenFrames: number;
  memoryPressureEvents: number;
  networkRequestCount: number;
  networkFailureCount: number;
}

export interface ReleaseHealthSummary {
  version: string;
  buildNumber: string;
  totalSessions: number;
  crashFreeSessions: number;
  crashFreeSessionsRate: number;
  averageSessionDuration: number;
  totalCrashes: number;
  uniqueCrashes: number;
  performanceScore: number;
  lastUpdated: number;
}

class ReleaseHealthService {
  private static instance: ReleaseHealthService;
  private currentSession: SessionMetrics | null = null;
  private performanceMetrics: PerformanceMetrics;
  private appStateSubscription: any;
  private frameRateMonitor: any;

  private constructor() {
    this.performanceMetrics = this.initializePerformanceMetrics();
    this.setupAppStateListener();
    this.setupCrashHandler();
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): ReleaseHealthService {
    if (!ReleaseHealthService.instance) {
      ReleaseHealthService.instance = new ReleaseHealthService();
    }
    return ReleaseHealthService.instance;
  }

  /**
   * Initialize the service and start session tracking
   */
  public async initialize(): Promise<void> {
    try {
      await this.startSession();
      this.trackAppStart();
      console.log('Release health monitoring initialized');
    } catch (error) {
      console.error('Error initializing release health service:', error);
    }
  }

  /**
   * Start a new session
   */
  private async startSession(): Promise<void> {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = await this.getDeviceInfo();

      this.currentSession = {
        sessionId,
        startTime: Date.now(),
        crashed: false,
        appVersion: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        platform: deviceInfo.platform,
        deviceModel: deviceInfo.deviceModel,
        osVersion: deviceInfo.osVersion,
        memoryUsage: deviceInfo.memoryUsage,
        batteryLevel: deviceInfo.batteryLevel,
        networkType: deviceInfo.networkType
      };

      
      // Store session start
      this.storeSessionMetrics(this.currentSession);
      
      // Track with Sentry
      Sentry.addBreadcrumb({
        message: 'Session started',
        category: 'session',
        data: {
          sessionId: this.currentSession.sessionId,
          appVersion: this.currentSession.appVersion
        }
      });

    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  /**
   * End current session
   */
  private endSession(crashed: boolean = false, crashReason?: string): void {
    if (!this.currentSession) return;

    try {
      const endTime = Date.now();
      const duration = endTime - this.currentSession.startTime;

      this.currentSession.endTime = endTime;
      this.currentSession.duration = duration;
      this.currentSession.crashed = crashed;
      if (crashReason !== undefined) {
        this.currentSession.crashReason = crashReason;
      }

      // Store completed session
      this.storeSessionMetrics(this.currentSession);

      // Update health summary
      this.updateHealthSummary();

      // Track with Sentry
      Sentry.addBreadcrumb({
        message: crashed ? 'Session ended with crash' : 'Session ended normally',
        category: 'session',
        level: crashed ? 'error' : 'info',
        data: {
          sessionId: this.currentSession.sessionId,
          duration,
          crashed
        }
      });

      this.currentSession = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Track app start performance
   */
  private trackAppStart(): void {
    const appStartTime = performance.now();
    this.performanceMetrics.appStartTime = appStartTime;

    // Measure time to interactive (when app is ready for user interaction)
    setTimeout(() => {
      this.performanceMetrics.timeToInteractive = performance.now() - appStartTime;
      this.reportPerformanceMetric('time_to_interactive', this.performanceMetrics.timeToInteractive);
    }, 100);

    // Track cold start vs warm start
    const isWarmStart = this.isWarmStart();
    if (isWarmStart) {
      this.performanceMetrics.warmStartDuration = appStartTime;
      this.reportPerformanceMetric('warm_start_duration', appStartTime);
    } else {
      this.performanceMetrics.coldStartDuration = appStartTime;
      this.reportPerformanceMetric('cold_start_duration', appStartTime);
    }
  }

  /**
   * Track crash event
   */
  public trackCrash(error: Error, isFatal: boolean = true): void {
    try {
      // End current session as crashed
      this.endSession(true, error.message);

      // Report to Sentry
      Sentry.captureException(error, {
        tags: {
          release_health: 'crash',
          session_id: this.currentSession?.sessionId
        },
        extra: {
          isFatal,
          sessionDuration: this.currentSession?.duration,
          performanceMetrics: this.performanceMetrics
        }
      });

      // Store crash details
      this.storeCrashDetails(error, isFatal);

    } catch (reportError) {
      console.error('Error reporting crash:', reportError);
    }
  }

  /**
   * Track performance metric
   */
  public trackPerformanceMetric(metric: string, value: number, tags?: Record<string, string>): void {
    try {
      // Report to Sentry
      Sentry.addBreadcrumb({
        message: `Performance metric: ${metric}`,
        category: 'performance',
        data: { metric, value, ...tags }
      });

      // Store locally
      const performanceData = {
        metric,
        value,
        timestamp: Date.now(),
        sessionId: this.currentSession?.sessionId,
        ...tags
      };

      this.storePerformanceMetric(performanceData);
    } catch (error) {
      console.error('Error tracking performance metric:', error);
    }
  }

  /**
   * Get current release health summary
   */
  public getHealthSummary(): ReleaseHealthSummary | null {
    try {
      const summaryData = healthStorage.getString('health_summary');
      return summaryData ? JSON.parse(summaryData) : null;
    } catch (error) {
      console.error('Error getting health summary:', error);
      return null;
    }
  }

  /**
   * Get crash-free sessions rate
   */
  public getCrashFreeSessionsRate(): number {
    try {
      const summary = this.getHealthSummary();
      return summary?.crashFreeSessionsRate || 0;
    } catch (error) {
      console.error('Error getting crash-free sessions rate:', error);
      return 0;
    }
  }

  /**
   * Check if release health is good
   */
  public isReleaseHealthy(): boolean {
    const crashFreeRate = this.getCrashFreeSessionsRate();
    const performanceScore = this.getPerformanceScore();
    
    // Consider healthy if crash-free rate > 99% and performance score > 80
    return crashFreeRate > 0.99 && performanceScore > 80;
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    try {
      const summary = this.getHealthSummary();
      return summary?.performanceScore || 0;
    } catch (error) {
      console.error('Error getting performance score:', error);
      return 0;
    }
  }

  /**
   * Setup app state listener
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.endSession();
      } else if (nextAppState === 'active' && !this.currentSession) {
        this.startSession();
      }
    });
  }

  /**
   * Setup crash handler
   */
  private setupCrashHandler(): void {
    // Global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.trackCrash(error, isFatal);
      originalHandler(error, isFatal);
    });

    // Unhandled promise rejection handler
    const originalRejectionHandler = require('react-native/Libraries/Core/ExceptionsManager').unstable_setGlobalHandler;
    if (originalRejectionHandler) {
      originalRejectionHandler((error: any) => {
        this.trackCrash(new Error(error), false);
      });
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor frame rate
    this.frameRateMonitor = setInterval(() => {
      // This would integrate with a frame rate monitoring library
      // For now, we'll simulate frame rate tracking
      this.trackFrameRate();
    }, 1000);

    // Monitor memory pressure
    this.setupMemoryPressureMonitoring();
  }

  /**
   * Track frame rate
   */
  private trackFrameRate(): void {
    // This would use a real frame rate monitoring solution
    // For demonstration, we'll simulate values
    const simulatedFrameRate = 58 + Math.random() * 4; // 58-62 FPS
    
    if (simulatedFrameRate < 55) {
      this.performanceMetrics.slowFrames++;
    }
    
    if (simulatedFrameRate < 30) {
      this.performanceMetrics.frozenFrames++;
    }

    this.performanceMetrics.averageFrameRate = 
      (this.performanceMetrics.averageFrameRate + simulatedFrameRate) / 2;
  }

  /**
   * Setup memory pressure monitoring
   */
  private setupMemoryPressureMonitoring(): void {
    // This would integrate with native memory monitoring
    // For now, we'll simulate memory pressure events
    setInterval(() => {
      const memoryUsage = Math.random() * 100; // Simulate memory usage percentage
      
      if (memoryUsage > 85) {
        this.performanceMetrics.memoryPressureEvents++;
        this.trackPerformanceMetric('memory_pressure', memoryUsage);
      }
    }, 5000);
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      appStartTime: 0,
      timeToInteractive: 0,
      coldStartDuration: 0,
      warmStartDuration: 0,
      averageFrameRate: 60,
      slowFrames: 0,
      frozenFrames: 0,
      memoryPressureEvents: 0,
      networkRequestCount: 0,
      networkFailureCount: 0
    };
  }

  /**
   * Check if this is a warm start
   */
  private isWarmStart(): boolean {
    // Check if app was recently in background
    const lastBackgroundTime = healthStorage.getNumber('last_background_time') || 0;
    const timeSinceBackground = Date.now() - lastBackgroundTime;
    
    // Consider warm start if app was backgrounded less than 30 seconds ago
    return timeSinceBackground < 30000;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<any> {
    try {
      return {
        platform: DeviceInfo.getSystemName(),
        deviceModel: DeviceInfo.getModel(),
        osVersion: DeviceInfo.getSystemVersion(),
        memoryUsage: await DeviceInfo.getUsedMemory(),
        batteryLevel: await DeviceInfo.getBatteryLevel(),
        networkType: 'unknown' // Would integrate with NetInfo
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {};
    }
  }

  /**
   * Store session metrics
   */
  private storeSessionMetrics(session: SessionMetrics): void {
    try {
      const sessions = this.getStoredSessions();
      sessions.push(session);
      
      // Keep only last 100 sessions
      const recentSessions = sessions.slice(-100);
      healthStorage.set('sessions', JSON.stringify(recentSessions));
    } catch (error) {
      console.error('Error storing session metrics:', error);
    }
  }

  /**
   * Store crash details
   */
  private storeCrashDetails(error: Error, isFatal: boolean): void {
    try {
      const crashes = this.getStoredCrashes();
      crashes.push({
        error: error.message,
        stack: error.stack,
        isFatal,
        timestamp: Date.now(),
        sessionId: this.currentSession?.sessionId,
        appVersion: DeviceInfo.getVersion()
      });

      // Keep only last 50 crashes
      const recentCrashes = crashes.slice(-50);
      healthStorage.set('crashes', JSON.stringify(recentCrashes));
    } catch (storeError) {
      console.error('Error storing crash details:', storeError);
    }
  }

  /**
   * Store performance metric
   */
  private storePerformanceMetric(metric: any): void {
    try {
      const metrics = this.getStoredPerformanceMetrics();
      metrics.push(metric);
      
      // Keep only last 1000 metrics
      const recentMetrics = metrics.slice(-1000);
      healthStorage.set('performance_metrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.error('Error storing performance metric:', error);
    }
  }

  /**
   * Update health summary
   */
  private updateHealthSummary(): void {
    try {
      const sessions = this.getStoredSessions();
      const crashes = this.getStoredCrashes();
      
      const totalSessions = sessions.length;
      const crashedSessions = sessions.filter(s => s.crashed).length;
      const crashFreeSessions = totalSessions - crashedSessions;
      const crashFreeSessionsRate = totalSessions > 0 ? crashFreeSessions / totalSessions : 1;
      
      const averageSessionDuration = sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length 
        : 0;

      const performanceScore = this.calculatePerformanceScore();

      const summary: ReleaseHealthSummary = {
        version: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        totalSessions,
        crashFreeSessions,
        crashFreeSessionsRate,
        averageSessionDuration,
        totalCrashes: crashes.length,
        uniqueCrashes: new Set(crashes.map(c => c.error)).size,
        performanceScore,
        lastUpdated: Date.now()
      };

      healthStorage.set('health_summary', JSON.stringify(summary));
    } catch (error) {
      console.error('Error updating health summary:', error);
    }
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(): number {
    try {
      let score = 100;

      // Deduct points for performance issues
      score -= this.performanceMetrics.slowFrames * 0.1;
      score -= this.performanceMetrics.frozenFrames * 0.5;
      score -= this.performanceMetrics.memoryPressureEvents * 2;

      // Deduct points for slow startup
      if (this.performanceMetrics.coldStartDuration > 2000) {
        score -= 10;
      }
      if (this.performanceMetrics.timeToInteractive > 3000) {
        score -= 15;
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating performance score:', error);
      return 0;
    }
  }

  /**
   * Get stored sessions
   */
  private getStoredSessions(): SessionMetrics[] {
    try {
      const sessionsData = healthStorage.getString('sessions');
      return sessionsData ? JSON.parse(sessionsData) : [];
    } catch (error) {
      console.error('Error getting stored sessions:', error);
      return [];
    }
  }

  /**
   * Get stored crashes
   */
  private getStoredCrashes(): any[] {
    try {
      const crashesData = healthStorage.getString('crashes');
      return crashesData ? JSON.parse(crashesData) : [];
    } catch (error) {
      console.error('Error getting stored crashes:', error);
      return [];
    }
  }

  /**
   * Get stored performance metrics
   */
  private getStoredPerformanceMetrics(): any[] {
    try {
      const metricsData = healthStorage.getString('performance_metrics');
      return metricsData ? JSON.parse(metricsData) : [];
    } catch (error) {
      console.error('Error getting stored performance metrics:', error);
      return [];
    }
  }

  /**
   * Report performance metric to external service
   */
  private reportPerformanceMetric(metric: string, value: number): void {
    Sentry.addBreadcrumb({
      message: `Performance: ${metric}`,
      category: 'performance',
      data: { metric, value, timestamp: Date.now() }
    });
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.frameRateMonitor) {
      clearInterval(this.frameRateMonitor);
    }

    this.endSession();
  }
}

// Export singleton instance
export const releaseHealth = ReleaseHealthService.getInstance();

export default releaseHealth;