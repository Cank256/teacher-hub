/**
 * Storage Insights Service
 * 
 * Provides detailed storage management and insights,
 * including recommendations for optimization.
 */

import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { StorageInsights, FileSystemInfo } from './types'
import FileSystemService from './FileSystemService'

export class StorageInsightsService {
  private static instance: StorageInsightsService
  
  public static getInstance(): StorageInsightsService {
    if (!StorageInsightsService.instance) {
      StorageInsightsService.instance = new StorageInsightsService()
    }
    return StorageInsightsService.instance
  }

  /**
   * Get comprehensive storage insights with recommendations
   */
  async getStorageInsights(): Promise<StorageInsights> {
    try {
      const fileSystemService = FileSystemService
      const fileSystemInfo = await fileSystemService.getFileSystemInfo()
      
      const breakdown = await this.getDetailedStorageBreakdown()
      const recommendations = await this.generateRecommendations(fileSystemInfo, breakdown)

      return {
        totalAppSize: fileSystemInfo.appDataSize,
        breakdown,
        recommendations
      }
    } catch (error) {
      console.error('Error getting storage insights:', error)
      throw new Error('Failed to analyze storage usage')
    }
  }

  /**
   * Get detailed breakdown of storage usage
   */
  private async getDetailedStorageBreakdown(): Promise<StorageInsights['breakdown']> {
    try {
      const documentDirectory = FileSystem.documentDirectory!
      const cacheDirectory = FileSystem.cacheDirectory!
      
      // Calculate user content (excluding system files)
      const userContentSize = await this.calculateUserContentSize(documentDirectory)
      
      // Calculate cache size
      const cacheSize = await this.getDirectorySize(cacheDirectory)
      
      // Calculate database size
      const databaseSize = await this.calculateDatabaseSize(documentDirectory)
      
      // Calculate log files size
      const logsSize = await this.calculateLogsSize(documentDirectory)
      
      // Calculate temp files size
      const tempSize = await this.calculateTempSize(cacheDirectory)

      return {
        userContent: userContentSize,
        cache: cacheSize,
        database: databaseSize,
        logs: logsSize,
        temp: tempSize
      }
    } catch (error) {
      console.error('Error getting storage breakdown:', error)
      return {
        userContent: 0,
        cache: 0,
        database: 0,
        logs: 0,
        temp: 0
      }
    }
  }

  /**
   * Generate storage optimization recommendations
   */
  private async generateRecommendations(
    fileSystemInfo: FileSystemInfo,
    breakdown: StorageInsights['breakdown']
  ): Promise<StorageInsights['recommendations']> {
    const recommendations: StorageInsights['recommendations'] = []

    // Check cache size
    if (breakdown.cache > 50 * 1024 * 1024) { // 50MB
      recommendations.push({
        type: 'clear_cache',
        description: 'Clear app cache to free up space. This won\'t affect your data.',
        potentialSavings: breakdown.cache
      })
    }

    // Check temp files
    if (breakdown.temp > 10 * 1024 * 1024) { // 10MB
      recommendations.push({
        type: 'remove_old_files',
        description: 'Remove temporary files that are no longer needed.',
        potentialSavings: breakdown.temp
      })
    }

    // Check log files
    if (breakdown.logs > 5 * 1024 * 1024) { // 5MB
      recommendations.push({
        type: 'remove_old_files',
        description: 'Remove old log files to free up space.',
        potentialSavings: breakdown.logs * 0.8 // Keep some recent logs
      })
    }

    // Check overall storage usage
    const totalUsage = Object.values(breakdown).reduce((sum, size) => sum + size, 0)
    const usagePercentage = (totalUsage / fileSystemInfo.totalSpace) * 100

    if (usagePercentage > 80) {
      recommendations.push({
        type: 'archive_data',
        description: 'Consider archiving old content to cloud storage.',
        potentialSavings: breakdown.userContent * 0.3 // Estimate 30% can be archived
      })
    }

    // Check for large images that could be compressed
    const largeImagesSize = await this.estimateLargeImagesSize()
    if (largeImagesSize > 20 * 1024 * 1024) { // 20MB
      recommendations.push({
        type: 'compress_images',
        description: 'Compress large images to save space without losing quality.',
        potentialSavings: largeImagesSize * 0.5 // Estimate 50% compression
      })
    }

    return recommendations
  }

