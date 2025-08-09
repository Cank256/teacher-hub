export interface ErrorEvent {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  type: 'response_time' | 'memory_usage' | 'cpu_usage' | 'database_query' | 'cache_hit_rate';
  value: number;
  unit: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserAnalyticsEvent {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  event: string;
  category: 'authentication' | 'content' | 'messaging' | 'search' | 'navigation' | 'error' | 'monitoring';
  properties?: Record<string, any>;
  userAgent?: string;
  ip?: string;
  platform?: 'web' | 'mobile' | 'desktop';
}

export interface SystemHealth {
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down' | 'degraded';
    redis: 'up' | 'down' | 'degraded';
    elasticsearch: 'up' | 'down' | 'degraded';
    storage: 'up' | 'down' | 'degraded';
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    responseTime: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationChannels: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}