/**
 * Content Download Manager
 * Handles selective content download and storage management
 */

import RNFS from 'react-native-fs'
import { DatabaseService } from '../storage/types'
import { StorageService } from '../storage/types'
import { 
  ContentDownloadRequest, 
  DownloadProgress, 
  DownloadStatus, 
  ResourceType,
  SyncPriority 
} from './types'

export class ContentDownloadManager {
  private db: DatabaseService
  private storage: StorageService
  private activeDownloads: Map<string, Promise<void>> = new Map()
  private downloadQueue: ContentDownloadRequest[] = []
  private isProcessingQueue = false
  private maxConcurrentDownloads = 3
  private downloadListeners: Map<string, (progress: DownloadProgress) => void> = new Map()

  constructor(db: DatabaseService, storage: StorageService) {
    this.db = db
    this.storage = storage
  }

  /**
   * Download content for offline access
   */
  async downloadContent(requests: ContentDownloadRequest[]): Promise<void> {
    // Add requests to queue
    for (const request of requests) {
      await this.queueDownload(request)
    }

    // Start processing queue
    this.processDownloadQueue()
  }

  /**
   * Download single resource
   */
  async downloadResource(
    resourceId: string,
    resourceType: ResourceType,
    url: string,
    priority: SyncPriority = SyncPriority.MEDIUM,
    metadata?: any
  ): Promise<void> {
    const request: ContentDownloadRequest = {
      resourceId,
      resourceType,
      priority,
      url,
      metadata
    }

    await this.queueDownload(request)
    this.processDownloadQueue()
  }

  /**
   * Cancel download
   */
  async cancelDownload(resourceId: string): Promise<void> {
    // Remove from queue
    this.downloadQueue = this.downloadQueue.filter(
      request => request.resourceId !== resourceId
    )

    // Cancel active download if exists
    const activeDownload = this.activeDownloads.get(resourceId)
    if (activeDownload) {
      // Note: RNFS doesn't support cancellation directly
      // We'll mark it as cancelled in the database
      await this.updateDownloadStatus(resourceId, DownloadStatus.CANCELLED)
      this.activeDownloads.delete(resourceId)
    }
  }

  /**
   * Pause download
   */
  async pauseDownload(resourceId: string): Promise<void> {
    await this.updateDownloadStatus(resourceId, DownloadStatus.PAUSED)
    
    // Remove from active downloads
    this.activeDownloads.delete(resourceId)
  }

  /**
   * Resume download
   */
  async resumeDownload(resourceId: string): Promise<void> {
    const downloadRecord = await this.getDownloadRecord(resourceId)
    if (!downloadRecord) return

    const request: ContentDownloadRequest = {
      resourceId: downloadRecord.resource_id,
      resourceType: downloadRecord.resource_type as ResourceType,
      priority: SyncPriority.MEDIUM,
      url: downloadRecord.file_url,
      metadata: downloadRecord.metadata ? JSON.parse(downloadRecord.metadata) : undefined
    }

    await this.queueDownload(request)
    this.processDownloadQueue()
  }

  /**
   * Remove downloaded content
   */
  async removeDownloadedContent(resourceIds: string[]): Promise<void> {
    for (const resourceId of resourceIds) {
      try {
        const downloadRecord = await this.getDownloadRecord(resourceId)
        if (downloadRecord && downloadRecord.local_path) {
          // Delete local file
          const fileExists = await RNFS.exists(downloadRecord.local_path)
          if (fileExists) {
            await RNFS.unlink(downloadRecord.local_path)
          }

          // Remove from database
          await this.db.execute(
            'DELETE FROM file_downloads WHERE resource_id = ?',
            [resourceId]
          )
        }
      } catch (error) {
        console.error(`Failed to remove downloaded content for ${resourceId}:`, error)
      }
    }
  }

  /**
   * Get download progress
   */
  async getDownloadProgress(resourceId: string): Promise<DownloadProgress | null> {
    const record = await this.getDownloadRecord(resourceId)
    if (!record) return null

    return {
      resourceId,
      progress: record.progress,
      downloadedBytes: record.downloaded_size,
      totalBytes: record.file_size,
      status: record.status as DownloadStatus,
      error: record.error_message
    }
  }

  /**
   * Get all downloads
   */
  async getAllDownloads(): Promise<DownloadProgress[]> {
    const sql = 'SELECT * FROM file_downloads ORDER BY started_at DESC'
    const records = await this.db.query<any>(sql)

    return records.map(record => ({
      resourceId: record.resource_id,
      progress: record.progress,
      downloadedBytes: record.downloaded_size,
      totalBytes: record.file_size,
      status: record.status as DownloadStatus,
      error: record.error_message
    }))
  }

