/**
 * Post Repository
 * Database operations for post entities
 */

import { BaseRepository } from './baseRepository'
import { PostModel, QueryFilters, PaginatedResult } from '../models'
import { TableNames, StorageError, StorageErrorCode } from '../types'

export class PostRepository extends BaseRepository<PostModel> {
  constructor() {
    super(TableNames.POSTS)
  }

  /**
   * Find posts by author
   */
  async findByAuthor(authorId: string, filters?: QueryFilters): Promise<PostModel[]> {
    try {
      return await this.findAll({
        ...filters,
        where: { ...filters?.where, author_id: authorId },
        orderBy: filters?.orderBy || 'created_at',
        orderDirection: filters?.orderDirection || 'DESC'
      })
    } catch (error) {
      throw new StorageError(
        `Failed to find posts by author: ${authorId}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Find posts by category
   */
  async findByCategory(categoryId: string, filters?: QueryFilters): Promise<PostModel[]> {
    try {
      return await this.findAll({
        ...filters,
        where: { ...filters?.where, category_id: categoryId },
        orderBy: filters?.orderBy || 'created_at',
        orderDirection: filters?.orderDirection || 'DESC'
      })
    } catch (error) {
      throw new StorageError(
        `Failed to find posts by category: ${categoryId}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get posts feed with pagination
   */
  async getFeed(filters?: QueryFilters): Promise<PaginatedResult<PostModel>> {
    try {
      return await this.findPaginated({
        ...filters,
        orderBy: filters?.orderBy || 'created_at',
        orderDirection: filters?.orderDirection || 'DESC'
      })
    } catch (error) {
      throw new StorageError(
        'Failed to get posts feed',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Search posts by title and content
   */
  async searchPosts(query: string, filters?: QueryFilters): Promise<PostModel[]> {
    try {
      const searchQuery = `%${query.toLowerCase()}%`
      let sql = `
        SELECT * FROM ${this.tableName} 
        WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
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
        sql += ` ORDER BY created_at DESC`
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

      return await this.db.query<PostModel>(sql, params)
    } catch (error) {
      throw new StorageError(
        `Failed to search posts: ${query}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Full-text search using FTS table
   */
  async fullTextSearch(query: string, limit: number = 20): Promise<PostModel[]> {
    try {
      const sql = `
        SELECT p.* FROM ${this.tableName} p
        JOIN posts_fts fts ON p.id = fts.id
        WHERE posts_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `
      
      return await this.db.query<PostModel>(sql, [query, limit])
    } catch (error) {
      throw new StorageError(
        `Failed to perform full-text search: ${query}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get popular posts (by likes and comments)
   */
  async getPopularPosts(limit: number = 10, timeframe?: 'day' | 'week' | 'month'): Promise<PostModel[]> {
    try {
      let sql = `
        SELECT * FROM ${this.tableName}
        WHERE 1=1
      `
      const params: any[] = []

      // Add time filter
      if (timeframe) {
        const timeMap = {
          day: 1,
          week: 7,
          month: 30
        }
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - timeMap[timeframe])
        
        sql += ` AND created_at >= ?`
        params.push(daysAgo.toISOString())
      }

      sql += `
        ORDER BY (likes_count * 2 + comments_count) DESC, created_at DESC
        LIMIT ?
      `
      params.push(limit)

      return await this.db.query<PostModel>(sql, params)
    } catch (error) {
      throw new StorageError(
        'Failed to get popular posts',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get liked posts by user
   */
  async getLikedPosts(userId: string, filters?: QueryFilters): Promise<PostModel[]> {
    try {
      return await this.findAll({
        ...filters,
        where: { ...filters?.where, is_liked: true },
        orderBy: filters?.orderBy || 'updated_at',
        orderDirection: filters?.orderDirection || 'DESC'
      })
    } catch (error) {
      throw new StorageError(
        `Failed to get liked posts for user: ${userId}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update post like status
   */
  async updateLikeStatus(postId: string, isLiked: boolean, likesCount?: number): Promise<PostModel | null> {
    try {
      const updateData: Partial<PostModel> = { is_liked: isLiked }
      
      if (likesCount !== undefined) {
        updateData.likes_count = likesCount
      }

      return await this.update(postId, updateData)
    } catch (error) {
      throw new StorageError(
        `Failed to update like status for post: ${postId}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Update post comments count
   */
  async updateCommentsCount(postId: string, commentsCount: number): Promise<PostModel | null> {
    try {
      return await this.update(postId, { comments_count: commentsCount })
    } catch (error) {
      throw new StorageError(
        `Failed to update comments count for post: ${postId}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get posts that need sync
   */
  async getPostsNeedingSync(olderThan: Date): Promise<PostModel[]> {
    try {
      return await this.executeRaw<PostModel>(
        `SELECT * FROM ${this.tableName} 
         WHERE last_sync_at IS NULL OR last_sync_at < ?
         ORDER BY created_at DESC`,
        [olderThan.toISOString()]
      )
    } catch (error) {
      throw new StorageError(
        'Failed to get posts needing sync',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Bulk upsert posts from sync
   */
  async bulkUpsert(posts: Partial<PostModel>[]): Promise<void> {
    try {
      await this.db.transaction(async () => {
        for (const post of posts) {
          if (!post.id) continue

          const existing = await this.findById(post.id)
          if (existing) {
            await this.update(post.id, post)
          } else {
            await this.create(post as Omit<PostModel, 'id' | 'created_at' | 'updated_at'>)
          }
        }
      })
    } catch (error) {
      throw new StorageError(
        'Failed to bulk upsert posts',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get post statistics
   */
  async getPostStats(): Promise<{
    totalPosts: number
    totalLikes: number
    totalComments: number
    averageLikesPerPost: number
  }> {
    try {
      const result = await this.db.queryFirst<{
        total_posts: number
        total_likes: number
        total_comments: number
        avg_likes: number
      }>(
        `SELECT 
           COUNT(*) as total_posts,
           SUM(likes_count) as total_likes,
           SUM(comments_count) as total_comments,
           AVG(likes_count) as avg_likes
         FROM ${this.tableName}`
      )

      return {
        totalPosts: result?.total_posts || 0,
        totalLikes: result?.total_likes || 0,
        totalComments: result?.total_comments || 0,
        averageLikesPerPost: result?.avg_likes || 0
      }
    } catch (error) {
      throw new StorageError(
        'Failed to get post statistics',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }
}

// Create singleton instance
export const postRepository = new PostRepository()

export default PostRepository