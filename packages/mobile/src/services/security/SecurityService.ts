import { DeviceSecurityService } from './DeviceSecurityService';
import { DataEncryptionService } from './DataEncryptionService';
import { AppLockService } from './AppLockService';
import { CertificateValidationService } from './CertificateValidationService';
import { PrivacyControlsService } from './PrivacyControlsService';
import { SecurityIncidentService } from './SecurityIncidentService';
import { 
  SecurityConfig, 
  DeviceSecurityStatus, 
  AppLockConfig, 
  PrivacySettings,
  SecurityIncidentType,
  SecuritySeverity
} from './types';

export class SecurityService {
  private static instance: SecurityService;
  private isInitialized: boolean = false;
  private config: SecurityConfig;

  private deviceSecurityService: DeviceSecurityService;
  private dataEncryptionService: DataEncryptionService;
  private appLockService: AppLockService;
  private certificateValidationService: CertificateValidationService;
  private privacyControlsService: PrivacyControlsService;
  private securityIncidentService: SecurityIncidentService;

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  constructor() {
    this.deviceSecurityService = DeviceSecurityService.getInstance();
    this.dataEncryptionService = DataEncryptionService.getInstance();
    this.appLockService = AppLockService.getInstance();
    this.certificateValidationService = CertificateValidationService.getInstance();
    this.privacyControlsService = PrivacyControlsService.getInstance();
    this.securityIncidentService = SecurityIncidentService.getInstance();

    this.config = {
      deviceSecurityChecks: true,
      certificatePinning: true,
      appLock: {
        enabled: false,
        biometricsEnabled: false,
        lockTimeout: 5 * 60 * 1000,
        maxFailedAttempts: 5,
        lockoutDuration: 30 * 60 * 1000
      },
      dataEncryption: {
        algorithm: 'AES-256-GCM',
        keySize: 256,
        iterations: 10000,
        saltLength: 16
      },
      incidentLogging: true,
      privacyControls: {
        dataMinimization: true,
        analyticsOptOut: false,
        crashReportingOptOut: false,
        locationTrackingOptOut: false,
        personalizedAdsOptOut: true,
        dataRetentionPeriod: 365
      }
    };
  }

