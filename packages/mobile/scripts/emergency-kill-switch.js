#!/usr/bin/env node

/**
 * Emergency Kill Switch Script
 * Quickly disable features in production via feature flags
 */

const https = require('https');
const readline = require('readline');

// Configuration
const CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.teacherhub.ug',
  adminApiKey: process.env.ADMIN_API_KEY,
  confirmationRequired: true
};

// Available kill switches
const KILL_SWITCHES = {
  file_upload: {
    name: 'File Upload',
    description: 'Disable file upload functionality',
    risk: 'medium',
    impact: 'Users cannot upload files or resources'
  },
  real_time_messaging: {
    name: 'Real-time Messaging',
    description: 'Disable WebSocket messaging',
    risk: 'high',
    impact: 'Users cannot send/receive real-time messages'
  },
  offline_sync: {
    name: 'Offline Sync',
    description: 'Disable offline synchronization',
    risk: 'high',
    impact: 'Offline changes will not sync when online'
  },
  push_notifications: {
    name: 'Push Notifications',
    description: 'Disable push notification delivery',
    risk: 'medium',
    impact: 'Users will not receive push notifications'
  },
  external_links: {
    name: 'External Links',
    description: 'Disable external link navigation',
    risk: 'low',
    impact: 'External links will not open'
  },
  location_services: {
    name: 'Location Services',
    description: 'Disable location-based features',
    risk: 'low',
    impact: 'Location-based features unavailable'
  },
  ai_content_suggestions: {
    name: 'AI Content Suggestions',
    description: 'Disable AI-powered features',
    risk: 'low',
    impact: 'AI suggestions will not appear'
  },
  video_calling: {
    name: 'Video Calling',
    description: 'Disable video calling features',
    risk: 'medium',
    impact: 'Video calls will not work'
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Disable advanced analytics collection',
    risk: 'low',
    impact: 'Reduced analytics data collection'
  }
};

class EmergencyKillSwitch {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('🚨 Emergency Kill Switch Tool');
    console.log('=' .repeat(50));
    console.log('This tool allows you to quickly disable features in production.');
    console.log('Use only in emergency situations!\n');

