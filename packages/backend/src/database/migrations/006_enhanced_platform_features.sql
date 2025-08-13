-- Enhanced Platform Features - Database Schema Extensions
-- Migration 006: Posts, Enhanced Communities, Enhanced Messaging, Video Integration, Admin Features

-- Posts table for post management system
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_attachments JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'community', 'followers')),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post likes table for tracking user likes on posts
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one like per user per post
    UNIQUE(post_id, user_id)
);

-- Post comments table for post discussion system
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- YouTube videos table for video integration
CREATE TABLE youtube_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(255) NOT NULL UNIQUE,
    upload_status VARCHAR(20) DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one YouTube video per resource
    UNIQUE(resource_id)
);

-- User searches table for tracking search queries and analytics
CREATE TABLE user_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    searcher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(500) NOT NULL,
    search_filters JSONB DEFAULT '{}'::jsonb,
    search_type VARCHAR(50) DEFAULT 'general' CHECK (search_type IN ('general', 'users', 'resources', 'communities', 'posts')),
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin actions table for tracking administrative actions and moderation
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'approve_post', 'flag_post', 'delete_post',
        'approve_comment', 'delete_comment',
        'approve_community', 'suspend_community', 'delete_community',
        'approve_resource', 'flag_resource', 'delete_resource',
        'approve_message', 'delete_message', 'flag_message', 'report_message',
        'ban_user', 'unban_user', 'verify_user'
    )),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'community', 'user', 'resource', 'message')),
    target_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    details_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderation queue table for content review workflow
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('post', 'comment', 'resource', 'community', 'message')),
    item_id UUID NOT NULL,
    report_reason TEXT NOT NULL,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'escalated')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_action VARCHAR(20) CHECK (resolution_action IN ('approve', 'reject', 'escalate')),
    resolution_reason TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- User activity log table for tracking user actions and analytics
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity VARCHAR(100) NOT NULL,
    details_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table for enhanced messaging system
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing tables with new columns for enhanced features

-- Add new columns to communities table for enhanced management
ALTER TABLE communities ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE communities ADD COLUMN requires_approval BOOLEAN DEFAULT false;
ALTER TABLE communities ADD COLUMN post_count INTEGER DEFAULT 0;

-- Update community_memberships table with enhanced status and permissions
ALTER TABLE community_memberships DROP CONSTRAINT IF EXISTS community_memberships_role_check;
ALTER TABLE community_memberships ADD CONSTRAINT community_memberships_role_check 
    CHECK (role IN ('member', 'moderator', 'owner'));

ALTER TABLE community_memberships ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'pending', 'banned'));
ALTER TABLE community_memberships ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;

-- Add new columns to resources table for security scanning and video integration
ALTER TABLE resources ADD COLUMN youtube_video_id VARCHAR(255);
ALTER TABLE resources ADD COLUMN security_scan_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (security_scan_status IN ('pending', 'passed', 'failed'));
ALTER TABLE resources ADD COLUMN security_scan_results JSONB DEFAULT '{}'::jsonb;

-- Add conversation_id to messages table for enhanced messaging
ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Update messages table constraint to allow conversation-based messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_message_target;
ALTER TABLE messages ADD CONSTRAINT check_message_target CHECK (
    (recipient_id IS NOT NULL AND group_id IS NULL AND conversation_id IS NULL) OR 
    (recipient_id IS NULL AND group_id IS NOT NULL AND conversation_id IS NULL) OR
    (recipient_id IS NULL AND group_id IS NULL AND conversation_id IS NOT NULL)
);

-- Update read_by_json to use enhanced format with timestamps
-- This will be handled in the service layer for backward compatibility

-- Create indexes for optimal query performance

-- Posts table indexes
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_like_count ON posts(like_count DESC);
CREATE INDEX idx_posts_comment_count ON posts(comment_count DESC);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX idx_posts_tags_gin ON posts USING GIN(tags);
CREATE INDEX idx_posts_title_trgm ON posts USING GIN(title gin_trgm_ops);
CREATE INDEX idx_posts_content_trgm ON posts USING GIN(content gin_trgm_ops);

-- Post likes table indexes
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at);

-- Post comments table indexes
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX idx_post_comments_parent_comment_id ON post_comments(parent_comment_id);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);

