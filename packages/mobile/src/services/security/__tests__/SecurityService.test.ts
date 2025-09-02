import { SecurityService } from '../SecurityService';
import { DeviceSecurityService } from '../DeviceSecurityService';
import { DataEncryptionService } from '../DataEncryptionService';
import { AppLockService } from '../AppLockService';
import { SecurityIncidentType, SecuritySeverity } from '../types';

// Mock the services
jest.mock('../DeviceSecurityService');
jest.mock('../DataEncryptionService');
jest.mock('../AppLockService');
jest.mock('../CertificateValidationService');
jest.mock('../PrivacyControlsService');
jest.mock('../SecurityIncidentService');

describe('SecurityService', () => {
  let securityService: SecurityService;
  let mockDeviceSecurityService: jest.Mocked<DeviceSecurityService>;
  let mockDataEncryptionService: jest.Mocked<DataEncryptionService>;
  let mockAppLockService: jest.Mocked<AppLockService>;

  beforeEach(() => {
    jest.clearAllMocks();
    securityService = SecurityService.getInstance();
    
    mockDeviceSecurityService = DeviceSecurityService.getInstance() as jest.Mocked<DeviceSecurityService>;
    mockDataEncryptionService = DataEncryptionService.getInstance() as jest.Mocked<DataEncryptionService>;
    mockAppLockService = AppLockService.getInstance() as jest.Mocked<AppLockService>;
  });

  describe('initialization', () => {
    it('should initialize all security services', async () => {
      mockDataEncryptionService.initialize.mockResolvedValue();
      mockAppLockService.initialize.mockResolvedValue();
      
      await securityService.initialize();
      
      expect(mockDataEncryptionService.initialize).toHaveBeenCalled();
      expect(mockAppLockService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Initialization failed');
      mockDataEncryptionService.initialize.mockRejectedValue(error);
      
      await expect(securityService.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('security assessment', () => {
    it('should perform comprehensive security assessment', async () => {
      const mockDeviceStatus = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      mockDeviceSecurityService.checkDeviceIntegrity.mockResolvedValue(mockDeviceStatus);
      mockDeviceSecurityService.getSecurityRecommendations.mockReturnValue([]);

      await securityService.initialize();
      const assessment = await securityService.performSecurityAssessment();

      expect(assessment.deviceSecurity).toEqual(mockDeviceStatus);
      expect(assessment.riskLevel).toBe('low');
      expect(assessment.recommendations).toEqual([]);
    });

    it('should detect high risk when device is compromised', async () => {
      const mockDeviceStatus = {
        isJailbroken: true,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      mockDeviceSecurityService.checkDeviceIntegrity.mockResolvedValue(mockDeviceStatus);
      mockDeviceSecurityService.getSecurityRecommendations.mockReturnValue([
        'Device appears to be compromised. Some features may be limited for security.'
      ]);

      await securityService.initialize();
      const assessment = await securityService.performSecurityAssessment();

      expect(assessment.riskLevel).toBe('high');
      expect(assessment.recommendations).toContain(
        'Device appears to be compromised. Some features may be limited for security.'
      );
    });
  });

  describe('data encryption', () => {
    it('should encrypt and decrypt data', async () => {
      const testData = { username: 'testuser', password: 'testpass' };
      const encryptedData = 'encrypted_data_string';

      mockDataEncryptionService.encryptData.mockResolvedValue(encryptedData);
      mockDataEncryptionService.decryptData.mockResolvedValue(testData);

      await securityService.initialize();

      const encrypted = await securityService.encryptData(testData);
      expect(encrypted).toBe(encryptedData);

      const decrypted = await securityService.decryptData(encryptedData);
      expect(decrypted).toEqual(testData);
    });

    it('should handle encryption failure', async () => {
      const testData = { username: 'testuser' };
      const error = new Error('Encryption failed');
      
      mockDataEncryptionService.encryptData.mockRejectedValue(error);

      await securityService.initialize();

      await expect(securityService.encryptData(testData)).rejects.toThrow('Encryption failed');
    });
  });

  describe('app lock', () => {
    it('should enable app lock', async () => {
      const lockConfig = {
        enabled: true,
        biometricsEnabled: true,
        lockTimeout: 300000,
        maxFailedAttempts: 5,
        lockoutDuration: 1800000
      };

      mockAppLockService.enableAppLock.mockResolvedValue();

      await securityService.initialize();
      await securityService.enableAppLock(lockConfig);

      expect(mockAppLockService.enableAppLock).toHaveBeenCalledWith(lockConfig);
    });

    it('should disable app lock', async () => {
      mockAppLockService.disableAppLock.mockResolvedValue();

      await securityService.initialize();
      await securityService.disableAppLock();

      expect(mockAppLockService.disableAppLock).toHaveBeenCalled();
    });

    it('should check if app is locked', async () => {
      mockAppLockService.isAppLocked.mockReturnValue(true);

      await securityService.initialize();
      const isLocked = securityService.isAppLocked();

      expect(isLocked).toBe(true);
      expect(mockAppLockService.isAppLocked).toHaveBeenCalled();
    });

    it('should unlock app with biometrics', async () => {
      mockAppLockService.unlockApp.mockResolvedValue(true);

      await securityService.initialize();
      const unlocked = await securityService.unlockApp(true);

      expect(unlocked).toBe(true);
      expect(mockAppLockService.unlockApp).toHaveBeenCalledWith(true);
    });
  });

  describe('app integrity validation', () => {
    it('should validate app integrity on secure device', async () => {
      const mockDeviceStatus = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      mockDeviceSecurityService.checkDeviceIntegrity.mockResolvedValue(mockDeviceStatus);

      await securityService.initialize();
      const isValid = await securityService.validateAppIntegrity();

      expect(isValid).toBe(true);
    });

    it('should fail validation on compromised device', async () => {
      const mockDeviceStatus = {
        isJailbroken: true,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      mockDeviceSecurityService.checkDeviceIntegrity.mockResolvedValue(mockDeviceStatus);

      await securityService.initialize();
      const isValid = await securityService.validateAppIntegrity();

      expect(isValid).toBe(false);
    });

    it('should fail validation when hooking framework detected', async () => {
      const mockDeviceStatus = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: true
      };

      mockDeviceSecurityService.checkDeviceIntegrity.mockResolvedValue(mockDeviceStatus);

      await securityService.initialize();
      const isValid = await securityService.validateAppIntegrity();

      expect(isValid).toBe(false);
    });
  });

  describe('emergency lockdown', () => {
    it('should perform emergency lockdown', async () => {
      mockAppLockService.lockApp.mockImplementation(() => {});
      mockDataEncryptionService.wipeKeys.mockImplementation(() => {});

      await securityService.initialize();
      await securityService.emergencyLockdown();

      expect(mockAppLockService.lockApp).toHaveBeenCalled();
      expect(mockDataEncryptionService.wipeKeys).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      expect(() => securityService.isAppLocked()).toThrow('Security service not initialized');
    });

    it('should handle service failures gracefully', async () => {
      mockDeviceSecurityService.checkDeviceIntegrity.mockRejectedValue(new Error('Device check failed'));

      await securityService.initialize();
      
      await expect(securityService.performSecurityAssessment()).rejects.toThrow('Device check failed');
    });
  });

  describe('security configuration', () => {
    it('should get security configuration', async () => {
      await securityService.initialize();
      const config = securityService.getSecurityConfig();

      expect(config).toHaveProperty('deviceSecurityChecks');
      expect(config).toHaveProperty('certificatePinning');
      expect(config).toHaveProperty('appLock');
      expect(config).toHaveProperty('dataEncryption');
    });

    it('should update security configuration', async () => {
      const newConfig = {
        deviceSecurityChecks: false,
        appLock: {
          enabled: true,
          biometricsEnabled: true,
          lockTimeout: 600000,
          maxFailedAttempts: 3,
          lockoutDuration: 3600000
        }
      };

      mockAppLockService.updateConfig.mockResolvedValue();

      await securityService.initialize();
      await securityService.updateSecurityConfig(newConfig);

      expect(mockAppLockService.updateConfig).toHaveBeenCalledWith(newConfig.appLock);
    });
  });
});