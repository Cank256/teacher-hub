import { migrator } from '../migrator';
import { db } from '../connection';

describe('Database Migrator', () => {
  beforeAll(async () => {
    // Ensure we're in test environment
    if (process.env.NODE_ENV !== 'test') {
      process.env.NODE_ENV = 'test';
    }
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Migration Status', () => {
    it('should get migration status', async () => {
      const status = await migrator.getStatus();
      
      expect(status).toHaveProperty('executed');
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('total');
      expect(Array.isArray(status.executed)).toBe(true);
      expect(Array.isArray(status.pending)).toBe(true);
      expect(typeof status.total).toBe('number');
    });
  });

  describe('Migration Execution', () => {
    it('should run migrations successfully', async () => {
      await expect(migrator.migrate()).resolves.not.toThrow();
    });

    it('should create expected tables after migration', async () => {
      // Check if main tables exist
      const tables = [
        'users',
        'resources', 
        'communities',
        'messages',
        'government_content',
        'resource_ratings',
        'community_memberships',
        'user_connections'
      ];

      for (const table of tables) {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should create expected indexes', async () => {
      // Check for some key indexes
      const indexes = [
        'idx_users_email',
        'idx_resources_author_id',
        'idx_communities_type',
        'idx_messages_sender_id'
      ];

      for (const index of indexes) {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = $1
          );
        `, [index]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should have proper constraints', async () => {
      // Test unique constraint on users.email
      const userInsert = `
        INSERT INTO users (email, password_hash, full_name, school_location_json) 
        VALUES ($1, $2, $3, $4)
      `;
      
      const testEmail = 'test@example.com';
      const testData = [testEmail, 'hash', 'Test User', '{"district": "Kampala", "region": "Central"}'];
      
      // First insert should succeed
      await db.query(userInsert, testData);
      
      // Second insert with same email should fail
      await expect(db.query(userInsert, testData)).rejects.toThrow();
      
      // Cleanup
      await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });
  });

  describe('Schema Validation', () => {
    it('should have proper column types and constraints', async () => {
      // Test users table structure
      const usersColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `);

      const emailColumn = usersColumns.rows.find((col: any) => col.column_name === 'email');
      expect(emailColumn?.data_type).toBe('character varying');
      expect(emailColumn?.is_nullable).toBe('NO');

      const verificationStatusColumn = usersColumns.rows.find((col: any) => col.column_name === 'verification_status');
      expect(verificationStatusColumn?.column_default).toContain('pending');
    });

    it('should have proper JSONB columns', async () => {
      const jsonbColumns = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND data_type = 'jsonb';
      `);

      const expectedJsonbColumns = ['subjects_json', 'grade_levels_json', 'school_location_json', 'credentials_json', 'preferences_json'];
      const actualColumns = jsonbColumns.rows.map((col: any) => col.column_name);
      
      expectedJsonbColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });
    });
  });
});