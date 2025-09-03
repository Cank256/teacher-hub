import { MMKV } from 'react-native-mmkv';
import * as Sentry from '@sentry/react-native';
import { MonitoringAlert, PERFORMANCE_THRESHOLDS } from './types';
import AnalyticsService from './AnalyticsService';

interface AlertRule {
  id: string;
  name: string;
  type: MonitoringAlert['type'];
  metric: string;
  threshold: number;
  severity: MonitoringAlert['severity'];
  enabled: boolean;
  cooldownPeriod: number; // milliseconds
  lastTriggered?: number;
}

interface AlertHistory {
  alert: MonitoringAlert;
  acknowledged: boolean;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

class MonitoringAlerts {
  private static instance: MonitoringAlerts;
  private storage: MMKV;
  private alertRules: AlertRule[] = [];
  private alertHistory: AlertHistory[] = [];
  private activeAlerts: Map<string, MonitoringAlert> = new Map();
  private isInitialized = false;

  private constructor() {
    this.storage = new MMKV({ id: 'monitoring_alerts' });
    this.loadAlertRules();
    this.loadAlertHistory();
  }

  static getInstance(): MonitoringAlerts {
    if (!MonitoringAlerts.instance) {
      MonitoringAlerts.instance = new MonitoringAlerts();
    }
    return MonitoringAlerts.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    this.setupDefaultAlertRules();
    this.startMonitoring();
    this.isInitialized = true;
    
    console.log('Monitoring alerts initialized');
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_crash_rate',
        name: 'High Crash Rate',
        type: 'crash',
        metric: 'crash_rate',
        threshold: 0.05, // 5% crash rate
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
      },
      {
        id: 'slow_cold_start',
        name: 'Slow Cold Start',
        type: 'performance',
        metric: 'cold_start_time',
        threshold: PERFORMANCE_THRESHOLDS.COLD_START_TIME,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 600000, // 10 minutes
      },
      {
        id: 'low_frame_rate',
        name: 'Low Frame Rate',
        type: 'performance',
        metric: 'frame_rate',
        threshold: PERFORMANCE_THRESHOLDS.FRAME_RATE,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        type: 'performance',
        metric: 'memory_usage',
        threshold: PERFORMANCE_THRESHOLDS.MEMORY_USAGE,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 180000, // 3 minutes
      },
      {
        id: 'slow_api_response',
        name: 'Slow API Response',
        type: 'performance',
        metric: 'api_response_time',
        threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'error',
        metric: 'error_rate',
        threshold: 0.1, // 10% error rate
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
      },
      {
        id: 'low_user_engagement',
        name: 'Low User Engagement',
        type: 'usage',
        metric: 'session_duration',
        threshold: 30000, // 30 seconds
        severity: 'low',
        enabled: true,
        cooldownPeriod: 3600000, // 1 hour
      },
      {
        id: 'security_violation',
        name: 'Security Violation',
        type: 'error',
        metric: 'security_events',
        threshold: 1,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 0, // No cooldown for security
      },
    ];

    // Add rules that don't already exist
    for (const rule of defaultRules) {
      if (!this.alertRules.find(r => r.id === rule.id)) {
        this.alertRules.push(rule);
      }
    }

