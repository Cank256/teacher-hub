# Performance Optimization Services

This directory contains comprehensive performance optimization services for the Teacher Hub mobile application, implementing advanced caching, monitoring, and optimization techniques.

## Overview

The performance optimization system includes:

- **Image Caching with FastImage and WebP Support**
- **Performance Monitoring with TTI and Frame Rate Tracking**
- **Memory Management and Garbage Collection Optimization**
- **Lazy Loading and Code Splitting**
- **Bundle Optimization with Hermes Precompilation**
- **Comprehensive Performance Testing Suite**

## Services

### ImageCacheService

Advanced image caching service with FastImage integration and WebP support.

**Features:**
- Intelligent caching with size and age limits
- WebP format support for better compression
- Preloading capabilities
- Cache statistics and management
- Automatic cleanup and eviction

**Usage:**
```typescript
import { ImageCacheService } from '@/services/performance';

const imageCache = ImageCacheService.getInstance();

// Get optimized image source
const source = imageCache.getOptimizedSource('https://example.com/image.jpg', {
  width: 300,
  height: 200,
  priority: 'high'
});

// Preload images
await imageCache.preloadImages([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg'
]);

// Get cache statistics
const stats = imageCache.getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### PerformanceMonitoringService

Comprehensive performance monitoring with TTI, frame rate, and API response tracking.

**Features:**
- Time to Interactive (TTI) measurement
- Frame rate monitoring and dropped frame detection
- Screen load time tracking
- API response time monitoring
- Performance regression detection

**Usage:**
```typescript
import { PerformanceMonitoringService } from '@/services/performance';

const monitor = PerformanceMonitoringService.getInstance();

// Start monitoring
monitor.startMonitoring();

// Track screen load
const startTime = Date.now();
// ... screen loading logic
monitor.trackScreenLoad('HomeScreen', startTime);

// Track API call
monitor.trackAPICall('/api/posts', 250, true);

// Get performance report
const report = monitor.getPerformanceReport();
```

### MemoryManagementService

Advanced memory management with pressure detection and automatic cleanup.

**Features:**
- Memory usage monitoring
- Memory pressure detection and handling
- Automatic garbage collection
- Cache cleanup strategies
- Memory optimization recommendations

**Usage:**
```typescript
import { MemoryManagementService } from '@/services/performance';

const memoryManager = MemoryManagementService.getInstance();

// Start monitoring
memoryManager.startMonitoring();

// Handle memory pressure
const unsubscribe = memoryManager.onMemoryPressure((level) => {
  if (level.level === 'critical') {
    // Perform aggressive cleanup
    clearNonEssentialCaches();
  }
});

// Force optimization
const result = await memoryManager.optimizeMemory();
console.log(`Freed ${Math.round(result.freedMemory / 1024 / 1024)}MB`);
```

### LazyLoadingService

Code splitting and lazy component loading with enhanced error handling.

**Features:**
- React.lazy wrapper with retry logic
- Component preloading
- Loading and error boundary components
- Performance statistics tracking

**Usage:**
```typescript
import { LazyLoadingService } from '@/services/performance';

const lazyLoader = LazyLoadingService.getInstance();

// Create lazy component
const LazyComponent = lazyLoader.createLazyComponent(
  () => import('./MyComponent'),
  'MyComponent',
  {
    preload: true,
    fallback: CustomLoadingComponent,
    errorBoundary: CustomErrorBoundary
  }
);

// Preload multiple components
await lazyLoader.preloadComponents([
  {
    importFn: () => import('./ComponentA'),
    name: 'ComponentA',
    priority: 'high'
  },
  {
    importFn: () => import('./ComponentB'),
    name: 'ComponentB',
    priority: 'normal'
  }
]);
```

### BundleOptimizationService

Bundle analysis and optimization with Hermes precompilation support.

**Features:**
- Bundle size analysis and recommendations
- Hermes optimization configuration
- Metro configuration generation
- Build optimization suggestions

**Usage:**
```typescript
import { BundleOptimizationService } from '@/services/performance';

const bundleOptimizer = BundleOptimizationService.getInstance();

// Analyze bundle
const analysis = bundleOptimizer.analyzeBundleSize();
console.log('Optimization potential:', analysis.optimizationPotential);

// Get Hermes recommendations
const hermes = bundleOptimizer.getHermesOptimizations();
console.log('Estimated startup improvement:', hermes.estimatedImprovement.startupTime);

// Simulate optimization
const result = await bundleOptimizer.simulateOptimization();
console.log(`Bundle size reduced by ${(result.compressionRatio * 100).toFixed(1)}%`);
```

## Components

### OptimizedImage

High-performance image component with FastImage and caching integration.

**Features:**
- Automatic cache integration
- Loading states and progress indicators
- Error handling with fallbacks
- Accessibility support
- Performance optimizations

**Usage:**
```typescript
import { OptimizedImage } from '@/components/ui';

