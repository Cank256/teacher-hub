import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/authService';
import logger from '../utils/logger';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Verify the token
    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    
    logger.debug('Token verified successfully', { userId: decoded.userId });
    next();

  } catch (error) {
    logger.warn('Token verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      token: req.headers.authorization?.substring(0, 20) + '...' // Log partial token for debugging
    });

    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware that requires user to have verified credentials
 */
export const requireVerifiedUser = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (req.user.verificationStatus !== 'verified') {
    res.status(403).json({
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Account verification required to access this resource',
        timestamp: new Date().toISOString(),
        suggestions: ['Please complete your credential verification process']
      }
    });
    return;
  }

  next();
};

/**
 * Middleware that allows access for pending or verified users (excludes rejected)
 */
export const requireActiveUser = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (req.user.verificationStatus === 'rejected') {
    res.status(403).json({
      error: {
        code: 'ACCOUNT_REJECTED',
        message: 'Account access has been restricted due to credential verification issues',
        timestamp: new Date().toISOString(),
        suggestions: ['Please contact support for assistance with your account']
      }
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware - sets user if token is valid but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
      logger.debug('Optional auth - token verified', { userId: decoded.userId });
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens, just proceed without user
    logger.debug('Optional auth - token verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (() => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of attempts.entries()) {
      if (now > value.resetTime) {
        attempts.delete(key);
      }
    }

    const clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts) {
      attempts.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
      next();
      return;
    }

    if (now > clientAttempts.resetTime) {
      // Reset window
      attempts.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
      next();
      return;
    }

    if (clientAttempts.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((clientAttempts.resetTime - now) / 1000 / 60);
      
      logger.warn('Rate limit exceeded for authentication', { 
        clientId, 
        attempts: clientAttempts.count,
        remainingTime 
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many authentication attempts. Please try again in ${remainingTime} minutes.`,
          timestamp: new Date().toISOString(),
          retryAfter: remainingTime * 60
        }
      });
      return;
    }

    clientAttempts.count++;
    attempts.set(clientId, clientAttempts);
    next();
  };
})();

/**
 * Middleware to extract user ID from token for user-specific operations
 */
export const extractUserId = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Add userId to request params for convenience
  req.params.userId = req.user.userId;
  next();
};

/**
 * Middleware to ensure user can only access their own resources
 */
export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (resourceUserId && resourceUserId !== req.user.userId) {
    logger.warn('Unauthorized access attempt', { 
      requestedUserId: resourceUserId, 
      authenticatedUserId: req.user.userId 
    });

    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You can only access your own resources',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};