/**
 * Base Repository
 * Generic repository pattern implementation for database operations
 */

import { DatabaseService } from '../types'
import { database } from '../databaseService'
import { BaseModel, QueryFilters, PaginatedResult } from '../models'
import { StorageError, StorageErrorCode } from '../types'

export abstract class BaseRepository<T extends BaseModel> {
  protected db: DatabaseService
  protected tableName: string

  constructor(tableName: string, databaseService: DatabaseService = database) {
    this.db = databaseService
    this.tableName = tableName
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.db.queryFirst<T>(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      )
      return result
    } catch (error) {
      throw new StorageError(
        `Failed to find ${this.tableName} by id: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Find all records with optional filters
   */
  async findAll(filters?: QueryFilters): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`
      const params: any[] = []

      // Add WHERE clause
      if (filters?.where) {
        const whereConditions = Object.entries(filters.where).map(([key, value]) => {
          params.push(value)
          return `${key} = ?`
        })
        sql += ` WHERE ${whereConditions.join(' AND ')}`
      }

      // Add ORDER BY clause
      if (filters?.orderBy) {
        const direction = filters.orderDirection || 'ASC'
        sql += ` ORDER BY ${filters.orderBy} ${direction}`
      }

      // Add LIMIT and OFFSET
      if (filters?.limit) {
        sql += ` LIMIT ?`
        params.push(filters.limit)
        
        if (filters?.offset) {
          sql += ` OFFSET ?`
          params.push(filters.offset)
        }
      }

      return await this.db.query<T>(sql, params)
    } catch (error) {
      throw new StorageError(
        `Failed to find all ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Find records with pagination
   */
  async findPaginated(filters?: QueryFilters): Promise<PaginatedResult<T>> {
    try {
      const limit = filters?.limit || 20
      const offset = filters?.offset || 0

      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`
      const countParams: any[] = []

      if (filters?.where) {
        const whereConditions = Object.entries(filters.where).map(([key, value]) => {
          countParams.push(value)
          return `${key} = ?`
        })
        countSql += ` WHERE ${whereConditions.join(' AND ')}`
      }

      const countResult = await this.db.queryFirst<{ total: number }>(countSql, countParams)
      const total = countResult?.total || 0

      // Get data
      const data = await this.findAll({ ...filters, limit, offset })

      return {
        data,
        total,
        hasMore: offset + data.length < total,
        nextOffset: offset + data.length < total ? offset + limit : undefined
      }
    } catch (error) {
      throw new StorageError(
        `Failed to find paginated ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      const now = new Date().toISOString()
      const id = this.generateId()
      
      const recordData = {
        ...data,
        id,
        created_at: now,
        updated_at: now
      }

      await this.db.insert(this.tableName, recordData)
      
      const created = await this.findById(id)
      if (!created) {
        throw new Error('Failed to retrieve created record')
      }
      
      return created
    } catch (error) {
      throw new StorageError(
        `Failed to create ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const changes = await this.db.update(this.tableName, updateData, 'id = ?', [id])
      
      if (changes === 0) {
        return null
      }

      return await this.findById(id)
    } catch (error) {
      throw new StorageError(
        `Failed to update ${this.tableName} with id: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const changes = await this.db.delete(this.tableName, 'id = ?', [id])
      return changes > 0
    } catch (error) {
      throw new StorageError(
        `Failed to delete ${this.tableName} with id: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Delete multiple records by IDs
   */
  async deleteMany(ids: string[]): Promise<number> {
    try {
      if (ids.length === 0) return 0

      const placeholders = ids.map(() => '?').join(', ')
      const changes = await this.db.delete(
        this.tableName,
        `id IN (${placeholders})`,
        ids
      )
      return changes
    } catch (error) {
      throw new StorageError(
        `Failed to delete multiple ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db.queryFirst<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`,
        [id]
      )
      return (result?.count || 0) > 0
    } catch (error) {
      throw new StorageError(
        `Failed to check existence of ${this.tableName} with id: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: Pick<QueryFilters, 'where'>): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
      const params: any[] = []

      if (filters?.where) {
        const whereConditions = Object.entries(filters.where).map(([key, value]) => {
          params.push(value)
          return `${key} = ?`
        })
        sql += ` WHERE ${whereConditions.join(' AND ')}`
      }

      const result = await this.db.queryFirst<{ count: number }>(sql, params)
      return result?.count || 0
    } catch (error) {
      throw new StorageError(
        `Failed to count ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Bulk insert records
   */
  async bulkCreate(records: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    try {
      const results: T[] = []
      
      await this.db.transaction(async () => {
        for (const record of records) {
          const created = await this.create(record)
          results.push(created)
        }
      })

      return results
    } catch (error) {
      throw new StorageError(
        `Failed to bulk create ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update records that match criteria
   */
  async updateWhere(
    where: Record<string, any>,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<number> {
    try {
      const whereConditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ')
      const whereParams = Object.values(where)
      
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      return await this.db.update(this.tableName, updateData, whereConditions, whereParams)
    } catch (error) {
      throw new StorageError(
        `Failed to update ${this.tableName} where conditions`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Delete records that match criteria
   */
  async deleteWhere(where: Record<string, any>): Promise<number> {
    try {
      const whereConditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ')
      const whereParams = Object.values(where)
      
      return await this.db.delete(this.tableName, whereConditions, whereParams)
    } catch (error) {
      throw new StorageError(
        `Failed to delete ${this.tableName} where conditions`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Execute raw SQL query
   */
  protected async executeRaw<R>(sql: string, params: any[] = []): Promise<R[]> {
    try {
      return await this.db.query<R>(sql, params)
    } catch (error) {
      throw new StorageError(
        `Failed to execute raw query on ${this.tableName}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Generate a unique ID for new records
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get table name
   */
  getTableName(): string {
    return this.tableName
  }
}

export default BaseRepository