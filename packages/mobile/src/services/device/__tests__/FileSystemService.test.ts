/**
 * File System Service Tests
 * 
 * Tests for file system access, storage management,
 * and file operations with proper permissions.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as FileSystem from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { Alert } from 'react-native'
import FileSystemService from '../FileSystemService'
import { createMockFileSystemInfo } from './setup'

// Mock modules
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>
const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>
const mockAlert = Alert as jest.Mocked<typeof Alert>

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService

  beforeEach(() => {
    fileSystemService = FileSystemService.getInstance()
    jest.clearAllMocks()

    // Set up default mock values
    mockFileSystem.documentDirectory = 'file:///mock/documents/'
    mockFileSystem.cacheDirectory = 'file:///mock/cache/'
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('File System Information', () => {
    it('should get file system info successfully', async () => {
      // Mock directory size calculations
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (uri.includes('documents')) {
          return { exists: true, isDirectory: true, size: 100 * 1024 * 1024 }
        }
        if (uri.includes('cache')) {
          return { exists: true, isDirectory: true, size: 50 * 1024 * 1024 }
        }
        return { exists: false, isDirectory: false }
      })

      mockFileSystem.readDirectoryAsync.mockResolvedValue([])
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(32 * 1024 * 1024 * 1024)

      const result = await fileSystemService.getFileSystemInfo()

      expect(result).toEqual(
        expect.objectContaining({
          totalSpace: expect.any(Number),
          freeSpace: 32 * 1024 * 1024 * 1024,
          usedSpace: expect.any(Number),
          appDataSize: expect.any(Number),
          cacheSize: expect.any(Number)
        })
      )
    })

    it('should handle file system info errors', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValue(new Error('Access denied'))

      await expect(fileSystemService.getFileSystemInfo()).rejects.toThrow(
        'Failed to retrieve file system information'
      )
    })
  })

  describe('File Picking', () => {
    it('should pick files successfully', async () => {
      const mockResult = {
        canceled: false,
        assets: [
          {
            uri: 'file:///mock/document.pdf',
            name: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024 * 1024
          },
          {
            uri: 'file:///mock/image.jpg',
            name: 'image.jpg',
            mimeType: 'image/jpeg',
            size: 2 * 1024 * 1024
          }
        ]
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValue(mockResult)

      const result = await fileSystemService.pickFiles({
        type: 'documents',
        allowMultiple: true,
        maxSize: 5 * 1024 * 1024
      })

      expect(result).toEqual({
        files: [
          {
            uri: 'file:///mock/document.pdf',
            name: 'document.pdf',
            type: 'application/pdf',
            size: 1024 * 1024
          },
          {
            uri: 'file:///mock/image.jpg',
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 2 * 1024 * 1024
          }
        ]
      })

      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: expect.arrayContaining(['application/pdf']),
        multiple: true,
        copyToCacheDirectory: true
      })
    })

    it('should filter files by size', async () => {
      const mockResult = {
        canceled: false,
        assets: [
          {
            uri: 'file:///mock/small.pdf',
            name: 'small.pdf',
            mimeType: 'application/pdf',
            size: 500 * 1024 // 500KB
          },
          {
            uri: 'file:///mock/large.pdf',
            name: 'large.pdf',
            mimeType: 'application/pdf',
            size: 5 * 1024 * 1024 // 5MB
          }
        ]
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValue(mockResult)

      const result = await fileSystemService.pickFiles({
        type: 'documents',
        allowMultiple: true,
        maxSize: 1024 * 1024 // 1MB limit
      })

      expect(result?.files).toHaveLength(1)
      expect(result?.files[0].name).toBe('small.pdf')
    })

    it('should limit number of files', async () => {
      const mockResult = {
        canceled: false,
        assets: Array.from({ length: 5 }, (_, i) => ({
          uri: `file:///mock/file${i}.pdf`,
          name: `file${i}.pdf`,
          mimeType: 'application/pdf',
          size: 1024 * 1024
        }))
      }

      mockDocumentPicker.getDocumentAsync.mockResolvedValue(mockResult)

      const result = await fileSystemService.pickFiles({
        type: 'documents',
        allowMultiple: true,
        maxFiles: 3
      })

      expect(result?.files).toHaveLength(3)
    })

    it('should handle cancelled file picking', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: true,
        assets: []
      })

      const result = await fileSystemService.pickFiles()

      expect(result).toBeNull()
    })

    it('should map file types correctly', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: []
      })

      // Test different file types
      await fileSystemService.pickFiles({ type: 'images' })
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: ['image/*'] })
      )

      await fileSystemService.pickFiles({ type: 'videos' })
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: ['video/*'] })
      )

      await fileSystemService.pickFiles({ type: 'audio' })
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: ['audio/*'] })
      )

      await fileSystemService.pickFiles({ type: 'all' })
      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: ['*/*'] })
      )
    })
  })

  describe('File Operations', () => {
    it('should save file successfully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })
      mockFileSystem.copyAsync.mockResolvedValue()

      const result = await fileSystemService.saveFile(
        'file:///source/file.pdf',
        'saved-file.pdf',
        'documents'
      )

      expect(result).toBe('file:///mock/documents/documents/saved-file.pdf')
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///mock/documents/documents/',
        { intermediates: true }
      )
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: 'file:///source/file.pdf',
        to: 'file:///mock/documents/documents/saved-file.pdf'
      })
    })

    it('should handle save file errors', async () => {
      mockFileSystem.copyAsync.mockRejectedValue(new Error('Copy failed'))

      const result = await fileSystemService.saveFile(
        'file:///source/file.pdf',
        'saved-file.pdf'
      )

      expect(result).toBeNull()
    })

    it('should delete file successfully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false
      })
      mockFileSystem.deleteAsync.mockResolvedValue()

      const result = await fileSystemService.deleteFile('file:///mock/file.pdf')

      expect(result).toBe(true)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith('file:///mock/file.pdf')
    })

    it('should handle delete non-existent file', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false
      })

      const result = await fileSystemService.deleteFile('file:///mock/nonexistent.pdf')

      expect(result).toBe(false)
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })

    it('should ensure directory exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false
      })
      mockFileSystem.makeDirectoryAsync.mockResolvedValue()

      await fileSystemService.ensureDirectoryExists('file:///mock/new-directory/')

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///mock/new-directory/',
        { intermediates: true }
      )
    })

    it('should not create directory if it already exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: true
      })

      await fileSystemService.ensureDirectoryExists('file:///mock/existing-directory/')

      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled()
    })
  })

  describe('Directory Size Calculation', () => {
    it('should calculate directory size recursively', async () => {
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (uri === 'file:///mock/directory/') {
          return { exists: true, isDirectory: true }
        }
        if (uri === 'file:///mock/directory/file1.txt') {
          return { exists: true, isDirectory: false, size: 1024 }
        }
        if (uri === 'file:///mock/directory/file2.txt') {
          return { exists: true, isDirectory: false, size: 2048 }
        }
        if (uri === 'file:///mock/directory/subdirectory/') {
          return { exists: true, isDirectory: true }
        }
        if (uri === 'file:///mock/directory/subdirectory/file3.txt') {
          return { exists: true, isDirectory: false, size: 512 }
        }
        return { exists: false, isDirectory: false }
      })

      mockFileSystem.readDirectoryAsync.mockImplementation(async (uri) => {
        if (uri === 'file:///mock/directory/') {
          return ['file1.txt', 'file2.txt', 'subdirectory']
        }
        if (uri === 'file:///mock/directory/subdirectory/') {
          return ['file3.txt']
        }
        return []
      })

      const size = await fileSystemService.getDirectorySize('file:///mock/directory/')

      expect(size).toBe(1024 + 2048 + 512) // Total of all files
    })

    it('should return 0 for non-existent directory', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false
      })

      const size = await fileSystemService.getDirectorySize('file:///mock/nonexistent/')

      expect(size).toBe(0)
    })
  })

  describe('Storage Cleanup', () => {
    it('should cleanup storage successfully', async () => {
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (uri.includes('cache')) {
          return { exists: true, isDirectory: true }
        }
        return { exists: false, isDirectory: false }
      })

      mockFileSystem.readDirectoryAsync.mockResolvedValue([])
      mockFileSystem.deleteAsync.mockResolvedValue()
      mockFileSystem.makeDirectoryAsync.mockResolvedValue()

      const result = await fileSystemService.cleanupStorage()

      expect(result.errors).toHaveLength(0)
      expect(result.cleaned).toBeGreaterThanOrEqual(0)
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled()
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      mockFileSystem.deleteAsync.mockRejectedValue(new Error('Delete failed'))

      const result = await fileSystemService.cleanupStorage()

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors).toContain('Failed to clean cache directory')
    })
  })

  describe('Storage Insights', () => {
    it('should get storage insights with recommendations', async () => {
      // Mock large cache size to trigger recommendation
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (uri.includes('documents')) {
          return { exists: true, isDirectory: true, size: 40 * 1024 * 1024 }
        }
        if (uri.includes('cache')) {
          return { exists: true, isDirectory: true, size: 60 * 1024 * 1024 } // Large cache
        }
        return { exists: false, isDirectory: false }
      })

      mockFileSystem.readDirectoryAsync.mockResolvedValue([])
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(32 * 1024 * 1024 * 1024)

      const insights = await fileSystemService.getStorageInsights()

      expect(insights.totalAppSize).toBeGreaterThan(0)
      expect(insights.breakdown).toEqual(
        expect.objectContaining({
          userContent: expect.any(Number),
          cache: expect.any(Number),
          database: expect.any(Number),
          logs: expect.any(Number),
          temp: expect.any(Number)
        })
      )
      expect(insights.recommendations.length).toBeGreaterThan(0)
      expect(insights.recommendations[0].type).toBe('clear_cache')
    })
  })

  describe('File Information', () => {
    it('should check if file exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false
      })

      const exists = await fileSystemService.fileExists('file:///mock/file.pdf')

      expect(exists).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false
      })

      const exists = await fileSystemService.fileExists('file:///mock/nonexistent.pdf')

      expect(exists).toBe(false)
    })

    it('should get file information', async () => {
      const mockFileInfo = {
        exists: true,
        isDirectory: false,
        size: 1024 * 1024,
        modificationTime: Date.now()
      }

      mockFileSystem.getInfoAsync.mockResolvedValue(mockFileInfo)

      const fileInfo = await fileSystemService.getFileInfo('file:///mock/file.pdf')

      expect(fileInfo).toEqual(mockFileInfo)
    })

    it('should return null for non-existent file info', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false
      })

      const fileInfo = await fileSystemService.getFileInfo('file:///mock/nonexistent.pdf')

      expect(fileInfo).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const error = new Error('File system error')
      ;(error as any).code = 'E_INVALID_DIRECTORY'
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(error)

      const result = await fileSystemService.pickFiles()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'File System Error',
        'The selected directory is not accessible.'
      )
    })

    it('should not show error for user cancellation', async () => {
      const error = new Error('User cancelled')
      ;(error as any).code = 'E_DOCUMENT_PICKER_CANCELED'
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(error)

      const result = await fileSystemService.pickFiles()

      expect(result).toBeNull()
      expect(mockAlert.alert).not.toHaveBeenCalled()
    })
  })

  describe('Fallback Handling', () => {
    it('should handle file system fallback with alternative action', async () => {
      const alternativeAction = jest.fn()

      await fileSystemService.handleFileSystemFallback({
        showError: true,
        errorMessage: 'Custom file system error',
        alternativeAction
      })

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'File System Access',
        'Custom file system error',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Try Alternative' }),
          expect.objectContaining({ text: 'OK' })
        ])
      )
    })

    it('should handle file system fallback without showing error', async () => {
      await fileSystemService.handleFileSystemFallback({
        showError: false
      })

      expect(mockAlert.alert).not.toHaveBeenCalled()
    })
  })
})