import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { errorTracker } from '../monitoring/errorTracker';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { userAnalytics } from '../monitoring/userAnalytics';

// Extend Request interface to include monitoring data
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      userId?: string;
      sessionId?: string;
    }
  }
}

/**
 * Middleware to add request ID and start time tracking
 */
export const requestTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Extract user ID from JWT token if available
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // This would decode the JWT token to get user ID
      // For now, we'll use a placeholder
      req.userId = 'user-from-token';
    } catch (error) {
      // Invalid token, continue without user ID
    }
  }

  // Extract session ID from headers or generate one
  req.sessionId = req.headers['x-session-id'] as string || uuidv4();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
};

/**
 * Middleware to track performance metrics
 */
export const performanceTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Record performance metric
    performanceMonitor.recordMetric({
      type: 'response_time',
      value: responseTime,
      unit: 'ms',
      endpoint: req.path,
      method: req.method,
      userId: req.userId,
      metadata: {
        statusCode: res.statusCode,
        requestId: req.requestId,
        userAgent: req.headers['user-agent'],
        contentLength: data ? Buffer.byteLength(data) : 0
      }
    });

    // Track user analytics event
    if (req.userId) {
      userAnalytics.trackEvent({
        userId: req.userId,
        sessionId: req.sessionId,
        event: 'api_request',
        category: 'navigation',
        properties: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          requestId: req.requestId
        },
        userAgent: req.headers['user-agent'] as string,
        ip: req.ip,
        platform: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web'
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to track errors
 */
export const errorTrackingMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Track the error
  errorTracker.trackError({
    level: 'error',
    message: error.message || 'Unknown error',
    stack: error.stack,
    userId: req.userId,
    requestId: req.requestId,
    endpoint: req.path,
    method: req.method,
    statusCode: error.statusCode || 500,
    userAgent: req.headers['user-agent'] as string,
    ip: req.ip,
    metadata: {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    }
  });

  // Track analytics event for error
  if (req.userId) {
    userAnalytics.trackEvent({
      userId: req.userId,
      sessionId: req.sessionId,
      event: 'error',
      category: 'error',
      properties: {
        errorMessage: error.message,
        errorCode: error.code,
        endpoint: req.path,
        method: req.method,
        statusCode: error.statusCode || 500,
        requestId: req.requestId
      },
      userAgent: req.headers['user-agent'] as string,
      ip: req.ip,
      platform: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web'
    });
  }

  // Continue with error handling
  next(error);
};

/**
 * Middleware to track specific user actions
 */
export const userActionTrackingMiddleware = (action: string, category: 'authentication' | 'content' | 'messaging' | 'search' | 'navigation' | 'error' = 'navigation') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.userId) {
      userAnalytics.trackEvent({
        userId: req.userId,
        sessionId: req.sessionId,
        event: action,
        category,
        properties: {
          endpoint: req.path,
          method: req.method,
          requestId: req.requestId,
          ...req.body,
          ...req.query
        },
        userAgent: req.headers['user-agent'] as string,
        ip: req.ip,
        platform: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web'
      });
    }
    next();
  };
};

/**
 * Middleware to track database query performance
 */
export const databaseQueryTrackingMiddleware = (queryType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Override res.send to capture when response is sent
    const originalSend = res.send;
    res.send = function(data) {
      const queryTime = Date.now() - startTime;
      
      performanceMonitor.recordMetric({
        type: 'database_query',
        value: queryTime,
        unit: 'ms',
        endpoint: req.path,
        method: req.method,
        userId: req.userId,
        metadata: {
          queryType,
          requestId: req.requestId
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to track cache hit/miss rates
 */
export const cacheTrackingMiddleware = (cacheType: string, hit: boolean) => {
  return (req: Request, res: Response, next: NextFunction) => {
    performanceMonitor.recordMetric({
      type: 'cache_hit_rate',
      value: hit ? 1 : 0,
      unit: 'boolean',
      endpoint: req.path,
      method: req.method,
      userId: req.userId,
      metadata: {
        cacheType,
        hit,
        requestId: req.requestId
      }
    });

    next();
  };
};