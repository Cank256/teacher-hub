import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

export interface OfflineResource {
  id: string;
  title: string;
  description: string;
  type: string;
  localPath: string;
  downloadedAt: string;
  size: number;
  metadata: string; // JSON string
}

export interface OfflineMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  timestamp: string;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface CachedData {
  key: string;
  data: string; // JSON string
  expiresAt: string;
  createdAt: string;
}

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'TeacherHub.db';
  private readonly dbVersion = '1.0';
  private readonly dbDisplayName = 'Teacher Hub Database';
  private readonly dbSize = 200000;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        version: this.dbVersion,
        displayName: this.dbDisplayName,
        size: this.dbSize,
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createResourcesTable = `
      CREATE TABLE IF NOT EXISTS offline_resources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        localPath TEXT NOT NULL,
        downloadedAt TEXT NOT NULL,
        size INTEGER NOT NULL,
        metadata TEXT
      );
    `;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS offline_messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'pending'
      );
    `;

    const createCacheTable = `
      CREATE TABLE IF NOT EXISTS cached_data (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON offline_messages(conversationId);
      CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON offline_messages(syncStatus);
      CREATE INDEX IF NOT EXISTS idx_cache_expires ON cached_data(expiresAt);
    `;

    await this.db.executeSql(createResourcesTable);
    await this.db.executeSql(createMessagesTable);
    await this.db.executeSql(createCacheTable);
    await this.db.executeSql(createIndexes);
  }

  // Resource methods
  async saveOfflineResource(resource: OfflineResource): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO offline_resources 
      (id, title, description, type, localPath, downloadedAt, size, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      resource.id,
      resource.title,
      resource.description,
      resource.type,
      resource.localPath,
      resource.downloadedAt,
      resource.size,
      resource.metadata,
    ]);
  }

  async getOfflineResources(): Promise<OfflineResource[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM offline_resources ORDER BY downloadedAt DESC';
    const [results] = await this.db.executeSql(query);
    
    const resources: OfflineResource[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      resources.push(results.rows.item(i));
    }
    
    return resources;
  }

  async deleteOfflineResource(resourceId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM offline_resources WHERE id = ?';
    await this.db.executeSql(query, [resourceId]);
  }

  // Message methods
  async saveOfflineMessage(message: OfflineMessage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO offline_messages 
      (id, conversationId, senderId, content, type, timestamp, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      message.id,
      message.conversationId,
      message.senderId,
      message.content,
      message.type,
      message.timestamp,
      message.syncStatus,
    ]);
  }

  async getPendingMessages(): Promise<OfflineMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM offline_messages WHERE syncStatus = ? ORDER BY timestamp ASC';
    const [results] = await this.db.executeSql(query, ['pending']);
    
    const messages: OfflineMessage[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      messages.push(results.rows.item(i));
    }
    
    return messages;
  }

  async updateMessageSyncStatus(messageId: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'UPDATE offline_messages SET syncStatus = ? WHERE id = ?';
    await this.db.executeSql(query, [status, messageId]);
  }

  async getMessagesByConversation(conversationId: string): Promise<OfflineMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM offline_messages WHERE conversationId = ? ORDER BY timestamp ASC';
    const [results] = await this.db.executeSql(query, [conversationId]);
    
    const messages: OfflineMessage[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      messages.push(results.rows.item(i));
    }
    
    return messages;
  }

  // Cache methods
  async setCachedData(key: string, data: any, expirationMinutes: number = 60): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60000);

    const query = `
      INSERT OR REPLACE INTO cached_data (key, data, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      key,
      JSON.stringify(data),
      expiresAt.toISOString(),
      now.toISOString(),
    ]);
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM cached_data WHERE key = ? AND expiresAt > ?';
    const [results] = await this.db.executeSql(query, [key, new Date().toISOString()]);
    
    if (results.rows.length === 0) {
      return null;
    }

    const cached = results.rows.item(0);
    return JSON.parse(cached.data);
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM cached_data WHERE expiresAt <= ?';
    await this.db.executeSql(query, [new Date().toISOString()]);
  }

  async getDatabaseSize(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    // This is a simplified size calculation
    // In a real implementation, you might want to use platform-specific methods
    const tables = ['offline_resources', 'offline_messages', 'cached_data'];
    let totalSize = 0;

    for (const table of tables) {
      const query = `SELECT COUNT(*) as count FROM ${table}`;
      const [results] = await this.db.executeSql(query);
      const count = results.rows.item(0).count;
      totalSize += count * 1000; // Rough estimate
    }

    return totalSize;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}