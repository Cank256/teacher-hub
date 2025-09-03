#!/usr/bin/env node

/**
 * Health Check Script
 * Monitors app health metrics and alerts on issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.teacherhub.ug',
  sentryDsn: process.env.SENTRY_DSN,
  thresholds: {
    crashFreeRate: 0.99, // 99%
    errorRate: 0.05, // 5%
    responseTime: 5000, // 5 seconds
    availability: 0.99 // 99%
  }
};

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      alerts: []
    };
  }

  async runAllChecks() {
    console.log('🏥 Running health checks...\n');

    try {
      await this.checkApiHealth();
      await this.checkAppMetrics();
      await this.checkThirdPartyServices();
      await this.checkReleaseHealth();
      
      this.generateReport();
      this.saveResults();
      
      if (this.results.alerts.length > 0) {
        await this.sendAlerts();
        process.exit(1);
      }
      
      console.log('✅ All health checks passed!');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.results.status = 'unhealthy';
      this.results.alerts.push({
        severity: 'critical',
        message: `Health check script failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    }
  }

  async checkApiHealth() {
    console.log('🔍 Checking API health...');
    
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(`${CONFIG.apiUrl}/health`);
      const responseTime = Date.now() - startTime;
      
      this.results.checks.api = {
        status: response.status === 'ok' ? 'healthy' : 'unhealthy',
        responseTime,
        details: response
      };
      
      if (responseTime > CONFIG.thresholds.responseTime) {
        this.addAlert('warning', `API response time is high: ${responseTime}ms`);
      }
      
      if (response.status !== 'ok') {
        this.addAlert('critical', `API health check failed: ${response.message}`);
      }
      
      console.log(`  ✅ API health: ${response.status} (${responseTime}ms)`);
      
    } catch (error) {
      this.results.checks.api = {
        status: 'unhealthy',
        error: error.message
      };
      this.addAlert('critical', `API is unreachable: ${error.message}`);
      console.log(`  ❌ API health: unreachable`);
    }
  }

  async checkAppMetrics() {
    console.log('📊 Checking app metrics...');
    
    try {
      // This would integrate with your analytics service
      // For now, we'll simulate metrics
      const metrics = await this.getAppMetrics();
      
      this.results.checks.metrics = {
        status: 'healthy',
        crashFreeRate: metrics.crashFreeRate,
        errorRate: metrics.errorRate,
        activeUsers: metrics.activeUsers
      };
      
      if (metrics.crashFreeRate < CONFIG.thresholds.crashFreeRate) {
        this.addAlert('critical', 
          `Crash-free rate is below threshold: ${(metrics.crashFreeRate * 100).toFixed(2)}%`
        );
      }
      
      if (metrics.errorRate > CONFIG.thresholds.errorRate) {
        this.addAlert('warning', 
          `Error rate is above threshold: ${(metrics.errorRate * 100).toFixed(2)}%`
        );
      }
      
      console.log(`  ✅ Crash-free rate: ${(metrics.crashFreeRate * 100).toFixed(2)}%`);
      console.log(`  ✅ Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`  ✅ Active users: ${metrics.activeUsers}`);
      
    } catch (error) {
      this.results.checks.metrics = {
        status: 'unhealthy',
        error: error.message
      };
      this.addAlert('warning', `Unable to fetch app metrics: ${error.message}`);
      console.log(`  ⚠️  App metrics: unavailable`);
    }
  }

  async checkThirdPartyServices() {
    console.log('🔗 Checking third-party services...');
    
    const services = [
      { name: 'Google OAuth', url: 'https://accounts.google.com/.well-known/openid_configuration' },
      { name: 'Firebase', url: 'https://firebase.googleapis.com/' },
      { name: 'Sentry', url: 'https://sentry.io/api/0/' }
    ];
    
    this.results.checks.thirdParty = {};
    
    for (const service of services) {
      try {
        const startTime = Date.now();
        await this.makeRequest(service.url);
        const responseTime = Date.now() - startTime;
        
        this.results.checks.thirdParty[service.name] = {
          status: 'healthy',
          responseTime
        };
        
        console.log(`  ✅ ${service.name}: healthy (${responseTime}ms)`);
        
      } catch (error) {
        this.results.checks.thirdParty[service.name] = {
          status: 'unhealthy',
          error: error.message
        };
        
        this.addAlert('warning', `${service.name} is unreachable: ${error.message}`);
        console.log(`  ⚠️  ${service.name}: unhealthy`);
      }
    }
  }

  async checkReleaseHealth() {
    console.log('🚀 Checking release health...');
    
    try {
      // Check if there are any active incidents
      const incidents = await this.getActiveIncidents();
      
      this.results.checks.release = {
        status: incidents.length === 0 ? 'healthy' : 'degraded',
        activeIncidents: incidents.length,
        incidents
      };
      
      if (incidents.length > 0) {
        incidents.forEach(incident => {
          this.addAlert(incident.severity, 
            `Active incident: ${incident.title} (${incident.status})`
          );
        });
      }
      
      console.log(`  ${incidents.length === 0 ? '✅' : '⚠️'} Active incidents: ${incidents.length}`);
      
    } catch (error) {
      this.results.checks.release = {
        status: 'unknown',
        error: error.message
      };
      console.log(`  ⚠️  Release health: unknown`);
    }
  }

  async getAppMetrics() {
    // This would integrate with your actual analytics service
    // For demonstration, we'll return simulated metrics
    return {
      crashFreeRate: 0.995,
      errorRate: 0.02,
      activeUsers: 1250,
      responseTime: 850
    };
  }

  async getActiveIncidents() {
    // This would integrate with your incident management system
    // For demonstration, we'll return empty array
    return [];
  }

  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(data ? JSON.parse(data) : { status: 'ok' });
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
          } catch (error) {
            resolve({ status: 'ok' }); // Some endpoints don't return JSON
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  addAlert(severity, message) {
    this.results.alerts.push({
      severity,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (severity === 'critical') {
      this.results.status = 'unhealthy';
    } else if (severity === 'warning' && this.results.status === 'healthy') {
      this.results.status = 'degraded';
    }
  }

  generateReport() {
    console.log('\n📋 Health Check Report');
    console.log('='.repeat(50));
    console.log(`Status: ${this.getStatusEmoji()} ${this.results.status.toUpperCase()}`);
    console.log(`Timestamp: ${this.results.timestamp}`);
    
    if (this.results.alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      this.results.alerts.forEach(alert => {
        const emoji = alert.severity === 'critical' ? '🔴' : '🟡';
        console.log(`  ${emoji} ${alert.severity.toUpperCase()}: ${alert.message}`);
      });
    }
    
    console.log('\n📊 Check Details:');
    Object.entries(this.results.checks).forEach(([check, result]) => {
      const emoji = result.status === 'healthy' ? '✅' : 
                   result.status === 'degraded' ? '⚠️' : '❌';
      console.log(`  ${emoji} ${check}: ${result.status}`);
    });
  }

  getStatusEmoji() {
    switch (this.results.status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  saveResults() {
    const resultsDir = path.join(__dirname, '..', 'health-reports');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `health-check-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
  }

  async sendAlerts() {
    // This would integrate with your alerting system (Slack, PagerDuty, etc.)
    console.log('\n🚨 Sending alerts...');
    
    const criticalAlerts = this.results.alerts.filter(a => a.severity === 'critical');
    const warningAlerts = this.results.alerts.filter(a => a.severity === 'warning');
    
    if (criticalAlerts.length > 0) {
      console.log(`  📢 ${criticalAlerts.length} critical alerts would be sent`);
    }
    
    if (warningAlerts.length > 0) {
      console.log(`  📢 ${warningAlerts.length} warning alerts would be sent`);
    }
    
    // Example Slack webhook integration:
    // await this.sendSlackAlert(this.results);
  }
}

// Run health checks if script is executed directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAllChecks().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;