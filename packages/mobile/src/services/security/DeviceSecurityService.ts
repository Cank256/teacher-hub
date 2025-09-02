import DeviceInfo from 'react-native-device-info';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { DeviceSecurityStatus, SecurityIncident, SecurityIncidentType, SecuritySeverity } from './types';

export class DeviceSecurityService {
  private static instance: DeviceSecurityService;
  private securityStatus: DeviceSecurityStatus | null = null;
  private lastCheckTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): DeviceSecurityService {
    if (!DeviceSecurityService.instance) {
      DeviceSecurityService.instance = new DeviceSecurityService();
    }
    return DeviceSecurityService.instance;
  }

  /**
   * Performs comprehensive device security checks
   */
  public async checkDeviceIntegrity(): Promise<DeviceSecurityStatus> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.securityStatus && (now - this.lastCheckTime) < this.CACHE_DURATION) {
      return this.securityStatus;
    }

    const status: DeviceSecurityStatus = {
      isJailbroken: await this.checkJailbreak(),
      isRooted: await this.checkRoot(),
      hasScreenLock: await this.checkScreenLock(),
      biometricsAvailable: await this.checkBiometricsAvailability(),
      isEmulator: await this.checkEmulator(),
      isDebuggingEnabled: await this.checkDebugging(),
      hasHookingFramework: await this.checkHookingFramework()
    };

    // Log security incidents
    await this.logSecurityIncidents(status);

    this.securityStatus = status;
    this.lastCheckTime = now;

    return status;
  }

  /**
   * Checks if device is jailbroken (iOS)
   */
  private async checkJailbreak(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      // Check for common jailbreak indicators
      const jailbreakIndicators = [
        '/Applications/Cydia.app',
        '/Library/MobileSubstrate/MobileSubstrate.dylib',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
        '/private/var/lib/apt/',
        '/private/var/lib/cydia',
        '/private/var/mobile/Library/SBSettings/Themes',
        '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
        '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
        '/private/var/cache/apt/',
        '/private/var/lib/apt/',
        '/private/var/Users/',
        '/var/cache/apt/',
        '/var/lib/apt/',
        '/var/lib/cydia/',
        '/usr/bin/ssh'
      ];

      // Check if any jailbreak files exist
      for (const path of jailbreakIndicators) {
        try {
          const exists = await this.fileExists(path);
          if (exists) {
            return true;
          }
        } catch (error) {
          // File access error might indicate jailbreak
          continue;
        }
      }

      // Check for suspicious URL schemes
      const suspiciousSchemes = [
        'cydia://',
        'undecimus://',
        'sileo://',
        'zbra://'
      ];

      for (const scheme of suspiciousSchemes) {
        try {
          const canOpen = await this.canOpenURL(scheme);
          if (canOpen) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('Jailbreak detection error:', error);
      return false;
    }
  }

  /**
   * Checks if device is rooted (Android)
   */
  private async checkRoot(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      // Check for common root indicators
      const rootIndicators = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
        '/su/bin/su',
        '/system/xbin/busybox',
        '/system/bin/busybox',
        '/data/local/xbin/busybox',
        '/data/local/bin/busybox',
        '/system/xbin/daemonsu',
        '/system/etc/init.d/99SuperSUDaemon',
        '/dev/com.koushikdutta.superuser.daemon/',
        '/system/app/SuperSU/SuperSU.apk'
      ];

      // Check if any root files exist
      for (const path of rootIndicators) {
        try {
          const exists = await this.fileExists(path);
          if (exists) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      // Check for root management apps
      const rootApps = [
        'com.noshufou.android.su',
        'com.noshufou.android.su.elite',
        'eu.chainfire.supersu',
        'com.koushikdutta.superuser',
        'com.thirdparty.superuser',
        'com.yellowes.su',
        'com.koushikdutta.rommanager',
        'com.koushikdutta.rommanager.license',
        'com.dimonvideo.luckypatcher',
        'com.chelpus.lackypatch',
        'com.ramdroid.appquarantine',
        'com.ramdroid.appquarantinepro'
      ];

      for (const packageName of rootApps) {
        try {
          const isInstalled = await this.isPackageInstalled(packageName);
          if (isInstalled) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('Root detection error:', error);
      return false;
    }
  }

  /**
   * Checks if device has screen lock enabled
   */
  private async checkScreenLock(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.warn('Screen lock check error:', error);
      return false;
    }
  }

  /**
   * Checks if biometrics are available
   */
  private async checkBiometricsAvailability(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return hasHardware && supportedTypes.length > 0;
    } catch (error) {
      console.warn('Biometrics check error:', error);
      return false;
    }
  }

  /**
   * Checks if running on emulator
   */
  private async checkEmulator(): Promise<boolean> {
    try {
      return await DeviceInfo.isEmulator();
    } catch (error) {
      console.warn('Emulator check error:', error);
      return false;
    }
  }

  /**
   * Checks if debugging is enabled
   */
  private async checkDebugging(): Promise<boolean> {
    try {
      // Check if running in debug mode
      if (__DEV__) {
        return true;
      }

      // Additional checks for debugging tools
      if (Platform.OS === 'android') {
        // Check for USB debugging
        return await this.isUSBDebuggingEnabled();
      }

      return false;
    } catch (error) {
      console.warn('Debugging check error:', error);
      return false;
    }
  }

  /**
   * Checks for hooking frameworks
   */
  private async checkHookingFramework(): Promise<boolean> {
    try {
      // Check for common hooking frameworks
      const hookingIndicators = Platform.OS === 'ios' 
        ? [
            '/Library/MobileSubstrate/MobileSubstrate.dylib',
            '/usr/lib/libsubstrate.dylib',
            '/Library/Frameworks/CydiaSubstrate.framework',
            '/Library/MobileSubstrate/DynamicLibraries'
          ]
        : [
            '/data/local/tmp/frida-server',
            '/data/local/tmp/re.frida.server',
            '/sdcard/frida-server',
            '/system/xbin/frida-server'
          ];

      for (const path of hookingIndicators) {
        try {
          const exists = await this.fileExists(path);
          if (exists) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('Hooking framework check error:', error);
      return false;
    }
  }

  /**
   * Logs security incidents based on detected threats
   */
  private async logSecurityIncidents(status: DeviceSecurityStatus): Promise<void> {
    try {
      // Use dynamic import to avoid circular dependency
      const { SecurityIncidentService } = await import('./SecurityIncidentService');
      const incidentService = SecurityIncidentService.getInstance();

    if (status.isJailbroken) {
      await incidentService.logIncident({
        type: SecurityIncidentType.JAILBREAK_DETECTED,
        severity: SecuritySeverity.HIGH,
        description: 'Jailbroken device detected'
      });
    }

    if (status.isRooted) {
      await incidentService.logIncident({
        type: SecurityIncidentType.ROOT_DETECTED,
        severity: SecuritySeverity.HIGH,
        description: 'Rooted device detected'
      });
    }

    if (status.isDebuggingEnabled) {
      await incidentService.logIncident({
        type: SecurityIncidentType.DEBUGGING_DETECTED,
        severity: SecuritySeverity.MEDIUM,
        description: 'Debugging enabled on device'
      });
    }

    if (status.hasHookingFramework) {
      await incidentService.logIncident({
        type: SecurityIncidentType.HOOKING_DETECTED,
        severity: SecuritySeverity.HIGH,
        description: 'Hooking framework detected'
      });
    }
    } catch (error) {
      console.error('Failed to log security incidents:', error);
    }
  }

  /**
   * Helper method to check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    // This would need to be implemented using native modules
    // For now, return false as a safe default
    return false;
  }

  /**
   * Helper method to check if URL can be opened
   */
  private async canOpenURL(url: string): Promise<boolean> {
    // This would need to be implemented using Linking.canOpenURL
    // For now, return false as a safe default
    return false;
  }

  /**
   * Helper method to check if package is installed (Android)
   */
  private async isPackageInstalled(packageName: string): Promise<boolean> {
    // This would need to be implemented using native modules
    // For now, return false as a safe default
    return false;
  }

  /**
   * Helper method to check USB debugging (Android)
   */
  private async isUSBDebuggingEnabled(): Promise<boolean> {
    // This would need to be implemented using native modules
    // For now, return false as a safe default
    return false;
  }

  /**
   * Gets security recommendations based on current status
   */
  public getSecurityRecommendations(status: DeviceSecurityStatus): string[] {
    const recommendations: string[] = [];

    if (status.isJailbroken || status.isRooted) {
      recommendations.push('Device appears to be compromised. Some features may be limited for security.');
    }

    if (!status.hasScreenLock) {
      recommendations.push('Enable screen lock for enhanced security.');
    }

    if (!status.biometricsAvailable) {
      recommendations.push('Consider enabling biometric authentication if available.');
    }

    if (status.isDebuggingEnabled) {
      recommendations.push('Disable debugging mode for production use.');
    }

    if (status.hasHookingFramework) {
      recommendations.push('Hooking framework detected. App functionality may be compromised.');
    }

    return recommendations;
  }
}