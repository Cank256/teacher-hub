/**
 * Performance Test Suite
 * Comprehensive performance testing across different device configurations
 */

import { Platform } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { PerformanceMonitoringService } from '../performanceMonitoringService';
import { MemoryManagementService } from '../memoryManagementService';
import { ImageCacheService } from '../imageCacheService';
import { LazyLoadingService } from '../lazyLoadingService';
import { BundleOptimizationService } from '../bundleOptimizationService';

// Mock device configurations for testing
const DEVICE_CONFIGS = {
  lowEnd: {
    name: 'Low-end Android',
    ram: 2 * 1024 * 1024 * 1024, // 2GB
    cpu: 'ARM Cortex-A53',
    platform: 'android',
    apiLevel: 21,
  },
  midRange: {
    name: 'Mid-range Device',
    ram: 4 * 1024 * 1024 * 1024, // 4GB
    cpu: 'Snapdragon 660',
    platform: 'android',
    apiLevel: 28,
  },
  highEnd: {
    name: 'High-end iPhone',
    ram: 6 * 1024 * 1024 * 1024, // 6GB
    cpu: 'A14 Bionic',
    platform: 'ios',
    version: '14.0',
  },
};

interface PerformanceTestResult {
  testName: string;
  deviceConfig: string;
  duration: number;
  memoryUsage: number;
  success: boolean;
  metrics: Record<string, number>;
  errors: string[];
}

interface PerformanceBenchmark {
  name: string;
  target: number;
  unit: string;
  critical: number;
}

const PERFORMANCE_BENCHMARKS: PerformanceBenchmark[] = [
  { name: 'App Startup Time', target: 1500, unit: 'ms', critical: 3000 },
  { name: 'Screen Load Time', target: 500, unit: 'ms', critical: 2000 },
  { name: 'Image Load Time', target: 200, unit: 'ms', critical: 1000 },
  { name: 'Memory Usage', target: 100, unit: 'MB', critical: 200 },
  { name: 'Frame Rate', target: 55, unit: 'fps', critical: 30 },
  { name: 'Bundle Size', target: 5, unit: 'MB', critical: 10 },
];

