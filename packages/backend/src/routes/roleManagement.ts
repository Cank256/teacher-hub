import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin, requirePermission, loadUserRole } from '../middleware/roleMiddleware';
import { roleService } from '../services/roleService';
import { userActionTrackingMiddleware } from '../middleware/monitoring';
import logger from '../utils/logger';

const router = express.Router();

// Apply authentication and role loading to all routes
router.use(authMiddleware);
router.use(loadUserRole);

/**
 * GET /roles/permissions
 * Get all available permissions
 */
router.get('/permissions', requireAdmin, async (req, res) => {
  try {
    const permissions = await roleService.getAllPermissions();
    
    // Group permissions by resource for better organization
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    res.json({
      success: true,
      data: {
        permissions,
        groupedPermissions
      }
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_PERMISSIONS_FAILED',
        message: 'Failed to fetch permissions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /roles/:role/permissions
 * Get permissions for a specific role
 */
router.get('/:role/permissions', requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['teacher', 'moderator', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid role specified',
          timestamp: new Date().toISOString()
        }
      });
    }

    const permissions = await roleService.getRolePermissions(role);
    
    res.json({
      success: true,
      data: {
        role,
        permissions
      }
    });
  } catch (error) {
    logger.error('Error fetching role permissions:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ROLE_PERMISSIONS_FAILED',
        message: 'Failed to fetch role permissions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /roles/users/:userId
 * Get user's role and permissions
 */
router.get('/users/:userId', requirePermission('users.read'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userRole = await roleService.getUserRole(userId);
    
    if (!userRole) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: userRole
    });
  } catch (error) {
    logger.error('Error fetching user role:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_USER_ROLE_FAILED',
        message: 'Failed to fetch user role',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /roles/users/:userId/role
 * Change user's role
 */
router.put('/users/:userId/role', 
  requireAdmin, 
  userActionTrackingMiddleware('change_user_role', 'navigation'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;
      
      if (!role || !['teacher', 'moderator', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Prevent non-super-admins from creating super-admins
      if (role === 'super_admin') {
        const requesterRole = await roleService.getUserRole(req.user!.userId);
        if (requesterRole?.role !== 'super_admin') {
          return res.status(403).json({
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Only super administrators can assign super admin role',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      const success = await roleService.changeUserRole({
        userId,
        newRole: role,
        reason,
        changedBy: req.user!.userId
      });

      if (!success) {
        return res.status(500).json({
          error: {
            code: 'ROLE_CHANGE_FAILED',
            message: 'Failed to change user role',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      logger.error('Error changing user role:', error);
      res.status(500).json({
        error: {
          code: 'ROLE_CHANGE_FAILED',
          message: 'Failed to change user role',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * POST /roles/users/:userId/permissions/:permissionName/grant
 * Grant individual permission to user
 */
router.post('/users/:userId/permissions/:permissionName/grant',
  requireAdmin,
  userActionTrackingMiddleware('grant_user_permission', 'navigation'),
  async (req, res) => {
    try {
      const { userId, permissionName } = req.params;
      const { reason } = req.body;

      const success = await roleService.grantPermission(
        userId,
        permissionName,
        req.user!.userId,
        reason
      );

      if (!success) {
        return res.status(500).json({
          error: {
            code: 'GRANT_PERMISSION_FAILED',
            message: 'Failed to grant permission',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        message: 'Permission granted successfully'
      });
    } catch (error) {
      logger.error('Error granting permission:', error);
      res.status(500).json({
        error: {
          code: 'GRANT_PERMISSION_FAILED',
          message: 'Failed to grant permission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * POST /roles/users/:userId/permissions/:permissionName/revoke
 * Revoke individual permission from user
 */
router.post('/users/:userId/permissions/:permissionName/revoke',
  requireAdmin,
  userActionTrackingMiddleware('revoke_user_permission', 'navigation'),
  async (req, res) => {
    try {
      const { userId, permissionName } = req.params;
      const { reason } = req.body;

      const success = await roleService.revokePermission(
        userId,
        permissionName,
        req.user!.userId,
        reason
      );

      if (!success) {
        return res.status(500).json({
          error: {
            code: 'REVOKE_PERMISSION_FAILED',
            message: 'Failed to revoke permission',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        message: 'Permission revoked successfully'
      });
    } catch (error) {
      logger.error('Error revoking permission:', error);
      res.status(500).json({
        error: {
          code: 'REVOKE_PERMISSION_FAILED',
          message: 'Failed to revoke permission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /roles/users/:userId/history
 * Get role change history for user
 */
router.get('/users/:userId/history', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const history = await roleService.getUserRoleHistory(userId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching user role history:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ROLE_HISTORY_FAILED',
        message: 'Failed to fetch role history',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /roles/admin-users
 * Get all users with admin roles
 */
router.get('/admin-users', requireAdmin, async (req, res) => {
  try {
    const adminUsers = await roleService.getAdminUsers();
    
    res.json({
      success: true,
      data: adminUsers
    });
  } catch (error) {
    logger.error('Error fetching admin users:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ADMIN_USERS_FAILED',
        message: 'Failed to fetch admin users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /roles/check/:permissionName
 * Check if current user has specific permission
 */
router.get('/check/:permissionName', async (req, res) => {
  try {
    const { permissionName } = req.params;
    
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
    
    res.json({
      success: true,
      data: {
        hasPermission,
        permission: permissionName,
        userId: req.user.userId
      }
    });
  } catch (error) {
    logger.error('Error checking permission:', error);
    res.status(500).json({
      error: {
        code: 'CHECK_PERMISSION_FAILED',
        message: 'Failed to check permission',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;