-- YouTube videos table indexes
CREATE INDEX idx_youtube_videos_resource_id ON youtube_videos(resource_id);
CREATE INDEX idx_youtube_videos_youtube_video_id ON youtube_videos(youtube_video_id);
CREATE INDEX idx_youtube_videos_upload_status ON youtube_videos(upload_status);
CREATE INDEX idx_youtube_videos_uploaded_at ON youtube_videos(uploaded_at);

-- User searches table indexes
CREATE INDEX idx_user_searches_searcher_id ON user_searches(searcher_id);
CREATE INDEX idx_user_searches_search_type ON user_searches(search_type);
CREATE INDEX idx_user_searches_created_at ON user_searches(created_at DESC);
CREATE INDEX idx_user_searches_query_trgm ON user_searches USING GIN(search_query gin_trgm_ops);

-- Admin actions table indexes
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_action ON admin_actions(action);
CREATE INDEX idx_admin_actions_target_type ON admin_actions(target_type);
CREATE INDEX idx_admin_actions_target_id ON admin_actions(target_id);
CREATE INDEX idx_admin_actions_timestamp ON admin_actions(timestamp DESC);

-- Moderation queue table indexes
CREATE INDEX idx_moderation_queue_item_type ON moderation_queue(item_type);
CREATE INDEX idx_moderation_queue_item_id ON moderation_queue(item_id);
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_assigned_to ON moderation_queue(assigned_to);
CREATE INDEX idx_moderation_queue_reported_by ON moderation_queue(reported_by);
CREATE INDEX idx_moderation_queue_created_at ON moderation_queue(created_at DESC);

-- User activity log table indexes
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_activity ON user_activity_log(activity);
CREATE INDEX idx_user_activity_log_timestamp ON user_activity_log(timestamp DESC);

-- Conversations table indexes
CREATE INDEX idx_conversations_participants_gin ON conversations USING GIN(participants);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_activity ON conversations(last_activity DESC);
CREATE INDEX idx_conversations_last_message_id ON conversations(last_message_id);

-- Enhanced messages table indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- New indexes for updated columns
CREATE INDEX idx_communities_owner_id ON communities(owner_id);
CREATE INDEX idx_communities_requires_approval ON communities(requires_approval);
CREATE INDEX idx_communities_post_count ON communities(post_count DESC);
CREATE INDEX idx_community_memberships_status ON community_memberships(status);
CREATE INDEX idx_resources_youtube_video_id ON resources(youtube_video_id);
CREATE INDEX idx_resources_security_scan_status ON resources(security_scan_status);

-- Create triggers for updated_at columns on new tables
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at 
    BEFORE UPDATE ON post_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for maintaining counts

-- Function to update post like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update community post count
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.community_id IS NOT NULL THEN
        UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.community_id IS NOT NULL THEN
        UPDATE communities SET post_count = post_count - 1 WHERE id = OLD.community_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle community change
        IF OLD.community_id IS DISTINCT FROM NEW.community_id THEN
            IF OLD.community_id IS NOT NULL THEN
                UPDATE communities SET post_count = post_count - 1 WHERE id = OLD.community_id;
            END IF;
            IF NEW.community_id IS NOT NULL THEN
                UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for count maintenance
CREATE TRIGGER trigger_update_post_like_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER trigger_update_post_comment_count
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER trigger_update_community_post_count
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_community_post_count();

-- Add new permissions for enhanced features
INSERT INTO permissions (name, description, resource, action) VALUES
-- Post management permissions
('posts.create', 'Create new posts and share content', 'posts', 'create'),
('posts.read', 'View posts and post content', 'posts', 'read'),
('posts.update', 'Edit and update posts', 'posts', 'update'),
('posts.delete', 'Delete posts', 'posts', 'delete'),
('posts.moderate', 'Moderate posts and post content', 'posts', 'moderate'),
('posts.pin', 'Pin posts in communities', 'posts', 'pin'),

-- Post interaction permissions
('posts.like', 'Like and unlike posts', 'posts', 'like'),
('posts.comment', 'Comment on posts', 'posts', 'comment'),
('posts.share', 'Share posts with others', 'posts', 'share'),

-- Enhanced community permissions
('communities.manage_members', 'Manage community members and roles', 'communities', 'manage_members'),
('communities.approve_members', 'Approve community membership requests', 'communities', 'approve_members'),
('communities.set_ownership', 'Transfer community ownership', 'communities', 'set_ownership'),

