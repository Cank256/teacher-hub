-- Teacher Hub Platform - Initial Database Schema
-- Migration 001: Core tables and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS resource_ratings CASCADE;
DROP TABLE IF EXISTS community_memberships CASCADE;
DROP TABLE IF EXISTS user_connections CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS government_content CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (Teacher profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    subjects_json JSONB DEFAULT '[]'::jsonb,
    grade_levels_json JSONB DEFAULT '[]'::jsonb,
    school_location_json JSONB NOT NULL,
    years_experience INTEGER DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    credentials_json JSONB DEFAULT '[]'::jsonb,
    preferences_json JSONB DEFAULT '{}'::jsonb,
    profile_image_url VARCHAR(500),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'image', 'document', 'text')),
    format VARCHAR(100) NOT NULL,
    size BIGINT DEFAULT 0,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    subjects_json JSONB DEFAULT '[]'::jsonb,
    grade_levels_json JSONB DEFAULT '[]'::jsonb,
    curriculum_alignment_json JSONB DEFAULT '[]'::jsonb,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_government_content BOOLEAN DEFAULT false,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('verified', 'pending', 'flagged')),
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    tags_json JSONB DEFAULT '[]'::jsonb,
    attachments_json JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communities table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('subject', 'region', 'grade', 'general')),
    members_json JSONB DEFAULT '[]'::jsonb,
    moderators_json JSONB DEFAULT '[]'::jsonb,
    is_private BOOLEAN DEFAULT false,
    rules_json JSONB DEFAULT '[]'::jsonb,
    image_url VARCHAR(500),
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'file', 'image')),
    attachments_json JSONB DEFAULT '[]'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_by_json JSONB DEFAULT '[]'::jsonb,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Constraint: message must have either recipient_id or group_id, but not both
    CONSTRAINT check_message_target CHECK (
        (recipient_id IS NOT NULL AND group_id IS NULL) OR 
        (recipient_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Government content table
CREATE TABLE government_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(10) NOT NULL CHECK (source IN ('MOE', 'UNEB', 'NCDC')),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('curriculum', 'policy', 'resource', 'announcement')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments_json JSONB DEFAULT '[]'::jsonb,
    target_audience_json JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    effective_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP,
    digital_signature TEXT NOT NULL,
    verification_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource ratings table
CREATE TABLE resource_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one rating per user per resource
    UNIQUE(resource_id, user_id)
);

-- Community memberships table
CREATE TABLE community_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Unique constraint: one membership per user per community
    UNIQUE(community_id, user_id)
);

-- User connections table (following/followers)
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one connection per follower-following pair
    UNIQUE(follower_id, following_id),
    
    -- Constraint: users cannot follow themselves
    CHECK (follower_id != following_id)
);

-- Create indexes for better query performance

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subjects_gin ON users USING GIN(subjects_json);
CREATE INDEX idx_users_grade_levels_gin ON users USING GIN(grade_levels_json);
CREATE INDEX idx_users_full_name_trgm ON users USING GIN(full_name gin_trgm_ops);

-- Resources table indexes
CREATE INDEX idx_resources_author_id ON resources(author_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_verification_status ON resources(verification_status);
CREATE INDEX idx_resources_is_government_content ON resources(is_government_content);
CREATE INDEX idx_resources_is_active ON resources(is_active);
CREATE INDEX idx_resources_created_at ON resources(created_at);
CREATE INDEX idx_resources_rating ON resources(rating);
CREATE INDEX idx_resources_download_count ON resources(download_count);
CREATE INDEX idx_resources_subjects_gin ON resources USING GIN(subjects_json);
CREATE INDEX idx_resources_grade_levels_gin ON resources USING GIN(grade_levels_json);
CREATE INDEX idx_resources_tags_gin ON resources USING GIN(tags_json);
CREATE INDEX idx_resources_title_trgm ON resources USING GIN(title gin_trgm_ops);
CREATE INDEX idx_resources_description_trgm ON resources USING GIN(description gin_trgm_ops);

-- Communities table indexes
CREATE INDEX idx_communities_type ON communities(type);
CREATE INDEX idx_communities_is_private ON communities(is_private);
CREATE INDEX idx_communities_is_active ON communities(is_active);
CREATE INDEX idx_communities_member_count ON communities(member_count);
CREATE INDEX idx_communities_created_at ON communities(created_at);
CREATE INDEX idx_communities_name_trgm ON communities USING GIN(name gin_trgm_ops);

-- Messages table indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_sync_status ON messages(sync_status);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

-- Government content table indexes
CREATE INDEX idx_government_content_source ON government_content(source);
CREATE INDEX idx_government_content_content_type ON government_content(content_type);
CREATE INDEX idx_government_content_priority ON government_content(priority);
CREATE INDEX idx_government_content_effective_date ON government_content(effective_date);
CREATE INDEX idx_government_content_expiry_date ON government_content(expiry_date);
CREATE INDEX idx_government_content_is_active ON government_content(is_active);
CREATE INDEX idx_government_content_target_audience_gin ON government_content USING GIN(target_audience_json);

-- Resource ratings table indexes
CREATE INDEX idx_resource_ratings_resource_id ON resource_ratings(resource_id);
CREATE INDEX idx_resource_ratings_user_id ON resource_ratings(user_id);
CREATE INDEX idx_resource_ratings_rating ON resource_ratings(rating);
CREATE INDEX idx_resource_ratings_created_at ON resource_ratings(created_at);

-- Community memberships table indexes
CREATE INDEX idx_community_memberships_community_id ON community_memberships(community_id);
CREATE INDEX idx_community_memberships_user_id ON community_memberships(user_id);
CREATE INDEX idx_community_memberships_role ON community_memberships(role);
CREATE INDEX idx_community_memberships_is_active ON community_memberships(is_active);

-- User connections table indexes
CREATE INDEX idx_user_connections_follower_id ON user_connections(follower_id);
CREATE INDEX idx_user_connections_following_id ON user_connections(following_id);
CREATE INDEX idx_user_connections_status ON user_connections(status);
CREATE INDEX idx_user_connections_created_at ON user_connections(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_government_content_updated_at BEFORE UPDATE ON government_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resource_ratings_updated_at BEFORE UPDATE ON resource_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_connections_updated_at BEFORE UPDATE ON user_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();