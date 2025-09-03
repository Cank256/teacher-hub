import { Platform, InteractionManager } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import * as Sentry from '@sentry/react-native';
import { PerformanceMetrics, PERFORMANCE_THRESHOLDS } from './types';
import AnalyticsService from './AnalyticsService';

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

interface NetworkInfo {
  type: string;
  isConnected: boolean;
  isInternetReachable: boolean;
  strength?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private performanceEntries: Map<string, PerformanceEntry> = new Map();
  private memoryWarningThreshold = PERFORMANCE_THRESHOLDS.MEMORY_USAGE;
  private frameRateBuffer: number[] = [];
  private lastFrameTime = 0;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
    this.startInteractionMonitoring();
    
    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('Performance monitoring stopped');
  }

  // Time-to-Interactive (TTI) measurement
  measureTTI(screenName: string): () => void {
    const startTime = Date.now();
    const entryName = `tti_${screenName}`;

    this.performanceEntries.set(entryName, {
      name: entryName,
      startTime,
      metadata: { screen: screenName },
    });

    return () => {
      const entry = this.performanceEntries.get(entryName);
      if (entry) {
        const endTime = Date.now();
        const duration = endTime - entry.startTime;
        
        entry.endTime = endTime;
        entry.duration = duration;

        this.trackPerformanceMetric({
          metric_name: 'time_to_interactive',
          value: duration,
          unit: 'milliseconds',
          screen: screenName,
        });

        // Alert if TTI is too slow
        if (duration > PERFORMANCE_THRESHOLDS.SCREEN_LOAD_TIME) {
          this.reportSlowOperation('slow_tti', {
            screen: screenName,
            duration,
            threshold: PERFORMANCE_THRESHOLDS.SCREEN_LOAD_TIME,
          });
        }

        this.performanceEntries.delete(entryName);
      }
    };
  }

  // Cold start time measurement
  measureColdStart(): void {
    const startTime = Date.now();
    
    // Wait for the app to be fully interactive
    InteractionManager.runAfterInteractions(() => {
      const coldStartTime = Date.now() - startTime;
      
      this.trackPerformanceMetric({
        metric_name: 'cold_start_time',
        value: coldStartTime,
        unit: 'milliseconds',
      });

      // Alert if cold start is too slow
      if (coldStartTime > PERFORMANCE_THRESHOLDS.COLD_START_TIME) {
        this.reportSlowOperation('slow_cold_start', {
          duration: coldStartTime,
          threshold: PERFORMANCE_THRESHOLDS.COLD_START_TIME,
        });
      }
    });
  }

  // API response time measurement
  measureAPICall(endpoint: string): () => void {
    const startTime = Date.now();
    const entryName = `api_${endpoint}_${startTime}`;

    this.performanceEntries.set(entryName, {
      name: entryName,
      startTime,
      metadata: { endpoint },
    });

    return () => {
      const entry = this.performanceEntries.get(entryName);
      if (entry) {
        const endTime = Date.now();
        const duration = endTime - entry.startTime;
        
        entry.endTime = endTime;
        entry.duration = duration;

        this.trackPerformanceMetric({
          metric_name: 'api_response_time',
          value: duration,
          unit: 'milliseconds',
          context: { endpoint },
        });

        // Alert if API call is too slow
        if (duration > PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME) {
          this.reportSlowOperation('slow_api_call', {
            endpoint,
            duration,
            threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME,
          });
        }

        this.performanceEntries.delete(entryName);
      }
    };
  }

  // Screen render time measurement
  measureScreenRender(screenName: string): () => void {
    const startTime = Date.now();
    const entryName = `render_${screenName}_${startTime}`;

    this.performanceEntries.set(entryName, {
      name: entryName,
      startTime,
      metadata: { screen: screenName },
    });

    return () => {
      const entry = this.performanceEntries.get(entryName);
      if (entry) {
        const endTime = Date.now();
        const duration = endTime - entry.startTime;
        
        entry.endTime = endTime;
        entry.duration = duration;

        this.trackPerformanceMetric({
          metric_name: 'screen_render_time',
          value: duration,
          unit: 'milliseconds',
          screen: screenName,
        });

        this.performanceEntries.delete(entryName);
      }
    };
  }

  // Memory monitoring
  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const memoryInfo = await this.getMemoryInfo();
        
        this.trackPerformanceMetric({
          metric_name: 'memory_usage',
          value: memoryInfo.used,
          unit: 'bytes',
          context: {
            percentage: memoryInfo.percentage,
            available: memoryInfo.available,
            total: memoryInfo.total,
          },
        });

        // Alert if memory usage is too high
        if (memoryInfo.used > this.memoryWarningThreshold) {
          this.reportMemoryWarning(memoryInfo);
        }
      } catch (error) {
        console.warn('Failed to get memory info:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  // Frame rate monitoring
  private startFrameRateMonitoring(): void {
    let frameCount = 0;
    let lastTime = Date.now();
    
    const measureFrameRate = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = Date.now();
      frameCount++;
      
      // Calculate FPS every second
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        this.frameRateBuffer.push(fps);
        
        // Keep only last 10 measurements
        if (this.frameRateBuffer.length > 10) {
          this.frameRateBuffer.shift();
        }
        
        const averageFPS = this.frameRateBuffer.reduce((a, b) => a + b, 0) / this.frameRateBuffer.length;
        
        this.trackPerformanceMetric({
          metric_name: 'frame_rate',
          value: averageFPS,
          unit: 'fps',
        });

        // Alert if frame rate is too low
        if (averageFPS < PERFORMANCE_THRESHOLDS.FRAME_RATE) {
          this.reportSlowOperation('low_frame_rate', {
            fps: averageFPS,
            threshold: PERFORMANCE_THRESHOLDS.FRAME_RATE,
          });
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  // Interaction monitoring
  private startInteractionMonitoring(): void {
    // Monitor long-running interactions
    InteractionManager.addInteractionHandle = ((originalMethod) => {
      return function(this: any, ...args: any[]) {
        const handle = originalMethod.apply(this, args);
        const startTime = Date.now();
        
        // Override clearInteractionHandle to measure duration
        const originalClear = InteractionManager.clearInteractionHandle;
        InteractionManager.clearInteractionHandle = function(handleToClear: any) {
          if (handleToClear === handle) {
            const duration = Date.now() - startTime;
            
            PerformanceMonitor.getInstance().trackPerformanceMetric({
              metric_name: 'interaction_duration',
              value: duration,
              unit: 'milliseconds',
            });
            
            // Restore original method
            InteractionManager.clearInteractionHandle = originalClear;
          }
          return originalClear.call(this, handleToClear);
        };
        
        return handle;
      };
    })(InteractionManager.addInteractionHandle);
  }

  // Get comprehensive memory information
  private async getMemoryInfo(): Promise<MemoryInfo> {
    const usedMemory = await DeviceInfo.getUsedMemory();
    const totalMemory = await DeviceInfo.getTotalMemory();
    const availableMemory = totalMemory - usedMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: usedMemory,
      available: availableMemory,
      total: totalMemory,
      percentage,
    };
  }

  // Track performance metrics
  private trackPerformanceMetric(metrics: PerformanceMetrics): void {
    AnalyticsService.trackPerformance(metrics);
    
    // Also send to Sentry for performance monitoring
    Sentry.addBreadcrumb({
      message: `Performance: ${metrics.metric_name}`,
      category: 'performance',
      level: 'info',
      data: {
        value: metrics.value,
        unit: metrics.unit,
        ...metrics.context,
      },
    });
  }

  // Report slow operations
  private reportSlowOperation(type: string, details: Record<string, any>): void {
    AnalyticsService.trackEvent('slow_operation', {
      type,
      ...details,
    });

    // Create Sentry transaction for slow operations
    const transaction = Sentry.startTransaction({
      name: `Slow Operation: ${type}`,
      op: 'performance',
    });

    transaction.setData('details', details);
    transaction.finish();

    console.warn(`Slow operation detected: ${type}`, details);
  }

  // Report memory warnings
  private reportMemoryWarning(memoryInfo: MemoryInfo): void {
    AnalyticsService.trackEvent('memory_warning', {
      used_memory: memoryInfo.used,
      memory_percentage: memoryInfo.percentage,
      threshold: this.memoryWarningThreshold,
    });

    Sentry.addBreadcrumb({
      message: 'Memory Warning',
      category: 'performance',
      level: 'warning',
      data: memoryInfo,
    });

    console.warn('Memory usage warning:', memoryInfo);
  }

  // Get performance summary
  getPerformanceSummary(): Record<string, any> {
    const averageFPS = this.frameRateBuffer.length > 0 
      ? this.frameRateBuffer.reduce((a, b) => a + b, 0) / this.frameRateBuffer.length 
      : 0;

    return {
      isMonitoring: this.isMonitoring,
      activeEntries: this.performanceEntries.size,
      averageFrameRate: averageFPS,
      memoryThreshold: this.memoryWarningThreshold,
      platform: Platform.OS,
      timestamp: Date.now(),
    };
  }

  // Set custom thresholds
  setMemoryWarningThreshold(threshold: number): void {
    this.memoryWarningThreshold = threshold;
  }

  // Clear performance data
  clearPerformanceData(): void {
    this.performanceEntries.clear();
    this.frameRateBuffer = [];
  }
}

export default PerformanceMonitor.getInstance();