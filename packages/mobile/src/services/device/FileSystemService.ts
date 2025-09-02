/**
 * File System Service
 * 
 * Handles file system access with proper permissions handling,
 * storage management, and file operations.
 */

import * as FileSystem from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { Platform, Alert } from 'react-native'
import { 
  FileSystemInfo, 
  FilePickerOptions, 
  FilePickerResult, 
  StorageInsights,
  PermissionResult,
  FallbackOptions,
  NativeModuleError
} from './types'

export class FileSystemService {
  private static instance: FileSystemService
  
  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService()
    }
    return FileSystemService.instance
  }

  /**
   * Get file system information and storage usage
   */
  async getFileSystemInfo(): Promise<FileSystemInfo> {
    try {
      const documentDirectory = FileSystem.documentDirectory!
      const cacheDirectory = FileSystem.cacheDirectory!
      
      // Get directory sizes
      const appDataSize = await this.getDirectorySize(documentDirectory)
      const cacheSize = await this.getDirectorySize(cacheDirectory)
      
      // Get device storage info (simplified - in real app might use native modules)
      const totalSpace = await this.getTotalDeviceStorage()
      const freeSpace = await this.getFreeDeviceStorage()
      const usedSpace = totalSpace - freeSpace
      
      // Calculate temp directory size
      const tempDir = `${cacheDirectory}temp/`
      const tempSize = await this.getDirectorySize(tempDir)
      
      // Calculate documents size (excluding cache)
      const documentsSize = appDataSize - cacheSize

      return {
        totalSpace,
        freeSpace,
        usedSpace,
        appDataSize,
        cacheSize,
        documentsSize,
        tempSize
      }
    } catch (error) {
      console.error('Error getting file system info:', error)
      throw new Error('Failed to retrieve file system information')
    }
  }

  /**
   * Pick files from device storage
   */
  async pickFiles(options: FilePickerOptions = { type: 'all' }): Promise<FilePickerResult | null> {
    try {
      const documentTypes = this.mapFileTypes(options.type)
      
      const result = await DocumentPicker.getDocumentAsync({
        type: documentTypes,
        multiple: options.allowMultiple ?? false,
        copyToCacheDirectory: true
      })

      if (result.canceled || !result.assets) {
        return null
      }

      // Filter files by size if specified
      let files = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0
      }))

      if (options.maxSize) {
        files = files.filter(file => file.size <= options.maxSize!)
      }

      if (options.maxFiles) {
        files = files.slice(0, options.maxFiles)
      }

      return { files }
    } catch (error) {
      this.handleFileSystemError(error as NativeModuleError)
      return null
    }
  }

  /**
   * Save file to app's document directory
   */
  async saveFile(sourceUri: string, fileName: string, subdirectory?: string): Promise<string | null> {
    try {
      const documentDirectory = FileSystem.documentDirectory!
      const targetDirectory = subdirectory 
        ? `${documentDirectory}${subdirectory}/`
        : documentDirectory
      
      // Ensure directory exists
      await this.ensureDirectoryExists(targetDirectory)
      
      const targetUri = `${targetDirectory}${fileName}`
      
      // Copy file to target location
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      })

      return targetUri
    } catch (error) {
      console.error('Error saving file:', error)
      return null
    }
  }

  /**
   * Delete file from app storage
   */
  async deleteFile(fileUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }

  /**
   * Create directory if it doesn't exist
   */
  async ensureDirectoryExists(directoryUri: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryUri)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true })
      }
    } catch (error) {
      console.error('Error creating directory:', error)
      throw new Error('Failed to create directory')
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(directoryUri: string): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryUri)
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return 0
      }

      const items = await FileSystem.readDirectoryAsync(directoryUri)
      let totalSize = 0

      for (const item of items) {
        const itemUri = `${directoryUri}${item}`
        const itemInfo = await FileSystem.getInfoAsync(itemUri)
        
        if (itemInfo.isDirectory) {
          totalSize += await this.getDirectorySize(`${itemUri}/`)
        } else {
          totalSize += itemInfo.size ?? 0
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error calculating directory size:', error)
      return 0
    }
  }

  /**
   * Clean up temporary files and cache
   */
  async cleanupStorage(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = []
    let totalCleaned = 0

    try {
      const cacheDirectory = FileSystem.cacheDirectory!
      
      // Clean cache directory
      const cacheSize = await this.getDirectorySize(cacheDirectory)
      try {
        await FileSystem.deleteAsync(cacheDirectory, { idempotent: true })
        await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true })
        totalCleaned += cacheSize
      } catch (error) {
        errors.push('Failed to clean cache directory')
      }

      // Clean temp directory
      const tempDir = `${cacheDirectory}temp/`
      try {
        const tempSize = await this.getDirectorySize(tempDir)
        await FileSystem.deleteAsync(tempDir, { idempotent: true })
        totalCleaned += tempSize
      } catch (error) {
        errors.push('Failed to clean temp directory')
      }

      return { cleaned: totalCleaned, errors }
    } catch (error) {
      errors.push('General cleanup error')
      return { cleaned: totalCleaned, errors }
    }
  }

  /**
   * Get storage insights and recommendations
   */
  async getStorageInsights(): Promise<StorageInsights> {
    try {
      const fileSystemInfo = await this.getFileSystemInfo()
      const recommendations: StorageInsights['recommendations'] = []

      // Analyze cache size
      if (fileSystemInfo.cacheSize > 50 * 1024 * 1024) { // 50MB
        recommendations.push({
          type: 'clear_cache',
          description: 'Clear app cache to free up space',
          potentialSavings: fileSystemInfo.cacheSize
        })
      }

      // Analyze temp files
      if (fileSystemInfo.tempSize > 10 * 1024 * 1024) { // 10MB
        recommendations.push({
          type: 'remove_old_files',
          description: 'Remove temporary files',
          potentialSavings: fileSystemInfo.tempSize
        })
      }

      // Check if storage is getting full
      const usagePercentage = (fileSystemInfo.usedSpace / fileSystemInfo.totalSpace) * 100
      if (usagePercentage > 90) {
        recommendations.push({
          type: 'archive_data',
          description: 'Archive old data to cloud storage',
          potentialSavings: fileSystemInfo.appDataSize * 0.3 // Estimate 30% can be archived
        })
      }

      return {
        totalAppSize: fileSystemInfo.appDataSize,
        breakdown: {
          userContent: fileSystemInfo.documentsSize,
          cache: fileSystemInfo.cacheSize,
          database: 0, // Would need to calculate actual DB size
          logs: 0, // Would need to calculate log file sizes
          temp: fileSystemInfo.tempSize
        },
        recommendations
      }
    } catch (error) {
      console.error('Error getting storage insights:', error)
      throw new Error('Failed to analyze storage usage')
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      return fileInfo.exists
    } catch (error) {
      return false
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(fileUri: string): Promise<FileSystem.FileInfo | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      return fileInfo.exists ? fileInfo : null
    } catch (error) {
      console.error('Error getting file info:', error)
      return null
    }
  }

  /**
   * Handle graceful fallbacks when file system operations fail
   */
  async handleFileSystemFallback(fallbackOptions: FallbackOptions = {}): Promise<void> {
    const { showError = true, errorMessage, alternativeAction, retryAction } = fallbackOptions

    if (showError) {
      const message = errorMessage ?? 'File system access is limited. Some features may not work as expected.'
      
      Alert.alert(
        'File System Access',
        message,
        [
          ...(alternativeAction ? [{
            text: 'Try Alternative',
            onPress: alternativeAction
          }] : []),
          ...(retryAction ? [{
            text: 'Retry',
            onPress: retryAction
          }] : []),
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      )
    }
  }

  // Private helper methods

  private mapFileTypes(type: FilePickerOptions['type']): string[] {
    switch (type) {
      case 'images':
        return ['image/*']
      case 'videos':
        return ['video/*']
      case 'audio':
        return ['audio/*']
      case 'documents':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ]
      case 'all':
      default:
        return ['*/*']
    }
  }

  private async getTotalDeviceStorage(): Promise<number> {
    // This is a simplified implementation
    // In a real app, you might use a native module to get actual device storage
    try {
      if (Platform.OS === 'ios') {
        // iOS doesn't provide easy access to total storage
        return 64 * 1024 * 1024 * 1024 // Default to 64GB
      } else {
        // Android - would need native module for accurate info
        return 32 * 1024 * 1024 * 1024 // Default to 32GB
      }
    } catch (error) {
      return 32 * 1024 * 1024 * 1024 // Fallback
    }
  }

  private async getFreeDeviceStorage(): Promise<number> {
    try {
      const freeSpace = await FileSystem.getFreeDiskStorageAsync()
      return freeSpace
    } catch (error) {
      console.error('Error getting free storage:', error)
      return 0
    }
  }

  private handleFileSystemError(error: NativeModuleError): void {
    console.error('File system error:', error)
    
    let message = 'An error occurred while accessing files. Please try again.'
    
    if (error.code === 'E_DOCUMENT_PICKER_CANCELED') {
      // User cancelled, don't show error
      return
    } else if (error.code === 'E_INVALID_DIRECTORY') {
      message = 'The selected directory is not accessible.'
    } else if (error.code === 'E_INSUFFICIENT_STORAGE') {
      message = 'Not enough storage space available.'
    }

    Alert.alert('File System Error', message)
  }
}

export default FileSystemService.getInstance()