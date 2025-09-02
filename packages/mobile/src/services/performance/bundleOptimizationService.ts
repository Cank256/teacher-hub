/**
 * Bundle Optimization Service
 * Handles bundle analysis, optimization, and Hermes precompilation
 */

import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import MonitoringService from '@/services/monitoring';

interface BundleConfig {
  enableHermesPrecompilation: boolean;
  enableInlineRequires: boolean;
  enableRAMBundles: boolean;
  minifyEnabled: boolean;
  enableProGuard: boolean; // Android only
  enableBitcode: boolean; // iOS only
}

interface BundleStats {
  totalSize: number;
  jsSize: number;
  assetsSize: number;
  hermesEnabled: boolean;
  buildTime: number;
  optimizationLevel: 'none' | 'basic' | 'aggressive';
  lastOptimized: number;
}

interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  optimizationTime: number;
  techniques: string[];
}

export class BundleOptimizationService {
  private static instance: BundleOptimizationService;
  private storage: MMKV;
  private config: BundleConfig;
  private stats: BundleStats;

  private constructor() {
    this.storage = new MMKV({ id: 'bundle-optimization' });
    this.config = {
      enableHermesPrecompilation: true,
      enableInlineRequires: true,
      enableRAMBundles: Platform.OS === 'android',
      minifyEnabled: !__DEV__,
      enableProGuard: Platform.OS === 'android' && !__DEV__,
      enableBitcode: Platform.OS === 'ios' && !__DEV__,
    };
    this.stats = this.loadStoredStats();
    this.initializeOptimization();
  }

  static getInstance(): BundleOptimizationService {
    if (!BundleOptimizationService.instance) {
      BundleOptimizationService.instance = new BundleOptimizationService();
    }
    return BundleOptimizationService.instance;
  }

  /**
   * Get current bundle configuration
   */
  getBundleConfig(): BundleConfig {
    return { ...this.config };
  }

  /**
   * Update bundle configuration
   */
  updateConfig(newConfig: Partial<BundleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    MonitoringService.addBreadcrumb({
      message: 'Bundle configuration updated',
      category: 'performance',
      level: 'info',
      data: newConfig,
    });
  }

  /**
   * Get bundle statistics
   */
  getBundleStats(): BundleStats {
    return { ...this.stats };
  }

  /**
   * Analyze bundle size and composition
   */
  analyzeBundleSize(): {
    breakdown: {
      javascript: number;
      images: number;
      fonts: number;
      other: number;
    };
    recommendations: string[];
    optimizationPotential: number;
  } {
    // This would typically analyze the actual bundle
    // For now, provide simulated analysis
    const breakdown = {
      javascript: this.stats.jsSize || 2.5 * 1024 * 1024, // 2.5MB
      images: 1.2 * 1024 * 1024, // 1.2MB
      fonts: 0.3 * 1024 * 1024, // 300KB
      other: 0.5 * 1024 * 1024, // 500KB
    };

    const recommendations: string[] = [];
    let optimizationPotential = 0;

    // Analyze JavaScript bundle
    if (breakdown.javascript > 3 * 1024 * 1024) { // > 3MB
      recommendations.push('Consider code splitting and lazy loading for large features');
      optimizationPotential += 0.3;
    }

    if (!this.config.enableInlineRequires) {
      recommendations.push('Enable inline requires to reduce startup time');
      optimizationPotential += 0.15;
    }

    if (!this.config.enableHermesPrecompilation) {
      recommendations.push('Enable Hermes precompilation for better performance');
      optimizationPotential += 0.25;
    }

    // Analyze assets
    if (breakdown.images > 2 * 1024 * 1024) { // > 2MB
      recommendations.push('Optimize images using WebP format and compression');
      optimizationPotential += 0.2;
    }

    if (breakdown.fonts > 500 * 1024) { // > 500KB
      recommendations.push('Consider using system fonts or subset custom fonts');
      optimizationPotential += 0.1;
    }

    return {
      breakdown,
      recommendations,
      optimizationPotential: Math.min(optimizationPotential, 0.8), // Cap at 80%
    };
  }

