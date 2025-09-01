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

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Expo Linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://localhost:8081/${path}`),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },
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
      getEnforcing: jest.fn((name) => {
        if (name === 'SourceCode') {
          return {
            scriptURL: 'http://localhost:8081/index.bundle',
          };
        }
        return null;
      }),
      get: jest.fn(() => null),
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

// Mock FastImage
jest.mock('react-native-fast-image', () => ({
  __esModule: true,
  default: 'FastImage',
  resizeMode: {
    contain: 'contain',
    cover: 'cover',
    stretch: 'stretch',
    center: 'center',
  },
}));

// Mock Vector Icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }: any) => {
    const MockScrollView = require('react-native').ScrollView;
    return MockScrollView;
  },
}));

// Mock Document Picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  types: {
    allFiles: '*/*',
    images: 'image/*',
    plainText: 'text/plain',
    audio: 'audio/*',
    pdf: 'application/pdf',
  },
}));

// Mock Image Crop Picker
jest.mock('react-native-image-crop-picker', () => ({
  openCamera: jest.fn(() => Promise.resolve({
    path: 'test-image-path',
    mime: 'image/jpeg',
    size: 1024,
  })),
  openPicker: jest.fn(() => Promise.resolve([{
    path: 'test-image-path',
    mime: 'image/jpeg',
    size: 1024,
  }])),
}));

// Mock Expo Local Authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
  },
}));

// Mock Expo Secure Store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => '2 hours ago'),
  format: jest.fn((date, formatStr) => '2024-01-01'),
}));

// Mock Expo runtime
jest.mock('expo/src/winter/runtime.native.ts', () => ({}));
jest.mock('expo/src/winter/ImportMetaRegistry.ts', () => ({}));
jest.mock('expo/src/utils/getBundleUrl.native.ts', () => ({}));

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Global test utilities
(global as any).__DEV__ = true;
(global as any).__ExpoImportMetaRegistry = {};

// Mock TurboModule system
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn((name) => {
    if (name === 'SourceCode') {
      return {
        scriptURL: 'http://localhost:8081/index.bundle',
      };
    }
    return null;
  }),
  get: jest.fn(() => null),
}));

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
