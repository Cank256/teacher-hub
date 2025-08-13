-- Enhanced Platform Features - Rollback Script
-- Migration 006 Rollback: Remove posts, enhanced communities, enhanced messaging, video integration, admin features

-- Drop materialized view and related objects
DROP MATERIALIZED VIEW IF EXISTS platform_analytics CASCADE;
DROP FUNCTION IF EXISTS refresh_platform_analytics();

-- Drop views
DROP VIEW IF EXISTS post_feed_view CASCADE;
DROP VIEW IF EXISTS community_details_view CASCADE;
DROP VIEW IF EXISTS user_search_view CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
DROP TRIGGER IF EXISTS trigger_update_community_post_count ON posts;
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;

-- Drop functions
DROP FUNCTION IF EXISTS update_post_like_count();
DROP FUNCTION IF EXISTS update_post_comment_count();
DROP FUNCTION IF EXISTS update_community_post_count();

-- Remove new permissions from role_permissions
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE name IN (
        'posts.create', 'posts.read', 'posts.update', 'posts.delete', 'posts.moderate', 'posts.pin',
        'posts.like', 'posts.comment', 'posts.share',
        'communities.manage_members', 'communities.approve_members', 'communities.set_ownership',
        'videos.upload', 'videos.manage',
        'users.search', 'users.discover',
        'analytics.view', 'analytics.export'
    )
);

-- Remove new permissions
DELETE FROM permissions WHERE name IN (
    'posts.create', 'posts.read', 'posts.update', 'posts.delete', 'posts.moderate', 'posts.pin',
    'posts.like', 'posts.comment', 'posts.share',
    'communities.manage_members', 'communities.approve_members', 'communities.set_ownership',
    'videos.upload', 'videos.manage',
    'users.search', 'users.discover',
    'analytics.view', 'analytics.export'
);

-- Drop indexes for new columns
DROP INDEX IF EXISTS idx_communities_owner_id;
DROP INDEX IF EXISTS idx_communities_requires_approval;
DROP INDEX IF EXISTS idx_communities_post_count;
DROP INDEX IF EXISTS idx_community_memberships_status;
DROP INDEX IF EXISTS idx_resources_youtube_video_id;
DROP INDEX IF EXISTS idx_resources_security_scan_status;

-- Drop indexes for new tables
DROP INDEX IF EXISTS idx_posts_author_id;
DROP INDEX IF EXISTS idx_posts_community_id;
DROP INDEX IF EXISTS idx_posts_visibility;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_like_count;
DROP INDEX IF EXISTS idx_posts_comment_count;
DROP INDEX IF EXISTS idx_posts_is_pinned;
DROP INDEX IF EXISTS idx_posts_tags_gin;
DROP INDEX IF EXISTS idx_posts_title_trgm;
DROP INDEX IF EXISTS idx_posts_content_trgm;

DROP INDEX IF EXISTS idx_post_likes_post_id;
DROP INDEX IF EXISTS idx_post_likes_user_id;
DROP INDEX IF EXISTS idx_post_likes_created_at;

DROP INDEX IF EXISTS idx_post_comments_post_id;
DROP INDEX IF EXISTS idx_post_comments_author_id;
DROP INDEX IF EXISTS idx_post_comments_parent_comment_id;
DROP INDEX IF EXISTS idx_post_comments_created_at;

DROP INDEX IF EXISTS idx_youtube_videos_resource_id;
DROP INDEX IF EXISTS idx_youtube_videos_youtube_video_id;
DROP INDEX IF EXISTS idx_youtube_videos_upload_status;
DROP INDEX IF EXISTS idx_youtube_videos_uploaded_at;

DROP INDEX IF EXISTS idx_user_searches_searcher_id;
DROP INDEX IF EXISTS idx_user_searches_search_type;
DROP INDEX IF EXISTS idx_user_searches_created_at;
DROP INDEX IF EXISTS idx_user_searches_query_trgm;

-- Remove new columns from existing tables
ALTER TABLE communities DROP COLUMN IF EXISTS owner_id;
ALTER TABLE communities DROP COLUMN IF EXISTS requires_approval;
ALTER TABLE communities DROP COLUMN IF EXISTS post_count;

ALTER TABLE community_memberships DROP COLUMN IF EXISTS status;
ALTER TABLE community_memberships DROP COLUMN IF EXISTS permissions;

-- Restore original role constraint for community_memberships
ALTER TABLE community_memberships DROP CONSTRAINT IF EXISTS community_memberships_role_check;
ALTER TABLE community_memberships ADD CONSTRAINT community_memberships_role_check 
    CHECK (role IN ('member', 'moderator', 'admin'));

ALTER TABLE resources DROP COLUMN IF EXISTS youtube_video_id;
ALTER TABLE resources DROP COLUMN IF EXISTS security_scan_status;
ALTER TABLE resources DROP COLUMN IF EXISTS security_scan_results;

-- Drop new tables (in reverse dependency order)
DROP TABLE IF EXISTS user_searches CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Note: This rollback script removes all data from the new tables and columns.
-- Make sure to backup data before running this rollback if you need to preserve it.