<OptimizedImage
  uri="https://example.com/image.jpg"
  width={300}
  height={200}
  priority="high"
  showLoadingIndicator={true}
  showProgressBar={true}
  fallbackUri="https://example.com/fallback.jpg"
  onLoadEnd={() => console.log('Image loaded')}
/>
```

## Hooks

### usePerformanceInit

React hook for initializing and managing performance services.

**Usage:**
```typescript
import { usePerformanceInit } from '@/hooks/usePerformanceInit';

function App() {
  const {
    getPerformanceReport,
    optimizePerformance,
    trackScreenLoad,
    isMonitoringEnabled
  } = usePerformanceInit({
    enableAutoOptimization: true,
    memoryThreshold: 150 * 1024 * 1024, // 150MB
    cacheSize: 100 * 1024 * 1024, // 100MB
    monitoringEnabled: true
  });

  // Track screen loads
  useEffect(() => {
    const cleanup = trackScreenLoad('HomeScreen');
    return cleanup;
  }, []);

  return <YourApp />;
}
```

## Configuration

### Metro Configuration

The `metro.config.js` file includes optimizations for:

- Hermes precompilation
- Inline requires for better tree shaking
- Bundle size optimization
- Asset optimization with WebP support
- Caching improvements

### Performance Thresholds

Default performance benchmarks:

- **App Startup Time**: Target 1s, Warning 2s, Critical 3s
- **Screen Load Time**: Target 300ms, Warning 800ms, Critical 1.5s
- **Memory Usage**: Target 80MB, Warning 150MB, Critical 250MB
- **Frame Rate**: Target 58fps, Warning 45fps, Critical 30fps
- **Bundle Size**: Target 3MB, Warning 6MB, Critical 10MB

## Testing

The performance system includes comprehensive testing:

- **Unit Tests**: Service functionality and API contracts
- **Integration Tests**: Cross-service interactions
- **Performance Tests**: Benchmarking and regression detection
- **Device Matrix Tests**: Multi-device performance validation

### Running Performance Tests

```bash
# Run all performance tests
npm test -- --testPathPattern="performance"

# Run specific test suites
npm test -- --testPathPattern="performanceBenchmarks"
npm test -- --testPathPattern="performanceTestSuite"
```

## Best Practices

### Image Optimization

1. Use WebP format when supported
2. Implement progressive loading for large images
3. Preload critical images
4. Set appropriate cache limits
5. Monitor cache hit rates

### Memory Management

1. Enable automatic cleanup
2. Monitor memory pressure events
3. Clear caches during background transitions
4. Use weak references for large objects
5. Profile memory usage regularly

### Bundle Optimization

1. Enable Hermes precompilation
2. Use inline requires
3. Implement code splitting for large features
4. Minimize bundle size with tree shaking
5. Monitor bundle size growth

### Performance Monitoring

1. Track key performance metrics
2. Set up regression detection
3. Monitor across device types
4. Use performance budgets
5. Implement alerting for critical issues

## Troubleshooting

### Common Issues

**High Memory Usage:**
- Check cache sizes and limits
- Enable automatic cleanup
- Monitor for memory leaks
- Use memory profiling tools

**Slow Startup Times:**
- Enable Hermes precompilation
- Implement lazy loading
- Optimize bundle size
- Reduce initial render complexity

**Poor Frame Rates:**
- Profile animation performance
- Optimize list rendering
- Reduce overdraw
- Use native driver for animations

**Large Bundle Sizes:**
- Enable code splitting
- Remove unused dependencies
- Optimize asset sizes
- Use dynamic imports

### Performance Debugging

1. Use the performance report to identify bottlenecks
2. Monitor memory pressure events
3. Check cache hit rates and efficiency
4. Profile frame rates during animations
5. Analyze bundle composition

## Integration

To integrate the performance system into your app:

1. **Initialize Services**: Use `usePerformanceInit` hook in your root component
2. **Replace Images**: Use `OptimizedImage` instead of regular Image components
3. **Implement Lazy Loading**: Use `LazyLoadingService` for code splitting
4. **Monitor Performance**: Set up regular performance reporting
5. **Configure Builds**: Use the provided Metro configuration

## Monitoring and Alerting

The system integrates with Sentry for:

- Crash reporting with performance context
- Performance regression alerts
- Memory pressure notifications
- Bundle size monitoring
- User experience tracking

## Future Enhancements

Planned improvements:

- Native memory profiling integration
- Advanced bundle analysis tools
- Machine learning-based optimization
- Real-time performance dashboards
- Automated performance testing in CI/CD