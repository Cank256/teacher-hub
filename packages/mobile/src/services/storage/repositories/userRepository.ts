/**
 * User Repository
 * Database operations for user entities
 */

import { BaseRepository } from './baseRepository'
import { UserModel, QueryFilters } from '../models'
import { TableNames, StorageError, StorageErrorCode } from '../types'

export class UserRepository extends BaseRepository<UserModel> {
  constructor() {
    super(TableNames.USERS)
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserModel | null> {
    try {
      return await this.db.queryFirst<UserModel>(
        `SELECT * FROM ${this.tableName} WHERE email = ?`,
        [email]
      )
    } catch (error) {
      throw new StorageError(
        `Failed to find user by email: ${email}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Find users by verification status
   */
  async findByVerificationStatus(status: 'pending' | 'verified' | 'rejected'): Promise<UserModel[]> {
    try {
      return await this.findAll({
        where: { verification_status: status }
      })
    } catch (error) {
      throw new StorageError(
        `Failed to find users by verification status: ${status}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Search users by name
   */
  async searchByName(query: string, filters?: QueryFilters): Promise<UserModel[]> {
    try {
      const searchQuery = `%${query.toLowerCase()}%`
      let sql = `
        SELECT * FROM ${this.tableName} 
        WHERE (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ?)
      `
      const params = [searchQuery, searchQuery]

      // Add additional filters
      if (filters?.where) {
        const whereConditions = Object.entries(filters.where).map(([key, value]) => {
          params.push(value)
          return `${key} = ?`
        })
        sql += ` AND ${whereConditions.join(' AND ')}`
      }

      // Add ordering
      if (filters?.orderBy) {
        const direction = filters.orderDirection || 'ASC'
        sql += ` ORDER BY ${filters.orderBy} ${direction}`
      } else {
        sql += ` ORDER BY first_name ASC, last_name ASC`
      }

      // Add limit
      if (filters?.limit) {
        sql += ` LIMIT ?`
        params.push(filters.limit.toString())
        
        if (filters?.offset) {
          sql += ` OFFSET ?`
          params.push(filters.offset.toString())
        }
      }

      return await this.db.query<UserModel>(sql, params)
    } catch (error) {
      throw new StorageError(
        `Failed to search users by name: ${query}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update user verification status
   */
  async updateVerificationStatus(
    id: string, 
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<UserModel | null> {
    try {
      return await this.update(id, { verification_status: status })
    } catch (error) {
      throw new StorageError(
        `Failed to update verification status for user: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get verified users count
   */
  async getVerifiedUsersCount(): Promise<number> {
    try {
      return await this.count({ where: { verification_status: 'verified' } })
    } catch (error) {
      throw new StorageError(
        'Failed to get verified users count',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get recently active users
   */
  async getRecentlyActiveUsers(limit: number = 10): Promise<UserModel[]> {
    try {
      return await this.executeRaw<UserModel>(
        `SELECT * FROM ${this.tableName} 
         WHERE last_sync_at IS NOT NULL 
         ORDER BY last_sync_at DESC 
         LIMIT ?`,
        [limit]
      )
    } catch (error) {
      throw new StorageError(
        'Failed to get recently active users',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update user last sync time
   */
  async updateLastSyncTime(id: string): Promise<void> {
    try {
      await this.update(id, { last_sync_at: new Date().toISOString() })
    } catch (error) {
      throw new StorageError(
        `Failed to update last sync time for user: ${id}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get users that need sync
   */
  async getUsersNeedingSync(olderThan: Date): Promise<UserModel[]> {
    try {
      return await this.executeRaw<UserModel>(
        `SELECT * FROM ${this.tableName} 
         WHERE last_sync_at IS NULL OR last_sync_at < ?
         ORDER BY last_sync_at ASC NULLS FIRST`,
        [olderThan.toISOString()]
      )
    } catch (error) {
      throw new StorageError(
        'Failed to get users needing sync',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Bulk update users from sync
   */
  async bulkUpsert(users: Partial<UserModel>[]): Promise<void> {
    try {
      await this.db.transaction(async () => {
        for (const user of users) {
          if (!user.id) continue

          const existing = await this.findById(user.id)
          if (existing) {
            await this.update(user.id, user)
          } else {
            await this.create(user as Omit<UserModel, 'id' | 'created_at' | 'updated_at'>)
          }
        }
      })
    } catch (error) {
      throw new StorageError(
        'Failed to bulk upsert users',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }
}

// Create singleton instance
export const userRepository = new UserRepository()

export default UserRepository