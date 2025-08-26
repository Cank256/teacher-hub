import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo', () => ({
  __esModule: true,
  default: {},
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    NativeModules: {
      ...RN.NativeModules,
      RNCNetInfo: {
        getCurrentState: jest.fn(() => Promise.resolve({
          isConnected: true,
          type: 'wifi',
          isInternetReachable: true
        })),
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
      SourceCode: {
        scriptURL: 'http://localhost:8081/index.bundle',
      },
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => ({
        SourceCode: {
          scriptURL: 'http://localhost:8081/index.bundle',
        },
      })),
    },
  };
});

// Mock NativeModules
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  UIManager: {
    RCTView: () => {},
  },
  PlatformConstants: {
    OS: 'ios',
  },
  RNCNetInfo: {
    getCurrentState: jest.fn(() => Promise.resolve({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    })),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  SourceCode: {
    scriptURL: 'http://localhost:8081/index.bundle',
  },
}));

// Mock device info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true
  })),
}));

// Global test utilities
(global as any).__DEV__ = true;

// Silence console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
