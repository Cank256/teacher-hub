import { db } from '../database/connection';
import logger from '../utils/logger';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UserRole {
  userId: string;
  role: 'teacher' | 'moderator' | 'admin' | 'super_admin';
  permissions: Permission[];
}

export interface RoleChangeRequest {
  userId: string;
  newRole: 'teacher' | 'moderator' | 'admin' | 'super_admin';
  reason?: string;
  changedBy: string;
}

export class RoleService {
  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT user_has_permission($1, $2) as has_permission',
        [userId, permissionName]
      );
      
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      logger.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    try {
      for (const permission of permissionNames) {
        if (await this.hasPermission(userId, permission)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error checking user permissions:', error);
      return false;
    }
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    try {
      for (const permission of permissionNames) {
        if (!(await this.hasPermission(userId, permission))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error checking user permissions:', error);
      return false;
    }
  }

  /**
   * Get user's role and permissions
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const userResult = await db.query(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      
      // Get role permissions
      const rolePermissionsResult = await db.query(`
        SELECT p.id, p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = $1
      `, [user.role]);

      // Get individual user permissions (overrides)
      const userPermissionsResult = await db.query(`
        SELECT p.id, p.name, p.description, p.resource, p.action, up.granted
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = $1
        ORDER BY up.granted_at DESC
      `, [userId]);

      // Combine permissions with overrides
      const rolePermissions = new Map<string, Permission>(
        rolePermissionsResult.rows.map((p: any) => [p.name, p as Permission])
      );

      // Apply user-specific overrides
      for (const userPerm of userPermissionsResult.rows) {
        if (userPerm.granted) {
          rolePermissions.set(userPerm.name, userPerm as Permission);
        } else {
          rolePermissions.delete(userPerm.name);
        }
      }

      return {
        userId: user.id,
        role: user.role,
        permissions: Array.from(rolePermissions.values())
      };
    } catch (error) {
      logger.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Change user's role
   */
  async changeUserRole(request: RoleChangeRequest): Promise<boolean> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get current role for audit log
      const currentRoleResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [request.userId]
      );

      if (currentRoleResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentRole = currentRoleResult.rows[0].role;

      // Update user role
      await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [request.newRole, request.userId]
      );

      // Log the role change
      await client.query(`
        INSERT INTO role_audit_log (user_id, changed_by, old_role, new_role, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        request.userId,
        request.changedBy,
        currentRole,
        request.newRole,
        request.reason || 'Role changed by administrator'
      ]);

      await client.query('COMMIT');
      
      logger.info(`User role changed: ${request.userId} from ${currentRole} to ${request.newRole} by ${request.changedBy}`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error changing user role:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Grant individual permission to user
   */
  async grantPermission(userId: string, permissionName: string, grantedBy: string, reason?: string): Promise<boolean> {
    try {
      const permissionResult = await db.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permissionName]
      );

      if (permissionResult.rows.length === 0) {
        throw new Error('Permission not found');
      }

      const permissionId = permissionResult.rows[0].id;

      await db.query(`
        INSERT INTO user_permissions (user_id, permission_id, granted, granted_by, reason)
        VALUES ($1, $2, true, $3, $4)
        ON CONFLICT (user_id, permission_id) 
        DO UPDATE SET granted = true, granted_by = $3, granted_at = CURRENT_TIMESTAMP, reason = $4
      `, [userId, permissionId, grantedBy, reason]);

      logger.info(`Permission granted: ${permissionName} to user ${userId} by ${grantedBy}`);
      return true;
    } catch (error) {
      logger.error('Error granting permission:', error);
      return false;
    }
  }

  /**
   * Revoke individual permission from user
   */
  async revokePermission(userId: string, permissionName: string, revokedBy: string, reason?: string): Promise<boolean> {
    try {
      const permissionResult = await db.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permissionName]
      );

      if (permissionResult.rows.length === 0) {
        throw new Error('Permission not found');
      }

      const permissionId = permissionResult.rows[0].id;

      await db.query(`
        INSERT INTO user_permissions (user_id, permission_id, granted, granted_by, reason)
        VALUES ($1, $2, false, $3, $4)
        ON CONFLICT (user_id, permission_id) 
        DO UPDATE SET granted = false, granted_by = $3, granted_at = CURRENT_TIMESTAMP, reason = $4
      `, [userId, permissionId, revokedBy, reason]);

      logger.info(`Permission revoked: ${permissionName} from user ${userId} by ${revokedBy}`);
      return true;
    } catch (error) {
      logger.error('Error revoking permission:', error);
      return false;
    }
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await db.query(`
        SELECT id, name, description, resource, action
        FROM permissions
        ORDER BY resource, action
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting permissions:', error);
      return [];
    }
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role: string): Promise<Permission[]> {
    try {
      const result = await db.query(`
        SELECT p.id, p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = $1
        ORDER BY p.resource, p.action
      `, [role]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Get role audit log for a user
   */
  async getUserRoleHistory(userId: string): Promise<any[]> {
    try {
      const result = await db.query(`
        SELECT 
          ral.*,
          u1.full_name as user_name,
          u2.full_name as changed_by_name
        FROM role_audit_log ral
        LEFT JOIN users u1 ON ral.user_id = u1.id
        LEFT JOIN users u2 ON ral.changed_by = u2.id
        WHERE ral.user_id = $1
        ORDER BY ral.created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user role history:', error);
      return [];
    }
  }

  /**
   * Get all users with admin roles
   */
  async getAdminUsers(): Promise<any[]> {
    try {
      const result = await db.query(`
        SELECT id, email, full_name, role, verification_status, created_at, last_login_at
        FROM users 
        WHERE role IN ('admin', 'super_admin', 'moderator')
        ORDER BY 
          CASE role 
            WHEN 'super_admin' THEN 1 
            WHEN 'admin' THEN 2 
            WHEN 'moderator' THEN 3 
            ELSE 4 
          END,
          full_name
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting admin users:', error);
      return [];
    }
  }

  /**
   * Check if user is admin (admin or super_admin)
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const role = result.rows[0].role;
      return role === 'admin' || role === 'super_admin';
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user is moderator or higher
   */
  async isModerator(userId: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const role = result.rows[0].role;
      return ['moderator', 'admin', 'super_admin'].includes(role);
    } catch (error) {
      logger.error('Error checking moderator status:', error);
      return false;
    }
  }
}

export const roleService = new RoleService();