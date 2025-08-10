-- Migration 004: Add phone column to users table
-- This migration adds a phone number field to the users table

-- Add phone column to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Add index for phone number lookups (optional, for future features)
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Update the updated_at timestamp
UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE phone IS NULL;