import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  connectionType?: string;
  isSlowConnection: boolean;
}

interface UsePerformanceMonitorOptions {
  trackMemory?: boolean;
  trackConnection?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    trackMemory = false,
    trackConnection = true,
    onMetricsUpdate
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    isSlowConnection: false
  });

  const renderStartTime = useRef<number>(performance.now());
  const componentMounted = useRef<boolean>(false);

  useEffect(() => {
    if (!componentMounted.current) {
      componentMounted.current = true;
      
      // Calculate render time
      const renderTime = performance.now() - renderStartTime.current;
      
      // Get page load time
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;

      // Get connection information
      let connectionType = 'unknown';
      let isSlowConnection = false;

      if (trackConnection && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connectionType = connection.effectiveType || connection.type || 'unknown';
          isSlowConnection = connection.effectiveType === 'slow-2g' || 
                           connection.effectiveType === '2g' ||
                           connection.downlink < 1.5;
        }
      }

      // Get memory usage
      let memoryUsage: number | undefined;
      if (trackMemory && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
        }
      }

      const newMetrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        memoryUsage,
        connectionType,
        isSlowConnection
      };

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    }
  }, [trackMemory, trackConnection, onMetricsUpdate]);

  return metrics;
};

// Hook for measuring specific operations
export const useOperationTimer = () => {
  const timerRef = useRef<number | null>(null);

  const startTimer = () => {
    timerRef.current = performance.now();
  };

  const endTimer = (): number => {
    if (timerRef.current === null) {
      console.warn('Timer was not started');
      return 0;
    }
    
    const duration = performance.now() - timerRef.current;
    timerRef.current = null;
    return duration;
  };

  const measureAsync = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    return { result, duration };
  };

  return {
    startTimer,
    endTimer,
    measureAsync
  };
};

// Hook for monitoring network performance
export const useNetworkMonitor = () => {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    isSlowConnection: false,
    downlink: 0,
    rtt: 0
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      let connectionType = 'unknown';
      let isSlowConnection = false;
      let downlink = 0;
      let rtt = 0;

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connectionType = connection.effectiveType || connection.type || 'unknown';
          downlink = connection.downlink || 0;
          rtt = connection.rtt || 0;
          isSlowConnection = connection.effectiveType === 'slow-2g' || 
                           connection.effectiveType === '2g' ||
                           downlink < 1.5;
        }
      }

      setNetworkInfo({
        isOnline: navigator.onLine,
        connectionType,
        isSlowConnection,
        downlink,
        rtt
      });
    };

    // Initial update
    updateNetworkInfo();

    // Listen for network changes
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateNetworkInfo);
      }
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', updateNetworkInfo);
        }
      }
    };
  }, []);

  return networkInfo;
};