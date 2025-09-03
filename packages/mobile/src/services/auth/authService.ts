/**
 * Authentication Service
 * Handles login, registration, token management, and biometric authentication
 */

import axios, { AxiosInstance } from 'axios'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Crypto from 'expo-crypto'
import { secureStorage } from '@/services/storage'
import { defaultStorage } from '@/services/storage'
import { User, VerificationStatus } from '@/types'
import {
    AuthService as IAuthService,
    LoginCredentials,
    RegisterCredentials,
    AuthResult,
    TokenPair,
    TokenValidationResult,
    BiometricAuthResult,
    BiometricCapabilities,
    BiometricType,
    VerificationRequest,
    VerificationResult,
    AuthError,
    AuthErrorCode,
    AuthConfig
} from './types'

class AuthService implements IAuthService {
    private apiClient: AxiosInstance
    private config: AuthConfig
    private currentUser: User | null = null
    private isInitialized = false

    constructor(config: AuthConfig) {
        this.config = config
        this.apiClient = axios.create({
            baseURL: config.apiBaseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        this.setupInterceptors()
    }

    /**
     * Initialize the authentication service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return

        try {
            console.log('Initializing AuthService...')
            
            // Check if user is already authenticated (offline-first approach)
            try {
                const tokens = await secureStorage.getAuthTokens()
                console.log('Retrieved tokens from secure storage:', !!tokens.accessToken)
                
                if (tokens.accessToken) {
                    try {
                        // Try to validate token with server
                        const isValid = await this.validateToken(tokens.accessToken)
                        if (isValid.isValid) {
                            this.currentUser = await this.fetchCurrentUser()
                            console.log('User authenticated with valid token')
                        } else if (tokens.refreshToken) {
                            try {
                                await this.refreshToken()
                                this.currentUser = await this.fetchCurrentUser()
                                console.log('User authenticated with refreshed token')
                            } catch (error) {
                                console.warn('Token refresh failed, clearing auth data:', error)
                                await this.clearAuthData()
                            }
                        }
                    } catch (networkError) {
                        console.warn('Network error during token validation, assuming offline mode:', networkError)
                        // In offline mode, we can't validate tokens but we can assume they're valid
                        // This allows the app to work offline with cached credentials
                    }
                }
            } catch (storageError) {
                console.warn('Storage error during auth initialization:', storageError)
                // Continue initialization even if storage fails
            }

            this.isInitialized = true
            console.log('AuthService initialization completed')
        } catch (error) {
            console.error('Critical error during auth service initialization:', error)
            // Mark as initialized anyway to prevent blocking the app
            this.isInitialized = true
            // Don't throw - allow app to continue
        }
    }

    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials): Promise<AuthResult> {
        try {
            const response = await this.apiClient.post('/auth/login', {
                email: credentials.email,
                password: credentials.password
            })

            const { user, accessToken, refreshToken } = response.data.data

            // Store tokens securely
            await secureStorage.setAuthTokens(accessToken, refreshToken)

            // Store remember me preference
            if (credentials.rememberMe) {
                await defaultStorage.setBool('remember_me', true)
                // Store encrypted credentials for biometric login
                const encryptedPassword = await this.encryptPassword(credentials.password)
                await secureStorage.setUserCredentials(credentials.email, encryptedPassword)
            }

            // Update current user
            this.currentUser = user
            await defaultStorage.setItem('last_login_at', new Date().toISOString())

            return {
                success: true,
                user,
                accessToken,
                refreshToken
            }
        } catch (error: any) {
            const authError = this.handleApiError(error)
            return {
                success: false,
                error: authError.message
            }
        }
    }

    /**
     * Register new user
     */
    async register(credentials: RegisterCredentials): Promise<AuthResult> {
        try {
            const response = await this.apiClient.post('/auth/register', credentials)
            const { user, accessToken, refreshToken, requiresVerification } = response.data.data

            // Store tokens securely
            await secureStorage.setAuthTokens(accessToken, refreshToken)

            // Update current user
            this.currentUser = user

            return {
                success: true,
                user,
                accessToken,
                refreshToken,
                requiresVerification
            }
        } catch (error: any) {
            const authError = this.handleApiError(error)
            return {
                success: false,
                error: authError.message
            }
        }
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            // Call logout endpoint if authenticated
            if (this.currentUser) {
                await this.apiClient.post('/auth/logout')
            }
        } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error)
        } finally {
            await this.clearAuthData()
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(): Promise<string> {
        try {
            const tokens = await secureStorage.getAuthTokens()
            if (!tokens.refreshToken) {
                throw new AuthError('No refresh token available', AuthErrorCode.TOKEN_EXPIRED)
            }

            const response = await this.apiClient.post('/auth/refresh', {
                refreshToken: tokens.refreshToken
            })

            const { accessToken, refreshToken: newRefreshToken } = response.data.data

            // Store new tokens
            await secureStorage.setAuthTokens(accessToken, newRefreshToken)

            return accessToken
        } catch (error: any) {
            await this.clearAuthData()
            throw this.handleApiError(error)
        }
    }

    /**
     * Validate token
     */
    async validateToken(token: string): Promise<TokenValidationResult> {
        try {
            const response = await this.apiClient.post('/auth/validate', { token })
            const { isValid, expiresAt } = response.data.data

            const expiryDate = new Date(expiresAt)
            const now = new Date()
            const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60)

            return {
                isValid,
                expiresAt: expiryDate,
                needsRefresh: minutesUntilExpiry < this.config.tokenRefreshThreshold
            }
        } catch (error) {
            return {
                isValid: false,
                needsRefresh: true
            }
        }
    }