  /**
   * Initializes all security services
   */
  public async initialize(config?: Partial<SecurityConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize all security services
      await Promise.all([
        this.dataEncryptionService.initialize(),
        this.appLockService.initialize(),
        this.certificateValidationService.initialize(),
        this.privacyControlsService.initialize(),
        this.securityIncidentService.initialize()
      ]);

      // Perform initial security checks
      await this.performInitialSecurityChecks();

      this.isInitialized = true;
      console.log('Security services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security services:', error);
      
      await this.securityIncidentService.logIncident({
        type: SecurityIncidentType.UNAUTHORIZED_ACCESS_ATTEMPT,
        severity: SecuritySeverity.HIGH,
        description: 'Security service initialization failed'
      });
      
      throw error;
    }
  }

  /**
   * Performs comprehensive security assessment
   */
  public async performSecurityAssessment(): Promise<{
    deviceSecurity: DeviceSecurityStatus;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const deviceSecurity = await this.deviceSecurityService.checkDeviceIntegrity();
      const recommendations = this.deviceSecurityService.getSecurityRecommendations(deviceSecurity);
      const riskLevel = this.calculateRiskLevel(deviceSecurity);

      return {
        deviceSecurity,
        recommendations,
        riskLevel
      };
    } catch (error) {
      console.error('Security assessment failed:', error);
      throw error;
    }
  }

  /**
   * Encrypts sensitive data
   */
  public async encryptData(data: any): Promise<string> {
    this.ensureInitialized();
    return await this.dataEncryptionService.encryptData(data);
  }

  /**
   * Decrypts sensitive data
   */
  public async decryptData(encryptedData: string): Promise<any> {
    this.ensureInitialized();
    return await this.dataEncryptionService.decryptData(encryptedData);
  }

  /**
   * Enables app lock with biometric authentication
   */
  public async enableAppLock(config?: Partial<AppLockConfig>): Promise<void> {
    this.ensureInitialized();
    await this.appLockService.enableAppLock(config || this.config.appLock);
  }

  /**
   * Disables app lock
   */
  public async disableAppLock(): Promise<void> {
    this.ensureInitialized();
    await this.appLockService.disableAppLock();
  }

  /**
   * Checks if app is locked
   */
  public isAppLocked(): boolean {
    this.ensureInitialized();
    return this.appLockService.isAppLocked();
  }

  /**
   * Unlocks the app
   */
  public async unlockApp(useBiometrics: boolean = true): Promise<boolean> {
    this.ensureInitialized();
    return await this.appLockService.unlockApp(useBiometrics);
  }

  /**
   * Validates SSL certificate
   */
  public async validateCertificate(hostname: string, certificate: any): Promise<boolean> {
    this.ensureInitialized();
    return await this.certificateValidationService.validateCertificate(hostname, certificate);
  }

  /**
   * Gets privacy settings
   */
  public getPrivacySettings(): PrivacySettings {
    this.ensureInitialized();
    return this.privacyControlsService.getSettings();
  }

  /**
   * Updates privacy settings
   */
  public async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.ensureInitialized();
    await this.privacyControlsService.updateSettings(settings);
  }

  /**
   * Logs a security incident
   */
  public async logSecurityIncident(
    type: SecurityIncidentType,
    severity: SecuritySeverity,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.securityIncidentService.logIncident({
      type,
      severity,
      description,
      metadata
    });
  }

  /**
   * Gets security incident statistics
   */
  public async getSecurityStatistics(): Promise<any> {
    this.ensureInitialized();
    return await this.securityIncidentService.getIncidentStatistics();
  }

  /**
   * Performs emergency security lockdown
   */
  public async emergencyLockdown(): Promise<void> {
    try {
      // Lock the app immediately
      this.appLockService.lockApp();

      // Log the emergency lockdown
      await this.securityIncidentService.logIncident({
        type: SecurityIncidentType.UNAUTHORIZED_ACCESS_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        description: 'Emergency security lockdown activated'
      });

      // Clear sensitive data from memory
      this.dataEncryptionService.wipeKeys();

      console.warn('Emergency security lockdown activated');
    } catch (error) {
      console.error('Emergency lockdown failed:', error);
    }
  }

  /**
   * Validates app integrity
   */
  public async validateAppIntegrity(): Promise<boolean> {
    try {
      const deviceSecurity = await this.deviceSecurityService.checkDeviceIntegrity();
      
      // Check for critical security issues
      if (deviceSecurity.isJailbroken || deviceSecurity.isRooted) {
        await this.logSecurityIncident(
          SecurityIncidentType.UNAUTHORIZED_ACCESS_ATTEMPT,
          SecuritySeverity.CRITICAL,
          'Compromised device detected'
        );
        return false;
      }

      if (deviceSecurity.hasHookingFramework) {
        await this.logSecurityIncident(
          SecurityIncidentType.HOOKING_DETECTED,
          SecuritySeverity.HIGH,
          'Hooking framework detected'
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('App integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Gets security configuration
   */
  public getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Updates security configuration
   */
  public async updateSecurityConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      
      // Apply configuration changes
      if (newConfig.appLock) {
        await this.appLockService.updateConfig(newConfig.appLock);
      }
      
      if (newConfig.privacyControls) {
        await this.privacyControlsService.updateSettings(newConfig.privacyControls);
      }
    } catch (error) {
      console.error('Failed to update security config:', error);
      throw error;
    }
  }

  /**
   * Performs initial security checks
   */
  private async performInitialSecurityChecks(): Promise<void> {
    try {
      if (this.config.deviceSecurityChecks) {
        const deviceSecurity = await this.deviceSecurityService.checkDeviceIntegrity();
        
        if (deviceSecurity.isJailbroken || deviceSecurity.isRooted) {
          console.warn('Device security compromised');
        }
      }

      // Check for critical incidents in the last hour
      const hasCriticalIncidents = await this.securityIncidentService.hasCriticalIncidentsInLastHour();
      if (hasCriticalIncidents) {
        console.warn('Critical security incidents detected in the last hour');
      }
    } catch (error) {
      console.error('Initial security checks failed:', error);
    }
  }

  /**
   * Calculates overall risk level based on device security status
   */
  private calculateRiskLevel(deviceSecurity: DeviceSecurityStatus): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    if (deviceSecurity.isJailbroken || deviceSecurity.isRooted) {
      riskScore += 40;
    }
    if (deviceSecurity.hasHookingFramework) {
      riskScore += 30;
    }
    if (deviceSecurity.isDebuggingEnabled) {
      riskScore += 20;
    }
    if (!deviceSecurity.hasScreenLock) {
      riskScore += 15;
    }
    if (deviceSecurity.isEmulator) {
      riskScore += 10;
    }

    if (riskScore >= 70) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  /**
   * Ensures security service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Security service not initialized. Call initialize() first.');
    }
  }

  /**
   * Resets all security services
   */
  public async reset(): Promise<void> {
    try {
      await Promise.all([
        this.appLockService.reset(),
        this.securityIncidentService.clearIncidents(),
        this.privacyControlsService.resetToDefaults()
      ]);

      this.dataEncryptionService.wipeKeys();
      this.isInitialized = false;
      
      console.log('Security services reset successfully');
    } catch (error) {
      console.error('Failed to reset security services:', error);
      throw error;
    }
  }

  /**
   * Gets security health status
   */
  public async getSecurityHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const assessment = await this.performSecurityAssessment();
      const stats = await this.getSecurityStatistics();
      
      const issues: string[] = [];
      const recommendations: string[] = [...assessment.recommendations];
      
      if (assessment.deviceSecurity.isJailbroken || assessment.deviceSecurity.isRooted) {
        issues.push('Device is compromised (jailbroken/rooted)');
      }
      
      if (stats.last24Hours > 10) {
        issues.push('High number of security incidents in last 24 hours');
      }
      
      if (!this.appLockService.isAppLocked() && this.config.appLock.enabled) {
        issues.push('App lock is not active');
      }

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (assessment.riskLevel === 'critical' || issues.length > 2) {
        status = 'critical';
      } else if (assessment.riskLevel === 'high' || issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, recommendations };
    } catch (error) {
      console.error('Failed to get security health:', error);
      return {
        status: 'critical',
        issues: ['Failed to assess security health'],
        recommendations: ['Restart the application and try again']
      };
    }
  }
}