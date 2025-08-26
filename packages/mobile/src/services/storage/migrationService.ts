/**
 * Database Migration Service
 * Handles database schema migrations with version control
 */

import { MigrationService, Migration, StorageError, StorageErrorCode, TableNames } from './types'
import { DatabaseService } from './types'
import { database } from './databaseService'

class DatabaseMigrationService implements MigrationService {
  private migrations: Map<number, Migration> = new Map()
  private db: DatabaseService

  constructor(databaseService: DatabaseService = database) {
    this.db = databaseService
    this.registerMigrations()
  }

  /**
   * Get current database version
   */
  async getCurrentVersion(): Promise<number> {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable()
      
      const result = await this.db.query<{ version: number }>(
        'SELECT MAX(version) as version FROM migrations'
      )
      
      return result[0]?.version || 0
    } catch (error) {
      throw new StorageError(
        'Failed to get current database version',
        StorageErrorCode.MIGRATION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion()
      const sortedMigrations = Array.from(this.migrations.entries())
        .sort(([a], [b]) => a - b)
        .filter(([version]) => version > currentVersion)

      if (sortedMigrations.length === 0) {
        console.log('No pending migrations')
        return
      }

      console.log(`Running ${sortedMigrations.length} migrations...`)

      for (const [version, migration] of sortedMigrations) {
        await this.runMigration(migration)
        console.log(`Migration ${version} completed`)
      }

      console.log('All migrations completed successfully')
    } catch (error) {
      throw new StorageError(
        'Failed to run migrations',
        StorageErrorCode.MIGRATION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Add a migration
   */
  addMigration(version: number, migration: Migration): void {
    if (this.migrations.has(version)) {
      throw new StorageError(
        `Migration version ${version} already exists`,
        StorageErrorCode.MIGRATION_FAILED
      )
    }
    
    this.migrations.set(version, migration)
  }

  /**
   * Rollback to a specific version
   */
  async rollbackTo(targetVersion: number): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion()
      
      if (targetVersion >= currentVersion) {
        throw new StorageError(
          `Target version ${targetVersion} must be less than current version ${currentVersion}`,
          StorageErrorCode.MIGRATION_FAILED
        )
      }

      const migrationsToRollback = Array.from(this.migrations.entries())
        .sort(([a], [b]) => b - a) // Descending order for rollback
        .filter(([version]) => version > targetVersion && version <= currentVersion)

      console.log(`Rolling back ${migrationsToRollback.length} migrations...`)

      for (const [version, migration] of migrationsToRollback) {
        await this.rollbackMigration(migration)
        console.log(`Rollback ${version} completed`)
      }

      console.log(`Rollback to version ${targetVersion} completed`)
    } catch (error) {
      throw new StorageError(
        `Failed to rollback to version ${targetVersion}`,
        StorageErrorCode.MIGRATION_FAILED,
        error as Error
      )
    }
  }

  /**
   * Run a single migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    await this.db.transaction(async () => {
      // Run the migration
      await migration.up(this.db)
      
      // Record the migration
      await this.db.execute(
        'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
        [migration.version, new Date().toISOString()]
      )
    })
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    await this.db.transaction(async () => {
      // Run the rollback
      await migration.down(this.db)
      
      // Remove the migration record
      await this.db.execute(
        'DELETE FROM migrations WHERE version = ?',
        [migration.version]
      )
    })
  }

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `)
  }

  /**
   * Register all migrations
   */
  private registerMigrations(): void {
    // Migration 1: Initial schema
    this.addMigration(1, {
      version: 1,
      up: async (db: DatabaseService) => {
        // Users table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.USERS} (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            profile_picture TEXT,
            verification_status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_sync_at TEXT
          )
        `)

        // Posts table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.POSTS} (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id TEXT NOT NULL,
            category_id TEXT,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            is_liked INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_sync_at TEXT,
            FOREIGN KEY (author_id) REFERENCES ${TableNames.USERS}(id)
          )
        `)

        // Communities table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.COMMUNITIES} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            member_count INTEGER DEFAULT 0,
            is_public INTEGER DEFAULT 1,
            is_joined INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_sync_at TEXT
          )
        `)

        // Messages table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.MESSAGES} (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            is_read INTEGER DEFAULT 0,
            delivery_status TEXT DEFAULT 'sent',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_sync_at TEXT,
            FOREIGN KEY (sender_id) REFERENCES ${TableNames.USERS}(id)
          )
        `)

        // Resources table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.RESOURCES} (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            resource_type TEXT NOT NULL,
            file_url TEXT,
            thumbnail_url TEXT,
            youtube_id TEXT,
            file_size INTEGER DEFAULT 0,
            category_id TEXT,
            uploaded_by TEXT NOT NULL,
            rating REAL DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            is_downloaded INTEGER DEFAULT 0,
            local_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_sync_at TEXT,
            FOREIGN KEY (uploaded_by) REFERENCES ${TableNames.USERS}(id)
          )
        `)

        // Offline operations queue
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.OFFLINE_OPERATIONS} (
            id TEXT PRIMARY KEY,
            operation_type TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            data TEXT NOT NULL,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            created_at TEXT NOT NULL,
            scheduled_at TEXT NOT NULL
          )
        `)

        // Sync status table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${TableNames.SYNC_STATUS} (
            resource_type TEXT PRIMARY KEY,
            last_sync_at TEXT NOT NULL,
            sync_token TEXT,
            is_syncing INTEGER DEFAULT 0
          )
        `)
      },
      down: async (db: DatabaseService) => {
        const tables = Object.values(TableNames)
        for (const table of tables) {
          await db.execute(`DROP TABLE IF EXISTS ${table}`)
        }
      }
    })

    // Migration 2: Add indexes for performance
    this.addMigration(2, {
      version: 2,
      up: async (db: DatabaseService) => {
        // User indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON ${TableNames.USERS}(email)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_verification ON ${TableNames.USERS}(verification_status)`)

        // Post indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_posts_author ON ${TableNames.POSTS}(author_id)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_posts_category ON ${TableNames.POSTS}(category_id)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_posts_created ON ${TableNames.POSTS}(created_at DESC)`)

        // Community indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_communities_category ON ${TableNames.COMMUNITIES}(category)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_communities_public ON ${TableNames.COMMUNITIES}(is_public)`)

        // Message indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ${TableNames.MESSAGES}(conversation_id)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON ${TableNames.MESSAGES}(sender_id)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_created ON ${TableNames.MESSAGES}(created_at DESC)`)

        // Resource indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_resources_type ON ${TableNames.RESOURCES}(resource_type)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_resources_category ON ${TableNames.RESOURCES}(category_id)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_resources_uploader ON ${TableNames.RESOURCES}(uploaded_by)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_resources_downloaded ON ${TableNames.RESOURCES}(is_downloaded)`)

        // Offline operations indexes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_offline_ops_type ON ${TableNames.OFFLINE_OPERATIONS}(operation_type)`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_offline_ops_scheduled ON ${TableNames.OFFLINE_OPERATIONS}(scheduled_at)`)
      },
      down: async (db: DatabaseService) => {
        const indexes = [
          'idx_users_email', 'idx_users_verification',
          'idx_posts_author', 'idx_posts_category', 'idx_posts_created',
          'idx_communities_category', 'idx_communities_public',
          'idx_messages_conversation', 'idx_messages_sender', 'idx_messages_created',
          'idx_resources_type', 'idx_resources_category', 'idx_resources_uploader', 'idx_resources_downloaded',
          'idx_offline_ops_type', 'idx_offline_ops_scheduled'
        ]
        
        for (const index of indexes) {
          await db.execute(`DROP INDEX IF EXISTS ${index}`)
        }
      }
    })

    // Migration 3: Add full-text search
    this.addMigration(3, {
      version: 3,
      up: async (db: DatabaseService) => {
        // Create FTS tables for search functionality
        await db.execute(`
          CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
            id UNINDEXED,
            title,
            content,
            content='${TableNames.POSTS}',
            content_rowid='rowid'
          )
        `)

        await db.execute(`
          CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
            id UNINDEXED,
            title,
            description,
            content='${TableNames.RESOURCES}',
            content_rowid='rowid'
          )
        `)

        // Create triggers to keep FTS tables in sync
        await db.execute(`
          CREATE TRIGGER IF NOT EXISTS posts_fts_insert AFTER INSERT ON ${TableNames.POSTS} BEGIN
            INSERT INTO posts_fts(id, title, content) VALUES (new.id, new.title, new.content);
          END
        `)

        await db.execute(`
          CREATE TRIGGER IF NOT EXISTS posts_fts_update AFTER UPDATE ON ${TableNames.POSTS} BEGIN
            UPDATE posts_fts SET title = new.title, content = new.content WHERE id = new.id;
          END
        `)

        await db.execute(`
          CREATE TRIGGER IF NOT EXISTS posts_fts_delete AFTER DELETE ON ${TableNames.POSTS} BEGIN
            DELETE FROM posts_fts WHERE id = old.id;
          END
        `)
      },
      down: async (db: DatabaseService) => {
        await db.execute('DROP TRIGGER IF EXISTS posts_fts_delete')
        await db.execute('DROP TRIGGER IF EXISTS posts_fts_update')
        await db.execute('DROP TRIGGER IF EXISTS posts_fts_insert')
        await db.execute('DROP TABLE IF EXISTS resources_fts')
        await db.execute('DROP TABLE IF EXISTS posts_fts')
      }
    })
  }
}

// Create singleton instance
export const migrationService = new DatabaseMigrationService()

export { DatabaseMigrationService }