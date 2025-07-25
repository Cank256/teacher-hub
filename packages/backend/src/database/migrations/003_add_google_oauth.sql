-- Migration: Add Google OAuth support
-- Description: Add google_id and auth_provider columns to users table

-- Add Google OAuth columns
ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) UNIQUE,
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local' NOT NULL;

-- Create index on google_id for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Create index on auth_provider
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- Make password_hash optional for Google OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add constraint to ensure password_hash is present for local auth users
ALTER TABLE users ADD CONSTRAINT check_password_for_local_auth 
CHECK (
  (auth_provider = 'local' AND password_hash IS NOT NULL) OR 
  (auth_provider != 'local')
);

-- Update existing users to have auth_provider = 'local'
UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;