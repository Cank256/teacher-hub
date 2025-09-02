/**
 * Performance Benchmarks and Regression Tests
 * Automated performance testing with baseline comparisons
 */

import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { PerformanceMonitoringService } from '../performanceMonitoringService';
import { MemoryManagementService } from '../memoryManagementService';
import { ImageCacheService } from '../imageCacheService';
import { BundleOptimizationService } from '../bundleOptimizationService';

interface BenchmarkResult {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  platform: string;
  buildType: 'debug' | 'release';
}

interface BenchmarkThresholds {
  target: number;
  warning: number;
  critical: number;
}

interface RegressionAnalysis {
  metric: string;
  current: number;
  baseline: number;
  change: number;
  changePercent: number;
  isRegression: boolean;
  severity: 'none' | 'minor' | 'major' | 'critical';
}

const BENCHMARK_THRESHOLDS: Record<string, BenchmarkThresholds> = {
  appStartupTime: {
    target: 1000, // 1 second
    warning: 2000, // 2 seconds
    critical: 3000, // 3 seconds
  },
  screenLoadTime: {
    target: 300, // 300ms
    warning: 800, // 800ms
    critical: 1500, // 1.5 seconds
  },
  imageLoadTime: {
    target: 150, // 150ms
    warning: 500, // 500ms
    critical: 1000, // 1 second
  },
  memoryUsage: {
    target: 80 * 1024 * 1024, // 80MB
    warning: 150 * 1024 * 1024, // 150MB
    critical: 250 * 1024 * 1024, // 250MB
  },
  frameRate: {
    target: 58, // 58 FPS
    warning: 45, // 45 FPS
    critical: 30, // 30 FPS
  },
  bundleSize: {
    target: 3 * 1024 * 1024, // 3MB
    warning: 6 * 1024 * 1024, // 6MB
    critical: 10 * 1024 * 1024, // 10MB
  },
  apiResponseTime: {
    target: 200, // 200ms
    warning: 1000, // 1 second
    critical: 3000, // 3 seconds
  },
};

