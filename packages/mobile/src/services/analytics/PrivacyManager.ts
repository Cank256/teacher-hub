import { MMKV } from 'react-native-mmkv';
import { PrivacySettings, PrivacyLevel, MonitoringAlert } from './types';
import AnalyticsService from './AnalyticsService';

interface ConsentRecord {
  type: 'analytics' | 'crash_reporting' | 'performance' | 'logging';
  granted: boolean;
  timestamp: number;
  version: string; // Privacy policy version
  ipAddress?: string; // Hashed for compliance
}

interface DataRetentionPolicy {
  analyticsData: number; // days
  crashReports: number; // days
  performanceMetrics: number; // days
  userLogs: number; // days
  personalData: number; // days
}

class PrivacyManager {
  private static instance: PrivacyManager;
  private storage: MMKV;
  private privacySettings: PrivacySettings;
  private consentRecords: ConsentRecord[] = [];
  private dataRetentionPolicy: DataRetentionPolicy;

  private constructor() {
    this.storage = new MMKV({ id: 'privacy' });
    this.dataRetentionPolicy = {
      analyticsData: 90, // 3 months
      crashReports: 365, // 1 year
      performanceMetrics: 30, // 1 month
      userLogs: 7, // 1 week
      personalData: 1095, // 3 years
    };
    
    this.loadPrivacySettings();
    this.loadConsentRecords();
  }

  static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  // Initialize privacy settings with defaults
  private loadPrivacySettings(): void {
    const stored = this.storage.getString('privacy_settings');
    
    this.privacySettings = stored ? JSON.parse(stored) : {
      analyticsEnabled: false, // Opt-in by default
      crashReportingEnabled: true, // Essential for app stability
      performanceMonitoringEnabled: true, // Essential for app quality
      structuredLoggingEnabled: false, // Opt-in by default
      dataRetentionDays: this.dataRetentionPolicy.analyticsData,
      anonymizeData: true,
    };
  }

  private loadConsentRecords(): void {
    const stored = this.storage.getString('consent_records');
    this.consentRecords = stored ? JSON.parse(stored) : [];
  }

  private savePrivacySettings(): void {
    this.storage.set('privacy_settings', JSON.stringify(this.privacySettings));
  }

  private saveConsentRecords(): void {
    this.storage.set('consent_records', JSON.stringify(this.consentRecords));
  }

