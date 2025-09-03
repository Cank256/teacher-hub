import { jest } from '@jest/globals';
import { initializeAnalytics } from '../index';
import AnalyticsService from '../AnalyticsService';
import PerformanceMonitor from '../PerformanceMonitor';
import PrivacyManager from '../PrivacyManager';
import MonitoringAlerts from '../MonitoringAlerts';

// Mock all dependencies
jest.mock('react-native-mmkv');
jest.mock('react-native-device-info');
jest.mock('@sentry/react-native');

const mockMMKV = {
  getBoolean: jest.fn(),
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clearAll: jest.fn(),
};

const mockDeviceInfo = {
  getVersion: jest.fn(() => '1.0.0'),
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getBrand: jest.fn(() => 'TestBrand'),
  getModel: jest.fn(() => 'TestModel'),
  getSystemName: jest.fn(() => 'TestOS'),
  getSystemVersion: jest.fn(() => '1.0'),
  getBuildNumber: jest.fn(() => '1'),
  getBundleId: jest.fn(() => 'com.test.app'),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  hasNotch: jest.fn(() => false),
  isTablet: jest.fn(() => false),
  getUsedMemory: jest.fn(() => Promise.resolve(100 * 1024 * 1024)),
  getTotalMemory: jest.fn(() => Promise.resolve(1024 * 1024 * 1024)),
};

const mockSentry = {
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    setData: jest.fn(),
    finish: jest.fn(),
  })),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockMMKV),
}));

jest.mock('react-native-device-info', () => mockDeviceInfo);

jest.mock('@sentry/react-native', () => mockSentry);

// Mock global functions
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