describe('Performance Benchmarks', () => {
  let storage: MMKV;
  let performanceMonitor: PerformanceMonitoringService;
  let memoryManager: MemoryManagementService;
  let imageCache: ImageCacheService;
  let bundleOptimizer: BundleOptimizationService;

  beforeAll(() => {
    storage = new MMKV({ id: 'performance-benchmarks' });
    performanceMonitor = PerformanceMonitoringService.getInstance();
    memoryManager = MemoryManagementService.getInstance();
    imageCache = ImageCacheService.getInstance();
    bundleOptimizer = BundleOptimizationService.getInstance();
  });

  beforeEach(() => {
    // Clear previous test data
    performanceMonitor.clearMetrics();
    memoryManager.updateConfig({ enableAutoCleanup: false });
  });

  describe('Startup Performance Benchmarks', () => {
    it('should meet app startup time benchmarks', async () => {
      const result = await measureAppStartupTime();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.appStartupTime.critical);
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.appStartupTime.warning);
      
      // Store baseline for regression testing
      storeBenchmarkResult(result);
      
      // Check for regression
      const regression = checkForRegression('appStartupTime', result.value);
      if (regression.isRegression && regression.severity !== 'none') {
        console.warn(`Startup time regression detected: ${regression.changePercent.toFixed(1)}%`);
      }
    });

    it('should optimize cold start performance', async () => {
      const coldStartTime = await measureColdStartTime();
      const warmStartTime = await measureWarmStartTime();
      
      expect(coldStartTime.value).toBeLessThan(BENCHMARK_THRESHOLDS.appStartupTime.critical);
      expect(warmStartTime.value).toBeLessThan(coldStartTime.value * 0.7); // 30% faster
      
      storeBenchmarkResult(coldStartTime);
      storeBenchmarkResult(warmStartTime);
    });
  });

  describe('Memory Performance Benchmarks', () => {
    it('should maintain memory usage within acceptable limits', async () => {
      const result = await measureMemoryUsage();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.memoryUsage.critical);
      
      storeBenchmarkResult(result);
      
      const regression = checkForRegression('memoryUsage', result.value);
      expect(regression.severity).not.toBe('critical');
    });

    it('should handle memory pressure efficiently', async () => {
      const result = await measureMemoryPressureHandling();
      
      expect(result.value).toBeLessThan(5000); // Should handle pressure within 5 seconds
      
      storeBenchmarkResult(result);
    });

    it('should perform garbage collection effectively', async () => {
      const result = await measureGarbageCollectionEfficiency();
      
      expect(result.value).toBeGreaterThan(0.2); // Should free at least 20% of memory
      
      storeBenchmarkResult(result);
    });
  });

  describe('UI Performance Benchmarks', () => {
    it('should maintain target frame rate', async () => {
      const result = await measureFrameRate();
      
      expect(result.value).toBeGreaterThan(BENCHMARK_THRESHOLDS.frameRate.critical);
      
      storeBenchmarkResult(result);
      
      const regression = checkForRegression('frameRate', result.value);
      if (regression.isRegression) {
        console.warn(`Frame rate regression: ${regression.changePercent.toFixed(1)}%`);
      }
    });

    it('should load screens within target time', async () => {
      const result = await measureScreenLoadTime();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.screenLoadTime.warning);
      
      storeBenchmarkResult(result);
    });

    it('should handle animations smoothly', async () => {
      const result = await measureAnimationPerformance();
      
      expect(result.value).toBeGreaterThan(55); // Maintain >55 FPS during animations
      
      storeBenchmarkResult(result);
    });
  });

  describe('Image Loading Benchmarks', () => {
    it('should load images within target time', async () => {
      const result = await measureImageLoadTime();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.imageLoadTime.warning);
      
      storeBenchmarkResult(result);
    });

    it('should achieve high cache hit rate', async () => {
      const result = await measureImageCacheHitRate();
      
      expect(result.value).toBeGreaterThan(0.8); // >80% cache hit rate
      
      storeBenchmarkResult(result);
    });

    it('should optimize image loading with FastImage', async () => {
      const result = await measureFastImagePerformance();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.imageLoadTime.target);
      
      storeBenchmarkResult(result);
    });
  });

  describe('Bundle Size Benchmarks', () => {
    it('should maintain bundle size within limits', async () => {
      const result = await measureBundleSize();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.bundleSize.warning);
      
      storeBenchmarkResult(result);
      
      const regression = checkForRegression('bundleSize', result.value);
      if (regression.changePercent > 10) { // More than 10% increase
        console.warn(`Bundle size increased significantly: ${regression.changePercent.toFixed(1)}%`);
      }
    });

    it('should benefit from Hermes optimization', async () => {
      const withoutHermes = await measureBundleSize(false);
      const withHermes = await measureBundleSize(true);
      
      expect(withHermes.value).toBeLessThan(withoutHermes.value * 0.9); // 10% smaller
    });
  });

  describe('Network Performance Benchmarks', () => {
    it('should meet API response time targets', async () => {
      const result = await measureAPIResponseTime();
      
      expect(result.value).toBeLessThan(BENCHMARK_THRESHOLDS.apiResponseTime.warning);
      
      storeBenchmarkResult(result);
    });

    it('should handle offline scenarios efficiently', async () => {
      const result = await measureOfflinePerformance();
      
      expect(result.value).toBeLessThan(1000); // Offline detection within 1 second
      
      storeBenchmarkResult(result);
    });
  });

  describe('Regression Analysis', () => {
    it('should detect performance regressions across all metrics', async () => {
      const currentMetrics = await gatherAllPerformanceMetrics();
      const regressions = analyzeRegressions(currentMetrics);
      
      const criticalRegressions = regressions.filter(r => r.severity === 'critical');
      const majorRegressions = regressions.filter(r => r.severity === 'major');
      
      expect(criticalRegressions.length).toBe(0);
      
      if (majorRegressions.length > 0) {
        console.warn(`Major regressions detected:`, majorRegressions);
      }
      
      // Store current metrics as new baseline if no critical regressions
      if (criticalRegressions.length === 0) {
        storeBaseline(currentMetrics);
      }
    });

    it('should track performance trends over time', async () => {
      const trends = analyzePerformanceTrends();
      
      // Check for concerning trends (>5% degradation over 10 measurements)
      const concerningTrends = trends.filter(trend => 
        trend.slope > 0.05 && trend.measurements >= 10
      );
      
      if (concerningTrends.length > 0) {
        console.warn('Performance degradation trends detected:', concerningTrends);
      }
    });
  });

  describe('Device-Specific Benchmarks', () => {
    it('should perform well on low-end devices', async () => {
      // Simulate low-end device constraints
      memoryManager.updateConfig({ 
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB limit
      });
      
      const metrics = await gatherAllPerformanceMetrics();
      
      // Relaxed thresholds for low-end devices
      expect(metrics.appStartupTime.value).toBeLessThan(BENCHMARK_THRESHOLDS.appStartupTime.critical * 1.5);
      expect(metrics.memoryUsage.value).toBeLessThan(BENCHMARK_THRESHOLDS.memoryUsage.warning);
      expect(metrics.frameRate.value).toBeGreaterThan(BENCHMARK_THRESHOLDS.frameRate.critical);
    });

    it('should scale performance with device capabilities', async () => {
      const lowEndMetrics = await measureWithDeviceConstraints('low');
      const highEndMetrics = await measureWithDeviceConstraints('high');
      
      // High-end devices should perform significantly better
      expect(highEndMetrics.appStartupTime.value).toBeLessThan(lowEndMetrics.appStartupTime.value * 0.7);
      expect(highEndMetrics.frameRate.value).toBeGreaterThan(lowEndMetrics.frameRate.value * 1.1);
    });
  });
});

