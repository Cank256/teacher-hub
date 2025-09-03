/**
 * Metro Configuration
 * Basic configuration for React Native with Expo
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias for better imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// Add support for additional file extensions
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config;