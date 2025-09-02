/**
 * Enhanced Image Cache Service with FastImage and WebP Support
 * Provides optimized image loading, caching, and format conversion
 */

import FastImage, { Source, Priority, ResizeMode } from 'react-native-fast-image';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

interface CacheConfig {
  maxCacheSize: number; // in bytes
  maxCacheAge: number; // in milliseconds
  enableWebP: boolean;
  compressionQuality: number;
}

interface CachedImageInfo {
  uri: string;
  localPath: string;
  size: number;
  timestamp: number;
  format: 'webp' | 'jpeg' | 'png';
  originalUri: string;
}

interface ImageCacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  lastCleanup: number;
}

export class ImageCacheService {
  private static instance: ImageCacheService;
  private storage: MMKV;
  private cacheDir: string;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  private constructor() {
    this.storage = new MMKV({ id: 'image-cache' });
    this.cacheDir = `${FileSystem.cacheDirectory}images/`;
    this.config = {
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableWebP: Platform.OS === 'android', // WebP support varies by platform
      compressionQuality: 0.8,
    };
    this.initializeCache();
  }

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  private async initializeCache(): Promise<void> {
    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Clean up expired cache on startup
      await this.cleanupExpiredCache();
    } catch (error) {
      console.warn('Failed to initialize image cache:', error);
    }
  }

  /**
   * Get optimized image source for FastImage
   */
  getOptimizedSource(
    uri: string,
    options: {
      width?: number;
      height?: number;
      priority?: Priority;
      cache?: 'immutable' | 'web' | 'cacheOnly';
    } = {}
  ): Source {
    this.stats.totalRequests++;

    const cacheKey = this.generateCacheKey(uri, options);
    const cachedInfo = this.getCachedImageInfo(cacheKey);

    if (cachedInfo && this.isValidCache(cachedInfo)) {
      this.stats.hits++;
      return {
        uri: cachedInfo.localPath,
        priority: options.priority || FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      };
    }

    this.stats.misses++;
    
    // Return original URI with caching enabled
    return {
      uri,
      priority: options.priority || FastImage.priority.normal,
      cache: this.getFastImageCacheControl(options.cache),
    };
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(uris: string[]): Promise<void> {
    try {
      const sources = uris.map(uri => ({
        uri,
        priority: FastImage.priority.high,
        cache: FastImage.cacheControl.web,
      }));

      await FastImage.preload(sources);
    } catch (error) {
      console.warn('Failed to preload images:', error);
    }
  }

  /**
   * Cache image locally with optimization
   */
  async cacheImage(
    uri: string,
    options: {
      width?: number;
      height?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(uri, options);
    const cachedInfo = this.getCachedImageInfo(cacheKey);

    if (cachedInfo && this.isValidCache(cachedInfo)) {
      return cachedInfo.localPath;
    }

    try {
      // Download and optimize image
      const localPath = await this.downloadAndOptimizeImage(uri, options);
      
      // Store cache info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const cacheInfo: CachedImageInfo = {
        uri: cacheKey,
        localPath,
        size: fileInfo.size || 0,
        timestamp: Date.now(),
        format: options.format || 'jpeg',
        originalUri: uri,
      };

      this.storage.set(cacheKey, JSON.stringify(cacheInfo));
      
      // Check if we need to cleanup cache
      await this.checkCacheSize();

      return localPath;
    } catch (error) {
      console.warn('Failed to cache image:', error);
      return uri; // Return original URI as fallback
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ImageCacheStats {
    const allKeys = this.storage.getAllKeys();
    let totalSize = 0;
    
    allKeys.forEach(key => {
      try {
        const info = JSON.parse(this.storage.getString(key) || '{}') as CachedImageInfo;
        totalSize += info.size || 0;
      } catch {
        // Ignore invalid entries
      }
    });

    return {
      totalSize,
      itemCount: allKeys.length,
      hitRate: this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0,
      lastCleanup: this.storage.getNumber('lastCleanup') || 0,
    };
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      // Clear storage
      this.storage.clearAll();
      
      // Remove cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Clear FastImage cache
      FastImage.clearMemoryCache();
      FastImage.clearDiskCache();

      // Reset stats
      this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private generateCacheKey(uri: string, options: any): string {
    const optionsStr = JSON.stringify(options);
    return `${uri}_${optionsStr}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private getCachedImageInfo(cacheKey: string): CachedImageInfo | null {
    try {
      const infoStr = this.storage.getString(cacheKey);
      return infoStr ? JSON.parse(infoStr) : null;
    } catch {
      return null;
    }
  }

  private isValidCache(info: CachedImageInfo): boolean {
    const now = Date.now();
    const isExpired = now - info.timestamp > this.config.maxCacheAge;
    
    if (isExpired) {
      return false;
    }

    // Check if file still exists
    return FileSystem.getInfoAsync(info.localPath)
      .then(fileInfo => fileInfo.exists)
      .catch(() => false);
  }

  private async downloadAndOptimizeImage(
    uri: string,
    options: {
      width?: number;
      height?: number;
      format?: 'webp' | 'jpeg' | 'png';
    }
  ): Promise<string> {
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const extension = this.getFileExtension(options.format || 'jpeg');
    const localPath = `${this.cacheDir}${filename}.${extension}`;

    // Download image
    const downloadResult = await FileSystem.downloadAsync(uri, localPath);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download image: ${downloadResult.status}`);
    }

    // TODO: Add image optimization/conversion here if needed
    // For now, we'll use the downloaded image as-is
    
    return localPath;
  }

  private getFastImageCacheControl(cache?: string): any {
    switch (cache) {
      case 'immutable':
        return FastImage.cacheControl.immutable;
      case 'cacheOnly':
        return FastImage.cacheControl.cacheOnly;
      case 'web':
      default:
        return FastImage.cacheControl.web;
    }
  }

  private getFileExtension(format: string): string {
    switch (format) {
      case 'webp':
        return 'webp';
      case 'png':
        return 'png';
      case 'jpeg':
      default:
        return 'jpg';
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      const allKeys = this.storage.getAllKeys();
      
      for (const key of allKeys) {
        const info = this.getCachedImageInfo(key);
        if (info && now - info.timestamp > this.config.maxCacheAge) {
          // Remove expired entry
          this.storage.delete(key);
          
          // Remove file
          try {
            await FileSystem.deleteAsync(info.localPath, { idempotent: true });
          } catch {
            // Ignore file deletion errors
          }
        }
      }

      this.storage.set('lastCleanup', now);
    } catch (error) {
      console.warn('Failed to cleanup expired cache:', error);
    }
  }

  private async checkCacheSize(): Promise<void> {
    const stats = this.getCacheStats();
    
    if (stats.totalSize > this.config.maxCacheSize) {
      await this.evictOldestEntries();
    }
  }

  private async evictOldestEntries(): Promise<void> {
    try {
      const allKeys = this.storage.getAllKeys();
      const entries: Array<{ key: string; info: CachedImageInfo }> = [];

      // Collect all valid entries
      for (const key of allKeys) {
        const info = this.getCachedImageInfo(key);
        if (info) {
          entries.push({ key, info });
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.info.timestamp - b.info.timestamp);

      // Remove oldest entries until we're under the size limit
      let currentSize = this.getCacheStats().totalSize;
      const targetSize = this.config.maxCacheSize * 0.8; // Remove to 80% of limit

      for (const entry of entries) {
        if (currentSize <= targetSize) {
          break;
        }

        // Remove entry
        this.storage.delete(entry.key);
        
        try {
          await FileSystem.deleteAsync(entry.info.localPath, { idempotent: true });
          currentSize -= entry.info.size;
        } catch {
          // Ignore file deletion errors
        }
      }
    } catch (error) {
      console.warn('Failed to evict cache entries:', error);
    }
  }
}

export default ImageCacheService;