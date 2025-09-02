import DeviceInfo from 'react-native-device-info';
import { MMKV } from 'react-native-mmkv';
import { SecurityIncident, SecurityIncidentType, SecuritySeverity, DeviceInfo as DeviceInfoType } from './types';
import { DataEncryptionService } from './DataEncryptionService';

export class SecurityIncidentService {
  private static instance: SecurityIncidentService;
  private storage: MMKV;
  private deviceInfo: DeviceInfoType | null = null;
  private readonly MAX_INCIDENTS = 1000;
  private readonly STORAGE_KEY = 'security_incidents';

  public static getInstance(): SecurityIncidentService {
    if (!SecurityIncidentService.instance) {
      SecurityIncidentService.instance = new SecurityIncidentService();
    }
    return SecurityIncidentService.instance;
  }

  constructor() {
    this.storage = new MMKV({
      id: 'security_incidents',
      encryptionKey: 'security_incident_encryption_key'
    });
  }

  /**
   * Initializes the security incident service
   */
  public async initialize(): Promise<void> {
    try {
      await this.collectDeviceInfo();
    } catch (error) {
      console.error('Failed to initialize security incident service:', error);
    }
  }

  /**
   * Logs a security incident
   */
  public async logIncident(incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'deviceInfo'>): Promise<void> {
    try {
      const fullIncident: SecurityIncident = {
        id: this.generateIncidentId(),
        timestamp: new Date(),
        deviceInfo: await this.getDeviceInfo(),
        ...incident
      };

      await this.storeIncident(fullIncident);
      await this.handleIncidentResponse(fullIncident);
      
      // Clean up old incidents if we exceed the limit
      await this.cleanupOldIncidents();
      
      console.warn(`Security incident logged: ${incident.type} - ${incident.description}`);
    } catch (error) {
      console.error('Failed to log security incident:', error);
    }
  }