  /**
   * Get downloads by status
   */
  async getDownloadsByStatus(status: DownloadStatus): Promise<DownloadProgress[]> {
    const sql = 'SELECT * FROM file_downloads WHERE status = ? ORDER BY started_at DESC'
    const records = await this.db.query<any>(sql, [status])

    return records.map(record => ({
      resourceId: record.resource_id,
      progress: record.progress,
      downloadedBytes: record.downloaded_size,
      totalBytes: record.file_size,
      status: record.status as DownloadStatus,
      error: record.error_message
    }))
  }

  /**
   * Check if resource is downloaded
   */
  async isResourceDownloaded(resourceId: string): Promise<boolean> {
    const record = await this.getDownloadRecord(resourceId)
    return record?.status === DownloadStatus.COMPLETED && 
           record.local_path && 
           await RNFS.exists(record.local_path)
  }

  /**
   * Get local file path for downloaded resource
   */
  async getLocalFilePath(resourceId: string): Promise<string | null> {
    const record = await this.getDownloadRecord(resourceId)
    if (record?.status === DownloadStatus.COMPLETED && record.local_path) {
      const exists = await RNFS.exists(record.local_path)
      return exists ? record.local_path : null
    }
    return null
  }

  /**
   * Get storage usage for downloads
   */
  async getStorageUsage(): Promise<{
    totalSize: number
    downloadCount: number
    byStatus: Record<DownloadStatus, number>
  }> {
    const sql = `
      SELECT 
        SUM(file_size) as total_size,
        COUNT(*) as download_count,
        status,
        COUNT(*) as status_count
      FROM file_downloads 
      GROUP BY status
    `
    
    const results = await this.db.query<any>(sql)
    
    const byStatus: Record<DownloadStatus, number> = {
      [DownloadStatus.PENDING]: 0,
      [DownloadStatus.DOWNLOADING]: 0,
      [DownloadStatus.COMPLETED]: 0,
      [DownloadStatus.FAILED]: 0,
      [DownloadStatus.PAUSED]: 0,
      [DownloadStatus.CANCELLED]: 0
    }

    let totalSize = 0
    let downloadCount = 0

    results.forEach(result => {
      totalSize += result.total_size || 0
      downloadCount += result.download_count || 0
      byStatus[result.status as DownloadStatus] = result.status_count || 0
    })

    return { totalSize, downloadCount, byStatus }
  }

  /**
   * Clean up failed and cancelled downloads
   */
  async cleanupFailedDownloads(): Promise<void> {
    const failedDownloads = await this.getDownloadsByStatus(DownloadStatus.FAILED)
    const cancelledDownloads = await this.getDownloadsByStatus(DownloadStatus.CANCELLED)
    
    const toCleanup = [...failedDownloads, ...cancelledDownloads]
    
    for (const download of toCleanup) {
      try {
        const record = await this.getDownloadRecord(download.resourceId)
        if (record?.local_path) {
          const exists = await RNFS.exists(record.local_path)
          if (exists) {
            await RNFS.unlink(record.local_path)
          }
        }
        
        await this.db.execute(
          'DELETE FROM file_downloads WHERE resource_id = ?',
          [download.resourceId]
        )
      } catch (error) {
        console.error(`Failed to cleanup download ${download.resourceId}:`, error)
      }
    }
  }

  /**
   * Add download progress listener
   */
  addProgressListener(
    resourceId: string, 
    listener: (progress: DownloadProgress) => void
  ): () => void {
    this.downloadListeners.set(resourceId, listener)
    
    return () => {
      this.downloadListeners.delete(resourceId)
    }
  }

  /**
   * Queue download request
   */
  private async queueDownload(request: ContentDownloadRequest): Promise<void> {
    // Check if already downloaded
    if (await this.isResourceDownloaded(request.resourceId)) {
      return
    }

    // Check if already in queue or downloading
    const existsInQueue = this.downloadQueue.some(
      req => req.resourceId === request.resourceId
    )
    const isActivelyDownloading = this.activeDownloads.has(request.resourceId)

    if (existsInQueue || isActivelyDownloading) {
      return
    }

    // Add to queue with priority sorting
    this.downloadQueue.push(request)
    this.downloadQueue.sort((a, b) => b.priority - a.priority)

    // Create download record
    await this.createDownloadRecord(request)
  }

