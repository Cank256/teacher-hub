/**
 * Performance Services Index
 * Exports all performance optimization and monitoring services
 */

export { ImageCacheService } from './imageCacheService';
export { PerformanceMonitoringService } from './performanceMonitoringService';
export { MemoryManagementService } from './memoryManagementService';
export { LazyLoadingService } from './lazyLoadingService';
export { BundleOptimizationService } from './bundleOptimizationService';

// Re-export default instances for convenience
export { default as ImageCache } from './imageCacheService';
export { default as PerformanceMonitor } from './performanceMonitoringService';
export { default as MemoryManager } from './memoryManagementService';
export { default as LazyLoader } from './lazyLoadingService';
export { default as BundleOptimizer } from './bundleOptimizationService';

// Export types
export type {
  CacheConfig,
  CachedImageInfo,
  ImageCacheStats,
} from './imageCacheService';

export type {
  PerformanceMetrics,
  FrameMetrics,
  ScreenLoadMetric,
  APIMetric,
} from './performanceMonitoringService';

export type {
  MemoryConfig,
  MemoryStats,
  MemoryPressureLevel,
} from './memoryManagementService';

export type {
  LazyLoadConfig,
  LazyComponentInfo,
  LoadingComponentProps,
} from './lazyLoadingService';

export type {
  BundleConfig,
  BundleStats,
  OptimizationResult,
} from './bundleOptimizationService';

/**
 * Initialize all performance services
 */
export function initializePerformanceServices(): void {
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  const memoryManager = MemoryManagementService.getInstance();
  const imageCache = ImageCacheService.getInstance();
  const bundleOptimizer = BundleOptimizationService.getInstance();

  // Start monitoring services
  performanceMonitor.startMonitoring();
  memoryManager.startMonitoring();

  // Configure services for optimal performance
  memoryManager.updateConfig({
    enableAutoCleanup: true,
    maxMemoryUsage: 150 * 1024 * 1024, // 150MB
    lowMemoryThreshold: 70,
    criticalMemoryThreshold: 90,
  });

  imageCache.updateConfig({
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableWebP: true,
    compressionQuality: 0.8,
  });

  bundleOptimizer.updateConfig({
    enableHermesPrecompilation: true,
    enableInlineRequires: true,
    minifyEnabled: !__DEV__,
  });
}

/**
 * Get comprehensive performance report
 */
export function getPerformanceReport(): {
  monitoring: ReturnType<PerformanceMonitoringService['getPerformanceReport']>;
  memory: ReturnType<MemoryManagementService['getMemoryStats']>;
  imageCache: ReturnType<ImageCacheService['getCacheStats']>;
  lazyLoading: ReturnType<LazyLoadingService['getComponentStats']>;
  bundle: ReturnType<BundleOptimizationService['getBundleStats']>;
} {
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  const memoryManager = MemoryManagementService.getInstance();
  const imageCache = ImageCacheService.getInstance();
  const lazyLoader = LazyLoadingService.getInstance();
  const bundleOptimizer = BundleOptimizationService.getInstance();

  return {
    monitoring: performanceMonitor.getPerformanceReport(),
    memory: memoryManager.getMemoryStats(),
    imageCache: imageCache.getCacheStats(),
    lazyLoading: lazyLoader.getComponentStats(),
    bundle: bundleOptimizer.getBundleStats(),
  };
}

/**
 * Optimize performance across all services
 */
export async function optimizePerformance(): Promise<{
  memoryOptimization: Awaited<ReturnType<MemoryManagementService['optimizeMemory']>>;
  bundleOptimization: Awaited<ReturnType<BundleOptimizationService['simulateOptimization']>>;
  cacheCleanup: boolean;
}> {
  const memoryManager = MemoryManagementService.getInstance();
  const imageCache = ImageCacheService.getInstance();
  const bundleOptimizer = BundleOptimizationService.getInstance();

  // Perform memory optimization
  const memoryOptimization = await memoryManager.optimizeMemory();

  // Simulate bundle optimization
  const bundleOptimization = await bundleOptimizer.simulateOptimization();

  // Clean up image cache if needed
  const cacheStats = imageCache.getCacheStats();
  let cacheCleanup = false;
  if (cacheStats.totalSize > 50 * 1024 * 1024) { // > 50MB
    await imageCache.clearCache();
    cacheCleanup = true;
  }

  return {
    memoryOptimization,
    bundleOptimization,
    cacheCleanup,
  };
}

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitoring(componentName: string) {
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  
  React.useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      performanceMonitor.trackScreenLoad(componentName, startTime);
    };
  }, [componentName]);
}

/**
 * Memory pressure hook for React components
 */
export function useMemoryPressure(
  onMemoryPressure?: (level: MemoryPressureLevel) => void
) {
  const memoryManager = MemoryManagementService.getInstance();
  
  React.useEffect(() => {
    if (!onMemoryPressure) return;
    
    return memoryManager.onMemoryPressure(onMemoryPressure);
  }, [onMemoryPressure]);
  
  return React.useCallback(() => {
    return memoryManager.getMemoryPressureLevel();
  }, []);
}

// Import React for hooks
import React from 'react';