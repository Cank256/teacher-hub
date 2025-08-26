/**
 * CredentialService Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import axios from 'axios'
import { CredentialService } from '../credentialService'
import { DocumentType, VerificationRequest } from '../types'
import { VerificationStatus } from '@/types'
import { mockCredentialDocument } from './setup'

// Import setup to ensure mocks are applied
import './setup'

const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockAxios = axios as jest.Mocked<typeof axios>

describe('CredentialService', () => {
  let credentialService: CredentialService
  let mockApiClient: any

  const testConfig = {
    apiBaseUrl: 'https://api.test.com',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxDocuments: 5
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock API client
    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() }
      }
    }

    mockAxios.create.mockReturnValue(mockApiClient)

    credentialService = new CredentialService(testConfig)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('document picking', () => {
    it('should pick document successfully', async () => {
      const mockResult = {
        canceled: false,
        assets: [{
          name: 'certificate.pdf',
          uri: 'file://certificate.pdf',
          mimeType: 'application/pdf',
          size: 1024
        }]
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValue(mockResult)

      const result = await credentialService.pickDocument()

      expect(result).toEqual({
        type: DocumentType.OTHER,
        fileName: 'certificate.pdf',
        fileUri: 'file://certificate.pdf',
        mimeType: 'application/pdf',
        size: 1024
      })

      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: testConfig.allowedMimeTypes,
        copyToCacheDirectory: true,
        multiple: false
      })
    })

    it('should return null when document picking is cancelled', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true })

      const result = await credentialService.pickDocument()

      expect(result).toBeNull()
    })

    it('should reject files that are too large', async () => {
      const mockResult = {
        canceled: false,
        assets: [{
          name: 'large-file.pdf',
          uri: 'file://large-file.pdf',
          mimeType: 'application/pdf',
          size: 20 * 1024 * 1024 // 20MB
        }]
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValue(mockResult)

      await expect(credentialService.pickDocument()).rejects.toThrow(
        'File size exceeds maximum allowed size'
      )
    })

    it('should handle document picker errors', async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(new Error('Picker failed'))

      await expect(credentialService.pickDocument()).rejects.toThrow('Failed to pick document')
    })
  })

  describe('photo taking', () => {
    it('should take photo successfully', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
      
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file://photo.jpg',
          fileSize: 2048
        }]
      }

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockResult)

      const result = await credentialService.takePhoto()

      expect(result).toEqual({
        type: DocumentType.OTHER,
        fileName: expect.stringMatching(/^photo_\d+\.jpg$/),
        fileUri: 'file://photo.jpg',
        mimeType: 'image/jpeg',
        size: 2048
      })

      expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled()
      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      })
    })

    it('should return null when photo taking is cancelled', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true })

      const result = await credentialService.takePhoto()

      expect(result).toBeNull()
    })

    it('should handle camera permission denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' })

      await expect(credentialService.takePhoto()).rejects.toThrow(
        'Camera permission is required to take photos'
      )
    })

    it('should reject photos that are too large', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
      
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file://large-photo.jpg',
          fileSize: 20 * 1024 * 1024 // 20MB
        }]
      }

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockResult)

      await expect(credentialService.takePhoto()).rejects.toThrow(
        'Image size exceeds maximum allowed size'
      )
    })
  })

  describe('image picking', () => {
    it('should pick image successfully', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
      
      const mockResult = {
        canceled: false,
        assets: [{
          uri: 'file://image.jpg',
          fileName: 'image.jpg',
          fileSize: 1536
        }]
      }

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockResult)

      const result = await credentialService.pickImage()

      expect(result).toEqual({
        type: DocumentType.OTHER,
        fileName: 'image.jpg',
        fileUri: 'file://image.jpg',
        mimeType: 'image/jpeg',
        size: 1536
      })

      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled()
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      })
    })

    it('should handle media library permission denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' })

      await expect(credentialService.pickImage()).rejects.toThrow(
        'Media library permission is required to select images'
      )
    })
  })

  describe('credential upload', () => {
    const mockVerificationRequest: VerificationRequest = {
      documents: [
        {
          ...mockCredentialDocument,
          type: DocumentType.TEACHING_CERTIFICATE
        }
      ],
      additionalInfo: 'Additional information'
    }

    it('should upload credentials successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            status: VerificationStatus.PENDING,
            message: 'Documents uploaded successfully',
            reviewDate: '2024-01-15T00:00:00.000Z'
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await credentialService.uploadCredentials(mockVerificationRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe(VerificationStatus.PENDING)
      expect(result.message).toBe('Documents uploaded successfully')
      expect(result.reviewDate).toEqual(new Date('2024-01-15T00:00:00.000Z'))

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/verify-credentials',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      )
    })

    it('should handle upload errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid file format' }
        }
      }

      mockApiClient.post.mockRejectedValue(mockError)

      const result = await credentialService.uploadCredentials(mockVerificationRequest)

      expect(result.success).toBe(false)
      expect(result.status).toBe(VerificationStatus.PENDING)
      expect(result.message).toBe('Invalid file format')
    })

    it('should validate request before upload', async () => {
      const invalidRequest: VerificationRequest = {
        documents: []
      }

      await expect(credentialService.uploadCredentials(invalidRequest)).rejects.toThrow(
        'At least one document is required'
      )
    })

    it('should reject too many documents', async () => {
      const tooManyDocsRequest: VerificationRequest = {
        documents: Array(10).fill(mockCredentialDocument)
      }

      await expect(credentialService.uploadCredentials(tooManyDocsRequest)).rejects.toThrow(
        'Maximum 5 documents allowed'
      )
    })
  })

  describe('verification status', () => {
    it('should get verification status successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            status: VerificationStatus.VERIFIED,
            submittedAt: '2024-01-01T00:00:00.000Z',
            reviewedAt: '2024-01-05T00:00:00.000Z',
            message: 'Credentials verified',
            documents: [mockCredentialDocument]
          }
        }
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await credentialService.getVerificationStatus()

      expect(result.status).toBe(VerificationStatus.VERIFIED)
      expect(result.submittedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      expect(result.reviewedAt).toEqual(new Date('2024-01-05T00:00:00.000Z'))
      expect(result.message).toBe('Credentials verified')
      expect(result.documents).toEqual([mockCredentialDocument])

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/verification-status')
    })

    it('should handle verification status errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'))

      await expect(credentialService.getVerificationStatus()).rejects.toThrow()
    })
  })

  describe('credential resubmission', () => {
    const mockVerificationRequest: VerificationRequest = {
      documents: [mockCredentialDocument]
    }

    it('should resubmit credentials successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            status: VerificationStatus.PENDING,
            message: 'Documents resubmitted successfully',
            reviewDate: '2024-01-20T00:00:00.000Z'
          }
        }
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await credentialService.resubmitCredentials(mockVerificationRequest)

      expect(result.success).toBe(true)
      expect(result.status).toBe(VerificationStatus.PENDING)
      expect(result.message).toBe('Documents resubmitted successfully')

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/resubmit-credentials',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      )
    })
  })

  describe('document validation', () => {
    it('should validate valid document', () => {
      const validDocument = {
        ...mockCredentialDocument,
        type: DocumentType.TEACHING_CERTIFICATE
      }

      const result = credentialService.validateDocument(validDocument)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject document that is too large', () => {
      const largeDocument = {
        ...mockCredentialDocument,
        size: 20 * 1024 * 1024 // 20MB
      }

      const result = credentialService.validateDocument(largeDocument)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size exceeds maximum allowed size of 10 MB')
    })

    it('should reject unsupported file type', () => {
      const unsupportedDocument = {
        ...mockCredentialDocument,
        mimeType: 'application/zip'
      }

      const result = credentialService.validateDocument(unsupportedDocument)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File type is not supported')
    })

    it('should reject document with empty filename', () => {
      const noNameDocument = {
        ...mockCredentialDocument,
        fileName: ''
      }

      const result = credentialService.validateDocument(noNameDocument)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File name is required')
    })
  })

  describe('document types', () => {
    it('should return available document types', () => {
      const documentTypes = credentialService.getDocumentTypes()

      expect(documentTypes).toHaveLength(5)
      expect(documentTypes).toContainEqual({
        value: DocumentType.TEACHING_CERTIFICATE,
        label: 'Teaching Certificate',
        description: 'Official teaching qualification certificate'
      })
      expect(documentTypes).toContainEqual({
        value: DocumentType.DEGREE_CERTIFICATE,
        label: 'Degree Certificate',
        description: 'University degree or diploma certificate'
      })
    })
  })
})