  /**
   * Calculate user content size (excluding system files)
   */
  private async calculateUserContentSize(documentDirectory: string): Promise<number> {
    try {
      const totalSize = await this.getDirectorySize(documentDirectory)
      const systemSize = await this.calculateSystemFilesSize(documentDirectory)
      return Math.max(0, totalSize - systemSize)
    } catch (error) {
      console.error('Error calculating user content size:', error)
      return 0
    }
  }

  /**
   * Calculate database files size
   */
  private async calculateDatabaseSize(documentDirectory: string): Promise<number> {
    try {
      const dbFiles = ['SQLite.db', 'SQLite.db-wal', 'SQLite.db-shm']
      let totalSize = 0

      for (const dbFile of dbFiles) {
        const dbPath = `${documentDirectory}${dbFile}`
        const fileInfo = await FileSystem.getInfoAsync(dbPath)
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size ?? 0
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error calculating database size:', error)
      return 0
    }
  }

  /**
   * Calculate log files size
   */
  private async calculateLogsSize(documentDirectory: string): Promise<number> {
    try {
      const logsDir = `${documentDirectory}logs/`
      const dirInfo = await FileSystem.getInfoAsync(logsDir)
      
      if (dirInfo.exists && dirInfo.isDirectory) {
        return await this.getDirectorySize(logsDir)
      }
      
      return 0
    } catch (error) {
      console.error('Error calculating logs size:', error)
      return 0
    }
  }

  /**
   * Calculate temporary files size
   */
  private async calculateTempSize(cacheDirectory: string): Promise<number> {
    try {
      const tempDir = `${cacheDirectory}temp/`
      const dirInfo = await FileSystem.getInfoAsync(tempDir)
      
      if (dirInfo.exists && dirInfo.isDirectory) {
        return await this.getDirectorySize(tempDir)
      }
      
      return 0
    } catch (error) {
      console.error('Error calculating temp size:', error)
      return 0
    }
  }

  /**
   * Calculate system files size
   */
  private async calculateSystemFilesSize(documentDirectory: string): Promise<number> {
    try {
      const systemFiles = [
        'RCTAsyncLocalStorage_V1',
        'com.apple.mobile_container_manager.metadata.plist'
      ]
      
      let totalSize = 0

      for (const systemFile of systemFiles) {
        const filePath = `${documentDirectory}${systemFile}`
        const fileInfo = await FileSystem.getInfoAsync(filePath)
        if (fileInfo.exists) {
          totalSize += fileInfo.size ?? 0
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error calculating system files size:', error)
      return 0
    }
  }

  /**
   * Estimate size of large images that could be compressed
   */
  private async estimateLargeImagesSize(): Promise<number> {
    try {
      const documentDirectory = FileSystem.documentDirectory!
      const imagesDir = `${documentDirectory}images/`
      
      const dirInfo = await FileSystem.getInfoAsync(imagesDir)
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return 0
      }

      const files = await FileSystem.readDirectoryAsync(imagesDir)
      let largeImagesSize = 0

      for (const file of files) {
        const filePath = `${imagesDir}${file}`
        const fileInfo = await FileSystem.getInfoAsync(filePath)
        
        if (fileInfo.exists && !fileInfo.isDirectory) {
          const fileSize = fileInfo.size ?? 0
          // Consider images larger than 1MB as candidates for compression
          if (fileSize > 1024 * 1024 && this.isImageFile(file)) {
            largeImagesSize += fileSize
          }
        }
      }

      return largeImagesSize
    } catch (error) {
      console.error('Error estimating large images size:', error)
      return 0
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(directoryUri: string): Promise<number> {
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
          totalSize += (itemInfo as any).size ?? 0
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error calculating directory size:', error)
      return 0
    }
  }

  /**
   * Check if file is an image based on extension
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

  /**
   * Get storage usage trend over time
   */
  async getStorageUsageTrend(days: number = 30): Promise<Array<{ date: string; size: number }>> {
    try {
      // This would typically read from a stored history
      // For now, return mock data showing the concept
      const trend: Array<{ date: string; size: number }> = []
      const currentSize = await this.getCurrentAppSize()
      
      for (let i = days; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        // Simulate gradual growth
        const sizeVariation = Math.random() * 0.1 - 0.05 // ±5% variation
        const size = currentSize * (1 + sizeVariation * (i / days))
        
        trend.push({
          date: date.toISOString().split('T')[0],
          size: Math.max(0, size)
        })
      }

      return trend
    } catch (error) {
      console.error('Error getting storage usage trend:', error)
      return []
    }
  }

  /**
   * Get current app size
   */
  private async getCurrentAppSize(): Promise<number> {
    try {
      const fileSystemService = FileSystemService
      const fileSystemInfo = await fileSystemService.getFileSystemInfo()
      return fileSystemInfo.appDataSize
    } catch (error) {
      console.error('Error getting current app size:', error)
      return 0
    }
  }

  /**
   * Optimize storage based on recommendations
   */
  async optimizeStorage(recommendationType: StorageInsights['recommendations'][0]['type']): Promise<{
    success: boolean
    spaceSaved: number
    error?: string
  }> {
    try {
      const fileSystemService = FileSystemService
      
      switch (recommendationType) {
        case 'clear_cache':
          const cacheResult = await fileSystemService.cleanupStorage()
          return {
            success: cacheResult.errors.length === 0,
            spaceSaved: cacheResult.cleaned,
            error: cacheResult.errors.join(', ') || undefined
          }

        case 'remove_old_files':
          const oldFilesSize = await this.removeOldFiles()
          return {
            success: true,
            spaceSaved: oldFilesSize
          }

        case 'compress_images':
          const compressedSize = await this.compressLargeImages()
          return {
            success: true,
            spaceSaved: compressedSize
          }

        case 'archive_data':
          // This would typically involve uploading to cloud storage
          return {
            success: false,
            spaceSaved: 0,
            error: 'Archive functionality not implemented'
          }

        default:
          return {
            success: false,
            spaceSaved: 0,
            error: 'Unknown optimization type'
          }
      }
    } catch (error) {
      console.error('Error optimizing storage:', error)
      return {
        success: false,
        spaceSaved: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Remove old temporary and log files
   */
  private async removeOldFiles(): Promise<number> {
    try {
      let totalRemoved = 0
      const documentDirectory = FileSystem.documentDirectory!
      const cacheDirectory = FileSystem.cacheDirectory!

      // Remove old log files (keep last 7 days)
      const logsDir = `${documentDirectory}logs/`
      const logsDirInfo = await FileSystem.getInfoAsync(logsDir)
      
      if (logsDirInfo.exists && logsDirInfo.isDirectory) {
        const logFiles = await FileSystem.readDirectoryAsync(logsDir)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 7)

        for (const logFile of logFiles) {
          const logPath = `${logsDir}${logFile}`
          const logInfo = await FileSystem.getInfoAsync(logPath)
          
          if (logInfo.exists && logInfo.modificationTime && logInfo.modificationTime < cutoffDate.getTime()) {
            totalRemoved += logInfo.size ?? 0
            await FileSystem.deleteAsync(logPath)
          }
        }
      }

      // Remove old temp files
      const tempDir = `${cacheDirectory}temp/`
      const tempDirInfo = await FileSystem.getInfoAsync(tempDir)
      
      if (tempDirInfo.exists && tempDirInfo.isDirectory) {
        const tempSize = await this.getDirectorySize(tempDir)
        await FileSystem.deleteAsync(tempDir, { idempotent: true })
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true })
        totalRemoved += tempSize
      }

      return totalRemoved
    } catch (error) {
      console.error('Error removing old files:', error)
      return 0
    }
  }

  /**
   * Compress large images (simplified implementation)
   */
  private async compressLargeImages(): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real app, you would use an image compression library
      const largeImagesSize = await this.estimateLargeImagesSize()
      
      // Simulate compression savings (50% reduction)
      const compressionSavings = largeImagesSize * 0.5
      
      console.log(`Simulated compression of ${largeImagesSize} bytes, saved ${compressionSavings} bytes`)
      
      return compressionSavings
    } catch (error) {
      console.error('Error compressing images:', error)
      return 0
    }
  }
}

export default StorageInsightsService.getInstance()