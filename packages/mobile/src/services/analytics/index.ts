// Main analytics service exports
export { default as AnalyticsService } from './AnalyticsService';
export { default as PerformanceMonitor } from './PerformanceMonitor';
export { default as PrivacyManager } from './PrivacyManager';
export { default as MonitoringAlerts } from './MonitoringAlerts';

// Types and constants
export * from './types';

// Hooks
export {
  useAnalytics,
  useScreenAnalytics,
  usePerformanceMonitoring,
  useEngagementTracking,
  usePrivacyManagement,
  useRetentionTracking,
} from '@/hooks/useAnalytics';

// Initialize analytics system
import AnalyticsService from './AnalyticsService';
import PerformanceMonitor from './PerformanceMonitor';
import MonitoringAlerts from './MonitoringAlerts';

export const initializeAnalytics = async (config?: {
  enableCrashReporting?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableUserAnalytics?: boolean;
  enableStructuredLogging?: boolean;
}) => {
  try {
    // Initialize analytics service
    await AnalyticsService.initialize(config);
    
    // Start performance monitoring
    if (config?.enablePerformanceMonitoring !== false) {
      PerformanceMonitor.startMonitoring();
    }
    
    // Initialize monitoring alerts
    MonitoringAlerts.initialize();
    
    console.log('Analytics system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize analytics system:', error);
  }
};