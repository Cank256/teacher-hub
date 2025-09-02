/**
 * Security Testing Setup
 * 
 * This file sets up the testing environment for security-related tests,
 * including mocks for native modules and security-sensitive operations.
 */

// Type declarations for global extensions
declare global {
  var securityTestUtils: {
    createMockDeviceStatus: (overrides?: any) => any;
    createMockSecurityIncident: (overrides?: any) => any;
    createMockEncryptedData: (data?: any) => string;
    simulateCompromisedDevice: () => any;
    simulateSecureDevice: () => any;
    createMockCertificate: (overrides?: any) => any;
    waitForAsync: (ms?: number) => Promise<void>;
    generateRandomData: (size?: number) => string;
  };
  var SECURITY_TEST_CONSTANTS: {
    ENCRYPTION_KEY_LENGTH: number;
    SALT_LENGTH: number;
    IV_LENGTH: number;
    MAX_FAILED_ATTEMPTS: number;
    LOCKOUT_DURATION: number;
    LOCK_TIMEOUT: number;
    MAX_INCIDENTS: number;
    CACHE_DURATION: number;
  };
}

// Mock global objects first
(global as any).window = (global as any).window || {};
(global as any).navigator = (global as any).navigator || {};

import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options: any) => options.ios || options.default)
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active'
  },
  Linking: {
    canOpenURL: jest.fn(() => Promise.resolve(false))
  }
}));

// Mock Expo modules
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true }))
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve(undefined)),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve(undefined))
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
  digestStringAsync: jest.fn(() => Promise.resolve('mocked_hash')),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256'
  }
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('mock_device_id')),
  getSystemName: jest.fn(() => Promise.resolve('iOS')),
  getSystemVersion: jest.fn(() => Promise.resolve('15.0')),
  getVersion: jest.fn(() => Promise.resolve('1.0.0')),
  getBuildNumber: jest.fn(() => Promise.resolve('1')),
  getManufacturer: jest.fn(() => Promise.resolve('Apple')),
  getModel: jest.fn(() => Promise.resolve('iPhone')),
  isTablet: jest.fn(() => Promise.resolve(false)),
  isEmulator: jest.fn(() => Promise.resolve(false))
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(null),
    delete: jest.fn(),
    clearAll: jest.fn()
  }))
}));

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  log: jest.fn()
};

// Global test utilities for security testing
global.securityTestUtils = {
  /**
   * Creates a mock device security status
   */
  createMockDeviceStatus: (overrides = {}) => ({
    isJailbroken: false,
    isRooted: false,
    hasScreenLock: true,
    biometricsAvailable: true,
    isEmulator: false,
    isDebuggingEnabled: false,
    hasHookingFramework: false,
    ...overrides
  }),

  /**
   * Creates a mock security incident
   */
  createMockSecurityIncident: (overrides = {}) => ({
    id: 'test_incident_123',
    type: 'unauthorized_access_attempt',
    severity: 'medium',
    description: 'Test security incident',
    timestamp: new Date(),
    deviceInfo: {
      deviceId: 'test_device',
      platform: 'iOS',
      osVersion: '15.0',
      appVersion: '1.0.0',
      buildNumber: '1',
      manufacturer: 'Apple',
      model: 'iPhone',
      isTablet: false
    },
    ...overrides
  }),

  /**
   * Creates mock encrypted data
   */
  createMockEncryptedData: (data = {}) => {
    return JSON.stringify({
      salt: 'mock_salt_base64',
      iv: 'mock_iv_base64',
      data: btoa(JSON.stringify(data))
    });
  },

  /**
   * Simulates a compromised device
   */
  simulateCompromisedDevice: () => ({
    isJailbroken: true,
    isRooted: true,
    hasScreenLock: false,
    biometricsAvailable: false,
    isEmulator: true,
    isDebuggingEnabled: true,
    hasHookingFramework: true
  }),

  /**
   * Simulates a secure device
   */
  simulateSecureDevice: () => ({
    isJailbroken: false,
    isRooted: false,
    hasScreenLock: true,
    biometricsAvailable: true,
    isEmulator: false,
    isDebuggingEnabled: false,
    hasHookingFramework: false
  }),

  /**
   * Creates a mock certificate
   */
  createMockCertificate: (overrides = {}) => ({
    subject: 'CN=api.teacherhub.ug',
    issuer: 'CN=DigiCert Global Root CA',
    serialNumber: '123456789',
    fingerprint: 'ABCDEF1234567890',
    validFrom: new Date('2023-01-01'),
    validTo: new Date('2024-12-31'),
    ...overrides
  }),

  /**
   * Waits for async operations to complete
   */
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generates random test data
   */
  generateRandomData: (size = 100) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < size; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

// Security test constants
global.SECURITY_TEST_CONSTANTS = {
  ENCRYPTION_KEY_LENGTH: 32,
  SALT_LENGTH: 16,
  IV_LENGTH: 12,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  LOCK_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  MAX_INCIDENTS: 1000,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  global.console = originalConsole;
});

export { };