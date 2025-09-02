/**
 * Metro Configuration for Performance Optimization
 * Optimized for React Native New Architecture with Hermes
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable Hermes optimizations
config.transformer = {
  ...config.transformer,
  // Enable inline requires for better tree shaking
  inlineRequires: true,
  
  // Hermes precompilation settings
  hermesCommand: process.platform === 'darwin' 
    ? './node_modules/react-native/sdks/hermesc/osx-bin/hermesc'
    : './node_modules/react-native/sdks/hermesc/linux64-bin/hermesc',
  
  // Minification configuration
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
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
      drop_console: !__DEV__, // Remove console logs in production
    },
  },
  
  // Enable experimental features for better performance
  experimentalImportSupport: true,
  unstable_allowRequireContext: true,
};

// Serializer optimizations
config.serializer = {
  ...config.serializer,
  
  // Create stable module IDs for better caching
  createModuleIdFactory: () => {
    const projectRoot = path.resolve(__dirname);
    return (path) => {
      // Create deterministic module IDs based on file path
      const relativePath = path.replace(projectRoot, '');
      return relativePath.replace(/\W/g, '').toLowerCase();
    };
  },
  
  // Optimize module output
  processModuleFilter: (module) => {
    // Filter out unnecessary modules in production
    if (!__DEV__ && module.path.includes('__tests__')) {
      return false;
    }
    return true;
  },
};

// Resolver optimizations
config.resolver = {
  ...config.resolver,
  
  // Asset extensions with WebP support
  assetExts: [
    ...config.resolver.assetExts,
    'webp', // Add WebP support
  ],
  
  // Source extensions
  sourceExts: [
    ...config.resolver.sourceExts,
    'ts',
    'tsx',
  ],
  
  // Platform-specific extensions
  platforms: ['ios', 'android', 'native', 'web'],
  
  // Alias for better imports
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
  
  // Node modules to resolve
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
  ],
};

// Server optimizations
config.server = {
  ...config.server,
  
  // Enhanced middleware for development
  enhanceMiddleware: (middleware, server) => {
    // Add performance monitoring middleware
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) { // Log slow requests
          console.warn(`Slow request: ${req.url} took ${duration}ms`);
        }
      });
      
      return middleware(req, res, next);
    };
  },
};

// Watchman configuration for better file watching
config.watchFolders = [
  path.resolve(__dirname, '../../node_modules'),
];

// Cache configuration
config.cacheStores = [
  {
    name: 'FileStore',
    options: {
      cacheDirectory: path.resolve(__dirname, '.metro-cache'),
    },
  },
];

// Performance optimizations
config.maxWorkers = Math.max(1, Math.floor(require('os').cpus().length / 2));

// Reset cache configuration for better performance
config.resetCache = false;

// Transformer options for better performance
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;