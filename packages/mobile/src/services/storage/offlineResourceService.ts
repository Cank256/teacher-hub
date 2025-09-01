import RNFS from 'react-native-fs';
import { MMKV } from 'react-native-mmkv';
import type {
  Resource,
  CachedResource,
  CachePriority,
  OfflineResourceStatus,
  DownloadProgress,
} from '@/types/resources';

const storage = new MMKV({ id: 'offline-resources' });

export class OfflineResourceService {
  private static readonly CACHE_DIR = `${RNFS.DocumentDirectoryPath}/resources`;
  private static readonly MAX_STORAGE_SIZE = 500 * 1024 * 1024; // 500MB default
  private static readonly CACHE_KEY_PREFIX = 'cached_resource_';
  private static readonly METADATA_KEY = 'offline_resources_metadata';

  /**
   * Initialize the offline resource service
   */
  static async initialize(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirExists = await RNFS.exists(this.CACHE_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.CACHE_DIR);
      }

      // Clean up orphaned files
      await this.cleanupOrphanedFiles();
    } catch (error) {
      console.error('Failed to initialize offline resource service:', error);
    }
  }

  /**
   * Download a resource for offline access
   */
  static async downloadResource(
    resource: Resource,
    priority: CachePriority = CachePriority.MEDIUM,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const fileName = this.generateFileName(resource);
    const localPath = `${this.CACHE_DIR}/${fileName}`;

    try {
      // Check if already downloaded
      const existingCache = this.getCachedResource(resource.id);
      if (existingCache && await RNFS.exists(existingCache.localPath)) {
        return existingCache.localPath;
      }

      // Check storage space
      const canDownload = await this.checkStorageSpace(resource.size);
      if (!canDownload) {
        await this.freeUpSpace(resource.size);
      }

      // Download the file
      const downloadResult = RNFS.downloadFile({
        fromUrl: resource.fileUrl,
        toFile: localPath,
        progress: (res) => {
          if (onProgress) {
            const progress: DownloadProgress = {
              resourceId: resource.id,
              loaded: res.bytesWritten,
              total: res.contentLength,
              percentage: Math.round((res.bytesWritten / res.contentLength) * 100),
            };
            onProgress(progress);
          }
        },
      });

      await downloadResult.promise;

      // Store cache metadata
      const cachedResource: CachedResource = {
        id: this.generateCacheId(),
        resourceId: resource.id,
        localPath,
        downloadedAt: new Date(),
        size: resource.size,
        priority,
      };

      this.storeCachedResource(cachedResource);
      this.updateMetadata();

      return localPath;
    } catch (error) {
      // Clean up partial download
      if (await RNFS.exists(localPath)) {
        await RNFS.unlink(localPath);
      }
      throw error;
    }
  }

  /**
   * Get cached resource info
   */
  static getCachedResource(resourceId: string): CachedResource | null {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${resourceId}`;
    const cached = storage.getString(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Check if resource is downloaded
   */
  static async isResourceDownloaded(resourceId: string): Promise<boolean> {
    const cached = this.getCachedResource(resourceId);
    if (!cached) return false;

    return await RNFS.exists(cached.localPath);
  }

  /**
   * Get local path for downloaded resource
   */
  static async getLocalPath(resourceId: string): Promise<string | null> {
    const cached = this.getCachedResource(resourceId);
    if (!cached) return null;

    const exists = await RNFS.exists(cached.localPath);
    return exists ? cached.localPath : null;
  }

  /**
   * Remove downloaded resource
   */
  static async removeResource(resourceId: string): Promise<void> {
    const cached = this.getCachedResource(resourceId);
    if (!cached) return;

    try {
      // Delete file
      if (await RNFS.exists(cached.localPath)) {
        await RNFS.unlink(cached.localPath);
      }

      // Remove from cache
      const cacheKey = `${this.CACHE_KEY_PREFIX}${resourceId}`;
      storage.delete(cacheKey);

      this.updateMetadata();
    } catch (error) {
      console.error('Failed to remove resource:', error);
    }
  }

  /**
   * Get all cached resources
   */
  static getAllCachedResources(): CachedResource[] {
    const keys = storage.getAllKeys().filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
    return keys.map(key => {
      const cached = storage.getString(key);
      return cached ? JSON.parse(cached) : null;
    }).filter(Boolean);
  }

  /**
   * Get offline resource status
   */
  static async getOfflineStatus(): Promise<OfflineResourceStatus> {
    const cachedResources = this.getAllCachedResources();
    const storageUsed = await this.calculateStorageUsed();

    return {
      totalResources: cachedResources.length,
      downloadedResources: cachedResources.length,
      storageUsed,
      storageLimit: this.getStorageLimit(),
      pendingDownloads: 0, // TODO: Implement download queue
    };
  }

  /**
   * Set storage limit
   */
  static setStorageLimit(limitInBytes: number): void {
    storage.set('storage_limit', limitInBytes);
  }

  /**
   * Get storage limit
   */
  static getStorageLimit(): number {
    return storage.getNumber('storage_limit') ?? this.MAX_STORAGE_SIZE;
  }

  /**
   * Clear all cached resources
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Delete all files
      const cachedResources = this.getAllCachedResources();
      for (const cached of cachedResources) {
        if (await RNFS.exists(cached.localPath)) {
          await RNFS.unlink(cached.localPath);
        }
      }

      // Clear cache metadata
      const keys = storage.getAllKeys().filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      keys.forEach(key => storage.delete(key));

      this.updateMetadata();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Free up space by removing least important resources
   */
  private static async freeUpSpace(requiredSpace: number): Promise<void> {
    const cachedResources = this.getAllCachedResources();
    
    // Sort by priority and age (oldest first)
    cachedResources.sort((a, b) => {
      const priorityOrder = {
        [CachePriority.CRITICAL]: 4,
        [CachePriority.HIGH]: 3,
        [CachePriority.MEDIUM]: 2,
        [CachePriority.LOW]: 1,
      };

      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      return new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime();
    });

    let freedSpace = 0;
    for (const cached of cachedResources) {
      if (freedSpace >= requiredSpace) break;

      await this.removeResource(cached.resourceId);
      freedSpace += cached.size;
    }
  }

  /**
   * Check if there's enough storage space
   */
  private static async checkStorageSpace(requiredSize: number): Promise<boolean> {
    const storageUsed = await this.calculateStorageUsed();
    const storageLimit = this.getStorageLimit();
    return (storageUsed + requiredSize) <= storageLimit;
  }

  /**
   * Calculate total storage used by cached resources
   */
  private static async calculateStorageUsed(): Promise<number> {
    try {
      const cachedResources = this.getAllCachedResources();
      let totalSize = 0;

      for (const cached of cachedResources) {
        if (await RNFS.exists(cached.localPath)) {
          const stat = await RNFS.stat(cached.localPath);
          totalSize += stat.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate storage used:', error);
      return 0;
    }
  }

  /**
   * Clean up orphaned files (files without metadata)
   */
  private static async cleanupOrphanedFiles(): Promise<void> {
    try {
      const files = await RNFS.readDir(this.CACHE_DIR);
      const cachedResources = this.getAllCachedResources();
      const validPaths = new Set(cachedResources.map(r => r.localPath));

      for (const file of files) {
        if (!validPaths.has(file.path)) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
    }
  }

  /**
   * Generate unique cache ID
   */
  private static generateCacheId(): string {
    return `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate file name for cached resource
   */
  private static generateFileName(resource: Resource): string {
    const extension = this.getFileExtension(resource.fileUrl);
    return `${resource.id}_${Date.now()}${extension}`;
  }

  /**
   * Get file extension from URL
   */
  private static getFileExtension(url: string): string {
    const match = url.match(/\.([^.?]+)(\?|$)/);
    return match ? `.${match[1]}` : '';
  }

  /**
   * Store cached resource metadata
   */
  private static storeCachedResource(cached: CachedResource): void {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${cached.resourceId}`;
    storage.set(cacheKey, JSON.stringify(cached));
  }

  /**
   * Update global metadata
   */
  private static updateMetadata(): void {
    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalCached: this.getAllCachedResources().length,
    };
    storage.set(this.METADATA_KEY, JSON.stringify(metadata));
  }

  /**
   * Get resource MIME type from file extension
   */
  static getMimeType(filePath: string): string {
    const extension = this.getFileExtension(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/mov',
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }
}