  /**
   * Gets all security incidents
   */
  public async getIncidents(
    filter?: {
      type?: SecurityIncidentType;
      severity?: SecuritySeverity;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SecurityIncident[]> {
    try {
      const incidents = await this.loadIncidents();
      
      if (!filter) {
        return incidents;
      }

      return incidents.filter(incident => {
        if (filter.type && incident.type !== filter.type) {
          return false;
        }
        if (filter.severity && incident.severity !== filter.severity) {
          return false;
        }
        if (filter.startDate && incident.timestamp < filter.startDate) {
          return false;
        }
        if (filter.endDate && incident.timestamp > filter.endDate) {
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Failed to get security incidents:', error);
      return [];
    }
  }

  /**
   * Gets incident statistics
   */
  public async getIncidentStatistics(): Promise<{
    total: number;
    byType: Record<SecurityIncidentType, number>;
    bySeverity: Record<SecuritySeverity, number>;
    last24Hours: number;
    lastWeek: number;
  }> {
    try {
      const incidents = await this.loadIncidents();
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: incidents.length,
        byType: {} as Record<SecurityIncidentType, number>,
        bySeverity: {} as Record<SecuritySeverity, number>,
        last24Hours: 0,
        lastWeek: 0
      };

      // Initialize counters
      Object.values(SecurityIncidentType).forEach(type => {
        stats.byType[type] = 0;
      });
      Object.values(SecuritySeverity).forEach(severity => {
        stats.bySeverity[severity] = 0;
      });

      // Count incidents
      incidents.forEach(incident => {
        stats.byType[incident.type]++;
        stats.bySeverity[incident.severity]++;
        
        if (incident.timestamp >= last24Hours) {
          stats.last24Hours++;
        }
        if (incident.timestamp >= lastWeek) {
          stats.lastWeek++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get incident statistics:', error);
      return {
        total: 0,
        byType: {} as Record<SecurityIncidentType, number>,
        bySeverity: {} as Record<SecuritySeverity, number>,
        last24Hours: 0,
        lastWeek: 0
      };
    }
  }

  /**
   * Exports security incidents for analysis
   */
  public async exportIncidents(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const incidents = await this.loadIncidents();
      
      if (format === 'csv') {
        return this.convertToCSV(incidents);
      }
      
      return JSON.stringify(incidents, null, 2);
    } catch (error) {
      console.error('Failed to export security incidents:', error);
      throw error;
    }
  }

  /**
   * Clears all security incidents
   */
  public async clearIncidents(): Promise<void> {
    try {
      this.storage.delete(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear security incidents:', error);
      throw error;
    }
  }

  /**
   * Handles incident response based on severity
   */
  private async handleIncidentResponse(incident: SecurityIncident): Promise<void> {
    try {
      switch (incident.severity) {
        case SecuritySeverity.CRITICAL:
          await this.handleCriticalIncident(incident);
          break;
        case SecuritySeverity.HIGH:
          await this.handleHighSeverityIncident(incident);
          break;
        case SecuritySeverity.MEDIUM:
          await this.handleMediumSeverityIncident(incident);
          break;
        case SecuritySeverity.LOW:
          await this.handleLowSeverityIncident(incident);
          break;
      }
    } catch (error) {
      console.error('Failed to handle incident response:', error);
    }
  }

  /**
   * Handles critical security incidents
   */
  private async handleCriticalIncident(incident: SecurityIncident): Promise<void> {
    // Immediate response for critical incidents
    console.error('CRITICAL SECURITY INCIDENT:', incident);
    
    // In a real app, you might:
    // - Lock the app immediately
    // - Send immediate alert to security team
    // - Disable sensitive features
    // - Force user logout
  }

  /**
   * Handles high severity incidents
   */
  private async handleHighSeverityIncident(incident: SecurityIncident): Promise<void> {
    console.warn('HIGH SEVERITY SECURITY INCIDENT:', incident);
    
    // In a real app, you might:
    // - Increase security monitoring
    // - Require additional authentication
    // - Limit app functionality
  }

  /**
   * Handles medium severity incidents
   */
  private async handleMediumSeverityIncident(incident: SecurityIncident): Promise<void> {
    console.warn('MEDIUM SEVERITY SECURITY INCIDENT:', incident);
    
    // In a real app, you might:
    // - Show security warning to user
    // - Enable additional logging
  }

  /**
   * Handles low severity incidents
   */
  private async handleLowSeverityIncident(incident: SecurityIncident): Promise<void> {
    console.info('LOW SEVERITY SECURITY INCIDENT:', incident);
    
    // In a real app, you might:
    // - Log for analysis
    // - No immediate action required
  }

  /**
   * Stores incident in encrypted storage
   */
  private async storeIncident(incident: SecurityIncident): Promise<void> {
    try {
      const incidents = await this.loadIncidents();
      incidents.push(incident);
      
      // Sort by timestamp (newest first)
      incidents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const encryptionService = DataEncryptionService.getInstance();
      const encryptedData = await encryptionService.encryptData(incidents);
      
      this.storage.set(this.STORAGE_KEY, encryptedData);
    } catch (error) {
      console.error('Failed to store security incident:', error);
      throw error;
    }
  }

  /**
   * Loads incidents from encrypted storage
   */
  private async loadIncidents(): Promise<SecurityIncident[]> {
    try {
      const encryptedData = this.storage.getString(this.STORAGE_KEY);
      if (!encryptedData) {
        return [];
      }
      
      const encryptionService = DataEncryptionService.getInstance();
      const incidents = await encryptionService.decryptData(encryptedData);
      
      // Convert timestamp strings back to Date objects
      return incidents.map((incident: any) => ({
        ...incident,
        timestamp: new Date(incident.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load security incidents:', error);
      return [];
    }
  }

  /**
   * Cleans up old incidents to maintain storage limits
   */
  private async cleanupOldIncidents(): Promise<void> {
    try {
      const incidents = await this.loadIncidents();
      
      if (incidents.length > this.MAX_INCIDENTS) {
        // Keep only the most recent incidents
        const recentIncidents = incidents.slice(0, this.MAX_INCIDENTS);
        
        const encryptionService = DataEncryptionService.getInstance();
        const encryptedData = await encryptionService.encryptData(recentIncidents);
        
        this.storage.set(this.STORAGE_KEY, encryptedData);
      }
    } catch (error) {
      console.error('Failed to cleanup old incidents:', error);
    }
  }

  /**
   * Collects device information
   */
  private async collectDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        deviceId: await DeviceInfo.getUniqueId(),
        platform: await DeviceInfo.getSystemName(),
        osVersion: await DeviceInfo.getSystemVersion(),
        appVersion: await DeviceInfo.getVersion(),
        buildNumber: await DeviceInfo.getBuildNumber(),
        manufacturer: await DeviceInfo.getManufacturer(),
        model: await DeviceInfo.getModel(),
        isTablet: await DeviceInfo.isTablet()
      };
    } catch (error) {
      console.error('Failed to collect device info:', error);
      this.deviceInfo = {
        deviceId: 'unknown',
        platform: 'unknown',
        osVersion: 'unknown',
        appVersion: 'unknown',
        buildNumber: 'unknown',
        manufacturer: 'unknown',
        model: 'unknown',
        isTablet: false
      };
    }
  }

  /**
   * Gets device information
   */
  private async getDeviceInfo(): Promise<DeviceInfoType> {
    if (!this.deviceInfo) {
      await this.collectDeviceInfo();
    }
    return this.deviceInfo!;
  }

  /**
   * Generates unique incident ID
   */
  private generateIncidentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `incident_${timestamp}_${random}`;
  }

  /**
   * Converts incidents to CSV format
   */
  private convertToCSV(incidents: SecurityIncident[]): string {
    const headers = [
      'ID',
      'Type',
      'Severity',
      'Description',
      'Timestamp',
      'Device ID',
      'Platform',
      'OS Version',
      'App Version',
      'User ID'
    ];

    const rows = incidents.map(incident => [
      incident.id,
      incident.type,
      incident.severity,
      incident.description,
      incident.timestamp.toISOString(),
      incident.deviceInfo.deviceId,
      incident.deviceInfo.platform,
      incident.deviceInfo.osVersion,
      incident.deviceInfo.appVersion,
      incident.userId || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Gets recent incidents for dashboard
   */
  public async getRecentIncidents(limit: number = 10): Promise<SecurityIncident[]> {
    try {
      const incidents = await this.loadIncidents();
      return incidents.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent incidents:', error);
      return [];
    }
  }

  /**
   * Checks if there are any critical incidents in the last hour
   */
  public async hasCriticalIncidentsInLastHour(): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const incidents = await this.getIncidents({
        severity: SecuritySeverity.CRITICAL,
        startDate: oneHourAgo
      });
      return incidents.length > 0;
    } catch (error) {
      console.error('Failed to check critical incidents:', error);
      return false;
    }
  }
}