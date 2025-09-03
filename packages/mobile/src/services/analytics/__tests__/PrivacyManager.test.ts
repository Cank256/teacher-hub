import { jest } from '@jest/globals';
import PrivacyManager from '../PrivacyManager';
import { PrivacyLevel } from '../types';

// Mock dependencies
jest.mock('react-native-mmkv');
jest.mock('../AnalyticsService');

const mockMMKV = {
  getString: jest.fn(),
  set: jest.fn(),
  clearAll: jest.fn(),
};

const mockAnalyticsService = {
  setUserConsent: jest.fn(),
  trackEvent: jest.fn(),
  getUserConsent: jest.fn(() => ({ analytics: false, logging: false })),
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockMMKV),
}));

jest.mock('../AnalyticsService', () => mockAnalyticsService);

describe('PrivacyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMMKV.getString.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default privacy settings', () => {
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings).toEqual({
        analyticsEnabled: false,
        crashReportingEnabled: true,
        performanceMonitoringEnabled: true,
        structuredLoggingEnabled: false,
        dataRetentionDays: 90,
        anonymizeData: true,
      });
    });

    it('should load existing privacy settings', () => {
      const existingSettings = {
        analyticsEnabled: true,
        crashReportingEnabled: true,
        performanceMonitoringEnabled: true,
        structuredLoggingEnabled: true,
        dataRetentionDays: 30,
        anonymizeData: false,
      };

      mockMMKV.getString.mockImplementation((key) => {
        if (key === 'privacy_settings') return JSON.stringify(existingSettings);
        return null;
      });

      // Create new instance to test loading
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings).toEqual(existingSettings);
    });
  });

  describe('privacy settings management', () => {
    it('should update privacy settings', async () => {
      const updates = {
        analyticsEnabled: true,
        structuredLoggingEnabled: true,
      };

      await PrivacyManager.updatePrivacySettings(updates);
      
      expect(mockAnalyticsService.setUserConsent).toHaveBeenCalledWith(true, true);
      expect(mockMMKV.set).toHaveBeenCalledWith(
        'privacy_settings',
        expect.stringContaining('"analyticsEnabled":true')
      );
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'privacy_settings_changed',
        expect.any(Object)
      );
    });

    it('should set privacy level correctly', async () => {
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.BASIC);
      
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings.analyticsEnabled).toBe(true);
      expect(settings.crashReportingEnabled).toBe(true);
      expect(settings.performanceMonitoringEnabled).toBe(true);
      expect(settings.structuredLoggingEnabled).toBe(false);
      expect(settings.anonymizeData).toBe(true);
    });

    it('should set minimal privacy level', async () => {
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.MINIMAL);
      
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings.analyticsEnabled).toBe(false);
      expect(settings.crashReportingEnabled).toBe(true);
      expect(settings.performanceMonitoringEnabled).toBe(false);
      expect(settings.structuredLoggingEnabled).toBe(false);
      expect(settings.anonymizeData).toBe(true);
    });

    it('should set full privacy level', async () => {
      await PrivacyManager.setPrivacyLevel(PrivacyLevel.FULL);
      
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings.analyticsEnabled).toBe(true);
      expect(settings.crashReportingEnabled).toBe(true);
      expect(settings.performanceMonitoringEnabled).toBe(true);
      expect(settings.structuredLoggingEnabled).toBe(true);
      expect(settings.anonymizeData).toBe(false);
    });
  });

  describe('consent management', () => {
    it('should record consent', async () => {
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      
      const history = PrivacyManager.getConsentHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        type: 'analytics',
        granted: true,
        timestamp: expect.any(Number),
        version: '1.0',
      });
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('consent_recorded', {
        type: 'analytics',
        granted: true,
        policy_version: '1.0',
      });
    });

    it('should withdraw all consent', async () => {
      await PrivacyManager.withdrawAllConsent();
      
      const settings = PrivacyManager.getPrivacySettings();
      
      expect(settings.analyticsEnabled).toBe(false);
      expect(settings.structuredLoggingEnabled).toBe(false);
      expect(settings.crashReportingEnabled).toBe(true); // Should remain true
      expect(settings.performanceMonitoringEnabled).toBe(true); // Should remain true
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('consent_withdrawn', {
        reason: 'user_request',
        timestamp: expect.any(Number),
      });
    });

    it('should check if consent is required', () => {
      // No consent history
      expect(PrivacyManager.isConsentRequired()).toBe(true);
      
      // Add consent record
      PrivacyManager.recordConsent('analytics', true);
      
      expect(PrivacyManager.isConsentRequired()).toBe(false);
    });

    it('should check if consent renewal is required', async () => {
      // No consent history
      expect(PrivacyManager.isConsentRenewalRequired('2.0')).toBe(true);
      
      // Add consent with old version
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      
      expect(PrivacyManager.isConsentRenewalRequired('2.0')).toBe(true);
      
      // Add consent with current version
      await PrivacyManager.recordConsent('analytics', true, '2.0');
      
      expect(PrivacyManager.isConsentRenewalRequired('2.0')).toBe(false);
    });
  });

  describe('data management', () => {
    it('should export user data', async () => {
      await PrivacyManager.recordConsent('analytics', true);
      
      const exportedData = await PrivacyManager.exportUserData();
      
      expect(exportedData).toEqual({
        privacy_settings: expect.any(Object),
        consent_history: expect.any(Array),
        analytics_consent: expect.any(Object),
        data_retention_policy: expect.any(Object),
        export_timestamp: expect.any(Number),
      });
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('data_export_requested', {
        export_timestamp: expect.any(Number),
      });
    });

    it('should delete all user data', async () => {
      await PrivacyManager.deleteAllUserData();
      
      expect(mockMMKV.clearAll).toHaveBeenCalled();
      expect(mockAnalyticsService.setUserConsent).toHaveBeenCalledWith(false, false);
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('data_deletion_completed', {
        deletion_timestamp: expect.any(Number),
      });
    });

    it('should anonymize user data', async () => {
      await PrivacyManager.anonymizeUserData();
      
      const settings = PrivacyManager.getPrivacySettings();
      expect(settings.anonymizeData).toBe(true);
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('data_anonymization_completed', {
        anonymization_timestamp: expect.any(Number),
      });
    });

    it('should cleanup expired data', async () => {
      // Add some old consent records
      await PrivacyManager.recordConsent('analytics', true);
      
      // Mock old timestamp
      const history = PrivacyManager.getConsentHistory();
      if (history.length > 0) {
        // Simulate old record by mocking the stored data
        const oldRecord = {
          ...history[0],
          timestamp: Date.now() - (4 * 365 * 24 * 60 * 60 * 1000), // 4 years ago
        };
        
        mockMMKV.getString.mockImplementation((key) => {
          if (key === 'consent_records') return JSON.stringify([oldRecord]);
          return null;
        });
      }
      
      await PrivacyManager.cleanupExpiredData();
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('data_cleanup_performed', {
        retention_periods: expect.any(Object),
        cleanup_timestamp: expect.any(Number),
      });
    });
  });

  describe('privacy compliance validation', () => {
    it('should validate privacy compliance', () => {
      const alerts = PrivacyManager.validatePrivacyCompliance();
      
      // Should have alert for missing consent
      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'usage',
            severity: 'high',
            message: 'User consent required for analytics',
          }),
        ])
      );
    });

    it('should detect expired consent', async () => {
      // Add consent with old version
      await PrivacyManager.recordConsent('analytics', true, '1.0');
      
      const alerts = PrivacyManager.validatePrivacyCompliance();
      
      // Should have alert for expired consent (assuming current version is different)
      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'usage',
            severity: 'medium',
            message: 'User consent needs renewal',
          }),
        ])
      );
    });

    it('should detect data retention violations', async () => {
      // Mock very old consent record
      const veryOldTimestamp = Date.now() - (4 * 365 * 24 * 60 * 60 * 1000); // 4 years ago
      
      mockMMKV.getString.mockImplementation((key) => {
        if (key === 'consent_records') {
          return JSON.stringify([{
            type: 'analytics',
            granted: true,
            timestamp: veryOldTimestamp,
            version: '1.0',
          }]);
        }
        return null;
      });
      
      const alerts = PrivacyManager.validatePrivacyCompliance();
      
      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'usage',
            severity: 'high',
            message: 'Data retention period exceeded',
          }),
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockMMKV.set.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      await expect(PrivacyManager.updatePrivacySettings({ analyticsEnabled: true }))
        .rejects.toThrow('Storage error');
    });

    it('should handle invalid stored data', () => {
      mockMMKV.getString.mockImplementation((key) => {
        if (key === 'privacy_settings') return 'invalid json';
        return null;
      });
      
      // Should fall back to defaults
      expect(() => PrivacyManager.getPrivacySettings()).not.toThrow();
    });
  });
});