/**
 * Test Setup for Notification Services
 */

import { jest } from '@jest/globals';

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-push-token' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  openSettingsAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationDroppedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidNotificationPriority: {
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high',
    MAX: 'max',
  },
  AndroidImportance: {
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high',
    MAX: 'max',
  },
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));

// Mock Expo Task Manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock Expo Background Fetch
jest.mock('expo-background-fetch', () => ({
  getStatusAsync: jest.fn().mockResolvedValue('available'),
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchStatus: {
    Restricted: 'restricted',
    Denied: 'denied',
    Available: 'available',
  },
  BackgroundFetchResult: {
    NoData: 'noData',
    NewData: 'newData',
    Failed: 'failed',
  },
}));

// Mock Expo Device
jest.mock('expo-device', () => ({
  isDevice: true,
  osInternalBuildId: 'mock-device-id',
}));

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
      extra: {
        eas: {
          projectId: 'mock-project-id',
        },
      },
    },
    easConfig: {
      projectId: 'mock-project-id',
    },
  },
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'mock-project-id',
      },
    },
  },
  easConfig: {
    projectId: 'mock-project-id',
  },
}));

// Mock React Native
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    NativeModules: {
      ...RN.NativeModules,
      SourceCode: {
        scriptURL: 'mock-script-url',
      },
    },
  };
});

// Mock storage service
jest.mock('../../storage/storageService', () => ({
  storageService: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock API client
jest.mock('../../api/apiClient', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock sync service
jest.mock('../../sync/syncService', () => ({
  syncService: {
    syncPendingOperations: jest.fn().mockResolvedValue({ success: true }),
    syncOperation: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock government service
jest.mock('../../api/governmentService', () => ({
  governmentService: {
    subscribeToNotifications: jest.fn().mockResolvedValue(undefined),
    unsubscribeFromNotifications: jest.fn().mockResolvedValue(undefined),
    trackContentEvent: jest.fn().mockResolvedValue(undefined),
    markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
  },
}));

// Global test utilities
global.mockNotification = {
  request: {
    identifier: 'mock-notification-id',
    content: {
      title: 'Test Notification',
      body: 'Test notification body',
      data: {
        id: 'test-id',
        category: 'messages',
        type: 'direct_message',
      },
      categoryIdentifier: 'messages',
    },
  },
};

global.mockNotificationResponse = {
  notification: global.mockNotification,
  actionIdentifier: 'default',
};

// Helper functions
global.createMockNotificationData = (overrides = {}) => ({
  id: 'test-notification-id',
  category: 'messages',
  type: 'direct_message',
  title: 'Test Notification',
  body: 'Test notification body',
  priority: 'normal',
  timestamp: new Date().toISOString(),
  ...overrides,
});

global.createMockNotificationPreferences = (overrides = {}) => ({
  messages: { enabled: true, sound: true, vibration: true, showPreview: true, priority: 'high' },
  posts: { enabled: true, sound: false, vibration: true, showPreview: true, priority: 'normal' },
  communities: { enabled: true, sound: false, vibration: false, showPreview: true, priority: 'normal' },
  government: { enabled: true, sound: true, vibration: true, showPreview: true, priority: 'high' },
  system: { enabled: true, sound: false, vibration: false, showPreview: false, priority: 'low' },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    allowCritical: true,
    allowMessages: false,
  },
  globalSettings: {
    enabled: true,
    showBadges: true,
    groupSimilar: true,
    smartDelivery: true,
  },
  ...overrides,
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});