-- Add role-based access control system
-- Migration 005: User roles and permissions

-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('teacher', 'moderator', 'admin', 'super_admin'));

-- Create index for role column
CREATE INDEX idx_users_role ON users(role);

-- Create permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    resource VARCHAR(50) NOT NULL, -- e.g., 'users', 'resources', 'communities'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete', 'moderate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions table for many-to-many relationship
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Create user_permissions table for individual user permissions (overrides)
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true, -- true = granted, false = revoked
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    UNIQUE(user_id, permission_id)
);

-- Create audit log for role and permission changes
CREATE TABLE role_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_role VARCHAR(20),
    new_role VARCHAR(20),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- User management permissions
('users.create', 'Create new user accounts', 'users', 'create'),
('users.read', 'View user profiles and information', 'users', 'read'),
('users.update', 'Update user profiles and information', 'users', 'update'),
('users.delete', 'Delete user accounts', 'users', 'delete'),
('users.verify', 'Verify user credentials and profiles', 'users', 'verify'),
('users.moderate', 'Moderate user accounts and behavior', 'users', 'moderate'),
('users.impersonate', 'Impersonate other users for support', 'users', 'impersonate'),

-- Resource management permissions
('resources.create', 'Upload and create educational resources', 'resources', 'create'),
('resources.read', 'View and download educational resources', 'resources', 'read'),
('resources.update', 'Edit and update educational resources', 'resources', 'update'),
('resources.delete', 'Delete educational resources', 'resources', 'delete'),
('resources.moderate', 'Moderate and review educational resources', 'resources', 'moderate'),
('resources.verify', 'Verify and approve educational resources', 'resources', 'verify'),

-- Community management permissions
('communities.create', 'Create new communities and groups', 'communities', 'create'),
('communities.read', 'View communities and participate in discussions', 'communities', 'read'),
('communities.update', 'Edit community information and settings', 'communities', 'update'),
('communities.delete', 'Delete communities and groups', 'communities', 'delete'),
('communities.moderate', 'Moderate community content and members', 'communities', 'moderate'),

-- Message management permissions
('messages.create', 'Send messages and participate in conversations', 'messages', 'create'),
('messages.read', 'Read messages and conversations', 'messages', 'read'),
('messages.update', 'Edit own messages', 'messages', 'update'),
('messages.delete', 'Delete messages', 'messages', 'delete'),
('messages.moderate', 'Moderate messages and conversations', 'messages', 'moderate'),

-- Government content permissions
('government.create', 'Create and publish government content', 'government', 'create'),
('government.read', 'View government content and announcements', 'government', 'read'),
('government.update', 'Update government content', 'government', 'update'),
('government.delete', 'Delete government content', 'government', 'delete'),
('government.verify', 'Verify government content authenticity', 'government', 'verify'),

-- Event management permissions
('events.create', 'Create and organize events and workshops', 'events', 'create'),
('events.read', 'View events and workshop information', 'events', 'read'),
('events.update', 'Edit event information and settings', 'events', 'update'),
('events.delete', 'Delete events and workshops', 'events', 'delete'),
('events.moderate', 'Moderate event content and participants', 'events', 'moderate'),

-- System administration permissions
('system.admin', 'Access administrative dashboard and system settings', 'system', 'admin'),
('system.monitor', 'View system monitoring and analytics', 'system', 'monitor'),
('system.backup', 'Perform system backups and maintenance', 'system', 'backup'),
('system.audit', 'View audit logs and system activity', 'system', 'audit'),

-- Gamification permissions
('gamification.manage', 'Manage badges, achievements, and gamification', 'gamification', 'manage'),
('gamification.moderate', 'Moderate peer nominations and achievements', 'gamification', 'moderate');

-- Assign permissions to roles

-- Teacher role (default user role)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'teacher', id FROM permissions WHERE name IN (
    'users.read', 'users.update',
    'resources.create', 'resources.read', 'resources.update', 'resources.delete',
    'communities.create', 'communities.read', 'communities.update',
    'messages.create', 'messages.read', 'messages.update', 'messages.delete',
    'government.read',
    'events.create', 'events.read', 'events.update', 'events.delete'
);

-- Moderator role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'moderator', id FROM permissions WHERE name IN (
    'users.read', 'users.update', 'users.verify', 'users.moderate',
    'resources.create', 'resources.read', 'resources.update', 'resources.delete', 'resources.moderate', 'resources.verify',
    'communities.create', 'communities.read', 'communities.update', 'communities.delete', 'communities.moderate',
    'messages.create', 'messages.read', 'messages.update', 'messages.delete', 'messages.moderate',
    'government.read', 'government.verify',
    'events.create', 'events.read', 'events.update', 'events.delete', 'events.moderate',
    'gamification.moderate'
);

-- Admin role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions WHERE name IN (
    'users.create', 'users.read', 'users.update', 'users.delete', 'users.verify', 'users.moderate',
    'resources.create', 'resources.read', 'resources.update', 'resources.delete', 'resources.moderate', 'resources.verify',
    'communities.create', 'communities.read', 'communities.update', 'communities.delete', 'communities.moderate',
    'messages.create', 'messages.read', 'messages.update', 'messages.delete', 'messages.moderate',
    'government.create', 'government.read', 'government.update', 'government.delete', 'government.verify',
    'events.create', 'events.read', 'events.update', 'events.delete', 'events.moderate',
    'system.admin', 'system.monitor', 'system.audit',
    'gamification.manage', 'gamification.moderate'
);

-- Super Admin role (all permissions)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM permissions;

-- Create indexes for performance
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX idx_role_audit_log_user ON role_audit_log(user_id);
CREATE INDEX idx_role_audit_log_changed_by ON role_audit_log(changed_by);
CREATE INDEX idx_role_audit_log_created_at ON role_audit_log(created_at);

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    user_role VARCHAR(20);
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = user_uuid;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission through role
    SELECT EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = user_role AND p.name = permission_name
    ) INTO has_permission;
    
    -- Check for individual user permission overrides
    IF has_permission THEN
        -- Check if permission is revoked for this user
        SELECT COALESCE(
            (SELECT granted FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = user_uuid AND p.name = permission_name
             ORDER BY up.granted_at DESC LIMIT 1),
            TRUE
        ) INTO has_permission;
    ELSE
        -- Check if permission is granted individually to this user
        SELECT COALESCE(
            (SELECT granted FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = user_uuid AND p.name = permission_name
             ORDER BY up.granted_at DESC LIMIT 1),
            FALSE
        ) INTO has_permission;
    END IF;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO role_audit_log (user_id, old_role, new_role, reason)
        VALUES (NEW.id, OLD.role, NEW.role, 'Role updated');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_role_changes
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_role_changes();