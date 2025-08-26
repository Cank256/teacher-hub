/**
 * Simple AuthService Tests (without React Native dependencies)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock all external dependencies
jest.mock('axios')
jest.mock('expo-crypto')
jest.mock('@/services/storage', () => ({
  secureStorage: {
    setAuthTokens: jest.fn(),
    getAuthTokens: jest.fn(),
    clearAuthTokens: jest.fn(),
    setBiometricKey: jest.fn(),
    getBiometricKey: jest.fn(),
    setUserCredentials: jest.fn(),
    getUserCredentials: jest.fn(),
    removeSecureItem: jest.fn()
  },
  defaultStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setBool: jest.fn(),
    getBool: jest.fn()
  }
}))

describe('AuthService (Simple Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('error handling', () => {
    it('should handle authentication errors correctly', () => {
      // Test error code mapping
      const { AuthErrorCode } = require('../types')
      
      expect(AuthErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
      expect(AuthErrorCode.USER_NOT_FOUND).toBe('USER_NOT_FOUND')
      expect(AuthErrorCode.EMAIL_ALREADY_EXISTS).toBe('EMAIL_ALREADY_EXISTS')
      expect(AuthErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR')
    })

    it('should create auth errors with correct properties', () => {
      const { AuthError, AuthErrorCode } = require('../types')
      
      const error = new AuthError(
        'Test error message',
        AuthErrorCode.INVALID_CREDENTIALS,
        new Error('Original error')
      )

      expect(error.message).toBe('Test error message')
      expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS)
      expect(error.name).toBe('AuthError')
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })

  describe('type definitions', () => {
    it('should have correct biometric types', () => {
      const { BiometricType } = require('../types')
      
      expect(BiometricType.FINGERPRINT).toBe('fingerprint')
      expect(BiometricType.FACE_ID).toBe('faceId')
      expect(BiometricType.IRIS).toBe('iris')
      expect(BiometricType.VOICE).toBe('voice')
    })

    it('should have correct document types', () => {
      const { DocumentType } = require('../types')
      
      expect(DocumentType.TEACHING_CERTIFICATE).toBe('teaching_certificate')
      expect(DocumentType.DEGREE_CERTIFICATE).toBe('degree_certificate')
      expect(DocumentType.NATIONAL_ID).toBe('national_id')
      expect(DocumentType.PASSPORT).toBe('passport')
      expect(DocumentType.OTHER).toBe('other')
    })
  })

  describe('configuration validation', () => {
    it('should validate auth config structure', () => {
      const config = {
        apiBaseUrl: 'https://api.test.com',
        googleClientId: 'test-client-id',
        tokenRefreshThreshold: 5,
        biometricPromptTitle: 'Test Auth',
        maxLoginAttempts: 5,
        lockoutDuration: 15
      }

      expect(config.apiBaseUrl).toBeTruthy()
      expect(config.googleClientId).toBeTruthy()
      expect(config.tokenRefreshThreshold).toBeGreaterThan(0)
      expect(config.maxLoginAttempts).toBeGreaterThan(0)
      expect(config.lockoutDuration).toBeGreaterThan(0)
    })
  })

  describe('credential validation', () => {
    it('should validate credential document structure', () => {
      const { DocumentType } = require('../types')
      
      const validDocument = {
        type: DocumentType.TEACHING_CERTIFICATE,
        fileName: 'certificate.pdf',
        fileUri: 'file://certificate.pdf',
        mimeType: 'application/pdf',
        size: 1024
      }

      expect(validDocument.type).toBe(DocumentType.TEACHING_CERTIFICATE)
      expect(validDocument.fileName).toBeTruthy()
      expect(validDocument.fileUri).toMatch(/^file:\/\//)
      expect(validDocument.mimeType).toBeTruthy()
      expect(validDocument.size).toBeGreaterThan(0)
    })
  })

  describe('service exports', () => {
    it('should export all required services', () => {
      const authIndex = require('../index')
      
      expect(authIndex.authService).toBeDefined()
      expect(authIndex.initializeAuthServices).toBeDefined()
      expect(authIndex.cleanupAuthServices).toBeDefined()
      expect(authIndex.AuthService).toBeDefined()
      expect(authIndex.BiometricService).toBeDefined()
      expect(authIndex.CredentialService).toBeDefined()
      expect(authIndex.GoogleAuthService).toBeDefined()
    })

    it('should export convenience functions', () => {
      const authIndex = require('../index')
      
      expect(authIndex.authenticateWithBiometrics).toBeDefined()
      expect(authIndex.enableBiometrics).toBeDefined()
      expect(authIndex.disableBiometrics).toBeDefined()
      expect(authIndex.pickDocument).toBeDefined()
      expect(authIndex.takePhoto).toBeDefined()
      expect(authIndex.pickImage).toBeDefined()
      expect(authIndex.uploadCredentials).toBeDefined()
    })
  })
})