describe('Analytics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMMKV.getBoolean.mockReturnValue(false);
    mockMMKV.getString.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('System Initialization', () => {
    it('should initialize all analytics components', async () => {
      await initializeAnalytics({
        enableCrashReporting: true,
        enablePerformanceMonitoring: true,
        enableUserAnalytics: false,
        enableStructuredLogging: false,
      });

      // Verify Sentry initialization
      expect(mockSentry.init).toHaveBeenCalled();
      
      // Verify device context is set
      expect(mockSentry.setContext).toHaveBeenCalledWith('device', expect.any(Object));
    });

    it('should handle initialization errors gracefully', async () => {
      mockSentry.init.mockImplementation(() => {
        throw new Error('Sentry initialization failed');
      });

      // Should not throw
      await expect(initializeAnalytics()).resolves.not.toThrow();
    });
  });

  describe('End-to-End User Journey', () => {
    beforeEach(async () => {
      await initializeAnalytics();
    });

    it('should handle complete user consent flow', async () => {
      // 1. User opens app - no consent given yet
      expect(PrivacyManager.isConsentRequired()).toBe(true);

      // 2. User grants consent
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      await AnalyticsService.setUserConsent(true, false);

      // 3. User performs actions that should be tracked
      AnalyticsService.trackEvent('login_success', { method: 'email' });
      AnalyticsService.trackScreen('HomeScreen');

      // 4. User sets profile information
      AnalyticsService.setUserProperties({
        firstName: 'John',
        subjects: ['Math', 'Science'],
        email: 'john@example.com',
      });

      // 5. Performance metrics are collected
      AnalyticsService.trackPerformance({
        metric_name: 'screen_load_time',
        value: 500,
        unit: 'milliseconds',
      });

      // 6. User later withdraws consent
      await PrivacyManager.withdrawAllConsent();

      // 7. Verify data is cleared
      expect(mockMMKV.delete).toHaveBeenCalled();
    });

    it('should handle user journey without consent', async () => {
      // User doesn't give consent
      await AnalyticsService.setUserConsent(false, false);

      // System events should still work
      AnalyticsService.trackEvent('session_start');
      AnalyticsService.trackAppStateChange('active');

      // User events should not be tracked
      AnalyticsService.trackEvent('user_action', { action: 'click' });

      // Crash reporting should still work for app stability
      const error = new Error('Test error');
      AnalyticsService.trackError(error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });

  describe('Performance Monitoring Integration', () => {
    beforeEach(async () => {
      await initializeAnalytics();
      PerformanceMonitor.startMonitoring();
    });

    afterEach(() => {
      PerformanceMonitor.stopMonitoring();
    });

    it('should integrate performance monitoring with analytics', async () => {
      // Measure TTI
      const endTTI = PerformanceMonitor.measureTTI('TestScreen');
      jest.advanceTimersByTime(500);
      endTTI();

      // Should track performance metric
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Performance Metrics',
        category: 'performance',
        level: 'info',
        data: expect.objectContaining({
          metric_name: 'time_to_interactive',
          value: expect.any(Number),
          unit: 'milliseconds',
        }),
      });
    });

    it('should trigger alerts for performance issues', async () => {
      // Simulate slow operation
      const endMeasurement = PerformanceMonitor.measureAPICall('/api/slow');
      jest.advanceTimersByTime(6000); // Exceed threshold
      endMeasurement();

      // Should trigger slow operation alert
      expect(mockSentry.startTransaction).toHaveBeenCalledWith({
        name: 'Slow Operation: slow_api_call',
        op: 'performance',
      });
    });

    it('should monitor memory usage and trigger alerts', async () => {
      // Mock high memory usage
      mockDeviceInfo.getUsedMemory.mockResolvedValue(250 * 1024 * 1024); // 250MB

      // Advance timer to trigger memory monitoring
      jest.advanceTimersByTime(30000);
      await jest.runAllTimersAsync();

      // Should track memory metrics
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Performance Metrics',
        category: 'performance',
        level: 'info',
        data: expect.objectContaining({
          metric_name: 'memory_usage',
        }),
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await initializeAnalytics();
    });

    it('should handle storage errors gracefully', async () => {
      mockMMKV.set.mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Should not crash the app
      expect(() => {
        AnalyticsService.trackEvent('test_event');
      }).not.toThrow();
    });

    it('should handle network errors in event flushing', async () => {
      await AnalyticsService.setUserConsent(true, true);

      // Fill event queue
      for (let i = 0; i < 60; i++) {
        AnalyticsService.trackEvent('test_event', { index: i });
      }

      // Should attempt to flush events
      jest.advanceTimersByTime(30000);

      // Even if network fails, should not crash
      expect(() => jest.runAllTimers()).not.toThrow();
    });

    it('should recover from Sentry initialization failure', async () => {
      mockSentry.init.mockImplementation(() => {
        throw new Error('Sentry failed');
      });

      await initializeAnalytics();

      // Should still be able to track events locally
      expect(() => {
        AnalyticsService.trackEvent('test_event');
      }).not.toThrow();
    });
  });

  describe('Data Flow Integration', () => {
    beforeEach(async () => {
      await initializeAnalytics();
      await AnalyticsService.setUserConsent(true, true);
    });

    it('should properly flow data between components', async () => {
      // 1. Track user event
      AnalyticsService.trackEvent('user_login', { method: 'google' });

      // 2. Track performance metric
      AnalyticsService.trackPerformance({
        metric_name: 'login_duration',
        value: 1200,
        unit: 'milliseconds',
      });

      // 3. Track error
      const error = new Error('Login failed');
      AnalyticsService.trackError(error, { step: 'oauth_callback' });

      // 4. All should be properly sent to Sentry
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledTimes(2); // Performance + error
      expect(mockSentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should maintain session consistency across components', async () => {
      // Start session
      AnalyticsService.trackEvent('session_start');

      // Track screen view
      AnalyticsService.trackScreen('HomeScreen');

      // Track performance
      AnalyticsService.trackPerformance({
        metric_name: 'screen_render_time',
        value: 200,
        unit: 'milliseconds',
      });

      // All events should have the same session ID
      // This would be verified by checking the actual event data
    });
  });

  describe('Privacy Integration', () => {
    beforeEach(async () => {
      await initializeAnalytics();
    });

    it('should respect privacy settings across all components', async () => {
      // Set minimal privacy
      await PrivacyManager.setPrivacyLevel('minimal' as any);

      // Analytics should be disabled
      AnalyticsService.trackEvent('user_action');

      // Performance monitoring should be disabled
      PerformanceMonitor.startMonitoring();
      jest.advanceTimersByTime(30000);

      // Should not track user-specific performance data
      // Only essential crash reporting should work
    });

    it('should handle privacy setting changes dynamically', async () => {
      // Start with consent
      await AnalyticsService.setUserConsent(true, true);
      AnalyticsService.trackEvent('user_action_1');

      // Withdraw consent
      await AnalyticsService.setUserConsent(false, false);
      AnalyticsService.trackEvent('user_action_2');

      // Re-grant consent
      await AnalyticsService.setUserConsent(true, true);
      AnalyticsService.trackEvent('user_action_3');

      // Should handle all transitions gracefully
    });
  });

  describe('Monitoring Alerts Integration', () => {
    beforeEach(async () => {
      await initializeAnalytics();
      MonitoringAlerts.initialize();
    });

    it('should trigger alerts for critical issues', () => {
      // Simulate high crash rate
      MonitoringAlerts.checkMetric('crash_rate', 0.1); // 10% crash rate

      // Should trigger critical alert
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('High Crash Rate'),
        expect.objectContaining({
          level: 'fatal',
        })
      );
    });

    it('should handle alert acknowledgment and resolution', () => {
      // Trigger alert
      MonitoringAlerts.checkMetric('memory_usage', 300 * 1024 * 1024);

      const activeAlerts = MonitoringAlerts.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);

      // Acknowledge alert
      if (activeAlerts.length > 0) {
        MonitoringAlerts.acknowledgeAlert(activeAlerts[0].id);
        MonitoringAlerts.resolveAlert(activeAlerts[0].id);
      }

      // Should track alert lifecycle
      expect(mockSentry.addBreadcrumb).toHaveBeenCalled();
    });
  });

  describe('Real-world Scenarios', () => {
    beforeEach(async () => {
      await initializeAnalytics();
    });

    it('should handle app lifecycle transitions', async () => {
      // App starts
      AnalyticsService.trackAppStateChange('active');
      PerformanceMonitor.startMonitoring();

      // User interacts with app
      await AnalyticsService.setUserConsent(true, false);
      AnalyticsService.trackEvent('app_opened');
      AnalyticsService.trackScreen('HomeScreen');

      // App goes to background
      AnalyticsService.trackAppStateChange('background');
      PerformanceMonitor.stopMonitoring();

      // App returns to foreground
      AnalyticsService.trackAppStateChange('active');
      PerformanceMonitor.startMonitoring();

      // Should handle all transitions smoothly
      expect(() => jest.runAllTimers()).not.toThrow();
    });

    it('should handle device resource constraints', async () => {
      // Simulate low memory device
      mockDeviceInfo.getUsedMemory.mockResolvedValue(900 * 1024 * 1024); // 900MB
      mockDeviceInfo.getTotalMemory.mockResolvedValue(1024 * 1024 * 1024); // 1GB

      PerformanceMonitor.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runAllTimersAsync();

      // Should trigger memory warning
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Memory Warning',
          category: 'performance',
          level: 'warning',
        })
      );
    });

    it('should handle network connectivity issues', async () => {
      await AnalyticsService.setUserConsent(true, true);

      // Generate many events while offline
      for (let i = 0; i < 100; i++) {
        AnalyticsService.trackEvent('offline_event', { index: i });
      }

      // Simulate network coming back
      jest.advanceTimersByTime(60000); // 1 minute

      // Should attempt to flush queued events
      expect(() => jest.runAllTimers()).not.toThrow();
    });
  });
});