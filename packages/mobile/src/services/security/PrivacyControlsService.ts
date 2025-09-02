import * as SecureStore from 'expo-secure-store';
import { PrivacySettings } from './types';
import { DataEncryptionService } from './DataEncryptionService';

export class PrivacyControlsService {
  private static instance: PrivacyControlsService;
  private settings: PrivacySettings;
  private readonly STORAGE_KEY = 'privacy_settings';

  private defaultSettings: PrivacySettings = {
    dataMinimization: true,
    analyticsOptOut: false,
    crashReportingOptOut: false,
    locationTrackingOptOut: false,
    personalizedAdsOptOut: true,
    dataRetentionPeriod: 365 // 1 year
  };

  public static getInstance(): PrivacyControlsService {
    if (!PrivacyControlsService.instance) {
      PrivacyControlsService.instance = new PrivacyControlsService();
    }
    return PrivacyControlsService.instance;
  }

  constructor() {
    this.settings = { ...this.defaultSettings };
  }

  /**
   * Initializes privacy controls service
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadSettings();
    } catch (error) {
      console.error('Failed to initialize privacy controls:', error);
      // Use default settings if loading fails
      this.settings = { ...this.defaultSettings };
    }
  }

  /**
   * Gets current privacy settings
   */
  public getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Updates privacy settings
   */
  public async updateSettings(newSettings: Partial<PrivacySettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      
      // Apply settings immediately
      await this.applyPrivacySettings();
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }

  /**
   * Enables data minimization
   */
  public async enableDataMinimization(): Promise<void> {
    await this.updateSettings({ dataMinimization: true });
  }

  /**
   * Disables data minimization
   */
  public async disableDataMinimization(): Promise<void> {
    await this.updateSettings({ dataMinimization: false });
  }

  /**
   * Opts out of analytics tracking
   */
  public async optOutOfAnalytics(): Promise<void> {
    await this.updateSettings({ analyticsOptOut: true });
  }

  /**
   * Opts in to analytics tracking
   */
  public async optInToAnalytics(): Promise<void> {
    await this.updateSettings({ analyticsOptOut: false });
  }

  /**
   * Opts out of crash reporting
   */
  public async optOutOfCrashReporting(): Promise<void> {
    await this.updateSettings({ crashReportingOptOut: true });
  }

  /**
   * Opts in to crash reporting
   */
  public async optInToCrashReporting(): Promise<void> {
    await this.updateSettings({ crashReportingOptOut: false });
  }

  /**
   * Opts out of location tracking
   */
  public async optOutOfLocationTracking(): Promise<void> {
    await this.updateSettings({ locationTrackingOptOut: true });
  }

  /**
   * Opts in to location tracking
   */
  public async optInToLocationTracking(): Promise<void> {
    await this.updateSettings({ locationTrackingOptOut: false });
  }

  /**
   * Opts out of personalized ads
   */
  public async optOutOfPersonalizedAds(): Promise<void> {
    await this.updateSettings({ personalizedAdsOptOut: true });
  }

  /**
   * Opts in to personalized ads
   */
  public async optInToPersonalizedAds(): Promise<void> {
    await this.updateSettings({ personalizedAdsOptOut: false });
  }

  /**
   * Sets data retention period
   */
  public async setDataRetentionPeriod(days: number): Promise<void> {
    if (days < 30) {
      throw new Error('Data retention period must be at least 30 days');
    }
    if (days > 2555) { // ~7 years
      throw new Error('Data retention period cannot exceed 7 years');
    }
    
    await this.updateSettings({ dataRetentionPeriod: days });
  }

  /**
   * Checks if analytics tracking is allowed
   */
  public isAnalyticsAllowed(): boolean {
    return !this.settings.analyticsOptOut;
  }

  /**
   * Checks if crash reporting is allowed
   */
  public isCrashReportingAllowed(): boolean {
    return !this.settings.crashReportingOptOut;
  }

  /**
   * Checks if location tracking is allowed
   */
  public isLocationTrackingAllowed(): boolean {
    return !this.settings.locationTrackingOptOut;
  }

  /**
   * Checks if personalized ads are allowed
   */
  public arePersonalizedAdsAllowed(): boolean {
    return !this.settings.personalizedAdsOptOut;
  }

  /**
   * Checks if data minimization is enabled
   */
  public isDataMinimizationEnabled(): boolean {
    return this.settings.dataMinimization;
  }

  /**
   * Gets data retention period in days
   */
  public getDataRetentionPeriod(): number {
    return this.settings.dataRetentionPeriod;
  }

  /**
   * Requests data deletion (GDPR right to be forgotten)
   */
  public async requestDataDeletion(): Promise<void> {
    try {
      // Clear local data
      await this.clearLocalData();
      
      // In a real app, you would also send a request to the backend
      // to delete server-side data
      await this.requestServerDataDeletion();
      
      // Reset privacy settings to defaults
      this.settings = { ...this.defaultSettings };
      await this.saveSettings();
    } catch (error) {
      console.error('Failed to request data deletion:', error);
      throw error;
    }
  }