-- Video integration permissions
('videos.upload', 'Upload videos to YouTube integration', 'videos', 'upload'),
('videos.manage', 'Manage video content and metadata', 'videos', 'manage'),

-- User search permissions
('users.search', 'Search for other users on the platform', 'users', 'search'),
('users.discover', 'Discover and connect with other users', 'users', 'discover'),

-- Admin analytics permissions
('analytics.view', 'View platform analytics and metrics', 'analytics', 'view'),
('analytics.export', 'Export analytics data and reports', 'analytics', 'export');

-- Update role permissions for new features

-- Add new permissions to teacher role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'teacher', id FROM permissions WHERE name IN (
    'posts.create', 'posts.read', 'posts.update', 'posts.delete',
    'posts.like', 'posts.comment', 'posts.share',
    'videos.upload', 'videos.manage',
    'users.search', 'users.discover'
);

-- Add new permissions to moderator role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'moderator', id FROM permissions WHERE name IN (
    'posts.create', 'posts.read', 'posts.update', 'posts.delete', 'posts.moderate', 'posts.pin',
    'posts.like', 'posts.comment', 'posts.share',
    'communities.manage_members', 'communities.approve_members',
    'videos.upload', 'videos.manage',
    'users.search', 'users.discover',
    'analytics.view'
);

-- Add new permissions to admin role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions WHERE name IN (
    'posts.create', 'posts.read', 'posts.update', 'posts.delete', 'posts.moderate', 'posts.pin',
    'posts.like', 'posts.comment', 'posts.share',
    'communities.manage_members', 'communities.approve_members', 'communities.set_ownership',
    'videos.upload', 'videos.manage',
    'users.search', 'users.discover',
    'analytics.view', 'analytics.export'
);

-- Add all new permissions to super_admin role
INSERT INTO role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM permissions WHERE name IN (
    'posts.create', 'posts.read', 'posts.update', 'posts.delete', 'posts.moderate', 'posts.pin',
    'posts.like', 'posts.comment', 'posts.share',
    'communities.manage_members', 'communities.approve_members', 'communities.set_ownership',
    'videos.upload', 'videos.manage',
    'users.search', 'users.discover',
    'analytics.view', 'analytics.export'
);

-- Create views for common queries

-- View for post feed with author information
CREATE VIEW post_feed_view AS
SELECT 
    p.id,
    p.title,
    p.content,
    p.media_attachments,
    p.tags,
    p.visibility,
    p.like_count,
    p.comment_count,
    p.is_pinned,
    p.created_at,
    p.updated_at,
    u.full_name as author_name,
    u.profile_image_url as author_image,
    u.verification_status as author_verification,
    c.name as community_name,
    c.type as community_type
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN communities c ON p.community_id = c.id
WHERE u.is_active = true;

-- View for community with enhanced information
CREATE VIEW community_details_view AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.type,
    c.is_private,
    c.requires_approval,
    c.rules_json,
    c.image_url,
    c.member_count,
    c.post_count,
    c.is_active,
    c.created_at,
    c.updated_at,
    u.full_name as owner_name,
    u.profile_image_url as owner_image
FROM communities c
LEFT JOIN users u ON c.owner_id = u.id
WHERE c.is_active = true;

-- View for user search results with privacy controls
CREATE VIEW user_search_view AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.profile_image_url,
    u.subjects_json,
    u.grade_levels_json,
    u.school_location_json,
    u.verification_status,
    u.bio,
    u.created_at
FROM users u
WHERE u.is_active = true 
AND u.verification_status = 'verified';

-- Create materialized view for analytics (refreshed periodically)
CREATE MATERIALIZED VIEW platform_analytics AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as active_users_30d,
    (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_users_7d,
    (SELECT COUNT(*) FROM posts) as total_posts,
    (SELECT COUNT(*) FROM posts WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as posts_30d,
    (SELECT COUNT(*) FROM communities WHERE is_active = true) as total_communities,
    (SELECT COUNT(*) FROM resources WHERE is_active = true) as total_resources,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM youtube_videos WHERE upload_status = 'completed') as total_videos,
    CURRENT_TIMESTAMP as last_updated;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_platform_analytics_last_updated ON platform_analytics(last_updated);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_platform_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_analytics;
END;
$$ LANGUAGE plpgsql;