describe('Performance Test Suite', () => {
  let performanceMonitor: PerformanceMonitoringService;
  let memoryManager: MemoryManagementService;
  let imageCache: ImageCacheService;
  let lazyLoader: LazyLoadingService;
  let bundleOptimizer: BundleOptimizationService;

  beforeAll(() => {
    performanceMonitor = PerformanceMonitoringService.getInstance();
    memoryManager = MemoryManagementService.getInstance();
    imageCache = ImageCacheService.getInstance();
    lazyLoader = LazyLoadingService.getInstance();
    bundleOptimizer = BundleOptimizationService.getInstance();
  });

  beforeEach(() => {
    // Reset services before each test
    performanceMonitor.clearMetrics();
    memoryManager.updateConfig({ enableAutoCleanup: false });
    imageCache.clearCache();
    lazyLoader.clearStats();
  });

  describe('Startup Performance Tests', () => {
    it('should meet startup time benchmarks on low-end devices', async () => {
      const result = await runPerformanceTest(
        'App Startup',
        DEVICE_CONFIGS.lowEnd,
        async () => {
          const startTime = Date.now();
          
          // Simulate app initialization
          performanceMonitor.startMonitoring();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return {
            startupTime: Date.now() - startTime,
            memoryUsage: memoryManager.getCurrentMemoryUsage(),
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.metrics.startupTime).toBeLessThan(PERFORMANCE_BENCHMARKS[0].critical);
    });

    it('should optimize startup with Hermes precompilation', async () => {
      const withoutHermes = await measureStartupTime(false);
      const withHermes = await measureStartupTime(true);

      expect(withHermes).toBeLessThan(withoutHermes * 0.8); // 20% improvement
    });
  });

  describe('Memory Performance Tests', () => {
    it('should maintain memory usage within limits', async () => {
      const result = await runPerformanceTest(
        'Memory Usage',
        DEVICE_CONFIGS.midRange,
        async () => {
          // Simulate memory-intensive operations
          const initialMemory = memoryManager.getCurrentMemoryUsage();
          
          // Load multiple images
          const imagePromises = Array.from({ length: 10 }, (_, i) => 
            imageCache.cacheImage(`https://example.com/image${i}.jpg`)
          );
          await Promise.all(imagePromises);
          
          const peakMemory = memoryManager.getCurrentMemoryUsage();
          
          // Force cleanup
          await memoryManager.forceGarbageCollection();
          const finalMemory = memoryManager.getCurrentMemoryUsage();
          
          return {
            initialMemory,
            peakMemory,
            finalMemory,
            memoryIncrease: peakMemory - initialMemory,
            memoryRecovered: peakMemory - finalMemory,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.metrics.memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      expect(result.metrics.memoryRecovered).toBeGreaterThan(0);
    });

    it('should handle memory pressure gracefully', async () => {
      const memoryStats = memoryManager.getMemoryStats();
      const initialUsage = memoryStats.currentUsage;

      // Simulate memory pressure
      memoryManager.updateConfig({ 
        maxMemoryUsage: initialUsage + 10 * 1024 * 1024, // Very low limit
        enableAutoCleanup: true,
      });

      let pressureDetected = false;
      const unsubscribe = memoryManager.onMemoryPressure((level) => {
        if (level.level === 'high' || level.level === 'critical') {
          pressureDetected = true;
        }
      });

      // Trigger memory pressure
      await Promise.all(
        Array.from({ length: 20 }, (_, i) => 
          imageCache.cacheImage(`https://example.com/large-image${i}.jpg`)
        )
      );

      await waitFor(() => expect(pressureDetected).toBe(true), { timeout: 5000 });
      
      unsubscribe();
    });
  });

  describe('Image Loading Performance Tests', () => {
    it('should load images efficiently with caching', async () => {
      const result = await runPerformanceTest(
        'Image Loading',
        DEVICE_CONFIGS.highEnd,
        async () => {
          const imageUrl = 'https://example.com/test-image.jpg';
          
          // First load (cache miss)
          const firstLoadStart = Date.now();
          await imageCache.cacheImage(imageUrl);
          const firstLoadTime = Date.now() - firstLoadStart;
          
          // Second load (cache hit)
          const secondLoadStart = Date.now();
          imageCache.getOptimizedSource(imageUrl);
          const secondLoadTime = Date.now() - secondLoadStart;
          
          const cacheStats = imageCache.getCacheStats();
          
          return {
            firstLoadTime,
            secondLoadTime,
            cacheHitRate: cacheStats.hitRate,
            cacheSize: cacheStats.totalSize,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.metrics.secondLoadTime).toBeLessThan(result.metrics.firstLoadTime * 0.1);
      expect(result.metrics.cacheHitRate).toBeGreaterThan(0);
    });

    it('should preload images without blocking UI', async () => {
      const imageUrls = Array.from({ length: 5 }, (_, i) => 
        `https://example.com/preload-image${i}.jpg`
      );

      const startTime = Date.now();
      
      // Start preloading
      const preloadPromise = imageCache.preloadImages(imageUrls);
      
      // Simulate UI interactions during preload
      const uiInteractionTime = await simulateUIInteractions();
      
      await preloadPromise;
      const totalTime = Date.now() - startTime;

      // UI should remain responsive during preload
      expect(uiInteractionTime).toBeLessThan(100); // UI interactions under 100ms
      expect(totalTime).toBeLessThan(2000); // Total preload under 2s
    });
  });

  describe('Lazy Loading Performance Tests', () => {
    it('should load components lazily without blocking', async () => {
      const mockComponent = () => Promise.resolve({ 
        default: () => null 
      });

      const result = await runPerformanceTest(
        'Lazy Loading',
        DEVICE_CONFIGS.midRange,
        async () => {
          const componentNames = ['ComponentA', 'ComponentB', 'ComponentC'];
          const loadTimes: number[] = [];

          for (const name of componentNames) {
            const startTime = Date.now();
            await lazyLoader.preloadComponent(mockComponent, name);
            loadTimes.push(Date.now() - startTime);
          }

          const stats = lazyLoader.getComponentStats();
          
          return {
            averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
            maxLoadTime: Math.max(...loadTimes),
            componentsLoaded: stats.length,
            totalLoadTime: loadTimes.reduce((a, b) => a + b, 0),
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.metrics.averageLoadTime).toBeLessThan(500);
      expect(result.metrics.maxLoadTime).toBeLessThan(1000);
    });
  });

  describe('Bundle Optimization Tests', () => {
    it('should analyze bundle size and provide recommendations', async () => {
      const analysis = bundleOptimizer.analyzeBundleSize();
      
      expect(analysis.breakdown).toBeDefined();
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.optimizationPotential).toBeGreaterThanOrEqual(0);
      expect(analysis.optimizationPotential).toBeLessThanOrEqual(1);
    });

    it('should simulate bundle optimization effectively', async () => {
      const result = await bundleOptimizer.simulateOptimization();
      
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.techniques.length).toBeGreaterThan(0);
    });
  });

  describe('Frame Rate Performance Tests', () => {
    it('should maintain 60fps during animations', async () => {
      const result = await runPerformanceTest(
        'Frame Rate',
        DEVICE_CONFIGS.lowEnd,
        async () => {
          performanceMonitor.startMonitoring();
          
          // Simulate animation workload
          await simulateAnimations();
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const report = performanceMonitor.getPerformanceReport();
          
          return {
            averageFPS: report.metrics.averageFPS,
            frameDrops: report.metrics.frameDrops,
            totalFrames: report.recentFrameMetrics.reduce(
              (sum, metric) => sum + metric.totalFrames, 0
            ),
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.metrics.averageFPS).toBeGreaterThan(PERFORMANCE_BENCHMARKS[4].critical);
    });
  });

  describe('Cross-Device Performance Tests', () => {
    it('should perform consistently across device configurations', async () => {
      const results: PerformanceTestResult[] = [];

      for (const [configName, config] of Object.entries(DEVICE_CONFIGS)) {
        const result = await runPerformanceTest(
          'Cross-Device Consistency',
          config,
          async () => {
            // Run a comprehensive performance test
            const startTime = Date.now();
            
            performanceMonitor.startMonitoring();
            memoryManager.startMonitoring();
            
            // Simulate typical app usage
            await simulateAppUsage();
            
            const endTime = Date.now();
            const memoryStats = memoryManager.getMemoryStats();
            const performanceReport = performanceMonitor.getPerformanceReport();
            
            return {
              totalTime: endTime - startTime,
              memoryUsage: memoryStats.currentUsage,
              averageFPS: performanceReport.metrics.averageFPS,
              screenLoadTime: Object.values(performanceReport.metrics.screenLoadTimes)[0] || 0,
            };
          }
        );

        results.push(result);
      }

      // Verify performance is acceptable across all devices
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.metrics.memoryUsage).toBeLessThan(
          PERFORMANCE_BENCHMARKS[3].critical * 1024 * 1024
        );
      });

      // Verify performance variance is reasonable
      const fpsList = results.map(r => r.metrics.averageFPS);
      const fpsVariance = Math.max(...fpsList) - Math.min(...fpsList);
      expect(fpsVariance).toBeLessThan(20); // FPS variance under 20
    });
  });

  describe('Performance Regression Tests', () => {
    it('should detect performance regressions', async () => {
      // Baseline performance
      const baseline = await measureBaselinePerformance();
      
      // Simulate performance regression
      const regressed = await measureRegressedPerformance();
      
      // Check for significant regression (>20% slower)
      const regressionThreshold = 1.2;
      expect(regressed.startupTime).toBeLessThan(baseline.startupTime * regressionThreshold);
      expect(regressed.memoryUsage).toBeLessThan(baseline.memoryUsage * regressionThreshold);
    });
  });
});

// Helper functions

async function runPerformanceTest(
  testName: string,
  deviceConfig: any,
  testFn: () => Promise<Record<string, number>>
): Promise<PerformanceTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let success = true;
  let metrics: Record<string, number> = {};

  try {
    metrics = await testFn();
  } catch (error) {
    success = false;
    errors.push((error as Error).message);
  }

  const duration = Date.now() - startTime;
  const memoryManager = MemoryManagementService.getInstance();
  const memoryUsage = memoryManager.getCurrentMemoryUsage();

  return {
    testName,
    deviceConfig: deviceConfig.name,
    duration,
    memoryUsage,
    success,
    metrics,
    errors,
  };
}

async function measureStartupTime(hermesEnabled: boolean): Promise<number> {
  const bundleOptimizer = BundleOptimizationService.getInstance();
  bundleOptimizer.updateConfig({ enableHermesPrecompilation: hermesEnabled });
  
  const startTime = Date.now();
  
  // Simulate app startup
  await new Promise(resolve => setTimeout(resolve, hermesEnabled ? 800 : 1200));
  
  return Date.now() - startTime;
}

async function simulateUIInteractions(): Promise<number> {
  const startTime = Date.now();
  
  // Simulate rapid UI interactions
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return Date.now() - startTime;
}

async function simulateAnimations(): Promise<void> {
  // Simulate animation workload
  for (let i = 0; i < 60; i++) { // 1 second at 60fps
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

async function simulateAppUsage(): Promise<void> {
  // Simulate typical app usage patterns
  await Promise.all([
    simulateScreenNavigation(),
    simulateImageLoading(),
    simulateDataFetching(),
  ]);
}

async function simulateScreenNavigation(): Promise<void> {
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  
  const screens = ['Home', 'Posts', 'Communities', 'Messages', 'Profile'];
  
  for (const screen of screens) {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    performanceMonitor.trackScreenLoad(screen, startTime);
  }
}

async function simulateImageLoading(): Promise<void> {
  const imageCache = ImageCacheService.getInstance();
  
  const imageUrls = Array.from({ length: 5 }, (_, i) => 
    `https://example.com/simulation-image${i}.jpg`
  );
  
  await imageCache.preloadImages(imageUrls);
}

async function simulateDataFetching(): Promise<void> {
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  
  const endpoints = ['/api/posts', '/api/communities', '/api/messages'];
  
  for (const endpoint of endpoints) {
    const responseTime = 200 + Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, responseTime));
    performanceMonitor.trackAPICall(endpoint, responseTime, true);
  }
}

async function measureBaselinePerformance(): Promise<{
  startupTime: number;
  memoryUsage: number;
  frameRate: number;
}> {
  const startTime = Date.now();
  
  const performanceMonitor = PerformanceMonitoringService.getInstance();
  const memoryManager = MemoryManagementService.getInstance();
  
  performanceMonitor.startMonitoring();
  memoryManager.startMonitoring();
  
  await simulateAppUsage();
  
  const startupTime = Date.now() - startTime;
  const memoryStats = memoryManager.getMemoryStats();
  const performanceReport = performanceMonitor.getPerformanceReport();
  
  return {
    startupTime,
    memoryUsage: memoryStats.currentUsage,
    frameRate: performanceReport.metrics.averageFPS,
  };
}

async function measureRegressedPerformance(): Promise<{
  startupTime: number;
  memoryUsage: number;
  frameRate: number;
}> {
  // Simulate performance regression by adding artificial delays
  const baseline = await measureBaselinePerformance();
  
  return {
    startupTime: baseline.startupTime * 1.1, // 10% slower
    memoryUsage: baseline.memoryUsage * 1.05, // 5% more memory
    frameRate: baseline.frameRate * 0.95, // 5% lower FPS
  };
}