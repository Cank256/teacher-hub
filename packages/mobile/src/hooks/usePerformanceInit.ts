/**
 * Performance Initialization Hook
 * Initializes all performance services and monitoring
 */

import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  initializePerformanceServices,
  PerformanceMonitoringService,
  MemoryManagementService,
  ImageCacheService,
  BundleOptimizationService,
} from '@/services/performance';
import MonitoringService from '@/services/monitoring';

interface PerformanceInitOptions {
  enableAutoOptimization?: boolean;
  memoryThreshold?: number;
  cacheSize?: number;
  monitoringEnabled?: boolean;
}

export function usePerformanceInit(options: PerformanceInitOptions = {}) {
  const {
    enableAutoOptimization = true,
    memoryThreshold = 150 * 1024 * 1024, // 150MB
    cacheSize = 100 * 1024 * 1024, // 100MB
    monitoringEnabled = true,
  } = options;

  // Initialize performance services
  useEffect(() => {
    if (!monitoringEnabled) return;

    try {
      // Initialize all performance services
      initializePerformanceServices();

      // Configure services with custom options
      const memoryManager = MemoryManagementService.getInstance();
      const imageCache = ImageCacheService.getInstance();
      const bundleOptimizer = BundleOptimizationService.getInstance();

      memoryManager.updateConfig({
        maxMemoryUsage: memoryThreshold,
        enableAutoCleanup: enableAutoOptimization,
        lowMemoryThreshold: 70,
        criticalMemoryThreshold: 90,
      });

      imageCache.updateConfig({
        maxCacheSize: cacheSize,
        maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        enableWebP: true,
        compressionQuality: 0.8,
      });

      bundleOptimizer.updateConfig({
        enableHermesPrecompilation: true,
        enableInlineRequires: true,
        minifyEnabled: !__DEV__,
      });

      MonitoringService.addBreadcrumb({
        message: 'Performance services initialized',
        category: 'performance',
        level: 'info',
        data: {
          memoryThreshold: Math.round(memoryThreshold / 1024 / 1024),
          cacheSize: Math.round(cacheSize / 1024 / 1024),
          autoOptimization: enableAutoOptimization,
        },
      });
    } catch (error) {
      console.warn('Failed to initialize performance services:', error);
      MonitoringService.captureException(error as Error);
    }
  }, [monitoringEnabled, memoryThreshold, cacheSize, enableAutoOptimization]);

  // Handle app state changes for performance optimization
  useEffect(() => {
    if (!monitoringEnabled) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      const memoryManager = MemoryManagementService.getInstance();

      if (nextAppState === 'background') {
        // App going to background - optimize for memory
        try {
          if (enableAutoOptimization) {
            await memoryManager.optimizeMemory();
          }
          
          performanceMonitor.stopMonitoring();
          memoryManager.stopMonitoring();

          MonitoringService.addBreadcrumb({
            message: 'App backgrounded - performance optimized',
            category: 'performance',
            level: 'info',
          });
        } catch (error) {
          console.warn('Failed to optimize on background:', error);
        }
      } else if (nextAppState === 'active') {
        // App coming to foreground - resume monitoring
        try {
          performanceMonitor.startMonitoring();
          memoryManager.startMonitoring();

          MonitoringService.addBreadcrumb({
            message: 'App foregrounded - monitoring resumed',
            category: 'performance',
            level: 'info',
          });
        } catch (error) {
          console.warn('Failed to resume monitoring:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [monitoringEnabled, enableAutoOptimization]);

  // Memory pressure handling
  useEffect(() => {
    if (!monitoringEnabled || !enableAutoOptimization) return;

    const memoryManager = MemoryManagementService.getInstance();
    const imageCache = ImageCacheService.getInstance();

    const unsubscribe = memoryManager.onMemoryPressure(async (level) => {
      try {
        MonitoringService.addBreadcrumb({
          message: `Memory pressure detected: ${level.level}`,
          category: 'performance',
          level: level.level === 'critical' ? 'error' : 'warning',
          data: {
            level: level.level,
            percentage: level.percentage,
          },
        });

        if (level.shouldCleanup) {
          switch (level.level) {
            case 'critical':
              // Aggressive cleanup
              await imageCache.clearCache();
              await memoryManager.forceGarbageCollection();
              break;
            case 'high':
              // Moderate cleanup
              const cacheStats = imageCache.getCacheStats();
              if (cacheStats.totalSize > 25 * 1024 * 1024) { // > 25MB
                await imageCache.clearCache();
              }
              break;
            case 'moderate':
              // Light cleanup - just clear memory cache
              // FastImage.clearMemoryCache() would be called here
              break;
          }
        }
      } catch (error) {
        console.warn('Failed to handle memory pressure:', error);
        MonitoringService.captureException(error as Error);
      }
    });

    return unsubscribe;
  }, [monitoringEnabled, enableAutoOptimization]);

  // Performance monitoring functions
  const getPerformanceReport = useCallback(() => {
    if (!monitoringEnabled) return null;

    try {
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      const memoryManager = MemoryManagementService.getInstance();
      const imageCache = ImageCacheService.getInstance();

      return {
        performance: performanceMonitor.getPerformanceReport(),
        memory: memoryManager.getMemoryStats(),
        imageCache: imageCache.getCacheStats(),
        summary: performanceMonitor.getPerformanceSummary(),
      };
    } catch (error) {
      console.warn('Failed to get performance report:', error);
      return null;
    }
  }, [monitoringEnabled]);

  const optimizePerformance = useCallback(async () => {
    if (!monitoringEnabled) return null;

    try {
      const memoryManager = MemoryManagementService.getInstance();
      const imageCache = ImageCacheService.getInstance();

      const beforeStats = {
        memory: memoryManager.getCurrentMemoryUsage(),
        cacheSize: imageCache.getCacheStats().totalSize,
      };

      // Perform optimization
      const memoryOptimization = await memoryManager.optimizeMemory();
      
      // Clear cache if it's too large
      const cacheStats = imageCache.getCacheStats();
      if (cacheStats.totalSize > cacheSize * 0.8) {
        await imageCache.clearCache();
      }

      const afterStats = {
        memory: memoryManager.getCurrentMemoryUsage(),
        cacheSize: imageCache.getCacheStats().totalSize,
      };

      const result = {
        memoryOptimization,
        cacheCleared: cacheStats.totalSize > afterStats.cacheSize,
        memoryFreed: beforeStats.memory - afterStats.memory,
        cacheFreed: beforeStats.cacheSize - afterStats.cacheSize,
      };

      MonitoringService.addBreadcrumb({
        message: 'Manual performance optimization completed',
        category: 'performance',
        level: 'info',
        data: {
          memoryFreed: Math.round(result.memoryFreed / 1024 / 1024),
          cacheFreed: Math.round(result.cacheFreed / 1024 / 1024),
        },
      });

      return result;
    } catch (error) {
      console.warn('Failed to optimize performance:', error);
      MonitoringService.captureException(error as Error);
      return null;
    }
  }, [monitoringEnabled, cacheSize]);

  const trackScreenLoad = useCallback((screenName: string) => {
    if (!monitoringEnabled) return;

    const performanceMonitor = PerformanceMonitoringService.getInstance();
    const startTime = Date.now();

    return () => {
      performanceMonitor.trackScreenLoad(screenName, startTime);
    };
  }, [monitoringEnabled]);

  return {
    getPerformanceReport,
    optimizePerformance,
    trackScreenLoad,
    isMonitoringEnabled: monitoringEnabled,
  };
}

export default usePerformanceInit;