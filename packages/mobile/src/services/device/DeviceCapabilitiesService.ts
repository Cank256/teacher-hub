/**
 * Device Capabilities Service
 * 
 * Handles device feature detection, capabilities checking,
 * and provides typed JavaScript facades for native modules.
 */

import DeviceInfo from 'react-native-device-info'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Notifications from 'expo-notifications'
import { Platform, Dimensions } from 'react-native'
import { 
  DeviceCapabilities, 
  DeviceFeatureAvailability,
  PermissionResult,
  FallbackOptions,
  NativeModuleError as NativeModuleErrorType
} from './types'

export class DeviceCapabilitiesService {
  private static instance: DeviceCapabilitiesService
  private capabilities: DeviceCapabilities | null = null
  
  public static getInstance(): DeviceCapabilitiesService {
    if (!DeviceCapabilitiesService.instance) {
      DeviceCapabilitiesService.instance = new DeviceCapabilitiesService()
    }
    return DeviceCapabilitiesService.instance
  }

  /**
   * Get comprehensive device capabilities
   */
  async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities
    }

    try {
      const [
        platform,
        version,
        model,
        manufacturer,
        hasNotch,
        screenDensity,
        isTablet,
        isEmulator,
        supportedFeatures
      ] = await Promise.all([
        this.getPlatform(),
        this.getSystemVersion(),
        this.getModel(),
        this.getManufacturer(),
        this.hasNotch(),
        this.getScreenDensity(),
        this.isTablet(),
        this.isEmulator(),
        this.getSupportedFeatures()
      ])

      const { width, height } = Dimensions.get('screen')

      this.capabilities = {
        platform,
        version,
        model,
        manufacturer,
        hasNotch,
        screenDensity,
        screenWidth: width,
        screenHeight: height,
        isTablet,
        isEmulator,
        supportedFeatures
      }

      return this.capabilities
    } catch (error) {
      console.error('Error getting device capabilities:', error)
      throw new Error('Failed to retrieve device capabilities')
    }
  }

  /**
   * Check if a specific feature is available
   */
  async isFeatureAvailable(feature: keyof DeviceFeatureAvailability): Promise<boolean> {
    try {
      const capabilities = await this.getDeviceCapabilities()
      return capabilities.supportedFeatures[feature]
    } catch (error) {
      console.error(`Error checking feature availability for ${feature}:`, error)
      return false
    }
  }

  /**
   * Get all supported features
   */
  async getSupportedFeatures(): Promise<DeviceFeatureAvailability> {
    try {
      const [
        camera,
        microphone,
        location,
        biometrics,
        notifications,
        backgroundRefresh,
        fileSystem
      ] = await Promise.all([
        this.isCameraAvailable(),
        this.isMicrophoneAvailable(),
        this.isLocationAvailable(),
        this.isBiometricsAvailable(),
        this.areNotificationsAvailable(),
        this.isBackgroundRefreshAvailable(),
        this.isFileSystemAvailable()
      ])

      return {
        camera,
        microphone,
        location,
        biometrics,
        notifications,
        backgroundRefresh,
        fileSystem
      }
    } catch (error) {
      console.error('Error getting supported features:', error)
      return {
        camera: false,
        microphone: false,
        location: false,
        biometrics: false,
        notifications: false,
        backgroundRefresh: false,
        fileSystem: false
      }
    }
  }

  /**
   * Check camera availability
   */
  async isCameraAvailable(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync()
      return status !== 'undetermined' || Platform.OS === 'ios'
    } catch (error) {
      return false
    }
  }

  /**
   * Check microphone availability
   */
  async isMicrophoneAvailable(): Promise<boolean> {
    try {
      // This is a simplified check - in a real app you might use a dedicated audio library
      return Platform.OS === 'ios' || Platform.OS === 'android'
    } catch (error) {
      return false
    }
  }

  /**
   * Check location services availability
   */
  async isLocationAvailable(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync()
    } catch (error) {
      return false
    }
  }

  /**
   * Check biometric authentication availability
   */
  async isBiometricsAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      return hasHardware && isEnrolled
    } catch (error) {
      return false
    }
  }

  /**
   * Check notifications availability
   */
  async areNotificationsAvailable(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync()
      return status === 'granted' || status === 'undetermined'
    } catch (error) {
      return false
    }
  }

  /**
   * Check background refresh availability
   */
  async isBackgroundRefreshAvailable(): Promise<boolean> {
    try {
      // This would need platform-specific implementation
      return Platform.OS === 'ios' || Platform.OS === 'android'
    } catch (error) {
      return false
    }
  }

  /**
   * Check file system access availability
   */
  async isFileSystemAvailable(): Promise<boolean> {
    try {
      // Basic file system is always available in React Native
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get device platform
   */
  private async getPlatform(): Promise<'ios' | 'android'> {
    return Platform.OS as 'ios' | 'android'
  }

  /**
   * Get system version
   */
  private async getSystemVersion(): Promise<string> {
    try {
      return await DeviceInfo.getSystemVersion()
    } catch (error) {
      return Platform.Version.toString()
    }
  }

  /**
   * Get device model
   */
  private async getModel(): Promise<string> {
    try {
      return await DeviceInfo.getModel()
    } catch (error) {
      return 'Unknown'
    }
  }

  /**
   * Get device manufacturer
   */
  private async getManufacturer(): Promise<string> {
    try {
      return await DeviceInfo.getManufacturer()
    } catch (error) {
      return Platform.OS === 'ios' ? 'Apple' : 'Unknown'
    }
  }

  /**
   * Check if device has notch
   */
  private async hasNotch(): Promise<boolean> {
    try {
      return await DeviceInfo.hasNotch()
    } catch (error) {
      return false
    }
  }

  /**
   * Get screen density
   */
  private async getScreenDensity(): Promise<number> {
    try {
      const { scale } = Dimensions.get('screen')
      return scale
    } catch (error) {
      return 1
    }
  }

  /**
   * Check if device is tablet
   */
  private async isTablet(): Promise<boolean> {
    try {
      return await DeviceInfo.isTablet()
    } catch (error) {
      // Fallback: check screen size
      const { width, height } = Dimensions.get('screen')
      const minDimension = Math.min(width, height)
      return minDimension >= 600 // Rough tablet threshold
    }
  }

  /**
   * Check if running on emulator
   */
  private async isEmulator(): Promise<boolean> {
    try {
      return await DeviceInfo.isEmulator()
    } catch (error) {
      return false
    }
  }

  /**
   * Get device memory information
   */
  async getMemoryInfo(): Promise<{ total: number; used: number; free: number }> {
    try {
      const totalMemory = await DeviceInfo.getTotalMemory()
      const usedMemory = await DeviceInfo.getUsedMemory()
      const freeMemory = totalMemory - usedMemory

      return {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory
      }
    } catch (error) {
      console.error('Error getting memory info:', error)
      return { total: 0, used: 0, free: 0 }
    }
  }

  /**
   * Get battery information
   */
  async getBatteryInfo(): Promise<{ level: number; isCharging: boolean }> {
    try {
      const [level, isCharging] = await Promise.all([
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.isBatteryCharging()
      ])

      return {
        level: level * 100, // Convert to percentage
        isCharging
      }
    } catch (error) {
      console.error('Error getting battery info:', error)
      return { level: 100, isCharging: false }
    }
  }

  /**
   * Check if device has sufficient resources for feature
   */
  async hasResourcesForFeature(feature: string): Promise<boolean> {
    try {
      const memoryInfo = await this.getMemoryInfo()
      const batteryInfo = await this.getBatteryInfo()
      const capabilities = await this.getDeviceCapabilities()

      // Define resource requirements for different features
      const requirements = {
        'camera': { minMemory: 512 * 1024 * 1024, minBattery: 10 }, // 512MB, 10%
        'video_recording': { minMemory: 1024 * 1024 * 1024, minBattery: 20 }, // 1GB, 20%
        'location_tracking': { minMemory: 256 * 1024 * 1024, minBattery: 15 }, // 256MB, 15%
        'background_sync': { minMemory: 128 * 1024 * 1024, minBattery: 5 }, // 128MB, 5%
      }

      const requirement = requirements[feature as keyof typeof requirements]
      if (!requirement) {
        return true // Unknown feature, assume it's supported
      }

      const hasMemory = memoryInfo.free >= requirement.minMemory
      const hasBattery = batteryInfo.level >= requirement.minBattery

      return hasMemory && hasBattery
    } catch (error) {
      console.error('Error checking resources for feature:', error)
      return true // Assume supported if we can't check
    }
  }

  /**
   * Handle graceful fallbacks when features are not available
   */
  async handleFeatureFallback(
    feature: string, 
    fallbackOptions: FallbackOptions = {}
  ): Promise<void> {
    const { showError = true, errorMessage, alternativeAction, retryAction } = fallbackOptions

    if (showError) {
      const message = errorMessage ?? `${feature} is not available on this device. Some features may be limited.`
      
      console.warn(`Feature fallback: ${feature}`, message)
      
      // In a real app, you might show a toast or modal
      // For now, just log the fallback
      if (alternativeAction) {
        alternativeAction()
      }
    }
  }

  /**
   * Create typed facade for native module
   */
  createNativeModuleFacade<T>(
    moduleName: string,
    methods: Record<string, (...args: any[]) => Promise<any>>
  ): T {
    const facade = {} as T

    for (const [methodName, implementation] of Object.entries(methods)) {
      (facade as any)[methodName] = async (...args: any[]) => {
        try {
          return await implementation(...args)
        } catch (error) {
          console.error(`Native module error in ${moduleName}.${methodName}:`, error)
          throw new NativeModuleError(
            `Native module ${moduleName} method ${methodName} failed`,
            { code: 'E_NATIVE_MODULE_ERROR', moduleName, methodName }
          )
        }
      }
    }

    return facade
  }
}

// Custom error class for native module errors
class NativeModuleError extends Error {
  code: string
  userInfo?: Record<string, any>

  constructor(message: string, userInfo?: Record<string, any>) {
    super(message)
    this.name = 'NativeModuleError'
    this.code = userInfo?.code || 'E_UNKNOWN'
    this.userInfo = userInfo
  }
}

export default DeviceCapabilitiesService.getInstance()