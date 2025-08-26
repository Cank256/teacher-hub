const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable Hermes
config.transformer.hermesCommand = 'hermes';

// Configure path aliases
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/features': path.resolve(__dirname, 'src/features'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/constants': path.resolve(__dirname, 'src/constants'),
  '@/store': path.resolve(__dirname, 'src/store'),
  '@/navigation': path.resolve(__dirname, 'src/navigation'),
};

// Optimize bundle size
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable RAM bundles for better performance
config.transformer.enableBabelRCLookup = false;

module.exports = config;