/**
 * Test Setup for Device Integration Services
 * 
 * Mock implementations and test utilities for device services testing.
 */

import { jest } from '@jest/globals'

// Mock React Native global environment
global.window = global.window || {}
global.navigator = global.navigator || {}

// Mock React Native modules that cause issues in test environment
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(),
  get: jest.fn()
}))

jest.mock('react-native/Libraries/Utilities/defineLazyObjectProperty', () => ({
  defineLazyObjectProperty: jest.fn()
}))

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All'
  }
}))

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn()
}))

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  copyAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn()
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5
  }
}))

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn()
}))

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn()
}))

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(),
  getModel: jest.fn(),
  getManufacturer: jest.fn(),
  hasNotch: jest.fn(),
  isTablet: jest.fn(),
  isEmulator: jest.fn(),
  getTotalMemory: jest.fn(),
  getUsedMemory: jest.fn(),
  getBatteryLevel: jest.fn(),
  isBatteryCharging: jest.fn()
}))

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0'
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812, scale: 3 }))
  },
  Alert: {
    alert: jest.fn()
  }
}))

// Test utilities
export const createMockCameraResult = (overrides = {}) => ({
  uri: 'file:///mock/image.jpg',
  type: 'image' as const,
  width: 1920,
  height: 1080,
  size: 1024 * 1024, // 1MB
  fileName: 'image.jpg',
  ...overrides
})

export const createMockLocationResult = (overrides = {}) => ({
  latitude: -0.3476,
  longitude: 32.5825,
  altitude: 1200,
  accuracy: 10,
  speed: 0,
  heading: 0,
  timestamp: Date.now(),
  ...overrides
})

export const createMockFileSystemInfo = (overrides = {}) => ({
  totalSpace: 64 * 1024 * 1024 * 1024, // 64GB
  freeSpace: 32 * 1024 * 1024 * 1024, // 32GB
  usedSpace: 32 * 1024 * 1024 * 1024, // 32GB
  appDataSize: 100 * 1024 * 1024, // 100MB
  cacheSize: 50 * 1024 * 1024, // 50MB
  documentsSize: 40 * 1024 * 1024, // 40MB
  tempSize: 10 * 1024 * 1024, // 10MB
  ...overrides
})

export const createMockDeviceCapabilities = (overrides = {}) => ({
  platform: 'ios' as const,
  version: '15.0',
  model: 'iPhone 13',
  manufacturer: 'Apple',
  hasNotch: true,
  screenDensity: 3,
  screenWidth: 375,
  screenHeight: 812,
  isTablet: false,
  isEmulator: false,
  supportedFeatures: {
    camera: true,
    microphone: true,
    location: true,
    biometrics: true,
    notifications: true,
    backgroundRefresh: true,
    fileSystem: true
  },
  ...overrides
})

export const createMockStorageInsights = (overrides = {}) => ({
  totalAppSize: 100 * 1024 * 1024, // 100MB
  breakdown: {
    userContent: 40 * 1024 * 1024, // 40MB
    cache: 30 * 1024 * 1024, // 30MB
    database: 15 * 1024 * 1024, // 15MB
    logs: 10 * 1024 * 1024, // 10MB
    temp: 5 * 1024 * 1024 // 5MB
  },
  recommendations: [
    {
      type: 'clear_cache' as const,
      description: 'Clear app cache to free up space',
      potentialSavings: 30 * 1024 * 1024
    }
  ],
  ...overrides
})

// Mock permission results
export const mockPermissionGranted = {
  granted: true,
  canAskAgain: true,
  status: 'granted' as const
}

export const mockPermissionDenied = {
  granted: false,
  canAskAgain: true,
  status: 'denied' as const
}

export const mockPermissionPermanentlyDenied = {
  granted: false,
  canAskAgain: false,
  status: 'denied' as const
}