  /**
   * Get Hermes optimization recommendations
   */
  getHermesOptimizations(): {
    enabled: boolean;
    benefits: string[];
    recommendations: string[];
    estimatedImprovement: {
      startupTime: number; // percentage
      memoryUsage: number; // percentage
      bundleSize: number; // percentage
    };
  } {
    const benefits = [
      'Faster app startup time',
      'Reduced memory usage',
      'Better garbage collection',
      'Improved performance on low-end devices',
      'Smaller bundle size with precompilation',
    ];

    const recommendations = [];
    
    if (!this.config.enableHermesPrecompilation) {
      recommendations.push('Enable Hermes precompilation in build configuration');
    }

    if (!this.config.enableInlineRequires) {
      recommendations.push('Enable inline requires for better tree shaking');
    }

    recommendations.push('Use Hermes-optimized code patterns');
    recommendations.push('Avoid eval() and Function() constructors');
    recommendations.push('Minimize use of dynamic imports in hot paths');

    return {
      enabled: this.stats.hermesEnabled,
      benefits,
      recommendations,
      estimatedImprovement: {
        startupTime: this.stats.hermesEnabled ? 0 : 30, // 30% faster startup
        memoryUsage: this.stats.hermesEnabled ? 0 : 20, // 20% less memory
        bundleSize: this.config.enableHermesPrecompilation ? 15 : 0, // 15% smaller with precompilation
      },
    };
  }

  /**
   * Generate Metro configuration for optimization
   */
  generateMetroConfig(): {
    transformer: any;
    serializer: any;
    resolver: any;
    server: any;
  } {
    return {
      transformer: {
        // Enable Hermes
        hermesCommand: this.config.enableHermesPrecompilation 
          ? Platform.OS === 'ios' 
            ? './node_modules/react-native/sdks/hermesc/osx-bin/hermesc'
            : './node_modules/react-native/sdks/hermesc/linux64-bin/hermesc'
          : undefined,
        
        // Enable inline requires
        inlineRequires: this.config.enableInlineRequires,
        
        // Minification
        minifierConfig: {
          mangle: this.config.minifyEnabled,
          output: {
            ascii_only: true,
            quote_style: 3,
            wrap_iife: true,
          },
          sourceMap: {
            includeSources: false,
          },
          toplevel: false,
          compress: {
            reduce_funcs: false,
          },
        },
      },
      
      serializer: {
        // Enable RAM bundles for Android
        createModuleIdFactory: this.config.enableRAMBundles 
          ? () => (path: string) => {
              // Create stable module IDs
              return path.replace(/\W/g, '').toLowerCase();
            }
          : undefined,
      },
      
      resolver: {
        // Asset resolution optimizations
        assetExts: [
          'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp',
          'mp4', 'webm', 'wav', 'mp3', 'm4a', 'aac', 'oga',
          'ttf', 'otf', 'woff', 'woff2',
        ],
        sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
      },
      
      server: {
        // Development server optimizations
        enhanceMiddleware: (middleware: any) => {
          return middleware;
        },
      },
    };
  }