  // Get current privacy settings
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }

  // Update privacy settings
  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    const previousSettings = { ...this.privacySettings };
    this.privacySettings = { ...this.privacySettings, ...updates };
    
    // Record consent changes
    await this.recordConsentChanges(previousSettings, this.privacySettings);
    
    // Update analytics service
    await AnalyticsService.setUserConsent(
      this.privacySettings.analyticsEnabled,
      this.privacySettings.structuredLoggingEnabled
    );
    
    this.savePrivacySettings();
    
    // Track privacy settings change
    AnalyticsService.trackEvent('privacy_settings_changed', {
      changes: this.getSettingsChanges(previousSettings, this.privacySettings),
    });
  }

  // Set privacy level (convenience method)
  async setPrivacyLevel(level: PrivacyLevel): Promise<void> {
    let settings: Partial<PrivacySettings>;
    
    switch (level) {
      case PrivacyLevel.MINIMAL:
        settings = {
          analyticsEnabled: false,
          crashReportingEnabled: true,
          performanceMonitoringEnabled: false,
          structuredLoggingEnabled: false,
          anonymizeData: true,
        };
        break;
      
      case PrivacyLevel.BASIC:
        settings = {
          analyticsEnabled: true,
          crashReportingEnabled: true,
          performanceMonitoringEnabled: true,
          structuredLoggingEnabled: false,
          anonymizeData: true,
        };
        break;
      
      case PrivacyLevel.STANDARD:
        settings = {
          analyticsEnabled: true,
          crashReportingEnabled: true,
          performanceMonitoringEnabled: true,
          structuredLoggingEnabled: false,
          anonymizeData: true,
        };
        break;
      
      case PrivacyLevel.FULL:
        settings = {
          analyticsEnabled: true,
          crashReportingEnabled: true,
          performanceMonitoringEnabled: true,
          structuredLoggingEnabled: true,
          anonymizeData: false,
        };
        break;
    }
    
    await this.updatePrivacySettings(settings);
  }

  // Record specific consent
  async recordConsent(
    type: ConsentRecord['type'],
    granted: boolean,
    policyVersion: string = '1.0'
  ): Promise<void> {
    const consentRecord: ConsentRecord = {
      type,
      granted,
      timestamp: Date.now(),
      version: policyVersion,
    };
    
    this.consentRecords.push(consentRecord);
    this.saveConsentRecords();
    
    // Update corresponding privacy setting
    switch (type) {
      case 'analytics':
        await this.updatePrivacySettings({ analyticsEnabled: granted });
        break;
      case 'crash_reporting':
        await this.updatePrivacySettings({ crashReportingEnabled: granted });
        break;
      case 'performance':
        await this.updatePrivacySettings({ performanceMonitoringEnabled: granted });
        break;
      case 'logging':
        await this.updatePrivacySettings({ structuredLoggingEnabled: granted });
        break;
    }
    
    AnalyticsService.trackEvent('consent_recorded', {
      type,
      granted,
      policy_version: policyVersion,
    });
  }

  // Withdraw all consent
  async withdrawAllConsent(): Promise<void> {
    await this.updatePrivacySettings({
      analyticsEnabled: false,
      structuredLoggingEnabled: false,
      // Keep crash reporting and performance monitoring for app stability
      crashReportingEnabled: true,
      performanceMonitoringEnabled: true,
    });
    
    // Record withdrawal
    await this.recordConsent('analytics', false);
    await this.recordConsent('logging', false);
    
    // Clear user data
    await this.clearUserData();
    
    AnalyticsService.trackEvent('consent_withdrawn', {
      reason: 'user_request',
      timestamp: Date.now(),
    });
  }

  // Get consent history
  getConsentHistory(): ConsentRecord[] {
    return [...this.consentRecords];
  }

  // Check if consent is required
  isConsentRequired(): boolean {
    // Check if user has never given consent for analytics
    const analyticsConsent = this.consentRecords.find(
      record => record.type === 'analytics'
    );
    
    return !analyticsConsent;
  }

  // Check if consent needs renewal (e.g., policy updated)
  isConsentRenewalRequired(currentPolicyVersion: string = '1.0'): boolean {
    const latestConsent = this.consentRecords
      .filter(record => record.type === 'analytics')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return !latestConsent || latestConsent.version !== currentPolicyVersion;
  }

  // Data retention management
  async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    const retentionPeriods = {
      analytics: this.dataRetentionPolicy.analyticsData * 24 * 60 * 60 * 1000,
      performance: this.dataRetentionPolicy.performanceMetrics * 24 * 60 * 60 * 1000,
      logs: this.dataRetentionPolicy.userLogs * 24 * 60 * 60 * 1000,
    };
    
    // Clean up consent records older than personal data retention period
    const personalDataRetention = this.dataRetentionPolicy.personalData * 24 * 60 * 60 * 1000;
    this.consentRecords = this.consentRecords.filter(
      record => now - record.timestamp < personalDataRetention
    );
    
    this.saveConsentRecords();
    
    // Notify analytics service to clean up its data
    // This would trigger cleanup in the analytics service
    AnalyticsService.trackEvent('data_cleanup_performed', {
      retention_periods: retentionPeriods,
      cleanup_timestamp: now,
    });
  }

  // Export user data (GDPR compliance)
  async exportUserData(): Promise<Record<string, any>> {
    const userData = {
      privacy_settings: this.privacySettings,
      consent_history: this.consentRecords,
      analytics_consent: AnalyticsService.getUserConsent(),
      data_retention_policy: this.dataRetentionPolicy,
      export_timestamp: Date.now(),
    };
    
    AnalyticsService.trackEvent('data_export_requested', {
      export_timestamp: userData.export_timestamp,
    });
    
    return userData;
  }

  // Delete all user data (GDPR compliance)
  async deleteAllUserData(): Promise<void> {
    // Clear privacy storage
    this.storage.clearAll();
    
    // Reset to defaults
    this.loadPrivacySettings();
    this.consentRecords = [];
    
    // Clear analytics data
    await AnalyticsService.setUserConsent(false, false);
    
    AnalyticsService.trackEvent('data_deletion_completed', {
      deletion_timestamp: Date.now(),
    });
  }

  // Anonymize user data
  async anonymizeUserData(): Promise<void> {
    // Update settings to enable anonymization
    await this.updatePrivacySettings({ anonymizeData: true });
    
    // Clear identifiable information from consent records
    this.consentRecords = this.consentRecords.map(record => ({
      ...record,
      ipAddress: undefined,
    }));
    
    this.saveConsentRecords();
    
    AnalyticsService.trackEvent('data_anonymization_completed', {
      anonymization_timestamp: Date.now(),
    });
  }

  // Privacy compliance validation
  validatePrivacyCompliance(): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];
    const now = Date.now();
    
    // Check for missing consent
    if (this.isConsentRequired()) {
      alerts.push({
        id: `privacy_alert_${now}`,
        type: 'usage',
        severity: 'high',
        message: 'User consent required for analytics',
        threshold: 1,
        currentValue: 0,
        timestamp: now,
        metadata: { type: 'missing_consent' },
      });
    }
    
    // Check for expired consent
    if (this.isConsentRenewalRequired()) {
      alerts.push({
        id: `privacy_alert_${now + 1}`,
        type: 'usage',
        severity: 'medium',
        message: 'User consent needs renewal',
        threshold: 1,
        currentValue: 0,
        timestamp: now,
        metadata: { type: 'expired_consent' },
      });
    }
    
    // Check data retention compliance
    const oldestRecord = this.consentRecords
      .sort((a, b) => a.timestamp - b.timestamp)[0];
    
    if (oldestRecord) {
      const age = now - oldestRecord.timestamp;
      const maxAge = this.dataRetentionPolicy.personalData * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        alerts.push({
          id: `privacy_alert_${now + 2}`,
          type: 'usage',
          severity: 'high',
          message: 'Data retention period exceeded',
          threshold: maxAge,
          currentValue: age,
          timestamp: now,
          metadata: { type: 'retention_violation' },
        });
      }
    }
    
    return alerts;
  }

  // Private helper methods
  private async recordConsentChanges(
    previous: PrivacySettings,
    current: PrivacySettings
  ): Promise<void> {
    const changes = this.getSettingsChanges(previous, current);
    
    for (const [setting, change] of Object.entries(changes)) {
      if (change.changed) {
        let consentType: ConsentRecord['type'];
        
        switch (setting) {
          case 'analyticsEnabled':
            consentType = 'analytics';
            break;
          case 'crashReportingEnabled':
            consentType = 'crash_reporting';
            break;
          case 'performanceMonitoringEnabled':
            consentType = 'performance';
            break;
          case 'structuredLoggingEnabled':
            consentType = 'logging';
            break;
          default:
            continue;
        }
        
        const consentRecord: ConsentRecord = {
          type: consentType,
          granted: change.newValue as boolean,
          timestamp: Date.now(),
          version: '1.0',
        };
        
        this.consentRecords.push(consentRecord);
      }
    }
    
    this.saveConsentRecords();
  }

  private getSettingsChanges(
    previous: PrivacySettings,
    current: PrivacySettings
  ): Record<string, { changed: boolean; oldValue: any; newValue: any }> {
    const changes: Record<string, any> = {};
    
    for (const key in current) {
      const oldValue = previous[key as keyof PrivacySettings];
      const newValue = current[key as keyof PrivacySettings];
      
      changes[key] = {
        changed: oldValue !== newValue,
        oldValue,
        newValue,
      };
    }
    
    return changes;
  }

  private async clearUserData(): Promise<void> {
    // This would clear user-specific analytics data
    // Implementation depends on your analytics backend
    console.log('Clearing user data...');
  }
}

export default PrivacyManager.getInstance();