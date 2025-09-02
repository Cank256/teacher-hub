export interface DeviceSecurityStatus {
  isJailbroken: boolean;
  isRooted: boolean;
  hasScreenLock: boolean;
  biometricsAvailable: boolean;
  isEmulator: boolean;
  isDebuggingEnabled: boolean;
  hasHookingFramework: boolean;
}

export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  description: string;
  timestamp: Date;
  deviceInfo: DeviceInfo;
  userId?: string;
  metadata?: Record<string, any>;
}

export enum SecurityIncidentType {
  JAILBREAK_DETECTED = 'jailbreak_detected',
  ROOT_DETECTED = 'root_detected',
  DEBUGGING_DETECTED = 'debugging_detected',
  HOOKING_DETECTED = 'hooking_detected',
  CERTIFICATE_PINNING_FAILED = 'certificate_pinning_failed',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  DATA_TAMPERING_DETECTED = 'data_tampering_detected',
  SUSPICIOUS_NETWORK_ACTIVITY = 'suspicious_network_activity'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  manufacturer: string;
  model: string;
  isTablet: boolean;
}

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  iterations: number;
  saltLength: number;
}

export interface AppLockConfig {
  enabled: boolean;
  biometricsEnabled: boolean;
  lockTimeout: number; // in milliseconds
  maxFailedAttempts: number;
  lockoutDuration: number; // in milliseconds
}

export interface PrivacySettings {
  dataMinimization: boolean;
  analyticsOptOut: boolean;
  crashReportingOptOut: boolean;
  locationTrackingOptOut: boolean;
  personalizedAdsOptOut: boolean;
  dataRetentionPeriod: number; // in days
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: Date;
  validTo: Date;
}

export interface SecurityConfig {
  deviceSecurityChecks: boolean;
  certificatePinning: boolean;
  appLock: AppLockConfig;
  dataEncryption: EncryptionConfig;
  incidentLogging: boolean;
  privacyControls: PrivacySettings;
}