  /**
   * Generate build optimization recommendations
   */
  getBuildOptimizations(): {
    android: {
      gradle: Record<string, any>;
      proguard: string[];
    };
    ios: {
      xcode: Record<string, any>;
      buildSettings: Record<string, any>;
    };
    general: string[];
  } {
    return {
      android: {
        gradle: {
          // Enable ProGuard/R8
          minifyEnabled: this.config.enableProGuard,
          shrinkResources: this.config.enableProGuard,
          
          // Enable multidex if needed
          multiDexEnabled: true,
          
          // Optimize APK
          zipAlignEnabled: true,
          
          // Build optimizations
          dexOptions: {
            jumboMode: true,
            preDexLibraries: true,
          },
        },
        proguard: [
          '-keep class com.facebook.react.** { *; }',
          '-keep class com.facebook.hermes.** { *; }',
          '-dontwarn com.facebook.react.**',
          '-dontwarn com.facebook.hermes.**',
        ],
      },
      
      ios: {
        xcode: {
          // Enable Bitcode
          ENABLE_BITCODE: this.config.enableBitcode ? 'YES' : 'NO',
          
          // Optimization level
          GCC_OPTIMIZATION_LEVEL: __DEV__ ? '0' : 's', // Optimize for size
          
          // Dead code stripping
          DEAD_CODE_STRIPPING: 'YES',
          
          // Link-time optimization
          LLVM_LTO: __DEV__ ? 'NO' : 'YES',
        },
        buildSettings: {
          // Swift optimization
          SWIFT_OPTIMIZATION_LEVEL: __DEV__ ? '-Onone' : '-O',
          
          // Asset catalog optimization
          ASSETCATALOG_COMPILER_OPTIMIZATION: 'time',
        },
      },
      
      general: [
        'Use vector icons instead of multiple PNG sizes',
        'Implement image lazy loading and caching',
        'Remove unused dependencies and code',
        'Use tree shaking to eliminate dead code',
        'Optimize font loading and subset fonts',
        'Implement code splitting for large features',
        'Use production builds for performance testing',
      ],
    };
  }

  /**
   * Simulate bundle optimization
   */
  async simulateOptimization(): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = this.stats.totalSize || 5 * 1024 * 1024; // 5MB default
    
    const techniques: string[] = [];
    let optimizedSize = originalSize;
    
    // Simulate various optimization techniques
    if (this.config.enableHermesPrecompilation) {
      optimizedSize *= 0.85; // 15% reduction
      techniques.push('Hermes precompilation');
    }
    
    if (this.config.enableInlineRequires) {
      optimizedSize *= 0.92; // 8% reduction
      techniques.push('Inline requires');
    }
    
    if (this.config.minifyEnabled) {
      optimizedSize *= 0.88; // 12% reduction
      techniques.push('Code minification');
    }
    
    if (this.config.enableRAMBundles) {
      // RAM bundles don't reduce size but improve startup
      techniques.push('RAM bundles');
    }
    
    const optimizationTime = Date.now() - startTime;
    const compressionRatio = (originalSize - optimizedSize) / originalSize;
    
    // Update stats
    this.stats.totalSize = optimizedSize;
    this.stats.lastOptimized = Date.now();
    this.stats.optimizationLevel = compressionRatio > 0.3 ? 'aggressive' : 
                                   compressionRatio > 0.1 ? 'basic' : 'none';
    
    this.saveStats();
    
    MonitoringService.addBreadcrumb({
      message: 'Bundle optimization simulated',
      category: 'performance',
      level: 'info',
      data: {
        originalSize: Math.round(originalSize / 1024),
        optimizedSize: Math.round(optimizedSize / 1024),
        compressionRatio: Math.round(compressionRatio * 100),
        techniques,
      },
    });
    
    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      optimizationTime,
      techniques,
    };
  }

  private initializeOptimization(): void {
    // Check if Hermes is enabled
    this.stats.hermesEnabled = this.isHermesEnabled();
    
    MonitoringService.addBreadcrumb({
      message: 'Bundle optimization service initialized',
      category: 'performance',
      level: 'info',
      data: {
        hermesEnabled: this.stats.hermesEnabled,
        platform: Platform.OS,
      },
    });
  }

  private isHermesEnabled(): boolean {
    // Check if Hermes is enabled in the current build
    // This would typically check build configuration or runtime flags
    return global.HermesInternal != null;
  }

  private loadStoredStats(): BundleStats {
    try {
      const stored = this.storage.getString('bundleStats');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored bundle stats:', error);
    }

    return {
      totalSize: 0,
      jsSize: 0,
      assetsSize: 0,
      hermesEnabled: false,
      buildTime: 0,
      optimizationLevel: 'none',
      lastOptimized: 0,
    };
  }

  private saveStats(): void {
    try {
      this.storage.set('bundleStats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save bundle stats:', error);
    }
  }

  private saveConfig(): void {
    try {
      this.storage.set('bundleConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save bundle config:', error);
    }
  }
}

export default BundleOptimizationService;