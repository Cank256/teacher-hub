/**
 * Credential Verification Service
 * Handles document upload and verification for teacher credentials
 */

import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import axios, { AxiosInstance } from 'axios'
import { secureStorage } from '@/services/storage'
import { VerificationStatus } from '@/types'
import {
  CredentialDocument,
  DocumentType,
  VerificationRequest,
  VerificationResult,
  AuthError,
  AuthErrorCode
} from './types'

interface CredentialConfig {
  apiBaseUrl: string
  maxFileSize: number // in bytes
  allowedMimeTypes: string[]
  maxDocuments: number
}

class CredentialService {
  private apiClient: AxiosInstance
  private config: CredentialConfig

  constructor(config: CredentialConfig) {
    this.config = config
    this.apiClient = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000, // 30 seconds for file uploads
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    this.setupInterceptors()
  }

  /**
   * Pick document from device storage
   */
  async pickDocument(): Promise<CredentialDocument | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: this.config.allowedMimeTypes,
        copyToCacheDirectory: true,
        multiple: false
      })

      if (result.canceled) {
        return null
      }

      const asset = result.assets[0]
      
      // Validate file size
      if (asset.size && asset.size > this.config.maxFileSize) {
        throw new AuthError(
          `File size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`,
          AuthErrorCode.DOCUMENT_UPLOAD_FAILED
        )
      }

      return {
        type: DocumentType.OTHER, // Will be set by user
        fileName: asset.name,
        fileUri: asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0
      }
    } catch (error) {
      console.error('Error picking document:', error)
      
      if (error instanceof AuthError) {
        throw error
      }

      throw new AuthError(
        'Failed to pick document',
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED,
        error as Error
      )
    }
  }

  /**
   * Take photo using camera
   */
  async takePhoto(): Promise<CredentialDocument | null> {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        throw new AuthError(
          'Camera permission is required to take photos',
          AuthErrorCode.PERMISSION_ERROR
        )
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      })

      if (result.canceled) {
        return null
      }

      const asset = result.assets[0]

      // Validate file size
      if (asset.fileSize && asset.fileSize > this.config.maxFileSize) {
        throw new AuthError(
          `Image size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`,
          AuthErrorCode.DOCUMENT_UPLOAD_FAILED
        )
      }

      return {
        type: DocumentType.OTHER, // Will be set by user
        fileName: `photo_${Date.now()}.jpg`,
        fileUri: asset.uri,
        mimeType: 'image/jpeg',
        size: asset.fileSize || 0
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      
      if (error instanceof AuthError) {
        throw error
      }

      throw new AuthError(
        'Failed to take photo',
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED,
        error as Error
      )
    }
  }

  /**
   * Pick image from gallery
   */
  async pickImage(): Promise<CredentialDocument | null> {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        throw new AuthError(
          'Media library permission is required to select images',
          AuthErrorCode.PERMISSION_ERROR
        )
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      })

      if (result.canceled) {
        return null
      }

      const asset = result.assets[0]

      // Validate file size
      if (asset.fileSize && asset.fileSize > this.config.maxFileSize) {
        throw new AuthError(
          `Image size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`,
          AuthErrorCode.DOCUMENT_UPLOAD_FAILED
        )
      }

      return {
        type: DocumentType.OTHER, // Will be set by user
        fileName: asset.fileName || `image_${Date.now()}.jpg`,
        fileUri: asset.uri,
        mimeType: 'image/jpeg',
        size: asset.fileSize || 0
      }
    } catch (error) {
      console.error('Error picking image:', error)
      
      if (error instanceof AuthError) {
        throw error
      }

      throw new AuthError(
        'Failed to pick image',
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED,
        error as Error
      )
    }
  }

  /**
   * Upload credential documents for verification
   */
  async uploadCredentials(request: VerificationRequest): Promise<VerificationResult> {
    try {
      // Validate request
      this.validateVerificationRequest(request)

      const formData = new FormData()

      // Add documents to form data
      request.documents.forEach((doc, index) => {
        formData.append(`documents`, {
          uri: doc.fileUri,
          type: doc.mimeType,
          name: doc.fileName
        } as any)
        
        formData.append(`documentTypes`, doc.type)
      })

      // Add additional info if provided
      if (request.additionalInfo) {
        formData.append('additionalInfo', request.additionalInfo)
      }

      // Upload with progress tracking
      const response = await this.apiClient.post('/auth/verify-credentials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          )
          console.log(`Upload progress: ${percentCompleted}%`)
        }
      })

      const { status, message, reviewDate, rejectionReason } = response.data.data

      return {
        success: true,
        status,
        message,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        rejectionReason
      }
    } catch (error: any) {
      console.error('Credential upload error:', error)
      
      const authError = this.handleApiError(error)
      return {
        success: false,
        status: VerificationStatus.PENDING,
        message: authError.message
      }
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(): Promise<{
    status: VerificationStatus
    submittedAt?: Date
    reviewedAt?: Date
    message?: string
    rejectionReason?: string
    documents: CredentialDocument[]
  }> {
    try {
      const response = await this.apiClient.get('/auth/verification-status')
      const data = response.data.data

      return {
        status: data.status,
        submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
        reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : undefined,
        message: data.message,
        rejectionReason: data.rejectionReason,
        documents: data.documents || []
      }
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  /**
   * Resubmit credentials after rejection
   */
  async resubmitCredentials(request: VerificationRequest): Promise<VerificationResult> {
    try {
      // Same as upload but to different endpoint
      const formData = new FormData()

      request.documents.forEach((doc, index) => {
        formData.append(`documents`, {
          uri: doc.fileUri,
          type: doc.mimeType,
          name: doc.fileName
        } as any)
        
        formData.append(`documentTypes`, doc.type)
      })

      if (request.additionalInfo) {
        formData.append('additionalInfo', request.additionalInfo)
      }

      const response = await this.apiClient.post('/auth/resubmit-credentials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { status, message, reviewDate } = response.data.data

      return {
        success: true,
        status,
        message,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined
      }
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
   * Get document type options
   */
  getDocumentTypes(): Array<{ value: DocumentType; label: string; description: string }> {
    return [
      {
        value: DocumentType.TEACHING_CERTIFICATE,
        label: 'Teaching Certificate',
        description: 'Official teaching qualification certificate'
      },
      {
        value: DocumentType.DEGREE_CERTIFICATE,
        label: 'Degree Certificate',
        description: 'University degree or diploma certificate'
      },
      {
        value: DocumentType.NATIONAL_ID,
        label: 'National ID',
        description: 'National identification document'
      },
      {
        value: DocumentType.PASSPORT,
        label: 'Passport',
        description: 'International passport'
      },
      {
        value: DocumentType.OTHER,
        label: 'Other',
        description: 'Other relevant credential document'
      }
    ]
  }

  /**
   * Validate document before upload
   */
  validateDocument(document: CredentialDocument): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check file size
    if (document.size > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`)
    }

    // Check mime type
    if (!this.config.allowedMimeTypes.includes(document.mimeType)) {
      errors.push('File type is not supported')
    }

    // Check document type
    if (!Object.values(DocumentType).includes(document.type)) {
      errors.push('Invalid document type')
    }

    // Check file name
    if (!document.fileName || document.fileName.trim().length === 0) {
      errors.push('File name is required')
    }

    return {
      isValid: errors.length === 0,
      errors
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
  }

  private validateVerificationRequest(request: VerificationRequest): void {
    if (!request.documents || request.documents.length === 0) {
      throw new AuthError(
        'At least one document is required',
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED
      )
    }

    if (request.documents.length > this.config.maxDocuments) {
      throw new AuthError(
        `Maximum ${this.config.maxDocuments} documents allowed`,
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED
      )
    }

    // Validate each document
    for (const doc of request.documents) {
      const validation = this.validateDocument(doc)
      if (!validation.isValid) {
        throw new AuthError(
          `Document validation failed: ${validation.errors.join(', ')}`,
          AuthErrorCode.DOCUMENT_UPLOAD_FAILED
        )
      }
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private handleApiError(error: any): AuthError {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          return new AuthError(
            data.message || 'Invalid request',
            AuthErrorCode.DOCUMENT_UPLOAD_FAILED
          )
        case 413:
          return new AuthError(
            'File size too large',
            AuthErrorCode.DOCUMENT_UPLOAD_FAILED
          )
        case 415:
          return new AuthError(
            'Unsupported file type',
            AuthErrorCode.DOCUMENT_UPLOAD_FAILED
          )
        case 422:
          return new AuthError(
            data.message || 'Validation failed',
            AuthErrorCode.DOCUMENT_UPLOAD_FAILED
          )
        default:
          return new AuthError(
            data.message || 'Upload failed',
            AuthErrorCode.DOCUMENT_UPLOAD_FAILED
          )
      }
    } else if (error.request) {
      return new AuthError(
        'Network error during upload',
        AuthErrorCode.NETWORK_ERROR,
        error
      )
    } else {
      return new AuthError(
        'Unknown error during upload',
        AuthErrorCode.DOCUMENT_UPLOAD_FAILED,
        error
      )
    }
  }
}

// Default configuration
const defaultCredentialConfig: CredentialConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxDocuments: 5
}

// Create singleton instance
export const credentialService = new CredentialService(defaultCredentialConfig)

// Export convenience functions
export const pickDocument = (): Promise<CredentialDocument | null> => {
  return credentialService.pickDocument()
}

export const takePhoto = (): Promise<CredentialDocument | null> => {
  return credentialService.takePhoto()
}

export const pickImage = (): Promise<CredentialDocument | null> => {
  return credentialService.pickImage()
}

export const uploadCredentials = (request: VerificationRequest): Promise<VerificationResult> => {
  return credentialService.uploadCredentials(request)
}

export const getVerificationStatus = () => {
  return credentialService.getVerificationStatus()
}

export const resubmitCredentials = (request: VerificationRequest): Promise<VerificationResult> => {
  return credentialService.resubmitCredentials(request)
}

export const getDocumentTypes = () => {
  return credentialService.getDocumentTypes()
}

export const validateDocument = (document: CredentialDocument) => {
  return credentialService.validateDocument(document)
}

export { CredentialService }