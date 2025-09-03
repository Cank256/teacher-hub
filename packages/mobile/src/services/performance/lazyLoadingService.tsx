/**
 * Lazy Loading Service
 * Handles code splitting, dynamic imports, and lazy component loading
 */

import React, { ComponentType, LazyExoticComponent, Suspense } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import MonitoringService from '@/services/monitoring';

interface LazyLoadConfig {
  enablePreloading: boolean;
  preloadDelay: number; // milliseconds
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
}

interface LazyComponentInfo {
  name: string;
  loadTime: number;
  loadCount: number;
  lastLoaded: number;
  errorCount: number;
}

interface LoadingComponentProps {
  message?: string;
  size?: 'small' | 'large';
}

export class LazyLoadingService {
  private static instance: LazyLoadingService;
  private storage: MMKV;
  private config: LazyLoadConfig;
  private componentStats: Map<string, LazyComponentInfo> = new Map();
  private preloadQueue: Set<string> = new Set();
  private loadingComponents: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.storage = new MMKV({ id: 'lazy-loading' });
    this.config = {
      enablePreloading: true,
      preloadDelay: 2000, // 2 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      enableCaching: true,
    };
    this.loadStoredStats();
  }

  static getInstance(): LazyLoadingService {
    if (!LazyLoadingService.instance) {
      LazyLoadingService.instance = new LazyLoadingService();
    }
    return LazyLoadingService.instance;
  }

  /**
   * Create a lazy component with enhanced loading and error handling
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName: string,
    options: {
      fallback?: ComponentType<any>;
      errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
      preload?: boolean;
    } = {}
  ): LazyExoticComponent<T> {
    const { fallback, errorBoundary, preload = false } = options;

    // Create enhanced import function with retry logic
    const enhancedImportFn = this.createEnhancedImport(importFn, componentName);

    // Create lazy component
    const LazyComponent = React.lazy(enhancedImportFn);

    // Add to preload queue if requested
    if (preload && this.config.enablePreloading) {
      this.schedulePreload(componentName, enhancedImportFn);
    }

    // Return wrapped component with error boundary and fallback
    return this.wrapLazyComponent(
      LazyComponent,
      componentName,
      fallback,
      errorBoundary
    ) as LazyExoticComponent<T>;
  }

  /**
   * Preload a component
   */
  async preloadComponent(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    componentName: string
  ): Promise<void> {
    if (this.loadingComponents.has(componentName)) {
      return this.loadingComponents.get(componentName);
    }

    const startTime = Date.now();
    const enhancedImportFn = this.createEnhancedImport(importFn, componentName);

    try {
      const loadPromise = enhancedImportFn();
      this.loadingComponents.set(componentName, loadPromise);

      await loadPromise;

      const loadTime = Date.now() - startTime;
      this.updateComponentStats(componentName, loadTime, true);

      MonitoringService.addBreadcrumb({
        message: `Component preloaded: ${componentName}`,
        category: 'performance',
        level: 'info',
        data: { componentName, loadTime },
      });
    } catch (error) {
      this.updateComponentStats(componentName, Date.now() - startTime, false);
      console.warn(`Failed to preload component ${componentName}:`, error);
    } finally {
      this.loadingComponents.delete(componentName);
    }
  }

  /**
   * Preload multiple components
   */
  async preloadComponents(
    components: Array<{
      importFn: () => Promise<{ default: ComponentType<any> }>;
      name: string;
      priority?: 'high' | 'normal' | 'low';
    }>
  ): Promise<void> {
    // Sort by priority
    const sortedComponents = components.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
    });

    // Preload components with delays based on priority
    for (const component of sortedComponents) {
      try {
        await this.preloadComponent(component.importFn, component.name);
        
        // Add delay between preloads to avoid blocking
        if (component.priority !== 'high') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Failed to preload component ${component.name}:`, error);
      }
    }
  }

  /**
   * Get component loading statistics
   */
  getComponentStats(): Array<LazyComponentInfo & { name: string }> {
    return Array.from(this.componentStats.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    }));
  }

  /**
   * Clear component statistics
   */
  clearStats(): void {
    this.componentStats.clear();
    this.storage.delete('componentStats');
  }

  /**
   * Update lazy loading configuration
   */
  updateConfig(newConfig: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create default loading component
   */
  static createLoadingComponent(props: LoadingComponentProps = {}): ComponentType<{}> {
    const { message = 'Loading...', size = 'small' } = props;

    return () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size={size} 
          color="#007AFF" 
          style={styles.loadingIndicator}
        />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    );
  }

  /**
   * Create default error boundary component
   */
  static createErrorBoundary(): ComponentType<{ error: Error; retry: () => void }> {
    return ({ error, retry }) => (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to load component</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <Text style={styles.retryButton} onPress={retry}>
          Tap to retry
        </Text>
      </View>
    );
  }

  private createEnhancedImport<T>(
    importFn: () => Promise<{ default: T }>,
    componentName: string
  ): () => Promise<{ default: T }> {
    return async () => {
      const startTime = Date.now();
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const result = await importFn();
          const loadTime = Date.now() - startTime;
          
          this.updateComponentStats(componentName, loadTime, true);
          
          MonitoringService.addBreadcrumb({
            message: `Component loaded: ${componentName}`,
            category: 'performance',
            level: 'info',
            data: { componentName, loadTime, attempt },
          });

          return result;
        } catch (error) {
          lastError = error as Error;
          
          MonitoringService.addBreadcrumb({
            message: `Component load failed: ${componentName}`,
            category: 'performance',
            level: 'warning',
            data: { componentName, attempt, error: error.message },
          });

          if (attempt < this.config.retryAttempts) {
            await new Promise(resolve => 
              setTimeout(resolve, this.config.retryDelay * attempt)
            );
          }
        }
      }

      const loadTime = Date.now() - startTime;
      this.updateComponentStats(componentName, loadTime, false);

      throw lastError || new Error(`Failed to load component ${componentName}`);
    };
  }

  private wrapLazyComponent<T extends ComponentType<any>>(
    LazyComponent: LazyExoticComponent<T>,
    componentName: string,
    fallback?: ComponentType<any>,
    errorBoundary?: ComponentType<{ error: Error; retry: () => void }>
  ): ComponentType<any> {
    const FallbackComponent = fallback || LazyLoadingService.createLoadingComponent();
    const ErrorBoundaryComponent = errorBoundary || LazyLoadingService.createErrorBoundary();

    return (props: any) => {
      const [error, setError] = React.useState<Error | null>(null);
      const [retryKey, setRetryKey] = React.useState(0);

      const retry = React.useCallback(() => {
        setError(null);
        setRetryKey(prev => prev + 1);
      }, []);

      if (error) {
        return <ErrorBoundaryComponent error={error} retry={retry} />;
      }

      return (
        <React.ErrorBoundary
          fallback={<ErrorBoundaryComponent error={error!} retry={retry} />}
          onError={setError}
        >
          <Suspense fallback={<FallbackComponent />}>
            <LazyComponent key={retryKey} {...props} />
          </Suspense>
        </React.ErrorBoundary>
      );
    };
  }

  private schedulePreload(
    componentName: string,
    importFn: () => Promise<{ default: ComponentType<any> }>
  ): void {
    if (this.preloadQueue.has(componentName)) {
      return;
    }

    this.preloadQueue.add(componentName);

    setTimeout(() => {
      this.preloadComponent(importFn, componentName);
      this.preloadQueue.delete(componentName);
    }, this.config.preloadDelay);
  }

  private updateComponentStats(
    componentName: string,
    loadTime: number,
    success: boolean
  ): void {
    const existing = this.componentStats.get(componentName) || {
      name: componentName,
      loadTime: 0,
      loadCount: 0,
      lastLoaded: 0,
      errorCount: 0,
    };

    const updated: LazyComponentInfo = {
      ...existing,
      loadTime: success ? (existing.loadTime + loadTime) / (existing.loadCount + 1) : existing.loadTime,
      loadCount: success ? existing.loadCount + 1 : existing.loadCount,
      lastLoaded: Date.now(),
      errorCount: success ? existing.errorCount : existing.errorCount + 1,
    };

    this.componentStats.set(componentName, updated);

    if (this.config.enableCaching) {
      this.saveStats();
    }
  }

  private loadStoredStats(): void {
    try {
      const stored = this.storage.getString('componentStats');
      if (stored) {
        const stats = JSON.parse(stored) as Array<LazyComponentInfo & { name: string }>;
        stats.forEach(stat => {
          this.componentStats.set(stat.name, stat);
        });
      }
    } catch (error) {
      console.warn('Failed to load stored component stats:', error);
    }
  }

  private saveStats(): void {
    try {
      const stats = this.getComponentStats();
      this.storage.set('componentStats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to save component stats:', error);
    }
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIndicator: {
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default LazyLoadingService;