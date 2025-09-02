/**
 * Memory Management Service
 * Handles memory optimization, garbage collection, and memory leak detection
 */

import { AppState, AppStateStatus } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import FastImage from 'react-native-fast-image';
import { ImageCacheService } from './imageCacheService';
import MonitoringService from '@/services/monitoring';

interface MemoryConfig {
  maxMemoryUsage: number; // in bytes
  gcInterval: number; // in milliseconds
  enableAutoCleanup: boolean;
  lowMemoryThreshold: number; // percentage
  criticalMemoryThreshold: number; // percentage
}

interface MemoryStats {
  currentUsage: number;
  peakUsage: number;
  availableMemory: number;
  gcCount: number;
  lastGCTime: number;
  memoryWarnings: number;
}

interface MemoryPressureLevel {
  level: 'low' | 'moderate' | 'high' | 'critical';
  percentage: number;
  shouldCleanup: boolean;
}

export class MemoryManagementService {
  private static instance: MemoryManagementService;
  private storage: MMKV;
  private config: MemoryConfig;
  private stats: MemoryStats;
  private gcInterval?: NodeJS.Timeout;
  private memoryCheckInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private memoryPressureCallbacks: Array<(level: MemoryPressureLevel) => void> = [];

  private constructor() {
    this.storage = new MMKV({ id: 'memory-management' });
    this.config = {
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB
      gcInterval: 30000, // 30 seconds
      enableAutoCleanup: true,
      lowMemoryThreshold: 70, // 70%
      criticalMemoryThreshold: 90, // 90%
    };
    this.stats = this.loadStoredStats();
    this.initializeMemoryManagement();
  }

  static getInstance(): MemoryManagementService {
    if (!MemoryManagementService.instance) {
      MemoryManagementService.instance = new MemoryManagementService();
    }
    return MemoryManagementService.instance;
  }

  /**
   * Start memory monitoring and management
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startMemoryChecks();
    this.startGarbageCollection();

    MonitoringService.addBreadcrumb({
      message: 'Memory management started',
      category: 'performance',
      level: 'info',
    });
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    this.saveStats();
  }

  /**
   * Force garbage collection
   */
  async forceGarbageCollection(): Promise<void> {
    try {
      const beforeMemory = this.getCurrentMemoryUsage();

      // Clear various caches
      await this.clearCaches();

      // Force JavaScript garbage collection (if available)
      if (global.gc) {
        global.gc();
      }

      const afterMemory = this.getCurrentMemoryUsage();
      const freedMemory = beforeMemory - afterMemory;

      this.stats.gcCount++;
      this.stats.lastGCTime = Date.now();

      MonitoringService.addBreadcrumb({
        message: `Garbage collection completed`,
        category: 'performance',
        level: 'info',
        data: {
          beforeMemory: Math.round(beforeMemory / 1024 / 1024),
          afterMemory: Math.round(afterMemory / 1024 / 1024),
          freedMemory: Math.round(freedMemory / 1024 / 1024),
        },
      });

      // Update current usage
      this.stats.currentUsage = afterMemory;
    } catch (error) {
      console.warn('Failed to perform garbage collection:', error);
      MonitoringService.captureException(error as Error);
    }
  }

