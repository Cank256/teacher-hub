import { DeviceSecurityService } from '../DeviceSecurityService';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import DeviceInfo from 'react-native-device-info';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

jest.mock('expo-local-authentication');
jest.mock('react-native-device-info');

describe('DeviceSecurityService', () => {
  let deviceSecurityService: DeviceSecurityService;
  let mockLocalAuthentication: jest.Mocked<typeof LocalAuthentication>;
  let mockDeviceInfo: jest.Mocked<typeof DeviceInfo>;

  beforeEach(() => {
    jest.clearAllMocks();
    deviceSecurityService = DeviceSecurityService.getInstance();
    mockLocalAuthentication = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
    mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>;
  });

  describe('checkDeviceIntegrity', () => {
    it('should return security status for iOS device', async () => {
      (Platform as any).OS = 'ios';
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1, 2]);
      mockDeviceInfo.isEmulator.mockResolvedValue(false);

      const status = await deviceSecurityService.checkDeviceIntegrity();

      expect(status).toEqual({
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: expect.any(Boolean),
        hasHookingFramework: false
      });
    });

    it('should return security status for Android device', async () => {
      (Platform as any).OS = 'android';
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
      mockDeviceInfo.isEmulator.mockResolvedValue(false);

      const status = await deviceSecurityService.checkDeviceIntegrity();

      expect(status).toEqual({
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: expect.any(Boolean),
        hasHookingFramework: false
      });
    });

    it('should detect emulator', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      mockDeviceInfo.isEmulator.mockResolvedValue(true);

      const status = await deviceSecurityService.checkDeviceIntegrity();

      expect(status.isEmulator).toBe(true);
      expect(status.hasScreenLock).toBe(false);
      expect(status.biometricsAvailable).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));
      mockLocalAuthentication.isEnrolledAsync.mockRejectedValue(new Error('Enrollment check failed'));
      mockDeviceInfo.isEmulator.mockRejectedValue(new Error('Emulator check failed'));

      const status = await deviceSecurityService.checkDeviceIntegrity();

      // Should return safe defaults when checks fail
      expect(status.hasScreenLock).toBe(false);
      expect(status.biometricsAvailable).toBe(false);
      expect(status.isEmulator).toBe(false);
    });
  });

  describe('getSecurityRecommendations', () => {
    it('should provide recommendations for compromised device', () => {
      const status = {
        isJailbroken: true,
        isRooted: false,
        hasScreenLock: false,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: true,
        hasHookingFramework: false
      };

      const recommendations = deviceSecurityService.getSecurityRecommendations(status);

      expect(recommendations).toContain('Device appears to be compromised. Some features may be limited for security.');
      expect(recommendations).toContain('Enable screen lock for enhanced security.');
      expect(recommendations).toContain('Disable debugging mode for production use.');
    });

    it('should provide minimal recommendations for secure device', () => {
      const status = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      const recommendations = deviceSecurityService.getSecurityRecommendations(status);

      expect(recommendations).toHaveLength(0);
    });

    it('should recommend biometrics when not available', () => {
      const status = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: false,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: false
      };

      const recommendations = deviceSecurityService.getSecurityRecommendations(status);

      expect(recommendations).toContain('Consider enabling biometric authentication if available.');
    });

    it('should warn about hooking framework', () => {
      const status = {
        isJailbroken: false,
        isRooted: false,
        hasScreenLock: true,
        biometricsAvailable: true,
        isEmulator: false,
        isDebuggingEnabled: false,
        hasHookingFramework: true
      };

      const recommendations = deviceSecurityService.getSecurityRecommendations(status);

      expect(recommendations).toContain('Hooking framework detected. App functionality may be compromised.');
    });
  });

  describe('caching', () => {
    it('should cache security status for 5 minutes', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
      mockDeviceInfo.isEmulator.mockResolvedValue(false);

      // First call
      const status1 = await deviceSecurityService.checkDeviceIntegrity();
      
      // Second call should use cached result
      const status2 = await deviceSecurityService.checkDeviceIntegrity();

      expect(status1).toEqual(status2);
      // Should only call the mocked functions once due to caching
      expect(mockLocalAuthentication.hasHardwareAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('platform-specific checks', () => {
    it('should not check for jailbreak on Android', async () => {
      (Platform as any).OS = 'android';
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
      mockDeviceInfo.isEmulator.mockResolvedValue(false);

      const status = await deviceSecurityService.checkDeviceIntegrity();

      expect(status.isJailbroken).toBe(false);
    });

    it('should not check for root on iOS', async () => {
      (Platform as any).OS = 'ios';
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
      mockDeviceInfo.isEmulator.mockResolvedValue(false);

      const status = await deviceSecurityService.checkDeviceIntegrity();

      expect(status.isRooted).toBe(false);
    });
  });
});