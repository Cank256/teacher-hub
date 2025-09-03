/**
 * Feature Flags Service
 * Provides runtime feature toggles and kill switches for risky features
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Feature flag storage
const featureFlagsStorage = new MMKV({
  id: 'feature-flags',
  encryptionKey: 'feature-flags-encryption-key'
});

// Remote config storage
const remoteConfigStorage = new MMKV({
  id: 'remote-config',
  encryptionKey: 'remote-config-encryption-key'
});

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  platforms?: ('ios' | 'android')[];
  minAppVersion?: string;
  maxAppVersion?: string;
  userSegments?: string[];
  killSwitch?: boolean;
  description?: string;
}

export interface RemoteConfig {
  featureFlags: Record<string, FeatureFlag>;
  killSwitches: Record<string, boolean>;
  lastUpdated: number;
  version: string;
}

class FeatureFlagsService {
  private static instance: FeatureFlagsService;
  private remoteConfig: RemoteConfig | null = null;
  private userId: string | null = null;
  private userSegments: string[] = [];

  // Default feature flags (fallback when remote config fails)
  private defaultFlags: Record<string, FeatureFlag> = {
    // Authentication features
    biometric_auth: {
      key: 'biometric_auth',
      enabled: true,
      platforms: ['ios', 'android'],
      description: 'Enable biometric authentication (Face ID, Touch ID, Fingerprint)'
    },
    google_oauth: {
      key: 'google_oauth',
      enabled: true,
      description: 'Enable Google OAuth login'
    },
    
    // Core features
    offline_sync: {
      key: 'offline_sync',
      enabled: true,
      description: 'Enable offline synchronization'
    },
    real_time_messaging: {
      key: 'real_time_messaging',
      enabled: true,
      description: 'Enable real-time messaging with WebSockets'
    },
    push_notifications: {
      key: 'push_notifications',
      enabled: true,
      description: 'Enable push notifications'
    },
    
    // New/experimental features
    ai_content_suggestions: {
      key: 'ai_content_suggestions',
      enabled: false,
      rolloutPercentage: 10,
      description: 'AI-powered content suggestions (experimental)'
    },
    video_calling: {
      key: 'video_calling',
      enabled: false,
      rolloutPercentage: 0,
      description: 'Video calling feature (in development)'
    },
    advanced_analytics: {
      key: 'advanced_analytics',
      enabled: false,
      rolloutPercentage: 25,
      description: 'Advanced analytics and insights'
    },
    
    // Performance features
    image_optimization: {
      key: 'image_optimization',
      enabled: true,
      description: 'Enable advanced image optimization'
    },
    lazy_loading: {
      key: 'lazy_loading',
      enabled: true,
      description: 'Enable lazy loading for lists and images'
    },
    
    // Kill switches for risky features
    file_upload: {
      key: 'file_upload',
      enabled: true,
      killSwitch: true,
      description: 'File upload functionality'
    },
    external_links: {
      key: 'external_links',
      enabled: true,
      killSwitch: true,
      description: 'External link navigation'
    },
    location_services: {
      key: 'location_services',
      enabled: true,
      killSwitch: true,
      description: 'Location-based services'
    }
  };

  private constructor() {
    this.loadRemoteConfig();
  }

  public static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService();
    }
    return FeatureFlagsService.instance;
  }

  /**
   * Initialize the service with user context
   */
  public initialize(userId: string, userSegments: string[] = []): void {
    this.userId = userId;
    this.userSegments = userSegments;
    this.loadRemoteConfig();
  }

  /**
   * Check if a feature is enabled
   */
  public isEnabled(flagKey: string): boolean {
    try {
      // Check for kill switch first
      if (this.isKillSwitchActive(flagKey)) {
        return false;
      }

      const flag = this.getFlag(flagKey);
      if (!flag) {
        return false;
      }

      // Check platform compatibility
      if (flag.platforms && !flag.platforms.includes(Platform.OS as 'ios' | 'android')) {
        return false;
      }

      // Check app version compatibility
      if (!this.isVersionCompatible(flag)) {
        return false;
      }

      // Check user segment targeting
      if (flag.userSegments && !this.isUserInSegment(flag.userSegments)) {
        return false;
      }

      // Check rollout percentage
      if (flag.rolloutPercentage !== undefined) {
        return this.isUserInRollout(flagKey, flag.rolloutPercentage);
      }

      return flag.enabled;
    } catch (error) {
      console.error(`Error checking feature flag ${flagKey}:`, error);
      return false;
    }
  }

  /**
   * Get feature flag configuration
   */
  public getFlag(flagKey: string): FeatureFlag | null {
    // Try remote config first
    if (this.remoteConfig?.featureFlags[flagKey]) {
      return this.remoteConfig.featureFlags[flagKey];
    }

    // Fall back to default flags
    return this.defaultFlags[flagKey] || null;
  }

  /**
   * Get all feature flags
   */
  public getAllFlags(): Record<string, FeatureFlag> {
    const remoteFlags = this.remoteConfig?.featureFlags || {};
    return { ...this.defaultFlags, ...remoteFlags };
  }

  /**
   * Check if kill switch is active
   */
  public isKillSwitchActive(flagKey: string): boolean {
    // Check remote kill switches first
    if (this.remoteConfig?.killSwitches[flagKey] === true) {
      return true;
    }

    // Check flag-level kill switch
    const flag = this.getFlag(flagKey);
    return flag?.killSwitch === true && flag?.enabled === false;
  }

  /**
   * Activate kill switch for a feature
   */
  public activateKillSwitch(flagKey: string): void {
    try {
      const currentConfig = this.remoteConfig || {
        featureFlags: {},
        killSwitches: {},
        lastUpdated: Date.now(),
        version: '1.0.0'
      };

      currentConfig.killSwitches[flagKey] = true;
      currentConfig.lastUpdated = Date.now();

      remoteConfigStorage.set('config', JSON.stringify(currentConfig));
      this.remoteConfig = currentConfig;

      console.log(`Kill switch activated for feature: ${flagKey}`);
    } catch (error) {
      console.error(`Error activating kill switch for ${flagKey}:`, error);
    }
  }

  /**
   * Deactivate kill switch for a feature
   */
  public deactivateKillSwitch(flagKey: string): void {
    try {
      if (this.remoteConfig?.killSwitches[flagKey]) {
        delete this.remoteConfig.killSwitches[flagKey];
        this.remoteConfig.lastUpdated = Date.now();

        remoteConfigStorage.set('config', JSON.stringify(this.remoteConfig));
        console.log(`Kill switch deactivated for feature: ${flagKey}`);
      }
    } catch (error) {
      console.error(`Error deactivating kill switch for ${flagKey}:`, error);
    }
  }

  /**
   * Update feature flags from remote config
   */
  public async updateFromRemote(configUrl?: string): Promise<void> {
    try {
      const url = configUrl || `${process.env.EXPO_PUBLIC_API_URL}/config/feature-flags`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `TeacherHub-Mobile/${DeviceInfo.getVersion()}`,
          'X-Platform': Platform.OS,
          'X-App-Version': DeviceInfo.getVersion(),
          'X-User-ID': this.userId || 'anonymous'
        }
      });

      if (response.ok) {
        const remoteConfig: RemoteConfig = await response.json();
        
        // Validate remote config
        if (this.validateRemoteConfig(remoteConfig)) {
          this.remoteConfig = remoteConfig;
          remoteConfigStorage.set('config', JSON.stringify(remoteConfig));
          console.log('Feature flags updated from remote config');
        }
      }
    } catch (error) {
      console.error('Error updating feature flags from remote:', error);
    }
  }

  /**
   * Load cached remote config
   */
  private loadRemoteConfig(): void {
    try {
      const cachedConfig = remoteConfigStorage.getString('config');
      if (cachedConfig) {
        this.remoteConfig = JSON.parse(cachedConfig);
      }
    } catch (error) {
      console.error('Error loading cached remote config:', error);
    }
  }

  /**
   * Check if user is in rollout percentage
   */
  private isUserInRollout(flagKey: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Use consistent hash based on user ID and flag key
    const hashInput = `${this.userId || 'anonymous'}-${flagKey}`;
    const hash = this.simpleHash(hashInput);
    const userPercentile = hash % 100;

    return userPercentile < percentage;
  }

  /**
   * Check if user is in target segment
   */
  private isUserInSegment(targetSegments: string[]): boolean {
    return targetSegments.some(segment => this.userSegments.includes(segment));
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(flag: FeatureFlag): boolean {
    const currentVersion = DeviceInfo.getVersion();

    if (flag.minAppVersion && this.compareVersions(currentVersion, flag.minAppVersion) < 0) {
      return false;
    }

    if (flag.maxAppVersion && this.compareVersions(currentVersion, flag.maxAppVersion) > 0) {
      return false;
    }

    return true;
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }

  /**
   * Validate remote config structure
   */
  private validateRemoteConfig(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      config.featureFlags &&
      typeof config.featureFlags === 'object' &&
      config.killSwitches &&
      typeof config.killSwitches === 'object' &&
      typeof config.lastUpdated === 'number' &&
      typeof config.version === 'string'
    );
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      userId: this.userId,
      userSegments: this.userSegments,
      platform: Platform.OS,
      appVersion: DeviceInfo.getVersion(),
      remoteConfigVersion: this.remoteConfig?.version,
      remoteConfigLastUpdated: this.remoteConfig?.lastUpdated,
      activeFlags: Object.keys(this.getAllFlags()).filter(key => this.isEnabled(key)),
      activeKillSwitches: Object.keys(this.remoteConfig?.killSwitches || {}).filter(
        key => this.remoteConfig?.killSwitches[key]
      )
    };
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagsService.getInstance();

// Export hook for React components
export const useFeatureFlag = (flagKey: string): boolean => {
  return featureFlags.isEnabled(flagKey);
};

// Export utility functions
export const withFeatureFlag = <T extends {}>(
  flagKey: string,
  Component: React.ComponentType<T>
): React.ComponentType<T> => {
  return (props: T) => {
    const isEnabled = useFeatureFlag(flagKey);
    return isEnabled ? <Component {...props} /> : null;
  };
};

export default featureFlags;