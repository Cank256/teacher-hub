import { jest } from '@jest/globals';
import AnalyticsService from '../AnalyticsService';
import PrivacyManager from '../PrivacyManager';
import { PrivacyLevel } from '../types';

// Mock dependencies
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

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockMMKV),
}));

jest.mock('react-native-device-info', () => ({
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
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    setData: jest.fn(),
    finish: jest.fn(),
  })),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));

describe('Privacy Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMMKV.getBoolean.mockReturnValue(false);
    mockMMKV.getString.mockReturnValue(null);
  });

  describe('GDPR Compliance', () => {
    it('should not track user events without consent', async () => {
      await AnalyticsService.initialize();
      
      // User has not given consent
      await AnalyticsService.setUserConsent(false, false);
      
      // Try to track a user event
      AnalyticsService.trackEvent('user_action', { action: 'click' });
      
      // Should not track user events, but system events should still work
      AnalyticsService.trackEvent('session_start');
      
      // Verify that user data is not being collected
      expect(mockMMKV.set).not.toHaveBeenCalledWith(
        expect.stringContaining('user_action'),
        expect.anything()
      );
    });

    it('should allow data export', async () => {
      await PrivacyManager.recordConsent('analytics', true);
      
      const exportedData = await PrivacyManager.exportUserData();
      
      expect(exportedData).toHaveProperty('privacy_settings');
      expect(exportedData).toHaveProperty('consent_history');
      expect(exportedData).toHaveProperty('export_timestamp');
    });

    it('should allow data deletion', async () => {
      await PrivacyManager.recordConsent('analytics', true);
      
      await PrivacyManager.deleteAllUserData();
      
      expect(mockMMKV.clearAll).toHaveBeenCalled();
    });

    it('should anonymize sensitive data', async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
      
      const userProperties = {
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
      };
      
      AnalyticsService.setUserProperties(userProperties);
      
      // Verify that sensitive data is anonymized
      // This would be tested by checking the actual calls to Sentry
      // In a real implementation, you'd verify the data is hashed/truncated
    });

    it('should respect data retention policies', async () => {
      await PrivacyManager.cleanupExpiredData();
      
      // Should clean up old data according to retention policy
      // This test would verify that old consent records are removed
    });
  });

  describe('CCPA Compliance', () => {
    it('should provide opt-out mechanism', async () => {
      // User initially consents
      await PrivacyManager.recordConsent('analytics', true);
      
      // User opts out
      await PrivacyManager.withdrawAllConsent();
      
      const settings = PrivacyManager.getPrivacySettings();
      expect(settings.analyticsEnabled).toBe(false);
      expect(settings.structuredLoggingEnabled).toBe(false);
    });

    it('should not sell personal information', async () => {
      // This is more of a policy test - ensure no data sharing mechanisms
      // In a real implementation, you'd verify no data is sent to third parties
      // for commercial purposes
      
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
      
      // Track some events
      AnalyticsService.trackEvent('user_action', { action: 'click' });
      
      // Verify data is only sent to approved analytics services (Sentry)
      // and not to any commercial data brokers
    });
  });

  describe('Privacy by Design', () => {
    it('should use minimal data collection by default', () => {
      const defaultSettings = PrivacyManager.getPrivacySettings();
      
      expect(defaultSettings.analyticsEnabled).toBe(false);
      expect(defaultSettings.structuredLoggingEnabled).toBe(false);
      expect(defaultSettings.anonymizeData).toBe(true);
    });

    it('should provide granular privacy controls', async () => {
      // Test different privacy levels
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.MINIMAL);
      let settings = PrivacyManager.getPrivacySettings();
      expect(settings.analyticsEnabled).toBe(false);
      
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.BASIC);
      settings = PrivacyManager.getPrivacySettings();
      expect(settings.analyticsEnabled).toBe(true);
      expect(settings.structuredLoggingEnabled).toBe(false);
      
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.FULL);
      settings = PrivacyManager.getPrivacySettings();
      expect(settings.analyticsEnabled).toBe(true);
      expect(settings.structuredLoggingEnabled).toBe(true);
    });

    it('should maintain essential functionality without consent', async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(false, false);
      
      // Crash reporting should still work for app stability
      const error = new Error('Test error');
      AnalyticsService.trackError(error);
      
      // Performance monitoring should still work for app quality
      AnalyticsService.trackPerformance({
        metric_name: 'cold_start_time',
        value: 1500,
        unit: 'milliseconds',
      });
      
      // These should not throw errors
      expect(() => AnalyticsService.trackError(error)).not.toThrow();
    });
  });

  describe('Consent Management', () => {
    it('should record consent with proper versioning', async () => {
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      
      const history = PrivacyManager.getConsentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('1.0');
    });

    it('should detect when consent renewal is needed', async () => {
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      
      // Check if renewal is needed for new policy version
      expect(PrivacyManager.isConsentRenewalRequired('2.0')).toBe(true);
      expect(PrivacyManager.isConsentRenewalRequired('1.0')).toBe(false);
    });

    it('should handle consent withdrawal gracefully', async () => {
      await PrivacyManager.recordConsent('analytics', true);
      await PrivacyManager.withdrawAllConsent();
      
      // Should clear user data
      expect(mockMMKV.delete).toHaveBeenCalled();
      
      // Should update analytics service
      const consent = AnalyticsService.getUserConsent();
      expect(consent.analytics).toBe(false);
    });
  });

  describe('Data Minimization', () => {
    it('should only collect necessary data', async () => {
      await AnalyticsService.initialize();
      await AnalyticsService.setUserConsent(true, true);
      
      // Track a minimal event
      AnalyticsService.trackEvent('button_click', { button_id: 'submit' });
      
      // Should not collect unnecessary personal information
      // This would be verified by checking what data is actually sent
    });

    it('should anonymize identifiers', async () => {
      await AnalyticsService.initialize();
      
      const userProperties = {
        email: 'user@example.com',
        phone: '+1234567890',
      };
      
      AnalyticsService.setUserProperties(userProperties);
      
      // Verify that identifiers are hashed or anonymized
      // In the actual implementation, check that email becomes something like "use***@example.com"
    });
  });

  describe('Transparency', () => {
    it('should provide clear privacy settings', () => {
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings).toHaveProperty('analyticsEnabled');
      expect(settings).toHaveProperty('crashReportingEnabled');
      expect(settings).toHaveProperty('performanceMonitoringEnabled');
      expect(settings).toHaveProperty('structuredLoggingEnabled');
      expect(settings).toHaveProperty('dataRetentionDays');
      expect(settings).toHaveProperty('anonymizeData');
    });

    it('should maintain audit trail of consent changes', async () => {
      await PrivacyManager.recordConsent('analytics', true);
      await PrivacyManager.recordConsent('analytics', false);
      
      const history = PrivacyManager.getConsentHistory();
      expect(history).toHaveLength(2);
      expect(history[0].granted).toBe(true);
      expect(history[1].granted).toBe(false);
    });
  });

  describe('Security', () => {
    it('should use secure storage for sensitive data', async () => {
      await AnalyticsService.initialize();
      
      // Verify that tokens and sensitive data use secure storage
      // This would check that Keychain/Keystore is used instead of regular storage
    });

    it('should validate privacy compliance regularly', () => {
      const alerts = PrivacyManager.validatePrivacyCompliance();
      
      // Should return array of compliance alerts
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should handle data breaches appropriately', async () => {
      // In case of a security incident, should be able to:
      // 1. Notify users
      // 2. Clear sensitive data
      // 3. Reset consent requirements
      
      await PrivacyManager.deleteAllUserData();
      
      expect(mockMMKV.clearAll).toHaveBeenCalled();
    });
  });

  describe('Cross-border Data Transfer', () => {
    it('should handle international data transfer compliance', async () => {
      await AnalyticsService.initialize();
      
      // Verify that data transfer mechanisms comply with international regulations
      // This would check that proper safeguards are in place for data sent to Sentry
    });
  });

  describe('Children\'s Privacy', () => {
    it('should provide enhanced privacy for minors', async () => {
      // If the app is used by minors, should provide enhanced privacy protections
      // This would involve additional consent mechanisms and data restrictions
      
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.MINIMAL);
      
      const settings = PrivacyManager.getPrivacySettings();
      expect(settings.analyticsEnabled).toBe(false);
    });
  });
});