    this.saveAlertRules();
  }

  private startMonitoring(): void {
    // Monitor performance metrics
    setInterval(() => {
      this.checkPerformanceAlerts();
    }, 30000); // Check every 30 seconds

    // Monitor error rates
    setInterval(() => {
      this.checkErrorRateAlerts();
    }, 60000); // Check every minute

    // Monitor user engagement
    setInterval(() => {
      this.checkEngagementAlerts();
    }, 300000); // Check every 5 minutes

    // Clean up old alerts
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // Clean up every hour
  }

  // Check specific metric against alert rules
  checkMetric(metricName: string, value: number, context?: Record<string, any>): void {
    const relevantRules = this.alertRules.filter(
      rule => rule.enabled && rule.metric === metricName
    );

    for (const rule of relevantRules) {
      const shouldTrigger = this.shouldTriggerAlert(rule, value);
      
      if (shouldTrigger) {
        this.triggerAlert(rule, value, context);
      }
    }
  }

  // Trigger an alert
  private triggerAlert(rule: AlertRule, currentValue: number, context?: Record<string, any>): void {
    const now = Date.now();
    
    // Check cooldown period
    if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldownPeriod) {
      return;
    }

    const alert: MonitoringAlert = {
      id: `${rule.id}_${now}`,
      type: rule.type,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`,
      threshold: rule.threshold,
      currentValue,
      timestamp: now,
      metadata: {
        rule_id: rule.id,
        rule_name: rule.name,
        metric: rule.metric,
        ...context,
      },
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push({
      alert,
      acknowledged: false,
    });

    // Update rule's last triggered time
    rule.lastTriggered = now;
    this.saveAlertRules();
    this.saveAlertHistory();

    // Send alert
    this.sendAlert(alert);

    // Track alert event
    AnalyticsService.trackEvent('monitoring_alert_triggered', {
      alert_id: alert.id,
      alert_type: alert.type,
      severity: alert.severity,
      metric: rule.metric,
      threshold: rule.threshold,
      current_value: currentValue,
    });
  }

  // Send alert to monitoring systems
  private sendAlert(alert: MonitoringAlert): void {
    // Send to Sentry
    Sentry.captureMessage(`Monitoring Alert: ${alert.message}`, {
      level: this.getSentryLevel(alert.severity),
      tags: {
        alert_type: alert.type,
        severity: alert.severity,
        metric: alert.metadata?.metric,
      },
      extra: {
        alert_id: alert.id,
        threshold: alert.threshold,
        current_value: alert.currentValue,
        metadata: alert.metadata,
      },
    });

    // Log to console in development
    if (__DEV__) {
      console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);
    }

    // In production, you might send to external monitoring services
    // this.sendToExternalMonitoring(alert);
  }

  // Check performance-related alerts
  private checkPerformanceAlerts(): void {
    // This would typically get metrics from your performance monitoring system
    // For now, we'll simulate checking stored performance data
    const performanceData = this.getStoredPerformanceData();
    
    for (const [metric, value] of Object.entries(performanceData)) {
      this.checkMetric(metric, value);
    }
  }

  // Check error rate alerts
  private checkErrorRateAlerts(): void {
    const errorData = this.getStoredErrorData();
    
    if (errorData.total_events > 0) {
      const errorRate = errorData.error_count / errorData.total_events;
      this.checkMetric('error_rate', errorRate, {
        error_count: errorData.error_count,
        total_events: errorData.total_events,
      });
    }
  }

  // Check engagement alerts
  private checkEngagementAlerts(): void {
    const engagementData = this.getStoredEngagementData();
    
    if (engagementData.session_count > 0) {
      const avgSessionDuration = engagementData.total_session_time / engagementData.session_count;
      this.checkMetric('session_duration', avgSessionDuration, {
        session_count: engagementData.session_count,
        total_session_time: engagementData.total_session_time,
      });
    }
  }

  // Acknowledge an alert
  acknowledgeAlert(alertId: string): void {
    const historyEntry = this.alertHistory.find(h => h.alert.id === alertId);
    if (historyEntry && !historyEntry.acknowledged) {
      historyEntry.acknowledged = true;
      historyEntry.acknowledgedAt = Date.now();
      this.saveAlertHistory();

      AnalyticsService.trackEvent('monitoring_alert_acknowledged', {
        alert_id: alertId,
      });
    }
  }

  // Resolve an alert
  resolveAlert(alertId: string): void {
    const historyEntry = this.alertHistory.find(h => h.alert.id === alertId);
    if (historyEntry) {
      historyEntry.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      this.saveAlertHistory();

      AnalyticsService.trackEvent('monitoring_alert_resolved', {
        alert_id: alertId,
        resolution_time: historyEntry.resolvedAt - historyEntry.alert.timestamp,
      });
    }
  }

  // Get active alerts
  getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Get alert history
  getAlertHistory(limit: number = 100): AlertHistory[] {
    return this.alertHistory
      .sort((a, b) => b.alert.timestamp - a.alert.timestamp)
      .slice(0, limit);
  }

  // Get alert rules
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // Update alert rule
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      this.saveAlertRules();

      AnalyticsService.trackEvent('alert_rule_updated', {
        rule_id: ruleId,
        updates: Object.keys(updates),
      });
    }
  }

  // Add custom alert rule
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AlertRule = { ...rule, id };
    
    this.alertRules.push(newRule);
    this.saveAlertRules();

    AnalyticsService.trackEvent('alert_rule_added', {
      rule_id: id,
      rule_name: rule.name,
      metric: rule.metric,
    });

    return id;
  }

  // Remove alert rule
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    this.saveAlertRules();

    AnalyticsService.trackEvent('alert_rule_removed', {
      rule_id: ruleId,
    });
  }

  // Private helper methods
  private shouldTriggerAlert(rule: AlertRule, value: number): boolean {
    switch (rule.metric) {
      case 'frame_rate':
        return value < rule.threshold; // Lower is worse for FPS
      case 'session_duration':
        return value < rule.threshold; // Lower is worse for engagement
      default:
        return value > rule.threshold; // Higher is worse for most metrics
    }
  }

  private getSentryLevel(severity: MonitoringAlert['severity']): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'fatal';
      default: return 'warning';
    }
  }

  private getStoredPerformanceData(): Record<string, number> {
    // This would typically come from your analytics service
    // For now, return mock data
    return {
      cold_start_time: 1500,
      frame_rate: 58,
      memory_usage: 180 * 1024 * 1024,
      api_response_time: 2000,
    };
  }

  private getStoredErrorData(): { error_count: number; total_events: number } {
    // This would typically come from your analytics service
    return {
      error_count: 5,
      total_events: 100,
    };
  }

  private getStoredEngagementData(): { session_count: number; total_session_time: number } {
    // This would typically come from your analytics service
    return {
      session_count: 10,
      total_session_time: 600000, // 10 minutes total
    };
  }

  private cleanupOldAlerts(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Remove old alerts from history
    this.alertHistory = this.alertHistory.filter(
      h => now - h.alert.timestamp < maxAge
    );

    // Remove resolved alerts from active alerts
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      const historyEntry = this.alertHistory.find(h => h.alert.id === alertId);
      if (historyEntry?.resolvedAt) {
        this.activeAlerts.delete(alertId);
      }
    }

    this.saveAlertHistory();
  }

  private loadAlertRules(): void {
    const stored = this.storage.getString('alert_rules');
    this.alertRules = stored ? JSON.parse(stored) : [];
  }

  private saveAlertRules(): void {
    this.storage.set('alert_rules', JSON.stringify(this.alertRules));
  }

  private loadAlertHistory(): void {
    const stored = this.storage.getString('alert_history');
    this.alertHistory = stored ? JSON.parse(stored) : [];
  }

  private saveAlertHistory(): void {
    // Keep only last 1000 alerts to prevent storage bloat
    const recentHistory = this.alertHistory.slice(-1000);
    this.storage.set('alert_history', JSON.stringify(recentHistory));
  }
}

export default MonitoringAlerts.getInstance();