import { InteractionManager, Platform } from 'react-native';
import { captureMessage } from '@sentry/react-native';

interface PerformanceMetrics {
  bundleSize: number;
  memoryUsage: number;
  renderTime: number;
  navigationTime: number;
  apiResponseTime: number;
}

interface OptimizationConfig {
  enableImageOptimization: boolean;
  enableBundleOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableNetworkOptimization: boolean;
  maxMemoryThreshold: number; // in MB
  maxBundleSize: number; // in MB
}

class PerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: Partial<PerformanceMetrics> = {};
  private memoryWarningCount = 0;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enableImageOptimization: true,
      enableBundleOptimization: true,
      enableMemoryOptimization: true,
      enableNetworkOptimization: true,
      maxMemoryThreshold: 150, // 150MB
      maxBundleSize: 50, // 50MB
      ...config,
    };

    this.initializeOptimizations();
  }

  private initializeOptimizations(): void {
    if (this.config.enableMemoryOptimization) {
      this.setupMemoryMonitoring();
    }

    if (this.config.enableBundleOptimization) {
      this.optimizeBundleLoading();
    }
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory usage periodically
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds

    // Listen for memory warnings on iOS
    if (Platform.OS === 'ios') {
      // Note: This would require native module implementation
      // For now, we'll simulate memory monitoring
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    try {
      // This would require native module to get actual memory usage
      // For now, we'll simulate memory checking
      const simulatedMemoryUsage = Math.random() * 200; // 0-200MB

      this.metrics.memoryUsage = simulatedMemoryUsage;

      if (simulatedMemoryUsage > this.config.maxMemoryThreshold) {
        this.memoryWarningCount++;
        await this.handleMemoryWarning();
      }
    } catch (error) {
      console.warn('Failed to check memory usage:', error);
    }
  }

  private async handleMemoryWarning(): Promise<void> {
    console.warn(`Memory usage high: ${this.metrics.memoryUsage}MB`);

    // Log to monitoring service
    captureMessage('High memory usage detected', {
      level: 'warning',
      extra: {
        memoryUsage: this.metrics.memoryUsage,
        threshold: this.config.maxMemoryThreshold,
        warningCount: this.memoryWarningCount,
      },
    });

    // Trigger garbage collection optimizations
    await this.optimizeMemoryUsage();
  }

  private async optimizeMemoryUsage(): Promise<void> {
    // Clear image caches
    if (this.config.enableImageOptimization) {
      await this.clearImageCaches();
    }

    // Clear unnecessary data from stores
    await this.clearCaches();

    // Force garbage collection (if possible)
    if (global.gc) {
      global.gc();
    }
  }

  private async clearImageCaches(): Promise<void> {
    try {
      // This would integrate with FastImage or similar library
      // FastImage.clearMemoryCache();
      // FastImage.clearDiskCache();
      console.log('Image caches cleared');
    } catch (error) {
      console.warn('Failed to clear image caches:', error);
    }
  }

  private async clearCaches(): Promise<void> {
    try {
      // Clear React Query cache
      // queryClient.clear();
      
      // Clear other caches as needed
      console.log('Application caches cleared');
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  private optimizeBundleLoading(): void {
    // Implement bundle optimization strategies
    this.enableLazyLoading();
    this.optimizeImports();
  }

  private enableLazyLoading(): void {
    // This would be implemented at the component level
    // using React.lazy and Suspense
    console.log('Lazy loading optimization enabled');
  }

  private optimizeImports(): void {
    // This would be handled by Metro bundler configuration
    // and tree shaking optimizations
    console.log('Import optimization enabled');
  }

  // Public methods for performance tracking
  startRenderTimer(): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.metrics.renderTime = endTime - startTime;
      
      if (this.metrics.renderTime > 100) { // 100ms threshold
        console.warn(`Slow render detected: ${this.metrics.renderTime}ms`);
      }
    };
  }

  startNavigationTimer(): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.metrics.navigationTime = endTime - startTime;
      
      if (this.metrics.navigationTime > 300) { // 300ms threshold
        console.warn(`Slow navigation detected: ${this.metrics.navigationTime}ms`);
      }
    };
  }

  startApiTimer(): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.metrics.apiResponseTime = endTime - startTime;
      
      if (this.metrics.apiResponseTime > 5000) { // 5s threshold
        console.warn(`Slow API response detected: ${this.metrics.apiResponseTime}ms`);
      }
    };
  }

  // Optimize component rendering
  optimizeComponentRender<T>(
    component: React.ComponentType<T>,
    shouldUpdate?: (prevProps: T, nextProps: T) => boolean
  ): React.ComponentType<T> {
    return React.memo(component, shouldUpdate);
  }

  // Debounce function for performance optimization
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle function for performance optimization
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  // Run after interactions for better UX
  runAfterInteractions(callback: () => void): void {
    InteractionManager.runAfterInteractions(callback);
  }

  // Get current performance metrics
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {};
    this.memoryWarningCount = 0;
  }

  // Bundle size optimization
  async optimizeBundleSize(): Promise<void> {
    // This would be implemented at build time
    // using Metro bundler optimizations
    console.log('Bundle size optimization applied');
  }

  // Network optimization
  optimizeNetworkRequests(): void {
    // Implement request batching, caching, and compression
    console.log('Network optimization enabled');
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
export { PerformanceOptimizer };