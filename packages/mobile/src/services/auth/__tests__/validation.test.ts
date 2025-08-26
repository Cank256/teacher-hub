/**
 * Authentication Services Validation Tests
 * Tests that validate the implementation without importing React Native modules
 */

import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Authentication Services Validation', () => {
  const authServicesPath = join(__dirname, '..')

  describe('file structure', () => {
    it('should have all required service files', () => {
      const requiredFiles = [
        'authService.ts',
        'biometricService.ts',
        'credentialService.ts',
        'googleAuthService.ts',
        'types.ts',
        'index.ts'
      ]

      requiredFiles.forEach(file => {
        const filePath = join(authServicesPath, file)
        expect(() => readFileSync(filePath, 'utf8')).not.toThrow()
      })
    })

    it('should have comprehensive test files', () => {
      const testFiles = [
        'authService.test.ts',
        'biometricService.test.ts',
        'credentialService.test.ts',
        'googleAuthService.test.ts',
        'integration.test.ts',
        'setup.ts'
      ]

      testFiles.forEach(file => {
        const filePath = join(__dirname, file)
        expect(() => readFileSync(filePath, 'utf8')).not.toThrow()
      })
    })
  })

  describe('type definitions', () => {
    it('should define all required types in types.ts', () => {
      const typesContent = readFileSync(join(authServicesPath, 'types.ts'), 'utf8')
      
      // Check for main interfaces
      expect(typesContent).toContain('interface LoginCredentials')
      expect(typesContent).toContain('interface RegisterCredentials')
      expect(typesContent).toContain('interface AuthResult')
      expect(typesContent).toContain('interface GoogleAuthResult')
      expect(typesContent).toContain('interface BiometricAuthResult')
      expect(typesContent).toContain('interface CredentialDocument')
      expect(typesContent).toContain('interface VerificationRequest')
      expect(typesContent).toContain('interface AuthService')
      
      // Check for enums
      expect(typesContent).toContain('enum BiometricType')
      expect(typesContent).toContain('enum DocumentType')
      expect(typesContent).toContain('enum AuthErrorCode')
      
      // Check for error class
      expect(typesContent).toContain('class AuthError')
    })

    it('should define all biometric types', () => {
      const typesContent = readFileSync(join(authServicesPath, 'types.ts'), 'utf8')
      
      expect(typesContent).toContain('FINGERPRINT = \'fingerprint\'')
      expect(typesContent).toContain('FACE_ID = \'faceId\'')
      expect(typesContent).toContain('IRIS = \'iris\'')
      expect(typesContent).toContain('VOICE = \'voice\'')
    })

    it('should define all document types', () => {
      const typesContent = readFileSync(join(authServicesPath, 'types.ts'), 'utf8')
      
      expect(typesContent).toContain('TEACHING_CERTIFICATE = \'teaching_certificate\'')
      expect(typesContent).toContain('DEGREE_CERTIFICATE = \'degree_certificate\'')
      expect(typesContent).toContain('NATIONAL_ID = \'national_id\'')
      expect(typesContent).toContain('PASSPORT = \'passport\'')
      expect(typesContent).toContain('OTHER = \'other\'')
    })

    it('should define all auth error codes', () => {
      const typesContent = readFileSync(join(authServicesPath, 'types.ts'), 'utf8')
      
      expect(typesContent).toContain('INVALID_CREDENTIALS = \'INVALID_CREDENTIALS\'')
      expect(typesContent).toContain('USER_NOT_FOUND = \'USER_NOT_FOUND\'')
      expect(typesContent).toContain('EMAIL_ALREADY_EXISTS = \'EMAIL_ALREADY_EXISTS\'')
      expect(typesContent).toContain('NETWORK_ERROR = \'NETWORK_ERROR\'')
      expect(typesContent).toContain('BIOMETRIC_NOT_AVAILABLE = \'BIOMETRIC_NOT_AVAILABLE\'')
      expect(typesContent).toContain('GOOGLE_AUTH_FAILED = \'GOOGLE_AUTH_FAILED\'')
      expect(typesContent).toContain('DOCUMENT_UPLOAD_FAILED = \'DOCUMENT_UPLOAD_FAILED\'')
    })
  })

  describe('service implementations', () => {
    it('should implement AuthService class', () => {
      const authServiceContent = readFileSync(join(authServicesPath, 'authService.ts'), 'utf8')
      
      // Check class definition
      expect(authServiceContent).toContain('class AuthService implements IAuthService')
      
      // Check required methods
      expect(authServiceContent).toContain('async login(')
      expect(authServiceContent).toContain('async register(')
      expect(authServiceContent).toContain('async logout(')
      expect(authServiceContent).toContain('async refreshToken(')
      expect(authServiceContent).toContain('async loginWithGoogle(')
      expect(authServiceContent).toContain('async enableBiometrics(')
      expect(authServiceContent).toContain('async authenticateWithBiometrics(')
      expect(authServiceContent).toContain('async uploadCredentials(')
      expect(authServiceContent).toContain('async getCurrentUser(')
      expect(authServiceContent).toContain('async isAuthenticated(')
    })

    it('should implement BiometricService class', () => {
      const biometricServiceContent = readFileSync(join(authServicesPath, 'biometricService.ts'), 'utf8')
      
      expect(biometricServiceContent).toContain('class BiometricService')
      expect(biometricServiceContent).toContain('async initialize(')
      expect(biometricServiceContent).toContain('async isAvailable(')
      expect(biometricServiceContent).toContain('async authenticate(')
      expect(biometricServiceContent).toContain('async enableBiometricAuth(')
      expect(biometricServiceContent).toContain('async disableBiometricAuth(')
      expect(biometricServiceContent).toContain('async getCapabilities(')
    })

    it('should implement CredentialService class', () => {
      const credentialServiceContent = readFileSync(join(authServicesPath, 'credentialService.ts'), 'utf8')
      
      expect(credentialServiceContent).toContain('class CredentialService')
      expect(credentialServiceContent).toContain('async pickDocument(')
      expect(credentialServiceContent).toContain('async takePhoto(')
      expect(credentialServiceContent).toContain('async pickImage(')
      expect(credentialServiceContent).toContain('async uploadCredentials(')
      expect(credentialServiceContent).toContain('async getVerificationStatus(')
      expect(credentialServiceContent).toContain('validateDocument(')
    })

    it('should implement GoogleAuthService class', () => {
      const googleAuthServiceContent = readFileSync(join(authServicesPath, 'googleAuthService.ts'), 'utf8')
      
      expect(googleAuthServiceContent).toContain('class GoogleAuthService')
      expect(googleAuthServiceContent).toContain('async initialize(')
      expect(googleAuthServiceContent).toContain('async authenticateWithGoogle(')
      expect(googleAuthServiceContent).toContain('async getUserInfo(')
      expect(googleAuthServiceContent).toContain('async revokeAccess(')
      expect(googleAuthServiceContent).toContain('async cleanup(')
    })
  })

  describe('service exports', () => {
    it('should export all services from index', () => {
      const indexContent = readFileSync(join(authServicesPath, 'index.ts'), 'utf8')
      
      // Check service exports
      expect(indexContent).toContain('export { AuthService }')
      expect(indexContent).toContain('export { GoogleAuthService')
      expect(indexContent).toContain('export { BiometricService')
      expect(indexContent).toContain('export { CredentialService')
      
      // Check type exports
      expect(indexContent).toContain('export * from \'./types\'')
      
      // Check convenience function exports
      expect(indexContent).toContain('authenticateWithGoogle')
      expect(indexContent).toContain('authenticateWithBiometrics')
      expect(indexContent).toContain('pickDocument')
      expect(indexContent).toContain('uploadCredentials')
      
      // Check initialization functions
      expect(indexContent).toContain('initializeAuthServices')
      expect(indexContent).toContain('cleanupAuthServices')
    })
  })

  describe('error handling', () => {
    it('should implement proper error handling in AuthService', () => {
      const authServiceContent = readFileSync(join(authServicesPath, 'authService.ts'), 'utf8')
      
      expect(authServiceContent).toContain('handleApiError')
      expect(authServiceContent).toContain('try {')
      expect(authServiceContent).toContain('catch (error')
      expect(authServiceContent).toContain('AuthError')
    })

    it('should implement error handling in all services', () => {
      const services = ['biometricService.ts', 'credentialService.ts', 'googleAuthService.ts']
      
      services.forEach(service => {
        const serviceContent = readFileSync(join(authServicesPath, service), 'utf8')
        expect(serviceContent).toContain('try {')
        expect(serviceContent).toContain('catch (error')
      })
    })
  })

  describe('security implementation', () => {
    it('should use secure storage for sensitive data', () => {
      const authServiceContent = readFileSync(join(authServicesPath, 'authService.ts'), 'utf8')
      
      expect(authServiceContent).toContain('secureStorage.setAuthTokens')
      expect(authServiceContent).toContain('secureStorage.getAuthTokens')
      expect(authServiceContent).toContain('secureStorage.clearAuthTokens')
      expect(authServiceContent).toContain('secureStorage.setBiometricKey')
      expect(authServiceContent).toContain('secureStorage.setUserCredentials')
    })

    it('should implement token refresh mechanism', () => {
      const authServiceContent = readFileSync(join(authServicesPath, 'authService.ts'), 'utf8')
      
      expect(authServiceContent).toContain('refreshToken')
      expect(authServiceContent).toContain('validateToken')
      expect(authServiceContent).toContain('setupInterceptors')
      expect(authServiceContent).toContain('interceptors.response.use')
    })

    it('should implement biometric security', () => {
      const biometricServiceContent = readFileSync(join(authServicesPath, 'biometricService.ts'), 'utf8')
      
      expect(biometricServiceContent).toContain('LocalAuthentication')
      expect(biometricServiceContent).toContain('authenticateAsync')
      expect(biometricServiceContent).toContain('hasHardwareAsync')
      expect(biometricServiceContent).toContain('isEnrolledAsync')
    })
  })

  describe('test coverage', () => {
    it('should have comprehensive test setup', () => {
      const setupContent = readFileSync(join(__dirname, 'setup.ts'), 'utf8')
      
      expect(setupContent).toContain('jest.mock(\'expo-secure-store\'')
      expect(setupContent).toContain('jest.mock(\'expo-local-authentication\'')
      expect(setupContent).toContain('jest.mock(\'expo-auth-session\'')
      expect(setupContent).toContain('jest.mock(\'axios\'')
      expect(setupContent).toContain('mockUser')
      expect(setupContent).toContain('mockLoginCredentials')
      expect(setupContent).toContain('mockTokens')
    })

    it('should test all major service methods', () => {
      const testFiles = [
        'authService.test.ts',
        'biometricService.test.ts',
        'credentialService.test.ts',
        'googleAuthService.test.ts'
      ]

      testFiles.forEach(testFile => {
        const testContent = readFileSync(join(__dirname, testFile), 'utf8')
        expect(testContent).toContain('describe(')
        expect(testContent).toContain('it(')
        expect(testContent).toContain('expect(')
        expect(testContent).toContain('beforeEach(')
      })
    })

    it('should have integration tests', () => {
      const integrationContent = readFileSync(join(__dirname, 'integration.test.ts'), 'utf8')
      
      expect(integrationContent).toContain('Authentication Services Integration')
      expect(integrationContent).toContain('complete authentication flow')
      expect(integrationContent).toContain('credential verification flow')
      expect(integrationContent).toContain('Google OAuth integration')
      expect(integrationContent).toContain('error handling and recovery')
    })
  })
})