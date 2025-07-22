import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../cache/cacheService';
import logger from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  prefix?: string;
}

export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = defaultKeyGenerator,
    condition = defaultCondition,
    prefix = 'api:'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or if condition is not met
    if (req.method !== 'GET' || !condition(req, res)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get cached response
      const cached = await cacheService.get(cacheKey, { prefix });
      
      if (cached) {
        logger.debug(`Serving cached response for: ${req.originalUrl}`);
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache the response
      res.json = function(body: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, { ttl, prefix }).catch(error => {
            logger.error('Failed to cache response:', error);
          });
        }
        
        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string {
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const userId = (req as any).user?.id || 'anonymous';
  
  return `${req.method}:${url}:${query}:${userId}`;
}

function defaultCondition(req: Request, res: Response): boolean {
  // Don't cache if user is authenticated and it's a user-specific endpoint
  const userSpecificPaths = ['/api/profile', '/api/messages'];
  const isUserSpecific = userSpecificPaths.some(path => req.path.startsWith(path));
  
  // Cache public content but not user-specific content
  return !isUserSpecific || !req.headers.authorization;
}

// Specific cache middleware for different types of content
export const contentCache = cacheMiddleware({
  ttl: 1800, // 30 minutes for content
  prefix: 'content:',
  keyGenerator: (req) => `${req.path}:${JSON.stringify(req.query)}`
});

export const userCache = cacheMiddleware({
  ttl: 300, // 5 minutes for user data
  prefix: 'user:',
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `${userId}:${req.path}:${JSON.stringify(req.query)}`;
  }
});

export const searchCache = cacheMiddleware({
  ttl: 600, // 10 minutes for search results
  prefix: 'search:',
  keyGenerator: (req) => `${req.path}:${JSON.stringify(req.query)}`
});