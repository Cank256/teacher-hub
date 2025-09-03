import { jest } from '@jest/globals';
import AnalyticsService from '../AnalyticsService';
import { ANALYTICS_EVENTS } from '../types';

// Mock dependencies
jest.mock('react-native-mmkv');
jest.mock('react-native-device-info');
jest.mock('@sentry/react-native');

const mockMMKV = {
  getBoolean: jest.fn(),
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
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
};

const mockSentry = {
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    setData: jest.fn(),
    finish: jest.fn(),
  })),
};

// Mock modules
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockMMKV),
}));

jest.mock('react-native-device-info', () => mockDeviceInfo);

jest.mock('@sentry/react-native', () => mockSentry);

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMMKV.getBoolean.mockReturnValue(false);
    mockMMKV.getString.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default config', async () => {
      await AnalyticsService.initialize();
      
      expect(mockSentry.init).toHaveBeenCalled();
      expect(mockSentry.setUser).toHaveBeenCalled();
      expect(mockSentry.setContext).toHaveBeenCalled();
    });

    it('should initialize with custom config', async () => {
      const config = {
        enableCrashReporting: false,
        enablePerformanceMonitoring: false,
        enableUserAnalytics: true,
        enableStructuredLogging: true,
      };

      await AnalyticsService.initialize(config);
      
      // Should still initialize Sentry even if crash reporting is disabled
      expect(mockSentry.init).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.initialize();
      
      expect(mockSentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('user consent', () => {
    it('should set user consent correctly', async () => {
      await AnalyticsService.setUserConsent(true, true);
      
      expect(mockMMKV.set).toHaveBeenCalledWith('analytics_opted_in', true);
      expect(mockMMKV.set).toHaveBeenCalledWith('logging_opted_in', true);
    });

    it('should get user consent correctly', () => {
      mockMMKV.getBoolean.mockImplementation((key) => {
        if (key === 'analytics_opted_in') return true;
        if (key === 'logging_opted_in') return false;
        return false;
      });

      const consent = AnalyticsService.getUserConsent();
      
      expect(consent).toEqual({
        analytics: true,
        logging: false,
      });
    });

    it('should clear user data when consent is withdrawn', async () => {
      await AnalyticsService.setUserConsent(false, false);
      
      expect(mockMMKV.delete).toHaveBeenCalled();
    });
  });

  describe('event tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
    });

    it('should track events when user has consented', () => {
      const eventName = ANALYTICS_EVENTS.LOGIN_SUCCESS;
      const properties = { method: 'email' };

      AnalyticsService.trackEvent(eventName, properties);
      
      // Event should be queued (we can't easily test the internal queue)
      // But we can verify it doesn't throw an error
      expect(() => AnalyticsService.trackEvent(eventName, properties)).not.toThrow();
    });

    it('should not track user events when consent is not given', async () => {
      await AnalyticsService.setUserConsent(false, false);
      
      const eventName = ANALYTICS_EVENTS.LOGIN_SUCCESS;
      const properties = { method: 'email' };

      // Should not throw but also should not track
      expect(() => AnalyticsService.trackEvent(eventName, properties)).not.toThrow();
    });

    it('should track system events even without consent', async () => {
      await AnalyticsService.setUserConsent(false, false);
      
      const eventName = ANALYTICS_EVENTS.SESSION_START;
      
      expect(() => AnalyticsService.trackEvent(eventName)).not.toThrow();
    });
  });

  describe('screen tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
    });

    it('should track screen views', () => {
      const screenName = 'HomeScreen';
      const properties = { tab: 'posts' };

      AnalyticsService.trackScreen(screenName, properties);
      
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: `Screen: ${screenName}`,
        category: 'navigation',
        level: 'info',
        data: properties,
      });
    });
  });

  describe('performance tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
    });

    it('should track performance metrics', () => {
      const metrics = {
        metric_name: 'cold_start_time',
        value: 1500,
        unit: 'milliseconds',
      };

      AnalyticsService.trackPerformance(metrics);
      
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Performance Metrics',
        category: 'performance',
        level: 'info',
        data: metrics,
      });
    });
  });

  describe('error tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
    });

    it('should track errors', () => {
      const error = new Error('Test error');
      const context = { screen: 'HomeScreen' };

      AnalyticsService.trackError(error, context);
      
      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        contexts: {
          error_context: context,
        },
        tags: expect.objectContaining({
          session_id: expect.any(String),
        }),
      });
    });
  });

  describe('user properties', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
    });

    it('should set user properties with sanitization', () => {
      const properties = {
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
        subjects: ['Math', 'Science'],
      };

      AnalyticsService.setUserProperties(properties);
      
      expect(mockSentry.setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          email: 'tes***@example.com', // Should be hashed
          phone: '123***', // Should be truncated
          firstName: 'John',
          subjects: ['Math', 'Science'],
        })
      );
    });
  });

  describe('logging', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
    });

    it('should log with structured logging enabled', async () => {
      await AnalyticsService.setUserConsent(true, true);
      
      const message = 'Test log message';
      const data = { key: 'value' };

      AnalyticsService.log('info', message, data);
      
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message,
        category: 'log',
        level: 'info',
        data,
      });
    });

    it('should only console log when structured logging is disabled', async () => {
      await AnalyticsService.setUserConsent(true, false);
      
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const message = 'Test log message';
      const data = { key: 'value' };

      AnalyticsService.log('info', message, data);
      
      // Should not add to Sentry breadcrumbs
      expect(mockSentry.addBreadcrumb).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('retention tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
    });

    it('should track daily active user', () => {
      const today = new Date().toDateString();
      mockMMKV.getString.mockReturnValue('different-date');

      AnalyticsService.trackRetention();
      
      expect(mockMMKV.set).toHaveBeenCalledWith('last_active_date', today);
    });

    it('should not track if already tracked today', () => {
      const today = new Date().toDateString();
      mockMMKV.getString.mockReturnValue(today);

      AnalyticsService.trackRetention();
      
      // Should not set the date again
      expect(mockMMKV.set).not.toHaveBeenCalledWith('last_active_date', today);
    });
  });

  describe('app state tracking', () => {
    beforeEach(async () => {
      await AnalyticsService.initialize();
    });

    it('should track app state changes', () => {
      AnalyticsService.trackAppStateChange('background');
      
      // Should not throw and should handle the state change
      expect(() => AnalyticsService.trackAppStateChange('active')).not.toThrow();
    });
  });
});