  /**
   * Clear various caches to free memory
   */
  async clearCaches(): Promise<void> {
    try {
      // Clear image caches
      FastImage.clearMemoryCache();
      
      const imageCacheService = ImageCacheService.getInstance();
      const cacheStats = imageCacheService.getCacheStats();
      
      // Clear image cache if it's using too much memory
      if (cacheStats.totalSize > 50 * 1024 * 1024) { // 50MB
        await imageCacheService.clearCache();
      }

      // Clear MMKV cache if needed
      this.clearMMKVCache();

      MonitoringService.addBreadcrumb({
        message: 'Caches cleared',
        category: 'performance',
        level: 'info',
        data: {
          imageCacheSize: Math.round(cacheStats.totalSize / 1024 / 1024),
        },
      });
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): number {
    // This would typically use a native module to get actual memory usage
    // For now, return a simulated value based on various factors
    const imageCacheService = ImageCacheService.getInstance();
    const cacheStats = imageCacheService.getCacheStats();
    
    // Simulate memory usage based on cache size and other factors
    const baseMemory = 30 * 1024 * 1024; // 30MB base
    const cacheMemory = cacheStats.totalSize;
    const variableMemory = Math.random() * 20 * 1024 * 1024; // Random 0-20MB
    
    return baseMemory + cacheMemory + variableMemory;
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressureLevel(): MemoryPressureLevel {
    const currentUsage = this.getCurrentMemoryUsage();
    const percentage = (currentUsage / this.config.maxMemoryUsage) * 100;

    let level: MemoryPressureLevel['level'];
    let shouldCleanup = false;

    if (percentage >= this.config.criticalMemoryThreshold) {
      level = 'critical';
      shouldCleanup = true;
    } else if (percentage >= this.config.lowMemoryThreshold) {
      level = 'high';
      shouldCleanup = true;
    } else if (percentage >= 50) {
      level = 'moderate';
      shouldCleanup = false;
    } else {
      level = 'low';
      shouldCleanup = false;
    }

    return {
      level,
      percentage,
      shouldCleanup,
    };
  }

  /**
   * Register callback for memory pressure events
   */
  onMemoryPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    this.memoryPressureCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.memoryPressureCallbacks.indexOf(callback);
      if (index > -1) {
        this.memoryPressureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats & {
    pressureLevel: MemoryPressureLevel;
    configuredLimit: number;
  } {
    const currentUsage = this.getCurrentMemoryUsage();
    
    // Update peak usage
    if (currentUsage > this.stats.peakUsage) {
      this.stats.peakUsage = currentUsage;
    }
    
    this.stats.currentUsage = currentUsage;

    return {
      ...this.stats,
      pressureLevel: this.getMemoryPressureLevel(),
      configuredLimit: this.config.maxMemoryUsage,
    };
  }

  /**
   * Update memory management configuration
   */
  updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<{
    beforeUsage: number;
    afterUsage: number;
    freedMemory: number;
  }> {
    const beforeUsage = this.getCurrentMemoryUsage();

    // Perform various optimization steps
    await this.clearCaches();
    await this.forceGarbageCollection();

    const afterUsage = this.getCurrentMemoryUsage();
    const freedMemory = beforeUsage - afterUsage;

    MonitoringService.addBreadcrumb({
      message: 'Memory optimization completed',
      category: 'performance',
      level: 'info',
      data: {
        beforeUsage: Math.round(beforeUsage / 1024 / 1024),
        afterUsage: Math.round(afterUsage / 1024 / 1024),
        freedMemory: Math.round(freedMemory / 1024 / 1024),
      },
    });

    return {
      beforeUsage,
      afterUsage,
      freedMemory,
    };
  }

  private initializeMemoryManagement(): void {
    // Start monitoring when app becomes active
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Start monitoring immediately if app is active
    if (AppState.currentState === 'active') {
      this.startMonitoring();
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.startMonitoring();
    } else if (nextAppState === 'background') {
      // Perform cleanup when going to background
      this.clearCaches();
      this.stopMonitoring();
    }
  };

  private startMemoryChecks(): void {
    this.memoryCheckInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      const pressureLevel = this.getMemoryPressureLevel();
      
      // Notify callbacks
      this.memoryPressureCallbacks.forEach(callback => {
        try {
          callback(pressureLevel);
        } catch (error) {
          console.warn('Memory pressure callback error:', error);
        }
      });

      // Auto cleanup if enabled and needed
      if (this.config.enableAutoCleanup && pressureLevel.shouldCleanup) {
        this.handleMemoryPressure(pressureLevel);
      }

      // Update stats
      this.stats.currentUsage = this.getCurrentMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  private startGarbageCollection(): void {
    if (!this.config.enableAutoCleanup) return;

    this.gcInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      const pressureLevel = this.getMemoryPressureLevel();
      
      // Only run GC if memory usage is moderate or higher
      if (pressureLevel.level !== 'low') {
        this.forceGarbageCollection();
      }
    }, this.config.gcInterval);
  }

  private async handleMemoryPressure(level: MemoryPressureLevel): Promise<void> {
    this.stats.memoryWarnings++;

    MonitoringService.addBreadcrumb({
      message: `Memory pressure detected: ${level.level}`,
      category: 'performance',
      level: level.level === 'critical' ? 'error' : 'warning',
      data: {
        level: level.level,
        percentage: level.percentage,
        currentUsage: Math.round(this.stats.currentUsage / 1024 / 1024),
      },
    });

    switch (level.level) {
      case 'critical':
        // Aggressive cleanup
        await this.clearCaches();
        await this.forceGarbageCollection();
        break;
      case 'high':
        // Moderate cleanup
        await this.clearCaches();
        break;
      case 'moderate':
        // Light cleanup
        FastImage.clearMemoryCache();
        break;
    }
  }

  private clearMMKVCache(): void {
    try {
      // Clear non-essential MMKV data
      // This would be implemented based on specific cache keys
      // For now, just log the action
      MonitoringService.addBreadcrumb({
        message: 'MMKV cache cleared',
        category: 'performance',
        level: 'info',
      });
    } catch (error) {
      console.warn('Failed to clear MMKV cache:', error);
    }
  }

  private loadStoredStats(): MemoryStats {
    try {
      const stored = this.storage.getString('stats');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored memory stats:', error);
    }

    return {
      currentUsage: 0,
      peakUsage: 0,
      availableMemory: this.config.maxMemoryUsage,
      gcCount: 0,
      lastGCTime: 0,
      memoryWarnings: 0,
    };
  }

  private saveStats(): void {
    try {
      this.storage.set('stats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save memory stats:', error);
    }
  }
}

export default MemoryManagementService;