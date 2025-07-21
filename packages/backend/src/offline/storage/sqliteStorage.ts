import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { 
  OfflineOperation, 
  CacheEntry, 
  OfflineStorageConfig, 
  StorageQuota,
  OfflineResource,
  OfflineMessage,
  ConflictResolution
} from '../types';
import logger from '../../utils/logger';

export class SQLiteStorage {
  private db!: Database.Database;
  private config: OfflineStorageConfig;

  constructor(config: OfflineStorageConfig) {
    this.config = config;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      // Ensure directory exists
      const dbDir = join(process.cwd(), 'data', 'offline');
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = join(dbDir, this.config.dbPath);
      this.db = new Database(dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      
      this.createTables();
      logger.info('SQLite offline storage initialized', { dbPath });
    } catch (error) {
      logger.error('Failed to initialize SQLite storage', { error });
      throw error;
    }
  }

  private createTables(): void {
    // Operations queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        user_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Cache entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER,
        priority TEXT DEFAULT 'medium',
        size INTEGER NOT NULL,
        access_count INTEGER DEFAULT 0,
        last_accessed INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Offline resources table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offline_resources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        local_path TEXT NOT NULL,
        original_url TEXT NOT NULL,
        size INTEGER NOT NULL,
        downloaded_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        priority TEXT DEFAULT 'medium',
        is_complete BOOLEAN DEFAULT 0,
        user_id TEXT NOT NULL
      )
    `);

    // Offline messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offline_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        group_id TEXT,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        timestamp INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        local_only BOOLEAN DEFAULT 0,
        attachments TEXT DEFAULT '[]'
      )
    `);

    // Conflict resolution table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conflict_resolutions (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version TEXT NOT NULL,
        remote_version TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        resolution TEXT,
        resolved_at INTEGER,
        resolved_by TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
      CREATE INDEX IF NOT EXISTS idx_operations_user_id ON operations(user_id);
      CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
      CREATE INDEX IF NOT EXISTS idx_cache_priority ON cache_entries(priority);
      CREATE INDEX IF NOT EXISTS idx_resources_user ON offline_resources(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON offline_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON offline_messages(sync_status);
    `);
  }

  // Operation Queue Methods
  addOperation(operation: OfflineOperation): void {
    const stmt = this.db.prepare(`
      INSERT INTO operations (id, type, entity, entity_id, data, timestamp, retry_count, max_retries, status, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      operation.id,
      operation.type,
      operation.entity,
      operation.entityId,
      JSON.stringify(operation.data),
      operation.timestamp.getTime(),
      operation.retryCount,
      operation.maxRetries,
      operation.status,
      operation.userId
    );
  }

  getPendingOperations(userId?: string): OfflineOperation[] {
    let query = `SELECT * FROM operations WHERE status = 'pending' ORDER BY timestamp ASC`;
    let params: any[] = [];

    if (userId) {
      query = `SELECT * FROM operations WHERE status = 'pending' AND user_id = ? ORDER BY timestamp ASC`;
      params = [userId];
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      entity: row.entity,
      entityId: row.entity_id,
      data: JSON.parse(row.data),
      timestamp: new Date(row.timestamp),
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      status: row.status,
      userId: row.user_id
    }));
  }

  updateOperationStatus(operationId: string, status: string, retryCount?: number): void {
    let query = `UPDATE operations SET status = ? WHERE id = ?`;
    let params: any[] = [status, operationId];

    if (retryCount !== undefined) {
      query = `UPDATE operations SET status = ?, retry_count = ? WHERE id = ?`;
      params = [status, retryCount, operationId];
    }

    const stmt = this.db.prepare(query);
    stmt.run(...params);
  }

  deleteOperation(operationId: string): void {
    const stmt = this.db.prepare(`DELETE FROM operations WHERE id = ?`);
    stmt.run(operationId);
  }

  // Cache Methods
  setCache<T>(key: string, data: T, priority: 'high' | 'medium' | 'low' = 'medium', expiresAt?: Date): void {
    const dataStr = JSON.stringify(data);
    const size = Buffer.byteLength(dataStr, 'utf8');
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cache_entries (key, data, timestamp, expires_at, priority, size, last_accessed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      key,
      dataStr,
      now,
      expiresAt ? expiresAt.getTime() : null,
      priority,
      size,
      now
    );

    this.cleanupExpiredCache();
  }

  getCache<T>(key: string): T | null {
    const stmt = this.db.prepare(`
      SELECT data, expires_at FROM cache_entries WHERE key = ?
    `);
    const row = stmt.get(key) as any;

    if (!row) return null;

    // Check if expired
    if (row.expires_at && row.expires_at < Date.now()) {
      this.deleteCache(key);
      return null;
    }

    // Update access count and last accessed
    const updateStmt = this.db.prepare(`
      UPDATE cache_entries SET access_count = access_count + 1, last_accessed = ? WHERE key = ?
    `);
    updateStmt.run(Date.now(), key);

    return JSON.parse(row.data);
  }

  deleteCache(key: string): void {
    const stmt = this.db.prepare(`DELETE FROM cache_entries WHERE key = ?`);
    stmt.run(key);
  }

  private cleanupExpiredCache(): void {
    const stmt = this.db.prepare(`
      DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < ?
    `);
    stmt.run(Date.now());
  }

  // Storage Quota Methods
  getStorageQuota(): StorageQuota {
    const stmt = this.db.prepare(`
      SELECT SUM(size) as used_size FROM cache_entries
      UNION ALL
      SELECT SUM(size) as used_size FROM offline_resources
    `);
    const rows = stmt.all() as any[];
    
    const usedSize = rows.reduce((total, row) => total + (row.used_size || 0), 0);
    const maxSize = this.config.maxCacheSize * 1024 * 1024; // Convert MB to bytes
    const available = maxSize - usedSize;
    
    return {
      total: maxSize,
      used: usedSize,
      available,
      critical: available < (maxSize * 0.1) // Less than 10% available
    };
  }

  // Offline Resource Methods
  addOfflineResource(resource: OfflineResource): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO offline_resources 
      (id, title, description, type, local_path, original_url, size, downloaded_at, last_accessed_at, priority, is_complete, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      resource.id,
      resource.title,
      resource.description,
      resource.type,
      resource.localPath,
      resource.originalUrl,
      resource.size,
      resource.downloadedAt.getTime(),
      resource.lastAccessedAt.getTime(),
      resource.priority,
      resource.isComplete ? 1 : 0,
      'system' // Default user for now
    );
  }

  getOfflineResource(resourceId: string): OfflineResource | null {
    const stmt = this.db.prepare(`SELECT * FROM offline_resources WHERE id = ?`);
    const row = stmt.get(resourceId) as any;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      localPath: row.local_path,
      originalUrl: row.original_url,
      size: row.size,
      downloadedAt: new Date(row.downloaded_at),
      lastAccessedAt: new Date(row.last_accessed_at),
      priority: row.priority,
      isComplete: Boolean(row.is_complete)
    };
  }

  // Offline Message Methods
  addOfflineMessage(message: OfflineMessage): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO offline_messages 
      (id, sender_id, recipient_id, group_id, content, type, timestamp, sync_status, local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.senderId,
      message.recipientId,
      message.groupId,
      message.content,
      message.type,
      message.timestamp.getTime(),
      message.syncStatus,
      message.localOnly ? 1 : 0
    );
  }

  getOfflineMessages(userId: string, limit: number = 50): OfflineMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM offline_messages 
      WHERE sender_id = ? OR recipient_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const rows = stmt.all(userId, userId, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      groupId: row.group_id,
      content: row.content,
      type: row.type,
      timestamp: new Date(row.timestamp),
      syncStatus: row.sync_status,
      localOnly: Boolean(row.local_only)
    }));
  }

  // Conflict Resolution Methods
  addConflictResolution(conflict: ConflictResolution): void {
    const stmt = this.db.prepare(`
      INSERT INTO conflict_resolutions 
      (id, entity_type, entity_id, local_version, remote_version, conflict_type, resolution, resolved_at, resolved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      conflict.id,
      conflict.entityType,
      conflict.entityId,
      JSON.stringify(conflict.localVersion),
      JSON.stringify(conflict.remoteVersion),
      conflict.conflictType,
      conflict.resolution,
      conflict.resolvedAt ? conflict.resolvedAt.getTime() : null,
      conflict.resolvedBy
    );
  }

  // Cleanup Methods
  cleanup(): void {
    const transaction = this.db.transaction(() => {
      // Clean expired cache entries
      this.cleanupExpiredCache();

      // Clean old completed operations (older than 7 days)
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      this.db.prepare(`DELETE FROM operations WHERE status = 'completed' AND created_at < ?`).run(weekAgo);

      // Clean old failed operations (older than 30 days)
      const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      this.db.prepare(`DELETE FROM operations WHERE status = 'failed' AND created_at < ?`).run(monthAgo);
    });

    transaction();
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}