/**
 * SQLite Database Service
 * Provides database operations with migration support using expo-sqlite
 */

import * as SQLite from 'expo-sqlite'
import { DatabaseService, StorageError, StorageErrorCode } from './types'

class SQLiteDatabaseService implements DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null
  private readonly dbName: string

  constructor(dbName: string = 'teacher_hub.db') {
    this.dbName = dbName
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName)
      
      // Enable foreign keys and WAL mode for better performance
      await this.execute('PRAGMA foreign_keys = ON')
      await this.execute('PRAGMA journal_mode = WAL')
      await this.execute('PRAGMA synchronous = NORMAL')
      await this.execute('PRAGMA cache_size = 10000')
      await this.execute('PRAGMA temp_store = MEMORY')
    } catch (error) {
      throw new StorageError(
        'Failed to initialize database',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Execute a SQL query and return results
   */
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      await this.initialize()
    }

    try {
      const result = await this.db!.getAllAsync(sql, params)
      return result as T[]
    } catch (error) {
      throw new StorageError(
        `Failed to execute query: ${sql}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    try {
      await this.db!.runAsync(sql, params)
    } catch (error) {
      throw new StorageError(
        `Failed to execute statement: ${sql}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction(operations: () => Promise<void>): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    try {
      await this.db!.withTransactionAsync(async () => {
        await operations()
      })
    } catch (error) {
      throw new StorageError(
        'Transaction failed',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.closeAsync()
        this.db = null
      }
    } catch (error) {
      throw new StorageError(
        'Failed to close database',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get a single row from query
   */
  async queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? results[0] || null : null
  }

  /**
   * Insert a record and return the inserted ID
   */
  async insert(table: string, data: Record<string, any>): Promise<number> {
    const columns = Object.keys(data)
    const placeholders = columns.map(() => '?').join(', ')
    const values = Object.values(data)

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    
    if (!this.db) {
      await this.initialize()
    }

    try {
      const result = await this.db!.runAsync(sql, values)
      return result.lastInsertRowId
    } catch (error) {
      throw new StorageError(
        `Failed to insert into ${table}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update records
   */
  async update(table: string, data: Record<string, any>, where: string, whereParams: any[] = []): Promise<number> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(data), ...whereParams]

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`
    
    if (!this.db) {
      await this.initialize()
    }

    try {
      const result = await this.db!.runAsync(sql, values)
      return result.changes
    } catch (error) {
      throw new StorageError(
        `Failed to update ${table}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Delete records
   */
  async delete(table: string, where: string, whereParams: any[] = []): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${where}`
    
    if (!this.db) {
      await this.initialize()
    }

    try {
      const result = await this.db!.runAsync(sql, whereParams)
      return result.changes
    } catch (error) {
      throw new StorageError(
        `Failed to delete from ${table}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      )
      return (result[0]?.count || 0) > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Get database schema information
   */
  async getTableInfo(tableName: string): Promise<any[]> {
    try {
      return await this.query(`PRAGMA table_info(${tableName})`)
    } catch (error) {
      throw new StorageError(
        `Failed to get table info for ${tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Execute raw SQL (for migrations and complex operations)
   */
  async executeRaw(sql: string): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    try {
      await this.db!.execAsync(sql)
    } catch (error) {
      throw new StorageError(
        `Failed to execute raw SQL: ${sql}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get database size in bytes
   */
  async getDatabaseSize(): Promise<number> {
    try {
      const result = await this.query<{ page_count: number; page_size: number }>(
        'PRAGMA page_count; PRAGMA page_size;'
      )
      return (result[0]?.page_count || 0) * (result[0]?.page_size || 0)
    } catch (error) {
      throw new StorageError(
        'Failed to get database size',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Vacuum database to reclaim space
   */
  async vacuum(): Promise<void> {
    try {
      await this.execute('VACUUM')
    } catch (error) {
      throw new StorageError(
        'Failed to vacuum database',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }
}

// Create singleton instance
export const database = new SQLiteDatabaseService()

export { SQLiteDatabaseService }