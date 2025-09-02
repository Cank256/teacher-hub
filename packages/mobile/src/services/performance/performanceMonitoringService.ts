/**
 * Performance Monitoring Service
 * Tracks TTI, frame rates, memory usage, and other performance metrics
 */

import { Platform, InteractionManager, AppState, AppStateStatus } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import MonitoringService from '@/services/monitoring';

interface PerformanceMetrics {
  tti: number; // Time to Interactive
  coldStartTime: number;
  warmStartTime: number;
  frameDrops: number;
  averageFPS: number;
  memoryUsage: number;
  bundleSize: number;
  screenLoadTimes: Record<string, number>;
  apiResponseTimes: Record<string, number[]>;
}

interface FrameMetrics {
  totalFrames: number;
  droppedFrames: number;
  timestamp: number;
}

interface ScreenLoadMetric {
  screenName: string;
  loadTime: number;
  timestamp: number;
  isInitialLoad: boolean;
}

interface APIMetric {
  endpoint: string;
  responseTime: number;
  timestamp: number;
  success: boolean;
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private storage: MMKV;
  private metrics: PerformanceMetrics;
  private frameMetrics: FrameMetrics[] = [];
  private screenLoadMetrics: ScreenLoadMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private appStartTime: number;
  private isMonitoring = false;
  private frameCallback?: number;
  private memoryCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.storage = new MMKV({ id: 'performance-metrics' });
    this.appStartTime = Date.now();
    this.metrics = this.loadStoredMetrics();
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
    this.measureTimeToInteractive();

