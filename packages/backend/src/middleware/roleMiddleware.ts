import { Request, Response, NextFunction } from 'express';
import { roleService } from '../services/roleService';
import logger from '../utils/logger';

// Extend Express Request interface to include role information
declare global {
  namespace Express {
    interface Request {
      userRole?: {
        role: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const hasPermission = await roleService.hasPermission(req.user.userId, permissionName);
      
      if (!hasPermission) {
        logger.warn(`Access denied: User ${req.user.userId} lacks permission ${permissionName}`);
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required: ${permissionName}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in permission middleware:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking permissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const hasAnyPermission = await roleService.hasAnyPermission(req.user.userId, permissionNames);
      
      if (!hasAnyPermission) {
        logger.warn(`Access denied: User ${req.user.userId} lacks any of permissions: ${permissionNames.join(', ')}`);
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required one of: ${permissionNames.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in permission middleware:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking permissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to check if user has all required permissions
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const hasAllPermissions = await roleService.hasAllPermissions(req.user.userId, permissionNames);
      
      if (!hasAllPermissions) {
        logger.warn(`Access denied: User ${req.user.userId} lacks all required permissions: ${permissionNames.join(', ')}`);
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required all of: ${permissionNames.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in permission middleware:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking permissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (requiredRole: 'teacher' | 'moderator' | 'admin' | 'super_admin') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userRole = await roleService.getUserRole(req.user.userId);
      
      if (!userRole || userRole.role !== requiredRole) {
        logger.warn(`Access denied: User ${req.user.userId} has role ${userRole?.role} but requires ${requiredRole}`);
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient role. Required: ${requiredRole}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in role middleware:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking role',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to check if user has minimum role level
 */
export const requireMinimumRole = (minimumRole: 'teacher' | 'moderator' | 'admin' | 'super_admin') => {
  const roleHierarchy = {
    'teacher': 1,
    'moderator': 2,
    'admin': 3,
    'super_admin': 4
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userRole = await roleService.getUserRole(req.user.userId);
      
      if (!userRole) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'User role not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userRoleLevel = roleHierarchy[userRole.role as keyof typeof roleHierarchy];
      const requiredRoleLevel = roleHierarchy[minimumRole];

      if (userRoleLevel < requiredRoleLevel) {
        logger.warn(`Access denied: User ${req.user.userId} has role ${userRole.role} but requires minimum ${minimumRole}`);
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient role. Required minimum: ${minimumRole}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in minimum role middleware:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking role',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to check if user is admin (admin or super_admin)
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const isAdmin = await roleService.isAdmin(req.user.userId);
    
    if (!isAdmin) {
      logger.warn(`Access denied: User ${req.user.userId} is not an admin`);
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Administrator access required',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error in admin middleware:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error checking admin status',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware to check if user is moderator or higher
 */
export const requireModerator = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const isModerator = await roleService.isModerator(req.user.userId);
    
    if (!isModerator) {
      logger.warn(`Access denied: User ${req.user.userId} is not a moderator or admin`);
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Moderator access required',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error in moderator middleware:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error checking moderator status',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware to load user role information into request
 */
export const loadUserRole = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (req.user?.userId) {
      const userRole = await roleService.getUserRole(req.user.userId);
      if (userRole) {
        req.userRole = {
          role: userRole.role,
          permissions: userRole.permissions.map(p => p.name)
        };
      }
    }
    next();
  } catch (error) {
    logger.error('Error loading user role:', error);
    next(); // Continue without role information
  }
};