    /**
     * Login with Google OAuth
     */
    async loginWithGoogle(): Promise<AuthResult> {
        try {
            const googleAuthService = await import('./googleAuthService')
            const googleResult = await googleAuthService.authenticateWithGoogle()

            if (!googleResult.success || !googleResult.idToken) {
                return {
                    success: false,
                    error: 'Google authentication failed'
                }
            }

            // Send Google token to backend
            const response = await this.apiClient.post('/auth/google', {
                idToken: googleResult.idToken,
                accessToken: googleResult.accessToken
            })

            const { user, accessToken, refreshToken, requiresVerification } = response.data.data

            // Store tokens securely
            await secureStorage.setAuthTokens(accessToken, refreshToken)

            // Update current user
            this.currentUser = user

            return {
                success: true,
                user,
                accessToken,
                refreshToken,
                requiresVerification
            }
        } catch (error: any) {
            const authError = this.handleApiError(error)
            return {
                success: false,
                error: authError.message
            }
        }
    }

    /**
     * Enable biometric authentication
     */
    async enableBiometrics(): Promise<boolean> {
        try {
            const capabilities = await this.getBiometricCapabilities()
            if (!capabilities.isAvailable || !capabilities.isEnrolled) {
                throw new AuthError(
                    'Biometric authentication is not available or not enrolled',
                    AuthErrorCode.BIOMETRIC_NOT_AVAILABLE
                )
            }

            // Generate a unique key for biometric authentication
            const biometricKey = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                `${this.currentUser?.id}-${Date.now()}`
            )

            // Store the key securely with biometric protection
            await secureStorage.setBiometricKey(biometricKey)
            await defaultStorage.setBool('biometric_enabled', true)

            return true
        } catch (error) {
            throw new AuthError(
                'Failed to enable biometric authentication',
                AuthErrorCode.BIOMETRIC_NOT_AVAILABLE,
                error as Error
            )
        }
    }

    /**
     * Disable biometric authentication
     */
    async disableBiometrics(): Promise<void> {
        try {
            await secureStorage.removeSecureItem('biometric_key')
            await defaultStorage.setBool('biometric_enabled', false)
        } catch (error) {
            throw new AuthError(
                'Failed to disable biometric authentication',
                AuthErrorCode.BIOMETRIC_NOT_AVAILABLE,
                error as Error
            )
        }
    }

    /**
     * Authenticate with biometrics
     */
    async authenticateWithBiometrics(): Promise<BiometricAuthResult> {
        try {
            const capabilities = await this.getBiometricCapabilities()
            if (!capabilities.isAvailable) {
                return {
                    success: false,
                    error: 'Biometric authentication is not available'
                }
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: this.config.biometricPromptTitle,
                cancelLabel: 'Cancel',
                fallbackLabel: 'Use Password'
            })

            if (result.success) {
                // Verify biometric key exists
                const biometricKey = await secureStorage.getBiometricKey()
                if (!biometricKey) {
                    return {
                        success: false,
                        error: 'Biometric key not found'
                    }
                }

                // Get stored credentials and login
                const credentials = await secureStorage.getUserCredentials()
                if (credentials) {
                    const decryptedPassword = await this.decryptPassword(credentials.encryptedPassword)
                    return await this.login({
                        email: credentials.email,
                        password: decryptedPassword,
                        rememberMe: true
                    })
                }

                return { success: true }
            } else {
                const errorMessage = 'error' in result ? result.error : 'Biometric authentication failed'
                const isCancelled = errorMessage === 'UserCancel'
                
                return {
                    success: false,
                    cancelled: isCancelled,
                    error: errorMessage
                }
            }
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message
            }
        }
    }

    /**
     * Get biometric capabilities
     */
    async getBiometricCapabilities(): Promise<BiometricCapabilities> {
        try {
            const isAvailable = await LocalAuthentication.hasHardwareAsync()
            const isEnrolled = await LocalAuthentication.isEnrolledAsync()
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()

            const mappedTypes: BiometricType[] = supportedTypes.map(type => {
                switch (type) {
                    case LocalAuthentication.AuthenticationType.FINGERPRINT:
                        return BiometricType.FINGERPRINT
                    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                        return BiometricType.FACE_ID
                    case LocalAuthentication.AuthenticationType.IRIS:
                        return BiometricType.IRIS
                    default:
                        return BiometricType.FINGERPRINT
                }
            })

            return {
                isAvailable,
                isEnrolled,
                supportedTypes: mappedTypes
            }
        } catch (error) {
            return {
                isAvailable: false,
                isEnrolled: false,
                supportedTypes: []
            }
        }
    }

    /**
     * Upload credential documents for verification
     */
    async uploadCredentials(request: VerificationRequest): Promise<VerificationResult> {
        try {
            const formData = new FormData()

            // Add documents to form data
            request.documents.forEach((doc, index) => {
                formData.append(`documents[${index}]`, {
                    uri: doc.fileUri,
                    type: doc.mimeType,
                    name: doc.fileName
                } as any)
                formData.append(`documentTypes[${index}]`, doc.type)
            })

            if (request.additionalInfo) {
                formData.append('additionalInfo', request.additionalInfo)
            }

            const response = await this.apiClient.post('/auth/verify-credentials', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const { status, message, reviewDate } = response.data.data

            // Update current user verification status
            if (this.currentUser) {
                this.currentUser.verificationStatus = status
            }

            const result = {
                success: true,
                status,
                message
            }

            // Only include reviewDate if it exists
            if (reviewDate) {
                return {
                    ...result,
                    reviewDate: new Date(reviewDate)
                }
            }

            return result
        } catch (error: any) {
            const authError = this.handleApiError(error)
            return {
                success: false,
                status: VerificationStatus.PENDING,
                message: authError.message
            }
        }
    }

    /**
     * Get current verification status
     */
    async getVerificationStatus(): Promise<VerificationStatus> {
        try {
            if (!this.currentUser) {
                throw new AuthError('User not authenticated', AuthErrorCode.USER_NOT_FOUND)
            }

            const response = await this.apiClient.get('/auth/verification-status')
            const { status } = response.data.data

            // Update current user
            this.currentUser.verificationStatus = status

            return status
        } catch (error) {
            return this.currentUser?.verificationStatus || VerificationStatus.PENDING
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser(): Promise<User | null> {
        if (this.currentUser) {
            return this.currentUser
        }

        try {
            const tokens = await secureStorage.getAuthTokens()
            if (tokens.accessToken) {
                this.currentUser = await this.fetchCurrentUser()
            }
        } catch (error) {
            console.warn('Failed to get current user:', error)
        }

        return this.currentUser
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const tokens = await secureStorage.getAuthTokens()
            if (!tokens.accessToken) {
                return false
            }

            const validation = await this.validateToken(tokens.accessToken)
            return validation.isValid
        } catch (error) {
            return false
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<boolean> {
        try {
            await this.apiClient.post('/auth/forgot-password', { email })
            return true
        } catch (error) {
            throw this.handleApiError(error)
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        try {
            await this.apiClient.post('/auth/reset-password', {
                token,
                password: newPassword
            })
            return true
        } catch (error) {
            throw this.handleApiError(error)
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
        try {
            await this.apiClient.post('/auth/change-password', {
                currentPassword,
                newPassword
            })
            return true
        } catch (error) {
            throw this.handleApiError(error)
        }
    }

    // Private methods

    private setupInterceptors(): void {
        // Request interceptor to add auth token
        this.apiClient.interceptors.request.use(async (config) => {
            const tokens = await secureStorage.getAuthTokens()
            if (tokens.accessToken) {
                config.headers.Authorization = `Bearer ${tokens.accessToken}`
            }
            return config
        })

        // Response interceptor to handle token refresh
        this.apiClient.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true

                    try {
                        const newToken = await this.refreshToken()
                        originalRequest.headers.Authorization = `Bearer ${newToken}`
                        return this.apiClient(originalRequest)
                    } catch (refreshError) {
                        await this.clearAuthData()
                        throw refreshError
                    }
                }

                return Promise.reject(error)
            }
        )
    }

    private async fetchCurrentUser(): Promise<User> {
        const response = await this.apiClient.get('/auth/me')
        return response.data.data
    }

    private async clearAuthData(): Promise<void> {
        this.currentUser = null
        await secureStorage.clearAuthTokens()
        await secureStorage.removeSecureItem('biometric_key')
        await secureStorage.removeSecureItem('user_credentials')
        await defaultStorage.removeItem('remember_me')
        await defaultStorage.removeItem('biometric_enabled')
        await defaultStorage.removeItem('last_login_at')
    }

    private async encryptPassword(password: string): Promise<string> {
        // Simple encryption - in production, use proper encryption
        const key = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            'teacher-hub-password-key'
        )
        return Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password + key
        )
    }

    private async decryptPassword(encryptedPassword: string): Promise<string> {
        // This is a placeholder - proper decryption would be needed
        // For now, we'll store the actual password encrypted with device keychain
        throw new Error('Password decryption not implemented - use stored credentials')
    }

    private handleApiError(error: any): AuthError {
        if (error.response) {
            const { status, data } = error.response

            switch (status) {
                case 401:
                    return new AuthError('Invalid credentials', AuthErrorCode.INVALID_CREDENTIALS)
                case 404:
                    return new AuthError('User not found', AuthErrorCode.USER_NOT_FOUND)
                case 409:
                    return new AuthError('Email already exists', AuthErrorCode.EMAIL_ALREADY_EXISTS)
                case 422:
                    return new AuthError(
                        data.message || 'Validation failed',
                        AuthErrorCode.WEAK_PASSWORD
                    )
                default:
                    return new AuthError(
                        data.message || 'Authentication failed',
                        AuthErrorCode.NETWORK_ERROR
                    )
            }
        } else if (error.request) {
            return new AuthError('Network error', AuthErrorCode.NETWORK_ERROR, error)
        } else {
            return new AuthError('Unknown error', AuthErrorCode.NETWORK_ERROR, error)
        }
    }
}

export { AuthService }