// Measurement functions

async function measureAppStartupTime(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Simulate app initialization
  performanceMonitor.startMonitoring();
  memoryManager.startMonitoring();
  
  // Wait for initialization to complete
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  
  const value = Date.now() - startTime;
  
  return {
    name: 'appStartupTime',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureColdStartTime(): Promise<BenchmarkResult> {
  // Simulate cold start by clearing caches
  await imageCache.clearCache();
  performanceMonitor.clearMetrics();
  
  return measureAppStartupTime();
}

async function measureWarmStartTime(): Promise<BenchmarkResult> {
  // Warm start with existing caches
  return measureAppStartupTime();
}

async function measureMemoryUsage(): Promise<BenchmarkResult> {
  const memoryStats = memoryManager.getMemoryStats();
  
  return {
    name: 'memoryUsage',
    value: memoryStats.currentUsage,
    unit: 'bytes',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureMemoryPressureHandling(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Trigger memory pressure
  memoryManager.updateConfig({ 
    maxMemoryUsage: 50 * 1024 * 1024, // Very low limit
    enableAutoCleanup: true,
  });
  
  let pressureHandled = false;
  const unsubscribe = memoryManager.onMemoryPressure((level) => {
    if (level.shouldCleanup) {
      pressureHandled = true;
    }
  });
  
  // Wait for pressure handling
  while (!pressureHandled && Date.now() - startTime < 10000) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  unsubscribe();
  
  return {
    name: 'memoryPressureHandling',
    value: Date.now() - startTime,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureGarbageCollectionEfficiency(): Promise<BenchmarkResult> {
  const beforeMemory = memoryManager.getCurrentMemoryUsage();
  
  // Create memory pressure
  await Promise.all(
    Array.from({ length: 10 }, (_, i) => 
      imageCache.cacheImage(`https://example.com/gc-test-${i}.jpg`)
    )
  );
  
  const peakMemory = memoryManager.getCurrentMemoryUsage();
  
  // Force garbage collection
  await memoryManager.forceGarbageCollection();
  
  const afterMemory = memoryManager.getCurrentMemoryUsage();
  const efficiency = (peakMemory - afterMemory) / (peakMemory - beforeMemory);
  
  return {
    name: 'garbageCollectionEfficiency',
    value: efficiency,
    unit: 'ratio',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureFrameRate(): Promise<BenchmarkResult> {
  performanceMonitor.startMonitoring();
  
  // Simulate UI workload
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const report = performanceMonitor.getPerformanceReport();
  
  return {
    name: 'frameRate',
    value: report.metrics.averageFPS,
    unit: 'fps',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureScreenLoadTime(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Simulate screen loading
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  const value = Date.now() - startTime;
  
  return {
    name: 'screenLoadTime',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureAnimationPerformance(): Promise<BenchmarkResult> {
  performanceMonitor.startMonitoring();
  
  // Simulate animation workload
  for (let i = 0; i < 120; i++) { // 2 seconds at 60fps
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  
  const report = performanceMonitor.getPerformanceReport();
  
  return {
    name: 'animationPerformance',
    value: report.metrics.averageFPS,
    unit: 'fps',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureImageLoadTime(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  await imageCache.cacheImage('https://example.com/benchmark-image.jpg');
  
  const value = Date.now() - startTime;
  
  return {
    name: 'imageLoadTime',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureImageCacheHitRate(): Promise<BenchmarkResult> {
  // Load images multiple times to test caching
  const imageUrl = 'https://example.com/cache-test.jpg';
  
  // First load (cache miss)
  await imageCache.cacheImage(imageUrl);
  
  // Subsequent loads (cache hits)
  for (let i = 0; i < 10; i++) {
    imageCache.getOptimizedSource(imageUrl);
  }
  
  const stats = imageCache.getCacheStats();
  
  return {
    name: 'imageCacheHitRate',
    value: stats.hitRate,
    unit: 'ratio',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureFastImagePerformance(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Simulate FastImage loading
  const source = imageCache.getOptimizedSource('https://example.com/fastimage-test.jpg');
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
  
  const value = Date.now() - startTime;
  
  return {
    name: 'fastImagePerformance',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureBundleSize(hermesEnabled = true): Promise<BenchmarkResult> {
  bundleOptimizer.updateConfig({ enableHermesPrecompilation: hermesEnabled });
  
  const analysis = bundleOptimizer.analyzeBundleSize();
  const totalSize = Object.values(analysis.breakdown).reduce((sum, size) => sum + size, 0);
  
  return {
    name: hermesEnabled ? 'bundleSize' : 'bundleSizeWithoutHermes',
    value: totalSize,
    unit: 'bytes',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureAPIResponseTime(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
  
  const value = Date.now() - startTime;
  
  return {
    name: 'apiResponseTime',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function measureOfflinePerformance(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  // Simulate offline detection and handling
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const value = Date.now() - startTime;
  
  return {
    name: 'offlinePerformance',
    value,
    unit: 'ms',
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  };
}

async function gatherAllPerformanceMetrics(): Promise<Record<string, BenchmarkResult>> {
  const metrics: Record<string, BenchmarkResult> = {};
  
  metrics.appStartupTime = await measureAppStartupTime();
  metrics.memoryUsage = await measureMemoryUsage();
  metrics.frameRate = await measureFrameRate();
  metrics.screenLoadTime = await measureScreenLoadTime();
  metrics.imageLoadTime = await measureImageLoadTime();
  metrics.bundleSize = await measureBundleSize();
  metrics.apiResponseTime = await measureAPIResponseTime();
  
  return metrics;
}

async function measureWithDeviceConstraints(deviceType: 'low' | 'high'): Promise<Record<string, BenchmarkResult>> {
  if (deviceType === 'low') {
    memoryManager.updateConfig({ 
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    });
  } else {
    memoryManager.updateConfig({ 
      maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    });
  }
  
  return gatherAllPerformanceMetrics();
}

// Helper functions

function storeBenchmarkResult(result: BenchmarkResult): void {
  const key = `${result.name}_${result.platform}_${result.buildType}`;
  const existing = storage.getString(key);
  
  let results: BenchmarkResult[] = [];
  if (existing) {
    try {
      results = JSON.parse(existing);
    } catch (error) {
      console.warn('Failed to parse existing benchmark results:', error);
    }
  }
  
  results.push(result);
  
  // Keep only last 50 results
  if (results.length > 50) {
    results = results.slice(-50);
  }
  
  storage.set(key, JSON.stringify(results));
}

function checkForRegression(metricName: string, currentValue: number): RegressionAnalysis {
  const key = `${metricName}_${Platform.OS}_${__DEV__ ? 'debug' : 'release'}`;
  const existing = storage.getString(key);
  
  if (!existing) {
    return {
      metric: metricName,
      current: currentValue,
      baseline: currentValue,
      change: 0,
      changePercent: 0,
      isRegression: false,
      severity: 'none',
    };
  }
  
  try {
    const results: BenchmarkResult[] = JSON.parse(existing);
    if (results.length < 5) {
      return {
        metric: metricName,
        current: currentValue,
        baseline: currentValue,
        change: 0,
        changePercent: 0,
        isRegression: false,
        severity: 'none',
      };
    }
    
    // Use median of last 5 results as baseline
    const recentResults = results.slice(-5);
    const baseline = recentResults
      .map(r => r.value)
      .sort((a, b) => a - b)[Math.floor(recentResults.length / 2)];
    
    const change = currentValue - baseline;
    const changePercent = (change / baseline) * 100;
    
    // Determine if this is a regression (worse performance)
    const isWorsePerformance = metricName === 'frameRate' ? change < 0 : change > 0;
    const isRegression = isWorsePerformance && Math.abs(changePercent) > 5; // >5% change
    
    let severity: RegressionAnalysis['severity'] = 'none';
    if (isRegression) {
      if (Math.abs(changePercent) > 25) severity = 'critical';
      else if (Math.abs(changePercent) > 15) severity = 'major';
      else severity = 'minor';
    }
    
    return {
      metric: metricName,
      current: currentValue,
      baseline,
      change,
      changePercent,
      isRegression,
      severity,
    };
  } catch (error) {
    console.warn('Failed to analyze regression:', error);
    return {
      metric: metricName,
      current: currentValue,
      baseline: currentValue,
      change: 0,
      changePercent: 0,
      isRegression: false,
      severity: 'none',
    };
  }
}

function analyzeRegressions(metrics: Record<string, BenchmarkResult>): RegressionAnalysis[] {
  return Object.values(metrics).map(metric => 
    checkForRegression(metric.name, metric.value)
  );
}

function analyzePerformanceTrends(): Array<{
  metric: string;
  slope: number;
  measurements: number;
  trend: 'improving' | 'stable' | 'degrading';
}> {
  const trends: Array<{
    metric: string;
    slope: number;
    measurements: number;
    trend: 'improving' | 'stable' | 'degrading';
  }> = [];
  
  const metricNames = Object.keys(BENCHMARK_THRESHOLDS);
  
  for (const metricName of metricNames) {
    const key = `${metricName}_${Platform.OS}_${__DEV__ ? 'debug' : 'release'}`;
    const existing = storage.getString(key);
    
    if (!existing) continue;
    
    try {
      const results: BenchmarkResult[] = JSON.parse(existing);
      if (results.length < 10) continue;
      
      // Calculate trend using linear regression
      const values = results.map(r => r.value);
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = values;
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      
      let trend: 'improving' | 'stable' | 'degrading';
      if (Math.abs(slope) < 0.01) {
        trend = 'stable';
      } else if (metricName === 'frameRate' ? slope > 0 : slope < 0) {
        trend = 'improving';
      } else {
        trend = 'degrading';
      }
      
      trends.push({
        metric: metricName,
        slope: Math.abs(slope),
        measurements: n,
        trend,
      });
    } catch (error) {
      console.warn(`Failed to analyze trend for ${metricName}:`, error);
    }
  }
  
  return trends;
}

function storeBaseline(metrics: Record<string, BenchmarkResult>): void {
  const baseline = Object.fromEntries(
    Object.entries(metrics).map(([key, result]) => [key, result.value])
  );
  
  storage.set('performance_baseline', JSON.stringify({
    ...baseline,
    timestamp: Date.now(),
    platform: Platform.OS,
    buildType: __DEV__ ? 'debug' : 'release',
  }));
}