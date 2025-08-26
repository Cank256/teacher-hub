/**
 * Authentication service types and interfaces
 */

import { User, VerificationStatus } from '@/types'

// Authentication credentials
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  subjects: string[]
  gradeLevels: string[]
  schoolLocation: string
  yearsOfExperience: number
}

// Authentication results
export interface AuthResult {
  success: boolean
  user?: User
  accessToken?: string
  refreshToken?: string
  error?: string
  requiresVerification?: boolean
}

export interface GoogleAuthResult {
  success: boolean
  idToken?: string
  accessToken?: string
  user?: GoogleUser
  error?: string
}

export interface GoogleUser {
  id: string
  email: string
  name: string
  givenName: string
  familyName: string
  photoUrl?: string
}

// Token management
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface TokenValidationResult {
  isValid: boolean
  expiresAt?: Date
  needsRefresh: boolean
}

// Biometric authentication
export interface BiometricAuthResult {
  success: boolean
  error?: string
  cancelled?: boolean
}

export interface BiometricCapabilities {
  isAvailable: boolean
  isEnrolled: boolean
  supportedTypes: BiometricType[]
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceId',
  IRIS = 'iris',
  VOICE = 'voice'
}

// Credential verification
export interface CredentialDocument {
  id?: string
  type: DocumentType
  fileName: string
  fileUri: string
  mimeType: string
  size: number
  uploadedAt?: Date
}

export enum DocumentType {
  TEACHING_CERTIFICATE = 'teaching_certificate',
  DEGREE_CERTIFICATE = 'degree_certificate',
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  OTHER = 'other'
}

export interface VerificationRequest {
  documents: CredentialDocument[]
  additionalInfo?: string
}

export interface VerificationResult {
  success: boolean
  status: VerificationStatus
  message?: string
  reviewDate?: Date | undefined
  rejectionReason?: string
}

// Authentication state
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  verificationStatus: VerificationStatus
  biometricsEnabled: boolean
  rememberMe: boolean
  lastLoginAt?: Date
}

// Authentication service interface
export interface AuthService {
  // Basic authentication
  login(credentials: LoginCredentials): Promise<AuthResult>
  register(credentials: RegisterCredentials): Promise<AuthResult>
  logout(): Promise<void>
  
  // Token management
  refreshToken(): Promise<string>
  validateToken(token: string): Promise<TokenValidationResult>
  
  // Google OAuth
  loginWithGoogle(): Promise<AuthResult>
  
  // Biometric authentication
  enableBiometrics(): Promise<boolean>
  disableBiometrics(): Promise<void>
  authenticateWithBiometrics(): Promise<BiometricAuthResult>
  getBiometricCapabilities(): Promise<BiometricCapabilities>
  
  // Credential verification
  uploadCredentials(request: VerificationRequest): Promise<VerificationResult>
  getVerificationStatus(): Promise<VerificationStatus>
  
  // State management
  getCurrentUser(): Promise<User | null>
  isAuthenticated(): Promise<boolean>
  
  // Password management
  requestPasswordReset(email: string): Promise<boolean>
  resetPassword(token: string, newPassword: string): Promise<boolean>
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>
}

// Authentication errors
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  BIOMETRIC_NOT_AVAILABLE = 'BIOMETRIC_NOT_AVAILABLE',
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',
  BIOMETRIC_CANCELLED = 'BIOMETRIC_CANCELLED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// Configuration
export interface AuthConfig {
  apiBaseUrl: string
  googleClientId: string
  tokenRefreshThreshold: number // minutes before expiry to refresh
  biometricPromptTitle: string
  maxLoginAttempts: number
  lockoutDuration: number // minutes
}