#!/usr/bin/env node

/**
 * Feature Flags Update Script
 * Updates feature flags configuration from remote source
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.teacherhub.ug',
  adminApiKey: process.env.ADMIN_API_KEY,
  configFile: path.join(__dirname, '..', 'src', 'config', 'feature-flags.json'),
  backupDir: path.join(__dirname, '..', 'backups', 'feature-flags')
};

class FeatureFlagsUpdater {
  constructor() {
    this.currentConfig = null;
    this.newConfig = null;
  }

  async run() {
    console.log('🚀 Feature Flags Update Tool');
    console.log('=' .repeat(50));

    try {
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Fetch new configuration from remote
      await this.fetchRemoteConfig();
      
      // Compare configurations
      const changes = this.compareConfigurations();
      
      if (changes.length === 0) {
        console.log('✅ No changes detected. Feature flags are up to date.');
        return;
      }

      // Show changes
      this.displayChanges(changes);
      
      // Create backup
      await this.createBackup();
      
      // Update configuration
      await this.updateConfiguration();
      
      // Validate new configuration
      await this.validateConfiguration();
      
      console.log('✅ Feature flags updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating feature flags:', error.message);
      process.exit(1);
    }
  }

  async loadCurrentConfig() {
    console.log('📖 Loading current configuration...');
    
    try {
      if (fs.existsSync(CONFIG.configFile)) {
        const configData = fs.readFileSync(CONFIG.configFile, 'utf8');
        this.currentConfig = JSON.parse(configData);
        console.log(`  ✅ Loaded ${Object.keys(this.currentConfig.featureFlags || {}).length} feature flags`);
      } else {
        console.log('  ⚠️  No existing configuration file found');
        this.currentConfig = {
          featureFlags: {},
          killSwitches: {},
          lastUpdated: 0,
          version: '1.0.0'
        };
      }
    } catch (error) {
      throw new Error(`Failed to load current configuration: ${error.message}`);
    }
  }

  async fetchRemoteConfig() {
    console.log('🌐 Fetching remote configuration...');
    
    try {
      const response = await this.makeApiCall('GET', '/admin/feature-flags/config');
      this.newConfig = response;
      
      console.log(`  ✅ Fetched ${Object.keys(this.newConfig.featureFlags || {}).length} feature flags`);
      console.log(`  📅 Remote version: ${this.newConfig.version}`);
      console.log(`  🕒 Last updated: ${new Date(this.newConfig.lastUpdated).toLocaleString()}`);
      
    } catch (error) {
      throw new Error(`Failed to fetch remote configuration: ${error.message}`);
    }
  }

  compareConfigurations() {
    console.log('🔍 Comparing configurations...');
    
    const changes = [];
    const currentFlags = this.currentConfig.featureFlags || {};
    const newFlags = this.newConfig.featureFlags || {};
    const currentKillSwitches = this.currentConfig.killSwitches || {};
    const newKillSwitches = this.newConfig.killSwitches || {};

    // Check for new flags
    Object.keys(newFlags).forEach(key => {
      if (!currentFlags[key]) {
        changes.push({
          type: 'added',
          category: 'feature_flag',
          key,
          newValue: newFlags[key]
        });
      } else if (JSON.stringify(currentFlags[key]) !== JSON.stringify(newFlags[key])) {
        changes.push({
          type: 'modified',
          category: 'feature_flag',
          key,
          oldValue: currentFlags[key],
          newValue: newFlags[key]
        });
      }
    });

    // Check for removed flags
    Object.keys(currentFlags).forEach(key => {
      if (!newFlags[key]) {
        changes.push({
          type: 'removed',
          category: 'feature_flag',
          key,
          oldValue: currentFlags[key]
        });
      }
    });

    // Check kill switches
    Object.keys(newKillSwitches).forEach(key => {
      if (!currentKillSwitches[key]) {
        changes.push({
          type: 'added',
          category: 'kill_switch',
          key,
          newValue: newKillSwitches[key]
        });
      } else if (currentKillSwitches[key] !== newKillSwitches[key]) {
        changes.push({
          type: 'modified',
          category: 'kill_switch',
          key,
          oldValue: currentKillSwitches[key],
          newValue: newKillSwitches[key]
        });
      }
    });

    Object.keys(currentKillSwitches).forEach(key => {
      if (!newKillSwitches[key]) {
        changes.push({
          type: 'removed',
          category: 'kill_switch',
          key,
          oldValue: currentKillSwitches[key]
        });
      }
    });

    console.log(`  📊 Found ${changes.length} changes`);
    return changes;
  }

  displayChanges(changes) {
    console.log('\n📋 Configuration Changes:');
    console.log('-'.repeat(50));

    const groupedChanges = {
      feature_flag: changes.filter(c => c.category === 'feature_flag'),
      kill_switch: changes.filter(c => c.category === 'kill_switch')
    };

    Object.entries(groupedChanges).forEach(([category, categoryChanges]) => {
      if (categoryChanges.length === 0) return;

      console.log(`\n${category === 'feature_flag' ? '🚩' : '🔴'} ${category.replace('_', ' ').toUpperCase()}S:`);
      
      categoryChanges.forEach(change => {
        const emoji = change.type === 'added' ? '➕' : 
                     change.type === 'removed' ? '➖' : '🔄';
        
        console.log(`  ${emoji} ${change.type.toUpperCase()}: ${change.key}`);
        
        if (change.type === 'modified') {
          if (category === 'feature_flag') {
            console.log(`    Old: enabled=${change.oldValue.enabled}, rollout=${change.oldValue.rolloutPercentage || 100}%`);
            console.log(`    New: enabled=${change.newValue.enabled}, rollout=${change.newValue.rolloutPercentage || 100}%`);
          } else {
            console.log(`    Old: ${change.oldValue}`);
            console.log(`    New: ${change.newValue}`);
          }
        } else if (change.type === 'added') {
          if (category === 'feature_flag') {
            console.log(`    Config: enabled=${change.newValue.enabled}, rollout=${change.newValue.rolloutPercentage || 100}%`);
            console.log(`    Description: ${change.newValue.description || 'No description'}`);
          } else {
            console.log(`    Value: ${change.newValue}`);
          }
        }
        console.log('');
      });
    });
  }

  async createBackup() {
    console.log('💾 Creating backup...');
    
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
      }

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(CONFIG.backupDir, `feature-flags-${timestamp}.json`);
      
      // Write backup
      fs.writeFileSync(backupFile, JSON.stringify(this.currentConfig, null, 2));
      
      console.log(`  ✅ Backup created: ${backupFile}`);
      
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async updateConfiguration() {
    console.log('🔄 Updating configuration...');
    
    try {
      // Ensure config directory exists
      const configDir = path.dirname(CONFIG.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write new configuration
      fs.writeFileSync(CONFIG.configFile, JSON.stringify(this.newConfig, null, 2));
      
      console.log('  ✅ Configuration file updated');
      
    } catch (error) {
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  async validateConfiguration() {
    console.log('✅ Validating configuration...');
    
    try {
      // Read the file back to ensure it's valid JSON
      const configData = fs.readFileSync(CONFIG.configFile, 'utf8');
      const parsedConfig = JSON.parse(configData);
      
      // Basic validation
      if (!parsedConfig.featureFlags || typeof parsedConfig.featureFlags !== 'object') {
        throw new Error('Invalid featureFlags structure');
      }
      
      if (!parsedConfig.killSwitches || typeof parsedConfig.killSwitches !== 'object') {
        throw new Error('Invalid killSwitches structure');
      }
      
      if (!parsedConfig.version || typeof parsedConfig.version !== 'string') {
        throw new Error('Invalid version');
      }
      
      if (!parsedConfig.lastUpdated || typeof parsedConfig.lastUpdated !== 'number') {
        throw new Error('Invalid lastUpdated timestamp');
      }

      // Validate individual feature flags
      Object.entries(parsedConfig.featureFlags).forEach(([key, flag]) => {
        if (typeof flag.enabled !== 'boolean') {
          throw new Error(`Feature flag ${key} has invalid enabled value`);
        }
        
        if (flag.rolloutPercentage !== undefined && 
            (typeof flag.rolloutPercentage !== 'number' || 
             flag.rolloutPercentage < 0 || 
             flag.rolloutPercentage > 100)) {
          throw new Error(`Feature flag ${key} has invalid rolloutPercentage`);
        }
      });

      console.log('  ✅ Configuration is valid');
      console.log(`  📊 ${Object.keys(parsedConfig.featureFlags).length} feature flags`);
      console.log(`  🔴 ${Object.keys(parsedConfig.killSwitches).length} kill switches`);
      
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  }

  makeApiCall(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, CONFIG.apiUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TeacherHub-FeatureFlags-Updater/1.0'
        }
      };

      // Add authentication if available
      if (CONFIG.adminApiKey) {
        options.headers['Authorization'] = `Bearer ${CONFIG.adminApiKey}`;
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const request = https.request(url, options, (response) => {
        let responseData = '';
        
        response.on('data', (chunk) => {
          responseData += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(responseData ? JSON.parse(responseData) : {});
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      if (data && (method === 'POST' || method === 'PUT')) {
        request.write(JSON.stringify(data));
      }
      
      request.end();
    });
  }

  // Utility method to show current feature flags status
  async showStatus() {
    console.log('📊 Current Feature Flags Status');
    console.log('=' .repeat(50));

    try {
      await this.loadCurrentConfig();
      
      const flags = this.currentConfig.featureFlags || {};
      const killSwitches = this.currentConfig.killSwitches || {};
      
      console.log(`Version: ${this.currentConfig.version}`);
      console.log(`Last Updated: ${new Date(this.currentConfig.lastUpdated).toLocaleString()}\n`);
      
      console.log('🚩 Feature Flags:');
      Object.entries(flags).forEach(([key, flag]) => {
        const status = flag.enabled ? '✅' : '❌';
        const rollout = flag.rolloutPercentage !== undefined ? ` (${flag.rolloutPercentage}%)` : '';
        console.log(`  ${status} ${key}${rollout}`);
        if (flag.description) {
          console.log(`     ${flag.description}`);
        }
      });
      
      if (Object.keys(killSwitches).length > 0) {
        console.log('\n🔴 Active Kill Switches:');
        Object.entries(killSwitches).forEach(([key, active]) => {
          if (active) {
            console.log(`  🔴 ${key}`);
          }
        });
      } else {
        console.log('\n✅ No active kill switches');
      }
      
    } catch (error) {
      console.error('❌ Error showing status:', error.message);
    }
  }
}

// Command line interface
if (require.main === module) {
  const updater = new FeatureFlagsUpdater();
  
  const command = process.argv[2];
  
  if (command === 'status') {
    updater.showStatus();
  } else if (command === 'update' || !command) {
    updater.run();
  } else {
    console.log('Usage:');
    console.log('  node update-feature-flags.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  update (default) - Update feature flags from remote');
    console.log('  status          - Show current feature flags status');
  }
}

module.exports = FeatureFlagsUpdater;