  /**
   * Process download queue
   */
  private async processDownloadQueue(): Promise<void> {
    if (this.isProcessingQueue) return

    this.isProcessingQueue = true

    try {
      while (this.downloadQueue.length > 0 && 
             this.activeDownloads.size < this.maxConcurrentDownloads) {
        
        const request = this.downloadQueue.shift()
        if (!request) break

        // Start download
        const downloadPromise = this.performDownload(request)
        this.activeDownloads.set(request.resourceId, downloadPromise)

        // Clean up when download completes
        downloadPromise.finally(() => {
          this.activeDownloads.delete(request.resourceId)
          
          // Continue processing queue
          if (this.downloadQueue.length > 0) {
            this.processDownloadQueue()
          }
        })
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Perform actual download
   */
  private async performDownload(request: ContentDownloadRequest): Promise<void> {
    const { resourceId, url } = request

    try {
      await this.updateDownloadStatus(resourceId, DownloadStatus.DOWNLOADING)

      // Generate local file path
      const fileName = this.generateFileName(resourceId, url)
      const localPath = `${RNFS.DocumentDirectoryPath}/downloads/${fileName}`

      // Ensure downloads directory exists
      const downloadsDir = `${RNFS.DocumentDirectoryPath}/downloads`
      const dirExists = await RNFS.exists(downloadsDir)
      if (!dirExists) {
        await RNFS.mkdir(downloadsDir)
      }

      // Download file with progress tracking
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100
          this.updateDownloadProgress(resourceId, progress, res.bytesWritten, res.contentLength)
        }
      }).promise

      if (downloadResult.statusCode === 200) {
        // Get file stats
        const stats = await RNFS.stat(localPath)
        
        // Update download record
        await this.db.execute(`
          UPDATE file_downloads 
          SET status = ?, local_path = ?, file_size = ?, downloaded_size = ?, 
              progress = 100, completed_at = datetime('now')
          WHERE resource_id = ?
        `, [DownloadStatus.COMPLETED, localPath, stats.size, stats.size, resourceId])

        // Notify listener
        this.notifyProgressListener(resourceId, {
          resourceId,
          progress: 100,
          downloadedBytes: stats.size,
          totalBytes: stats.size,
          status: DownloadStatus.COMPLETED
        })
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await this.updateDownloadStatus(resourceId, DownloadStatus.FAILED, errorMessage)
      
      this.notifyProgressListener(resourceId, {
        resourceId,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: DownloadStatus.FAILED,
        error: errorMessage
      })
    }
  }

  /**
   * Create download record in database
   */
  private async createDownloadRecord(request: ContentDownloadRequest): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO file_downloads (
        id, resource_id, file_url, file_size, downloaded_size, 
        status, progress, started_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `

    await this.db.execute(sql, [
      `download_${request.resourceId}`,
      request.resourceId,
      request.url,
      request.expectedSize || 0,
      0,
      DownloadStatus.PENDING,
      0,
      request.metadata ? JSON.stringify(request.metadata) : null
    ])
  }

  /**
   * Update download status
   */
  private async updateDownloadStatus(
    resourceId: string, 
    status: DownloadStatus, 
    errorMessage?: string
  ): Promise<void> {
    const sql = `
      UPDATE file_downloads 
      SET status = ?, error_message = ?
      WHERE resource_id = ?
    `

    await this.db.execute(sql, [status, errorMessage || null, resourceId])
  }

  /**
   * Update download progress
   */
  private async updateDownloadProgress(
    resourceId: string,
    progress: number,
    downloadedBytes: number,
    totalBytes: number
  ): Promise<void> {
    const sql = `
      UPDATE file_downloads 
      SET progress = ?, downloaded_size = ?, file_size = ?
      WHERE resource_id = ?
    `

    await this.db.execute(sql, [progress, downloadedBytes, totalBytes, resourceId])

    // Notify listener
    this.notifyProgressListener(resourceId, {
      resourceId,
      progress,
      downloadedBytes,
      totalBytes,
      status: DownloadStatus.DOWNLOADING
    })
  }

  /**
   * Get download record from database
   */
  private async getDownloadRecord(resourceId: string): Promise<any | null> {
    const sql = 'SELECT * FROM file_downloads WHERE resource_id = ?'
    return await this.db.queryFirst<any>(sql, [resourceId])
  }

  /**
   * Generate file name for download
   */
  private generateFileName(resourceId: string, url: string): string {
    const urlParts = url.split('/')
    const originalName = urlParts[urlParts.length - 1] || 'download'
    const extension = originalName.includes('.') ? originalName.split('.').pop() : 'bin'
    
    return `${resourceId}.${extension}`
  }

  /**
   * Notify progress listener
   */
  private notifyProgressListener(resourceId: string, progress: DownloadProgress): void {
    const listener = this.downloadListeners.get(resourceId)
    if (listener) {
      try {
        listener(progress)
      } catch (error) {
        console.error(`Error in download progress listener for ${resourceId}:`, error)
      }
    }
  }
}