/**
 * Test Setup for Sync Services
 */

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active'
  },
  Platform: {
    OS: 'ios'
  }
}))

// Mock React Native Community NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true
  }))
}))

// Mock React Native Background Job
jest.mock('react-native-background-job', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  on: jest.fn()
}))

// Mock Socket.IO Client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  }))
}))

// Mock React Native FS
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 1024 })),
  downloadFile: jest.fn(() => ({
    promise: Promise.resolve({ statusCode: 200 })
  }))
}))

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => 'mock-device-id')
}))

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error in tests unless needed
  error: jest.fn(),
  warn: jest.fn()
}

// Setup for tests
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  // Clean up any pending timers
  if (jest.isMockFunction(setTimeout)) {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  }
})