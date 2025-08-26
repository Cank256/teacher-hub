import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

interface MonitoringConfig {
  dsn: string;
  environment: string;
  debug?: boolean;
}

class MonitoringService {
  private static isInitialized = false;

  static init(config: MonitoringConfig): void {
    if (this.isInitialized) {
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,

      debug: config.debug ?? __DEV__,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      beforeSend: event => {
        // Filter out development errors in production
        if (
          config.environment === 'production' &&
          event.environment === 'development'
        ) {
          return null;
        }
        return event;
      },
      // Note: ReactNativeTracing integration would be configured here
      // when using the full Sentry React Native SDK
      integrations: [],
      tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0,
    });

    this.isInitialized = true;
  }

  static captureException(error: Error, context?: Record<string, any>): void {
    if (context) {
      Sentry.withScope(scope => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  static captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info'
  ): void {
    Sentry.captureMessage(message, level);
  }

  static setUser(user: {
    id: string;
    email?: string;
    username?: string;
  }): void {
    Sentry.setUser(user);
  }

  static clearUser(): void {
    Sentry.setUser(null);
  }

  static addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category ?? 'custom',
      level: breadcrumb.level ?? 'info',
      ...(breadcrumb.data && { data: breadcrumb.data }),
      timestamp: Date.now() / 1000,
    });
  }

  static setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  static setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  static startTransaction(_name: string, _op: string): any {
    // Note: Transaction would be created here with full Sentry SDK
    return {
      setStatus: (_status: string) => {},
      finish: () => {},
    };
  }

  static measurePerformance<T>(
    name: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const transaction = this.startTransaction(name, operation);

    return fn()
      .then(result => {
        transaction.setStatus('ok');
        return result;
      })
      .catch(error => {
        transaction.setStatus('internal_error');
        this.captureException(error, { transaction: name });
        throw error;
      })
      .finally(() => {
        transaction.finish();
      });
  }

  static trackScreenView(
    screenName: string,
    params?: Record<string, any>
  ): void {
    this.addBreadcrumb({
      message: `Screen viewed: ${screenName}`,
      category: 'navigation',
      level: 'info',
      ...(params && { data: params }),
    });

    this.setTag('screen', screenName);
  }

  static trackUserAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      ...(data && { data }),
    });
  }

  static flush(_timeout = 2000): Promise<boolean> {
    return Sentry.flush();
  }
}

export default MonitoringService;

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static startMeasurement(key: string): void {
    this.measurements.set(key, Date.now());
  }

  static endMeasurement(key: string): number {
    const startTime = this.measurements.get(key);
    if (!startTime) {
      console.warn(`No measurement started for key: ${key}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.measurements.delete(key);

    MonitoringService.addBreadcrumb({
      message: `Performance: ${key}`,
      category: 'performance',
      level: 'info',
      data: { duration, platform: Platform.OS },
    });

    return duration;
  }

  static measureAsync<T>(key: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(key);
    return fn().finally(() => {
      this.endMeasurement(key);
    });
  }

  static measureSync<T>(key: string, fn: () => T): T {
    this.startMeasurement(key);
    try {
      return fn();
    } finally {
      this.endMeasurement(key);
    }
  }
}

// Error boundary for React components
export const SentryErrorBoundary = Sentry.withErrorBoundary;
