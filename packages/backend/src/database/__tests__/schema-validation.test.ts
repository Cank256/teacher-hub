import fs from 'fs';
import path from 'path';

describe('Database Schema Validation', () => {
  let migrationSQL: string;

  beforeAll(() => {
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  });

  describe('Migration File Structure', () => {
    it('should contain all required table definitions', () => {
      const requiredTables = [
        'users',
        'resources',
        'communities',
        'messages',
        'government_content',
        'resource_ratings',
        'community_memberships',
        'user_connections'
      ];

      requiredTables.forEach(table => {
        expect(migrationSQL).toMatch(new RegExp(`CREATE TABLE ${table}`, 'i'));
      });
    });

    it('should have proper UUID primary keys', () => {
      const uuidPrimaryKeyPattern = /id UUID PRIMARY KEY DEFAULT uuid_generate_v4\(\)/g;
      const matches = migrationSQL.match(uuidPrimaryKeyPattern);
      
      // Should have 8 tables with UUID primary keys
      expect(matches).toHaveLength(8);
    });

    it('should have proper foreign key constraints', () => {
      const foreignKeyPatterns = [
        /author_id UUID NOT NULL REFERENCES users\(id\)/,
        /sender_id UUID NOT NULL REFERENCES users\(id\)/,
        /resource_id UUID NOT NULL REFERENCES resources\(id\)/,
        /community_id UUID NOT NULL REFERENCES communities\(id\)/,
        /user_id UUID NOT NULL REFERENCES users\(id\)/
      ];

      foreignKeyPatterns.forEach(pattern => {
        expect(migrationSQL).toMatch(pattern);
      });
    });

    it('should have proper JSONB columns for complex data', () => {
      const jsonbColumns = [
        'subjects_json JSONB',
        'grade_levels_json JSONB',
        'school_location_json JSONB',
        'credentials_json JSONB',
        'preferences_json JSONB',
        'attachments_json JSONB',
        'tags_json JSONB',
        'target_audience_json JSONB'
      ];

      jsonbColumns.forEach(column => {
        expect(migrationSQL).toMatch(new RegExp(column, 'i'));
      });
    });

    it('should have proper check constraints', () => {
      const checkConstraints = [
        /verification_status IN \('pending', 'verified', 'rejected'\)/,
        /type IN \('video', 'image', 'document', 'text'\)/,
        /source IN \('MOE', 'UNEB', 'NCDC'\)/,
        /priority IN \('high', 'medium', 'low'\)/,
        /rating >= 0 AND rating <= 5/
      ];

      checkConstraints.forEach(constraint => {
        expect(migrationSQL).toMatch(constraint);
      });
    });

    it('should create proper indexes', () => {
      const requiredIndexes = [
        'idx_users_email',
        'idx_users_verification_status',
        'idx_resources_author_id',
        'idx_resources_type',
        'idx_communities_type',
        'idx_messages_sender_id',
        'idx_messages_timestamp'
      ];

      requiredIndexes.forEach(index => {
        expect(migrationSQL).toMatch(new RegExp(`CREATE INDEX ${index}`, 'i'));
      });
    });

    it('should create GIN indexes for JSONB columns', () => {
      const ginIndexes = [
        'idx_users_subjects_gin',
        'idx_resources_subjects_gin',
        'idx_resources_tags_gin'
      ];

      ginIndexes.forEach(index => {
        expect(migrationSQL).toMatch(new RegExp(`CREATE INDEX ${index}.*USING GIN`, 'i'));
      });
    });

    it('should create trigram indexes for text search', () => {
      const trigramIndexes = [
        'idx_users_full_name_trgm',
        'idx_resources_title_trgm',
        'idx_communities_name_trgm'
      ];

      trigramIndexes.forEach(index => {
        expect(migrationSQL).toMatch(new RegExp(`CREATE INDEX ${index}.*gin_trgm_ops`, 'i'));
      });
    });

    it('should have updated_at triggers', () => {
      const triggerTables = [
        'users',
        'resources',
        'communities',
        'government_content',
        'resource_ratings',
        'user_connections'
      ];

      triggerTables.forEach(table => {
        expect(migrationSQL).toMatch(
          new RegExp(`CREATE TRIGGER update_${table}_updated_at`, 'i')
        );
      });
    });

    it('should enable required PostgreSQL extensions', () => {
      expect(migrationSQL).toMatch(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/);
      expect(migrationSQL).toMatch(/CREATE EXTENSION IF NOT EXISTS "pg_trgm"/);
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should have unique constraints where needed', () => {
      const uniqueConstraints = [
        /UNIQUE\(resource_id, user_id\)/, // resource_ratings
        /UNIQUE\(community_id, user_id\)/, // community_memberships
        /UNIQUE\(follower_id, following_id\)/ // user_connections
      ];

      uniqueConstraints.forEach(constraint => {
        expect(migrationSQL).toMatch(constraint);
      });
    });

    it('should have proper cascade delete rules', () => {
      const cascadeDeletes = [
        /ON DELETE CASCADE/g
      ];

      cascadeDeletes.forEach(pattern => {
        const matches = migrationSQL.match(pattern);
        expect(matches).toBeTruthy();
        expect(matches!.length).toBeGreaterThan(5); // Multiple cascade deletes expected
      });
    });

    it('should have message target constraint', () => {
      // Messages should have either recipient_id or group_id, but not both
      expect(migrationSQL).toMatch(/CONSTRAINT check_message_target CHECK/);
      expect(migrationSQL).toMatch(/recipient_id IS NOT NULL AND group_id IS NULL/);
      expect(migrationSQL).toMatch(/recipient_id IS NULL AND group_id IS NOT NULL/);
    });

    it('should prevent self-following constraint', () => {
      expect(migrationSQL).toMatch(/CHECK \(follower_id != following_id\)/);
    });
  });

  describe('Default Values', () => {
    it('should have proper default values', () => {
      const defaultValues = [
        /verification_status VARCHAR\(20\) DEFAULT 'pending'/,
        /is_active BOOLEAN DEFAULT true/,
        /download_count INTEGER DEFAULT 0/,
        /rating DECIMAL\(3,2\) DEFAULT 0\.00/,
        /member_count INTEGER DEFAULT 0/,
        /sync_status VARCHAR\(20\) DEFAULT 'synced'/
      ];

      defaultValues.forEach(pattern => {
        expect(migrationSQL).toMatch(pattern);
      });
    });

    it('should have proper JSONB default values', () => {
      const jsonbDefaults = [
        /subjects_json JSONB DEFAULT '\[\]'::jsonb/,
        /grade_levels_json JSONB DEFAULT '\[\]'::jsonb/,
        /credentials_json JSONB DEFAULT '\[\]'::jsonb/,
        /preferences_json JSONB DEFAULT '\{\}'::jsonb/
      ];

      jsonbDefaults.forEach(pattern => {
        expect(migrationSQL).toMatch(pattern);
      });
    });
  });
});