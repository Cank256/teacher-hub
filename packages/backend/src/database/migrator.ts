import fs from 'fs';
import path from 'path';
import { db } from './connection';
import { createLogger } from '../utils/logger';

const logger = createLogger('migrator');

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize the migrations table if it doesn't exist
   */
  private async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await db.query(createTableQuery);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Failed to initialize migrations table', error);
      throw error;
    }
  }

  /**
   * Get list of executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await db.query('SELECT filename FROM schema_migrations ORDER BY id');
      return result.rows.map((row: any) => row.filename);
    } catch (error) {
      logger.error('Failed to get executed migrations', error);
      throw error;
    }
  }

  /**
   * Get list of migration files from filesystem
   */
  private getMigrationFiles(): Migration[] {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(filename => {
        const filePath = path.join(this.migrationsPath, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        const idPart = filename.split('_')[0];
        const id = idPart ? parseInt(idPart) : 0;
        
        return { id, filename, sql };
      });
    } catch (error) {
      logger.error('Failed to read migration files', error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);
        
        // Record the migration as executed
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [migration.filename]
        );
      });

      logger.info(`Migration executed successfully: ${migration.filename}`);
    } catch (error) {
      logger.error(`Failed to execute migration: ${migration.filename}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  public async migrate(): Promise<void> {
    try {
      logger.info('Starting database migration...');

      // Initialize migrations table
      await this.initializeMigrationsTable();

      // Get executed migrations and available migration files
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.filename)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        logger.info(`Executing migration: ${migration.filename}`);
        await this.executeMigration(migration);
      }

      logger.info('Database migration completed successfully');
    } catch (error) {
      logger.error('Database migration failed', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration (for development purposes)
   */
  public async rollback(): Promise<void> {
    try {
      logger.info('Starting migration rollback...');

      const result = await db.query(
        'SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0].filename;
      
      // Remove the migration record
      await db.query(
        'DELETE FROM schema_migrations WHERE filename = $1',
        [lastMigration]
      );

      logger.info(`Rolled back migration: ${lastMigration}`);
      logger.warn('Note: This only removes the migration record. Manual cleanup of schema changes may be required.');
    } catch (error) {
      logger.error('Migration rollback failed', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    try {
      await this.initializeMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles
        .filter(migration => !executedMigrations.includes(migration.filename))
        .map(migration => migration.filename);

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
        total: migrationFiles.length
      };
    } catch (error) {
      logger.error('Failed to get migration status', error);
      throw error;
    }
  }

  /**
   * Reset database (drop all tables and re-run migrations)
   * WARNING: This will destroy all data!
   */
  public async reset(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production environment');
    }

    try {
      logger.warn('Resetting database - this will destroy all data!');

      // Drop all tables
      await db.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO public;
      `);

      logger.info('Database reset completed');

      // Re-run migrations
      await this.migrate();
    } catch (error) {
      logger.error('Database reset failed', error);
      throw error;
    }
  }
}

export const migrator = new DatabaseMigrator();