-- Gamification system tables

-- Badges table
CREATE TABLE badges (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('contribution', 'engagement', 'achievement', 'milestone')),
    criteria_type VARCHAR(50) NOT NULL,
    criteria_threshold INTEGER NOT NULL,
    criteria_timeframe VARCHAR(20),
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges (earned badges)
CREATE TABLE user_badges (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_id VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE(user_id, badge_id)
);

-- User points and statistics
CREATE TABLE user_stats (
    user_id VARCHAR(255) PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    resource_uploads INTEGER DEFAULT 0,
    helpful_ratings INTEGER DEFAULT 0,
    community_posts INTEGER DEFAULT 0,
    peer_nominations_received INTEGER DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Achievements
CREATE TABLE achievements (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('badge_earned', 'milestone_reached', 'peer_nominated', 'top_contributor')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Peer nominations
CREATE TABLE peer_nominations (
    id VARCHAR(255) PRIMARY KEY,
    nominator_id VARCHAR(255) NOT NULL,
    nominee_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('helpful_teacher', 'innovative_educator', 'community_leader', 'resource_creator')),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    FOREIGN KEY (nominator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (nominee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(nominator_id, nominee_id, category)
);

-- Leaderboard cache (for performance)
CREATE TABLE leaderboard_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('weekly', 'monthly', 'all_time')),
    rank INTEGER NOT NULL,
    points INTEGER NOT NULL,
    badges_count INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, timeframe)
);

-- Indexes for performance
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_created_at ON achievements(created_at DESC);
CREATE INDEX idx_peer_nominations_nominee ON peer_nominations(nominee_id);
CREATE INDEX idx_peer_nominations_nominator ON peer_nominations(nominator_id);
CREATE INDEX idx_peer_nominations_status ON peer_nominations(status);
CREATE INDEX idx_leaderboard_cache_timeframe_rank ON leaderboard_cache(timeframe, rank);
CREATE INDEX idx_user_stats_total_points ON user_stats(total_points DESC);

-- Events and workshops tables

-- Events table
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('workshop', 'webinar', 'conference', 'training', 'meeting')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT false,
    virtual_link VARCHAR(500),
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    organizer_id VARCHAR(255) NOT NULL,
    tags TEXT[], -- PostgreSQL array type
    subjects TEXT[],
    target_audience TEXT[],
    registration_deadline TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event registrations table
CREATE TABLE event_registrations (
    id VARCHAR(255) PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

-- Event notifications table
CREATE TABLE event_notifications (
    id VARCHAR(255) PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('registration_confirmation', 'reminder', 'update', 'cancellation')),
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for events
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);
CREATE INDEX idx_event_notifications_scheduled ON event_notifications(scheduled_for);
CREATE INDEX idx_event_notifications_sent ON event_notifications(sent);

-- Insert default badges
INSERT INTO badges (id, name, description, icon, category, criteria_type, criteria_threshold, rarity, points) VALUES
('first_upload', 'First Contributor', 'Upload your first educational resource', '🎯', 'milestone', 'resource_uploads', 1, 'common', 10),
('helpful_teacher', 'Helpful Teacher', 'Receive 10 helpful ratings from peers', '⭐', 'engagement', 'helpful_ratings', 10, 'uncommon', 25),
('resource_master', 'Resource Master', 'Upload 50 high-quality resources', '📚', 'contribution', 'resource_uploads', 50, 'rare', 100),
('community_champion', 'Community Champion', 'Active in community discussions for 30 days', '🏆', 'engagement', 'community_participation', 30, 'epic', 150),
('peer_favorite', 'Peer Favorite', 'Receive 5 peer nominations', '💎', 'achievement', 'peer_nominations', 5, 'legendary', 200),
('early_adopter', 'Early Adopter', 'One of the first 100 users to join', '🚀', 'milestone', 'profile_completion', 1, 'rare', 75),
('mentor', 'Mentor', 'Help 25 fellow teachers with resources', '👨‍🏫', 'engagement', 'helpful_ratings', 25, 'epic', 125),
('innovator', 'Innovator', 'Create unique and creative educational content', '💡', 'contribution', 'resource_uploads', 20, 'uncommon', 50);