  /**
   * Exports user data (GDPR right to data portability)
   */
  public async exportUserData(): Promise<any> {
    try {
      // Collect all user data from local storage
      const userData = await this.collectLocalUserData();
      
      // In a real app, you would also request data from the backend
      const serverData = await this.requestServerUserData();
      
      return {
        localData: userData,
        serverData: serverData,
        privacySettings: this.settings,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Gets privacy policy compliance status
   */
  public getComplianceStatus(): {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    copaCompliant: boolean;
  } {
    return {
      gdprCompliant: this.isGDPRCompliant(),
      ccpaCompliant: this.isCCPACompliant(),
      copaCompliant: this.isCOPACompliant()
    };
  }

  /**
   * Applies privacy settings to various services
   */
  private async applyPrivacySettings(): Promise<void> {
    try {
      // Apply analytics settings
      if (this.settings.analyticsOptOut) {
        await this.disableAnalytics();
      } else {
        await this.enableAnalytics();
      }

      // Apply crash reporting settings
      if (this.settings.crashReportingOptOut) {
        await this.disableCrashReporting();
      } else {
        await this.enableCrashReporting();
      }

      // Apply location tracking settings
      if (this.settings.locationTrackingOptOut) {
        await this.disableLocationTracking();
      }

      // Apply data minimization settings
      if (this.settings.dataMinimization) {
        await this.enableDataMinimizationMode();
      }
    } catch (error) {
      console.error('Failed to apply privacy settings:', error);
    }
  }

  /**
   * Loads privacy settings from secure storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const encryptionService = DataEncryptionService.getInstance();
      const storedSettings = await encryptionService.decryptFromSecureStorage(this.STORAGE_KEY);
      
      if (storedSettings) {
        this.settings = { ...this.defaultSettings, ...storedSettings };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      throw error;
    }
  }

  /**
   * Saves privacy settings to secure storage
   */
  private async saveSettings(): Promise<void> {
    try {
      const encryptionService = DataEncryptionService.getInstance();
      await encryptionService.encryptForSecureStorage(this.STORAGE_KEY, this.settings);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      throw error;
    }
  }

  /**
   * Enables analytics tracking
   */
  private async enableAnalytics(): Promise<void> {
    // Implementation would depend on your analytics service
    console.log('Analytics enabled');
  }

  /**
   * Disables analytics tracking
   */
  private async disableAnalytics(): Promise<void> {
    // Implementation would depend on your analytics service
    console.log('Analytics disabled');
  }

  /**
   * Enables crash reporting
   */
  private async enableCrashReporting(): Promise<void> {
    // Implementation would depend on your crash reporting service
    console.log('Crash reporting enabled');
  }

  /**
   * Disables crash reporting
   */
  private async disableCrashReporting(): Promise<void> {
    // Implementation would depend on your crash reporting service
    console.log('Crash reporting disabled');
  }

  /**
   * Disables location tracking
   */
  private async disableLocationTracking(): Promise<void> {
    // Clear any stored location data
    console.log('Location tracking disabled');
  }

  /**
   * Enables data minimization mode
   */
  private async enableDataMinimizationMode(): Promise<void> {
    // Reduce data collection and storage
    console.log('Data minimization enabled');
  }

  /**
   * Clears all local user data
   */
  private async clearLocalData(): Promise<void> {
    try {
      // Clear all user-related data from local storage
      // This is a simplified implementation
      const keysToDelete = [
        'user_profile',
        'user_preferences',
        'cached_posts',
        'cached_messages',
        'offline_data'
      ];

      for (const key of keysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Key might not exist, continue
        }
      }
    } catch (error) {
      console.error('Failed to clear local data:', error);
      throw error;
    }
  }

  /**
   * Requests server-side data deletion
   */
  private async requestServerDataDeletion(): Promise<void> {
    try {
      // In a real app, make API call to request data deletion
      console.log('Server data deletion requested');
    } catch (error) {
      console.error('Failed to request server data deletion:', error);
      throw error;
    }
  }

  /**
   * Collects local user data for export
   */
  private async collectLocalUserData(): Promise<any> {
    try {
      // Collect all user data from local storage
      const userData: any = {};
      
      const dataKeys = [
        'user_profile',
        'user_preferences',
        'privacy_settings'
      ];

      for (const key of dataKeys) {
        try {
          const data = await SecureStore.getItemAsync(key);
          if (data) {
            userData[key] = JSON.parse(data);
          }
        } catch (error) {
          // Key might not exist or be encrypted
        }
      }

      return userData;
    } catch (error) {
      console.error('Failed to collect local user data:', error);
      throw error;
    }
  }

  /**
   * Requests user data from server
   */
  private async requestServerUserData(): Promise<any> {
    try {
      // In a real app, make API call to get user data
      return {};
    } catch (error) {
      console.error('Failed to request server user data:', error);
      throw error;
    }
  }

  /**
   * Checks GDPR compliance
   */
  private isGDPRCompliant(): boolean {
    // Basic GDPR compliance checks
    return true; // Simplified for this implementation
  }

  /**
   * Checks CCPA compliance
   */
  private isCCPACompliant(): boolean {
    // Basic CCPA compliance checks
    return true; // Simplified for this implementation
  }

  /**
   * Checks COPPA compliance
   */
  private isCOPACompliant(): boolean {
    // Basic COPPA compliance checks
    return true; // Simplified for this implementation
  }

  /**
   * Resets all privacy settings to defaults
   */
  public async resetToDefaults(): Promise<void> {
    try {
      this.settings = { ...this.defaultSettings };
      await this.saveSettings();
      await this.applyPrivacySettings();
    } catch (error) {
      console.error('Failed to reset privacy settings:', error);
      throw error;
    }
  }
}