    try {
      // Check authentication
      if (!CONFIG.adminApiKey) {
        throw new Error('ADMIN_API_KEY environment variable is required');
      }

      // Show available kill switches
      this.showAvailableKillSwitches();

      // Get user selection
      const action = await this.getAction();
      
      if (action === 'list') {
        await this.listActiveKillSwitches();
      } else if (action === 'activate') {
        await this.activateKillSwitch();
      } else if (action === 'deactivate') {
        await this.deactivateKillSwitch();
      } else if (action === 'status') {
        await this.showSystemStatus();
      } else {
        console.log('Operation cancelled.');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  showAvailableKillSwitches() {
    console.log('📋 Available Kill Switches:');
    console.log('-'.repeat(50));
    
    Object.entries(KILL_SWITCHES).forEach(([key, config]) => {
      const riskEmoji = config.risk === 'high' ? '🔴' : 
                       config.risk === 'medium' ? '🟡' : '🟢';
      console.log(`${riskEmoji} ${key}: ${config.name}`);
      console.log(`   ${config.description}`);
      console.log(`   Impact: ${config.impact}\n`);
    });
  }

  async getAction() {
    console.log('Available actions:');
    console.log('1. list - List active kill switches');
    console.log('2. activate - Activate a kill switch');
    console.log('3. deactivate - Deactivate a kill switch');
    console.log('4. status - Show system status');
    console.log('5. exit - Exit without changes\n');

    const answer = await this.question('Select an action (1-5): ');
    
    switch (answer.trim()) {
      case '1': return 'list';
      case '2': return 'activate';
      case '3': return 'deactivate';
      case '4': return 'status';
      case '5': return 'exit';
      default:
        console.log('Invalid selection. Please choose 1-5.');
        return this.getAction();
    }
  }

  async activateKillSwitch() {
    console.log('\n🔴 Activate Kill Switch');
    console.log('-'.repeat(30));

    // Show available switches
    const switches = Object.keys(KILL_SWITCHES);
    switches.forEach((key, index) => {
      const config = KILL_SWITCHES[key];
      const riskEmoji = config.risk === 'high' ? '🔴' : 
                       config.risk === 'medium' ? '🟡' : '🟢';
      console.log(`${index + 1}. ${riskEmoji} ${key} - ${config.name}`);
    });

    const selection = await this.question('\nSelect kill switch to activate (number): ');
    const index = parseInt(selection) - 1;
    
    if (index < 0 || index >= switches.length) {
      console.log('Invalid selection.');
      return;
    }

    const switchKey = switches[index];
    const config = KILL_SWITCHES[switchKey];

    // Show impact warning
    console.log(`\n⚠️  WARNING: Activating "${config.name}"`);
    console.log(`Description: ${config.description}`);
    console.log(`Risk Level: ${config.risk.toUpperCase()}`);
    console.log(`Impact: ${config.impact}`);

    // Require confirmation
    if (CONFIG.confirmationRequired) {
      const reason = await this.question('\nReason for activation (required): ');
      if (!reason.trim()) {
        console.log('Reason is required for kill switch activation.');
        return;
      }

      const confirm = await this.question(`\nType "ACTIVATE ${switchKey.toUpperCase()}" to confirm: `);
      if (confirm !== `ACTIVATE ${switchKey.toUpperCase()}`) {
        console.log('Confirmation failed. Kill switch not activated.');
        return;
      }
    }

    // Activate the kill switch
    try {
      console.log('\n🔄 Activating kill switch...');
      await this.makeApiCall('POST', '/admin/kill-switches', {
        switch: switchKey,
        action: 'activate',
        reason: reason || 'Emergency activation',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Kill switch "${switchKey}" activated successfully!`);
      console.log('📱 The change will take effect within 1-2 minutes for all users.');
      
      // Log the action
      this.logAction('ACTIVATE', switchKey, reason);
      
    } catch (error) {
      console.error(`❌ Failed to activate kill switch: ${error.message}`);
    }
  }

  async deactivateKillSwitch() {
    console.log('\n🟢 Deactivate Kill Switch');
    console.log('-'.repeat(30));

    try {
      // Get currently active kill switches
      const activeKillSwitches = await this.getActiveKillSwitches();
      
      if (activeKillSwitches.length === 0) {
        console.log('No active kill switches found.');
        return;
      }

      // Show active switches
      activeKillSwitches.forEach((switchKey, index) => {
        const config = KILL_SWITCHES[switchKey] || { name: switchKey, description: 'Unknown' };
        console.log(`${index + 1}. ${switchKey} - ${config.name}`);
      });

      const selection = await this.question('\nSelect kill switch to deactivate (number): ');
      const index = parseInt(selection) - 1;
      
      if (index < 0 || index >= activeKillSwitches.length) {
        console.log('Invalid selection.');
        return;
      }

      const switchKey = activeKillSwitches[index];
      const config = KILL_SWITCHES[switchKey];

      // Confirm deactivation
      const reason = await this.question('\nReason for deactivation (optional): ');
      const confirm = await this.question(`\nDeactivate "${switchKey}"? (y/N): `);
      
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('Deactivation cancelled.');
        return;
      }

      // Deactivate the kill switch
      console.log('\n🔄 Deactivating kill switch...');
      await this.makeApiCall('POST', '/admin/kill-switches', {
        switch: switchKey,
        action: 'deactivate',
        reason: reason || 'Manual deactivation',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Kill switch "${switchKey}" deactivated successfully!`);
      console.log('📱 The feature will be restored within 1-2 minutes for all users.');
      
      // Log the action
      this.logAction('DEACTIVATE', switchKey, reason);
      
    } catch (error) {
      console.error(`❌ Failed to deactivate kill switch: ${error.message}`);
    }
  }

  async listActiveKillSwitches() {
    console.log('\n📋 Active Kill Switches');
    console.log('-'.repeat(30));

    try {
      const activeKillSwitches = await this.getActiveKillSwitches();
      
      if (activeKillSwitches.length === 0) {
        console.log('✅ No active kill switches. All features are enabled.');
        return;
      }

      console.log(`🚨 ${activeKillSwitches.length} active kill switch(es):\n`);
      
      activeKillSwitches.forEach(switchKey => {
        const config = KILL_SWITCHES[switchKey] || { 
          name: switchKey, 
          description: 'Unknown kill switch',
          impact: 'Unknown impact'
        };
        
        console.log(`🔴 ${switchKey}`);
        console.log(`   Name: ${config.name}`);
        console.log(`   Impact: ${config.impact}\n`);
      });

    } catch (error) {
      console.error(`❌ Failed to fetch active kill switches: ${error.message}`);
    }
  }

  async showSystemStatus() {
    console.log('\n📊 System Status');
    console.log('-'.repeat(30));

    try {
      const status = await this.makeApiCall('GET', '/admin/system-status');
      
      console.log(`Overall Status: ${this.getStatusEmoji(status.overall)} ${status.overall.toUpperCase()}`);
      console.log(`Active Users: ${status.activeUsers || 'Unknown'}`);
      console.log(`Error Rate: ${status.errorRate ? (status.errorRate * 100).toFixed(2) + '%' : 'Unknown'}`);
      console.log(`Response Time: ${status.responseTime || 'Unknown'}ms`);
      
      if (status.activeKillSwitches && status.activeKillSwitches.length > 0) {
        console.log(`\n🚨 Active Kill Switches: ${status.activeKillSwitches.length}`);
        status.activeKillSwitches.forEach(switchKey => {
          console.log(`  - ${switchKey}`);
        });
      } else {
        console.log('\n✅ No active kill switches');
      }

      if (status.recentIncidents && status.recentIncidents.length > 0) {
        console.log(`\n⚠️  Recent Incidents: ${status.recentIncidents.length}`);
        status.recentIncidents.forEach(incident => {
          console.log(`  - ${incident.title} (${incident.status})`);
        });
      }

    } catch (error) {
      console.error(`❌ Failed to fetch system status: ${error.message}`);
    }
  }

  async getActiveKillSwitches() {
    try {
      const response = await this.makeApiCall('GET', '/admin/kill-switches');
      return response.activeKillSwitches || [];
    } catch (error) {
      // Fallback: return empty array if API call fails
      console.warn('Warning: Could not fetch active kill switches from API');
      return [];
    }
  }

  makeApiCall(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, CONFIG.apiUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.adminApiKey}`,
          'User-Agent': 'TeacherHub-Emergency-KillSwitch/1.0'
        }
      };

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

  getStatusEmoji(status) {
    switch (status?.toLowerCase()) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  logAction(action, switchKey, reason) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      switch: switchKey,
      reason: reason || 'No reason provided',
      user: process.env.USER || 'unknown'
    };

    console.log('\n📝 Action logged:');
    console.log(JSON.stringify(logEntry, null, 2));
    
    // In a real implementation, you would also log this to a persistent store
    // such as a database, log file, or audit system
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run the tool if script is executed directly
if (require.main === module) {
  const killSwitch = new EmergencyKillSwitch();
  killSwitch.run().catch(error => {
    console.error('Emergency kill switch tool failed:', error);
    process.exit(1);
  });
}

module.exports = EmergencyKillSwitch;