    MonitoringService.addBreadcrumb({
      message: 'Performance monitoring started',
      category: 'performance',
      level: 'info',
    });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.frameCallback) {
      cancelAnimationFrame(this.frameCallback);
      this.frameCallback = undefined;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    this.saveMetrics();
  }

  /**
   * Measure Time to Interactive (TTI)
   */
  private measureTimeToInteractive(): void {
    InteractionManager.runAfterInteractions(() => {
      const tti = Date.now() - this.appStartTime;
      this.metrics.tti = tti;

      MonitoringService.addBreadcrumb({
        message: `TTI measured: ${tti}ms`,
        category: 'performance',
        level: 'info',
        data: { tti, platform: Platform.OS },
      });

      // Report to monitoring service if TTI is concerning
      if (tti > 3000) { // More than 3 seconds
        MonitoringService.captureMessage(
          `Slow TTI detected: ${tti}ms`,
          'warning'
        );
      }
    });
  }

  /**
   * Track screen load time
   */
  trackScreenLoad(screenName: string, startTime: number): void {
    const loadTime = Date.now() - startTime;
    const isInitialLoad = this.screenLoadMetrics.length === 0;

    const metric: ScreenLoadMetric = {
      screenName,
      loadTime,
      timestamp: Date.now(),
      isInitialLoad,
    };

    this.screenLoadMetrics.push(metric);

    // Update metrics
    if (!this.metrics.screenLoadTimes[screenName]) {
      this.metrics.screenLoadTimes[screenName] = loadTime;
    } else {
      // Calculate average
      const existing = this.metrics.screenLoadTimes[screenName];
      this.metrics.screenLoadTimes[screenName] = (existing + loadTime) / 2;
    }

    MonitoringService.addBreadcrumb({
      message: `Screen load: ${screenName}`,
      category: 'performance',
      level: 'info',
      data: { screenName, loadTime, isInitialLoad },
    });

    // Report slow screen loads
    if (loadTime > 2000) {
      MonitoringService.captureMessage(
        `Slow screen load: ${screenName} took ${loadTime}ms`,
        'warning'
      );
    }
  }

  /**
   * Track API response time
   */
  trackAPICall(endpoint: string, responseTime: number, success: boolean): void {
    const metric: APIMetric = {
      endpoint,
      responseTime,
      timestamp: Date.now(),
      success,
    };

    this.apiMetrics.push(metric);

    // Update metrics
    if (!this.metrics.apiResponseTimes[endpoint]) {
      this.metrics.apiResponseTimes[endpoint] = [responseTime];
    } else {
      this.metrics.apiResponseTimes[endpoint].push(responseTime);
      
      // Keep only last 10 measurements
      if (this.metrics.apiResponseTimes[endpoint].length > 10) {
        this.metrics.apiResponseTimes[endpoint] = 
          this.metrics.apiResponseTimes[endpoint].slice(-10);
      }
    }

    // Report slow API calls
    if (responseTime > 5000) {
      MonitoringService.captureMessage(
        `Slow API call: ${endpoint} took ${responseTime}ms`,
        'warning'
      );
    }
  }

  /**
   * Start frame rate monitoring
   */
  private startFrameRateMonitoring(): void {
    let lastFrameTime = Date.now();
    let frameCount = 0;
    let droppedFrames = 0;

    const measureFrame = () => {
      if (!this.isMonitoring) return;

      const currentTime = Date.now();
      const frameDuration = currentTime - lastFrameTime;
      
      frameCount++;
      
      // Detect dropped frames (assuming 60fps target = 16.67ms per frame)
      if (frameDuration > 33) { // More than 2 frames worth of time
        droppedFrames += Math.floor(frameDuration / 16.67) - 1;
      }

      lastFrameTime = currentTime;

      // Calculate metrics every second
      if (frameCount % 60 === 0) {
        const fps = 1000 / (frameDuration || 1);
        this.updateFrameMetrics(frameCount, droppedFrames, fps);
      }

      this.frameCallback = requestAnimationFrame(measureFrame);
    };

    this.frameCallback = requestAnimationFrame(measureFrame);
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      // Note: React Native doesn't provide direct memory access
      // This is a placeholder for when native modules are available
      const memoryUsage = this.getMemoryUsage();
      this.metrics.memoryUsage = memoryUsage;

      // Report high memory usage
      if (memoryUsage > 100 * 1024 * 1024) { // 100MB
        MonitoringService.captureMessage(
          `High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`,
          'warning'
        );
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update frame metrics
   */
  private updateFrameMetrics(totalFrames: number, droppedFrames: number, fps: number): void {
    const frameMetric: FrameMetrics = {
      totalFrames,
      droppedFrames,
      timestamp: Date.now(),
    };

    this.frameMetrics.push(frameMetric);

    // Keep only last 60 measurements (1 minute at 1 measurement per second)
    if (this.frameMetrics.length > 60) {
      this.frameMetrics = this.frameMetrics.slice(-60);
    }

    // Update overall metrics
    this.metrics.frameDrops = droppedFrames;
    this.metrics.averageFPS = fps;

    // Report low FPS
    if (fps < 45) {
      MonitoringService.addBreadcrumb({
        message: `Low FPS detected: ${fps.toFixed(1)}`,
        category: 'performance',
        level: 'warning',
        data: { fps, droppedFrames, totalFrames },
      });
    }
  }

  /**
   * Get current memory usage (placeholder implementation)
   */
  private getMemoryUsage(): number {
    // This would typically use a native module to get actual memory usage
    // For now, return a placeholder value
    return 50 * 1024 * 1024; // 50MB placeholder
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    recentFrameMetrics: FrameMetrics[];
    recentScreenLoads: ScreenLoadMetric[];
    recentAPIMetrics: APIMetric[];
  } {
    return {
      metrics: { ...this.metrics },
      recentFrameMetrics: [...this.frameMetrics.slice(-10)],
      recentScreenLoads: [...this.screenLoadMetrics.slice(-10)],
      recentAPIMetrics: [...this.apiMetrics.slice(-10)],
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageTTI: number;
    averageFPS: number;
    totalFrameDrops: number;
    slowestScreen: { name: string; time: number } | null;
    slowestAPI: { endpoint: string; time: number } | null;
    memoryUsage: number;
  } {
    const slowestScreen = Object.entries(this.metrics.screenLoadTimes)
      .reduce((slowest, [name, time]) => {
        return !slowest || time > slowest.time ? { name, time } : slowest;
      }, null as { name: string; time: number } | null);

    const slowestAPI = Object.entries(this.metrics.apiResponseTimes)
      .reduce((slowest, [endpoint, times]) => {
        const maxTime = Math.max(...times);
        return !slowest || maxTime > slowest.time ? { endpoint, time: maxTime } : slowest;
      }, null as { endpoint: string; time: number } | null);

    return {
      averageTTI: this.metrics.tti,
      averageFPS: this.metrics.averageFPS,
      totalFrameDrops: this.metrics.frameDrops,
      slowestScreen,
      slowestAPI,
      memoryUsage: this.metrics.memoryUsage,
    };
  }

  /**
   * Initialize monitoring
   */
  private initializeMonitoring(): void {
    // Start monitoring when app becomes active
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Start monitoring immediately if app is active
    if (AppState.currentState === 'active') {
      this.startMonitoring();
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  };

  /**
   * Load stored metrics
   */
  private loadStoredMetrics(): PerformanceMetrics {
    try {
      const stored = this.storage.getString('metrics');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored performance metrics:', error);
    }

    return {
      tti: 0,
      coldStartTime: 0,
      warmStartTime: 0,
      frameDrops: 0,
      averageFPS: 60,
      memoryUsage: 0,
      bundleSize: 0,
      screenLoadTimes: {},
      apiResponseTimes: {},
    };
  }

  /**
   * Save metrics to storage
   */
  private saveMetrics(): void {
    try {
      this.storage.set('metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {
      tti: 0,
      coldStartTime: 0,
      warmStartTime: 0,
      frameDrops: 0,
      averageFPS: 60,
      memoryUsage: 0,
      bundleSize: 0,
      screenLoadTimes: {},
      apiResponseTimes: {},
    };
    
    this.frameMetrics = [];
    this.screenLoadMetrics = [];
    this.apiMetrics = [];
    
    this.storage.delete('metrics');
  }
}

export default PerformanceMonitoringService;