/**
 * Test setup for authentication services
 */

import { jest } from '@jest/globals'

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true))
}))

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3
  }
}))

jest.mock('expo-auth-session', () => ({
  useAutoDiscovery: jest.fn(() => ({
    authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
    tokenEndpoint: 'https://oauth2.googleapis.com/token'
  })),
  useAuthRequest: jest.fn(() => [
    { clientId: 'test-client-id' },
    null,
    jest.fn()
  ]),
  makeRedirectUri: jest.fn(() => 'teacher-hub://auth/google'),
  ResponseType: {
    IdToken: 'id_token'
  }
}))

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn()
}))

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((algorithm, data) => 
    Promise.resolve(`hashed-${data.replace(/[^a-zA-Z0-9]/g, '-')}`)
  ),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256'
  }
}))

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{
      name: 'test-document.pdf',
      uri: 'file://test-document.pdf',
      mimeType: 'application/pdf',
      size: 1024
    }]
  }))
}))

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchCameraAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{
      uri: 'file://test-photo.jpg',
      fileName: 'test-photo.jpg',
      fileSize: 2048
    }]
  })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{
      uri: 'file://test-image.jpg',
      fileName: 'test-image.jpg',
      fileSize: 1536
    }]
  })),
  MediaTypeOptions: {
    Images: 'Images'
  }
}))

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  default: {
    create: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    }))
  }
}))

// Mock storage services
jest.mock('@/services/storage', () => ({
  secureStorage: {
    setSecureItem: jest.fn(),
    getSecureItem: jest.fn(),
    removeSecureItem: jest.fn(),
    clearSecureStorage: jest.fn(),
    setAuthTokens: jest.fn(),
    getAuthTokens: jest.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
    clearAuthTokens: jest.fn(),
    setBiometricKey: jest.fn(),
    getBiometricKey: jest.fn(),
    setUserCredentials: jest.fn(),
    getUserCredentials: jest.fn(),
    isAvailable: jest.fn(() => Promise.resolve(true))
  },
  defaultStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setBool: jest.fn(),
    getBool: jest.fn(),
    clear: jest.fn()
  }
}))

// Test data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profilePicture: 'https://example.com/avatar.jpg',
  subjects: [{ id: 'math', name: 'Mathematics', code: 'MATH' }],
  gradeLevels: [{ id: 'grade-1', name: 'Grade 1', order: 1 }],
  schoolLocation: {
    id: 'kampala',
    name: 'Kampala',
    district: 'Kampala',
    region: 'Central'
  },
  yearsOfExperience: 5,
  verificationStatus: 'verified' as const,
  createdAt: new Date('2024-01-01'),
  lastActiveAt: new Date()
}

export const mockLoginCredentials = {
  email: 'test@example.com',
  password: 'password123',
  rememberMe: true
}

export const mockRegisterCredentials = {
  email: 'newuser@example.com',
  password: 'password123',
  firstName: 'Jane',
  lastName: 'Smith',
  subjects: ['math', 'science'],
  gradeLevels: ['grade-1', 'grade-2'],
  schoolLocation: 'kampala',
  yearsOfExperience: 3
}

export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
}

export const mockGoogleUser = {
  id: 'google-123',
  email: 'test@gmail.com',
  name: 'John Doe',
  givenName: 'John',
  familyName: 'Doe',
  photoUrl: 'https://lh3.googleusercontent.com/avatar.jpg'
}

export const mockCredentialDocument = {
  type: 'teaching_certificate' as const,
  fileName: 'certificate.pdf',
  fileUri: 'file://certificate.pdf',
  mimeType: 'application/pdf',
  size: 1024
}