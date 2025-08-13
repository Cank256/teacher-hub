import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  Post, 
  PostComment, 
  PostLike, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PaginationOptions, 
  PaginatedResponse,
  MediaAttachment 
} from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export interface PostSearchFilters {
  authorId?: string;
  communityId?: string;
  visibility?: 'public' | 'community' | 'followers';
  tags?: string[];
  searchTerm?: string;
  hasMedia?: boolean;
  isPinned?: boolean;
}

export interface PostFeedOptions extends PaginationOptions {
  userId: string;
  includeFollowing?: boolean;
  includeCommunities?: boolean;
  visibility?: ('public' | 'community' | 'followers')[];
}

export class PostService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  async createPost(authorId: string, postData: CreatePostRequest): Promise<Post> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const postId = uuidv4();
      const timestamp = new Date();

      // Validate community access if posting to a community
      if (postData.communityId) {
        const membershipQuery = `
          SELECT cm.status, c.is_active 
          FROM community_memberships cm
          JOIN communities c ON cm.community_id = c.id
          WHERE cm.community_id = $1 AND cm.user_id = $2 AND cm.status = 'active'
        `;
        const membershipResult = await client.query(membershipQuery, [postData.communityId, authorId]);
        
        if (membershipResult.rows.length === 0) {
          throw new Error('User is not a member of the specified community');
        }

        if (!membershipResult.rows[0].is_active) {
          throw new Error('Community is not active');
        }
      }

      // Validate visibility rules
      if (postData.visibility === 'community' && !postData.communityId) {
        throw new Error('Community visibility requires a community to be specified');
      }

      const query = `
        INSERT INTO posts (
          id, author_id, community_id, title, content, 
          media_attachments, tags, visibility, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        postId,
        authorId,
        postData.communityId || null,
        postData.title,
        postData.content,
        JSON.stringify(postData.mediaAttachments || []),
        JSON.stringify(postData.tags || []),
        postData.visibility,
        timestamp,
        timestamp
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      await client.query('COMMIT');

      const post: Post = {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Post created: ${postId} by user ${authorId}`);
      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePost(postId: string, authorId: string, updates: UpdatePostRequest): Promise<Post> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id FROM posts WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [postId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (ownershipResult.rows[0].author_id !== authorId) {
        throw new Error('User not authorized to update this post');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        updateValues.push(updates.title);
      }
      if (updates.content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        updateValues.push(updates.content);
      }
      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.tags));
      }
      if (updates.visibility !== undefined) {
        updateFields.push(`visibility = $${paramIndex++}`);
        updateValues.push(updates.visibility);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date());

      updateValues.push(postId);

      const query = `
        UPDATE posts 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, updateValues);
      const row = result.rows[0];

      const post: Post = {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Post ${postId} updated by user ${authorId}`);
      return post;
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePost(postId: string, authorId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id FROM posts WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [postId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (ownershipResult.rows[0].author_id !== authorId) {
        throw new Error('User not authorized to delete this post');
      }

      // Delete the post (cascade will handle comments and likes)
      await client.query('DELETE FROM posts WHERE id = $1', [postId]);

      logger.info(`Post ${postId} deleted by user ${authorId}`);
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPost(postId: string, viewerId?: string): Promise<Post | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM posts WHERE id = $1';
      const result = await client.query(query, [postId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Check visibility permissions
      if (!await this.canViewPost(client, row, viewerId)) {
        return null;
      }

      return {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error fetching post:', error);
      throw new Error('Failed to fetch post');
    } finally {
      client.release();
    }
  }

  async getFeedPosts(options: PostFeedOptions): Promise<PaginatedResponse<Post>> {
    const client = await this.pool.connect();
    
    try {
      const { userId, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;

      let baseQuery = `
        FROM posts p
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE 1=1
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Visibility filtering
      const visibilityConditions: string[] = ['p.visibility = \'public\''];

      // Include community posts if user is a member
      if (options.includeCommunities !== false) {
        visibilityConditions.push(`
          (p.visibility = 'community' AND p.community_id IN (
            SELECT community_id FROM community_memberships 
            WHERE user_id = $${paramIndex} AND status = 'active'
          ))
        `);
        values.push(userId);
        paramIndex++;
      }

      // Include follower posts if following system is implemented
      if (options.includeFollowing) {
        visibilityConditions.push(`
          (p.visibility = 'followers' AND p.author_id IN (
            SELECT following_id FROM user_connections 
            WHERE follower_id = $${paramIndex} AND status = 'accepted'
          ))
        `);
        values.push(userId);
        paramIndex++;
      }

      // Include user's own posts
      visibilityConditions.push(`p.author_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      conditions.push(`(${visibilityConditions.join(' OR ')})`);

      // Apply additional filters
      if (options.visibility && options.visibility.length > 0) {
        const visibilityPlaceholders = options.visibility.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`p.visibility IN (${visibilityPlaceholders})`);
        values.push(...options.visibility);
      }

      if (conditions.length > 0) {
        baseQuery += ` AND ${conditions.join(' AND ')}`;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) ${baseQuery}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT p.* ${baseQuery}
        ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const dataResult = await client.query(dataQuery, values);

      const posts: Post[] = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching feed posts:', error);
      throw new Error('Failed to fetch feed posts');
    } finally {
      client.release();
    }
  }

  async getCommunityPosts(communityId: string, viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Post>> {
    const client = await this.pool.connect();
    
    try {
      // Check if user can view community posts
      const membershipQuery = `
        SELECT status FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, viewerId]);
      
      // Check if community is private
      const communityQuery = 'SELECT is_private FROM communities WHERE id = $1 AND is_active = true';
      const communityResult = await client.query(communityQuery, [communityId]);
      
      if (communityResult.rows.length === 0) {
        throw new Error('Community not found');
      }

      const isPrivate = communityResult.rows[0].is_private;
      const isMember = membershipResult.rows.length > 0;

      if (isPrivate && !isMember) {
        throw new Error('Access denied to private community');
      }

      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Count query
      const countQuery = 'SELECT COUNT(*) FROM posts WHERE community_id = $1';
      const countResult = await client.query(countQuery, [communityId]);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM posts 
        WHERE community_id = $1
        ORDER BY is_pinned DESC, ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;

      const dataResult = await client.query(dataQuery, [communityId, limit, offset]);

      const posts: Post[] = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching community posts:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserPosts(userId: string, viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Post>> {
    const client = await this.pool.connect();
    
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Determine visibility based on relationship
      let visibilityCondition = "visibility = 'public'";
      
      if (userId === viewerId) {
        // User viewing their own posts - show all
        visibilityCondition = "1=1";
      } else {
        // Check if viewer follows the user (if following system exists)
        const followQuery = `
          SELECT 1 FROM user_connections 
          WHERE follower_id = $1 AND following_id = $2 AND status = 'accepted'
        `;
        const followResult = await client.query(followQuery, [viewerId, userId]);
        
        if (followResult.rows.length > 0) {
          visibilityCondition = "visibility IN ('public', 'followers')";
        }
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) FROM posts 
        WHERE author_id = $1 AND (${visibilityCondition})
      `;
      const countResult = await client.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM posts 
        WHERE author_id = $1 AND (${visibilityCondition})
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;

      const dataResult = await client.query(dataQuery, [userId, limit, offset]);

      const posts: Post[] = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user posts:', error);
      throw new Error('Failed to fetch user posts');
    } finally {
      client.release();
    }
  }

  async searchPosts(query: string, filters: PostSearchFilters, viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Post>> {
    const client = await this.pool.connect();
    
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Text search
      if (query.trim()) {
        conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
        values.push(`%${query}%`);
        paramIndex++;
      }

      // Apply filters
      if (filters.authorId) {
        conditions.push(`author_id = $${paramIndex++}`);
        values.push(filters.authorId);
      }

      if (filters.communityId) {
        conditions.push(`community_id = $${paramIndex++}`);
        values.push(filters.communityId);
      }

      if (filters.visibility) {
        conditions.push(`visibility = $${paramIndex++}`);
        values.push(filters.visibility);
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`tags ?| $${paramIndex++}`);
        values.push(filters.tags);
      }

      if (filters.hasMedia !== undefined) {
        if (filters.hasMedia) {
          conditions.push(`jsonb_array_length(media_attachments) > 0`);
        } else {
          conditions.push(`jsonb_array_length(media_attachments) = 0`);
        }
      }

      if (filters.isPinned !== undefined) {
        conditions.push(`is_pinned = $${paramIndex++}`);
        values.push(filters.isPinned);
      }

      // Visibility permissions
      const visibilityConditions: string[] = ['visibility = \'public\''];
      
      // Add community visibility if user is member
      visibilityConditions.push(`
        (visibility = 'community' AND community_id IN (
          SELECT community_id FROM community_memberships 
          WHERE user_id = $${paramIndex} AND status = 'active'
        ))
      `);
      values.push(viewerId);
      paramIndex++;

      // Add follower visibility if following
      visibilityConditions.push(`
        (visibility = 'followers' AND author_id IN (
          SELECT following_id FROM user_connections 
          WHERE follower_id = $${paramIndex} AND status = 'accepted'
        ))
      `);
      values.push(viewerId);
      paramIndex++;

      // Add user's own posts
      visibilityConditions.push(`author_id = $${paramIndex}`);
      values.push(viewerId);
      paramIndex++;

      conditions.push(`(${visibilityConditions.join(' OR ')})`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) FROM posts ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM posts ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const dataResult = await client.query(dataQuery, values);

      const posts: Post[] = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching posts:', error);
      throw new Error('Failed to search posts');
    } finally {
      client.release();
    }
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if post exists and user can view it
      const postQuery = 'SELECT * FROM posts WHERE id = $1';
      const postResult = await client.query(postQuery, [postId]);
      
      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (!await this.canViewPost(client, postResult.rows[0], userId)) {
        throw new Error('Access denied to post');
      }

      // Check if already liked
      const existingLikeQuery = 'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2';
      const existingLikeResult = await client.query(existingLikeQuery, [postId, userId]);
      
      if (existingLikeResult.rows.length > 0) {
        throw new Error('Post already liked by user');
      }

      // Create like record
      const likeQuery = `
        INSERT INTO post_likes (id, post_id, user_id, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(likeQuery, [uuidv4(), postId, userId, new Date()]);

      await client.query('COMMIT');
      logger.info(`Post ${postId} liked by user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error liking post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Like not found');
      }

      logger.info(`Post ${postId} unliked by user ${userId}`);
    } catch (error) {
      logger.error('Error unliking post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addComment(postId: string, authorId: string, content: string, parentCommentId?: string): Promise<PostComment> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if post exists and user can view it
      const postQuery = 'SELECT * FROM posts WHERE id = $1';
      const postResult = await client.query(postQuery, [postId]);
      
      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (!await this.canViewPost(client, postResult.rows[0], authorId)) {
        throw new Error('Access denied to post');
      }

      // If replying to a comment, check if parent comment exists
      if (parentCommentId) {
        const parentQuery = 'SELECT id FROM post_comments WHERE id = $1 AND post_id = $2';
        const parentResult = await client.query(parentQuery, [parentCommentId, postId]);
        
        if (parentResult.rows.length === 0) {
          throw new Error('Parent comment not found');
        }
      }

      const commentId = uuidv4();
      const timestamp = new Date();

      const query = `
        INSERT INTO post_comments (
          id, post_id, author_id, parent_comment_id, content, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        commentId,
        postId,
        authorId,
        parentCommentId || null,
        content,
        timestamp,
        timestamp
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      await client.query('COMMIT');

      const comment: PostComment = {
        id: row.id,
        postId: row.post_id,
        authorId: row.author_id,
        parentCommentId: row.parent_comment_id,
        content: row.content,
        likeCount: row.like_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Comment ${commentId} added to post ${postId} by user ${authorId}`);
      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding comment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateComment(commentId: string, authorId: string, content: string): Promise<PostComment> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id, post_id FROM post_comments WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [commentId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Comment not found');
      }

      if (ownershipResult.rows[0].author_id !== authorId) {
        throw new Error('User not authorized to update this comment');
      }

      const query = `
        UPDATE post_comments 
        SET content = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [content, new Date(), commentId]);
      const row = result.rows[0];

      const comment: PostComment = {
        id: row.id,
        postId: row.post_id,
        authorId: row.author_id,
        parentCommentId: row.parent_comment_id,
        content: row.content,
        likeCount: row.like_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Comment ${commentId} updated by user ${authorId}`);
      return comment;
    } catch (error) {
      logger.error('Error updating comment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteComment(commentId: string, authorId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id FROM post_comments WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [commentId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Comment not found');
      }

      if (ownershipResult.rows[0].author_id !== authorId) {
        throw new Error('User not authorized to delete this comment');
      }

      // Delete the comment (cascade will handle child comments)
      await client.query('DELETE FROM post_comments WHERE id = $1', [commentId]);

      logger.info(`Comment ${commentId} deleted by user ${authorId}`);
    } catch (error) {
      logger.error('Error deleting comment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPostComments(postId: string, viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<PostComment>> {
    const client = await this.pool.connect();
    
    try {
      // Check if user can view the post
      const postQuery = 'SELECT * FROM posts WHERE id = $1';
      const postResult = await client.query(postQuery, [postId]);
      
      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (!await this.canViewPost(client, postResult.rows[0], viewerId)) {
        throw new Error('Access denied to post');
      }

      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'asc' } = pagination;
      const offset = (page - 1) * limit;

      // Count query - only top-level comments
      const countQuery = 'SELECT COUNT(*) FROM post_comments WHERE post_id = $1 AND parent_comment_id IS NULL';
      const countResult = await client.query(countQuery, [postId]);
      const total = parseInt(countResult.rows[0].count);

      // Data query - get top-level comments with their replies
      const dataQuery = `
        WITH RECURSIVE comment_tree AS (
          -- Base case: top-level comments
          SELECT *, 0 as depth, ARRAY[created_at, id::text] as sort_path
          FROM post_comments 
          WHERE post_id = $1 AND parent_comment_id IS NULL
          
          UNION ALL
          
          -- Recursive case: replies
          SELECT c.*, ct.depth + 1, ct.sort_path || ARRAY[c.created_at, c.id::text]
          FROM post_comments c
          JOIN comment_tree ct ON c.parent_comment_id = ct.id::uuid
          WHERE ct.depth < 3  -- Limit nesting depth
        )
        SELECT * FROM comment_tree
        ORDER BY sort_path
        LIMIT $2 OFFSET $3
      `;

      const dataResult = await client.query(dataQuery, [postId, limit, offset]);

      const comments: PostComment[] = dataResult.rows.map(row => ({
        id: row.id,
        postId: row.post_id,
        authorId: row.author_id,
        parentCommentId: row.parent_comment_id,
        content: row.content,
        likeCount: row.like_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching post comments:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async pinPost(postId: string, userId: string, communityId?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if user has permission to pin posts
      if (communityId) {
        // Check if user is moderator or owner of the community
        const membershipQuery = `
          SELECT role FROM community_memberships 
          WHERE community_id = $1 AND user_id = $2 AND status = 'active'
          AND role IN ('moderator', 'owner')
        `;
        const membershipResult = await client.query(membershipQuery, [communityId, userId]);
        
        if (membershipResult.rows.length === 0) {
          throw new Error('User not authorized to pin posts in this community');
        }
      } else {
        // Check if user is the post author for non-community posts
        const postQuery = 'SELECT author_id FROM posts WHERE id = $1';
        const postResult = await client.query(postQuery, [postId]);
        
        if (postResult.rows.length === 0) {
          throw new Error('Post not found');
        }

        if (postResult.rows[0].author_id !== userId) {
          throw new Error('User not authorized to pin this post');
        }
      }

      await client.query('UPDATE posts SET is_pinned = true WHERE id = $1', [postId]);
      logger.info(`Post ${postId} pinned by user ${userId}`);
    } catch (error) {
      logger.error('Error pinning post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async unpinPost(postId: string, userId: string, communityId?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Same permission checks as pinPost
      if (communityId) {
        const membershipQuery = `
          SELECT role FROM community_memberships 
          WHERE community_id = $1 AND user_id = $2 AND status = 'active'
          AND role IN ('moderator', 'owner')
        `;
        const membershipResult = await client.query(membershipQuery, [communityId, userId]);
        
        if (membershipResult.rows.length === 0) {
          throw new Error('User not authorized to unpin posts in this community');
        }
      } else {
        const postQuery = 'SELECT author_id FROM posts WHERE id = $1';
        const postResult = await client.query(postQuery, [postId]);
        
        if (postResult.rows.length === 0) {
          throw new Error('Post not found');
        }

        if (postResult.rows[0].author_id !== userId) {
          throw new Error('User not authorized to unpin this post');
        }
      }

      await client.query('UPDATE posts SET is_pinned = false WHERE id = $1', [postId]);
      logger.info(`Post ${postId} unpinned by user ${userId}`);
    } catch (error) {
      logger.error('Error unpinning post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async sharePost(postId: string, userId: string, shareData: { content?: string; communityId?: string; visibility?: 'public' | 'community' | 'followers' }): Promise<Post> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if original post exists and user can view it
      const originalPostQuery = 'SELECT * FROM posts WHERE id = $1';
      const originalPostResult = await client.query(originalPostQuery, [postId]);
      
      if (originalPostResult.rows.length === 0) {
        throw new Error('Original post not found');
      }

      if (!await this.canViewPost(client, originalPostResult.rows[0], userId)) {
        throw new Error('Access denied to original post');
      }

      const originalPost = originalPostResult.rows[0];

      // Create shared post
      const sharedPostId = uuidv4();
      const timestamp = new Date();

      // Prepare shared post content
      const sharedContent = shareData.content 
        ? `${shareData.content}\n\n--- Shared Post ---\n${originalPost.title}\n${originalPost.content}`
        : `--- Shared Post ---\n${originalPost.title}\n${originalPost.content}`;

      const query = `
        INSERT INTO posts (
          id, author_id, community_id, title, content, 
          media_attachments, tags, visibility, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        sharedPostId,
        userId,
        shareData.communityId || null,
        `Shared: ${originalPost.title}`,
        sharedContent,
        originalPost.media_attachments, // Copy media attachments
        JSON.stringify([...JSON.parse(originalPost.tags), 'shared']), // Add 'shared' tag
        shareData.visibility || 'public',
        timestamp,
        timestamp
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      await client.query('COMMIT');

      const sharedPost: Post = {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Post ${postId} shared by user ${userId} as ${sharedPostId}`);
      return sharedPost;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error sharing post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addTagsToPost(postId: string, userId: string, tags: string[]): Promise<Post> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id, tags FROM posts WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [postId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (ownershipResult.rows[0].author_id !== userId) {
        throw new Error('User not authorized to modify this post');
      }

      const currentTags = JSON.parse(ownershipResult.rows[0].tags);
      const newTags = [...new Set([...currentTags, ...tags])]; // Remove duplicates

      const query = `
        UPDATE posts 
        SET tags = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [JSON.stringify(newTags), new Date(), postId]);
      const row = result.rows[0];

      const post: Post = {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Tags added to post ${postId} by user ${userId}`);
      return post;
    } catch (error) {
      logger.error('Error adding tags to post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeTagsFromPost(postId: string, userId: string, tags: string[]): Promise<Post> {
    const client = await this.pool.connect();
    
    try {
      // Check ownership
      const ownershipQuery = 'SELECT author_id, tags FROM posts WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [postId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (ownershipResult.rows[0].author_id !== userId) {
        throw new Error('User not authorized to modify this post');
      }

      const currentTags = JSON.parse(ownershipResult.rows[0].tags);
      const newTags = currentTags.filter((tag: string) => !tags.includes(tag));

      const query = `
        UPDATE posts 
        SET tags = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [JSON.stringify(newTags), new Date(), postId]);
      const row = result.rows[0];

      const post: Post = {
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Tags removed from post ${postId} by user ${userId}`);
      return post;
    } catch (error) {
      logger.error('Error removing tags from post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT tag, COUNT(*) as count
        FROM (
          SELECT jsonb_array_elements_text(tags) as tag
          FROM posts
          WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        ) tag_counts
        GROUP BY tag
        ORDER BY count DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);
      
      return result.rows.map(row => ({
        tag: row.tag,
        count: parseInt(row.count)
      }));
    } catch (error) {
      logger.error('Error fetching popular tags:', error);
      throw new Error('Failed to fetch popular tags');
    } finally {
      client.release();
    }
  }

  async getPostsByTag(tag: string, viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Post>> {
    const filters: PostSearchFilters = {
      tags: [tag]
    };
    
    return this.searchPosts('', filters, viewerId, pagination);
  }

  async getTrendingPosts(viewerId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Post>> {
    const client = await this.pool.connect();
    
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      // Calculate trending score based on likes, comments, and recency
      const baseQuery = `
        FROM posts p
        WHERE p.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Visibility permissions
      const visibilityConditions: string[] = ['p.visibility = \'public\''];
      
      // Add community visibility if user is member
      visibilityConditions.push(`
        (p.visibility = 'community' AND p.community_id IN (
          SELECT community_id FROM community_memberships 
          WHERE user_id = $${paramIndex} AND status = 'active'
        ))
      `);
      values.push(viewerId);
      paramIndex++;

      // Add follower visibility if following
      visibilityConditions.push(`
        (p.visibility = 'followers' AND p.author_id IN (
          SELECT following_id FROM user_connections 
          WHERE follower_id = $${paramIndex} AND status = 'accepted'
        ))
      `);
      values.push(viewerId);
      paramIndex++;

      // Add user's own posts
      visibilityConditions.push(`p.author_id = $${paramIndex}`);
      values.push(viewerId);
      paramIndex++;

      conditions.push(`(${visibilityConditions.join(' OR ')})`);

      const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query with trending score
      const dataQuery = `
        SELECT p.*,
          (p.like_count * 2 + p.comment_count * 3 + 
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / -3600) as trending_score
        ${baseQuery} ${whereClause}
        ORDER BY trending_score DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const dataResult = await client.query(dataQuery, values);

      const posts: Post[] = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: JSON.parse(row.media_attachments),
        tags: JSON.parse(row.tags),
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching trending posts:', error);
      throw new Error('Failed to fetch trending posts');
    } finally {
      client.release();
    }
  }

  async moderateComment(commentId: string, moderatorId: string, action: 'approve' | 'delete', reason: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get comment details
      const commentQuery = `
        SELECT pc.*, p.community_id 
        FROM post_comments pc
        JOIN posts p ON pc.post_id = p.id
        WHERE pc.id = $1
      `;
      const commentResult = await client.query(commentQuery, [commentId]);
      
      if (commentResult.rows.length === 0) {
        throw new Error('Comment not found');
      }

      const comment = commentResult.rows[0];

      // Check if user has moderation permissions
      let hasPermission = false;

      if (comment.community_id) {
        // Check community moderation permissions
        const membershipQuery = `
          SELECT role FROM community_memberships 
          WHERE community_id = $1 AND user_id = $2 AND status = 'active'
          AND role IN ('moderator', 'owner')
        `;
        const membershipResult = await client.query(membershipQuery, [comment.community_id, moderatorId]);
        hasPermission = membershipResult.rows.length > 0;
      }

      // Check if user is admin/super_admin (global moderation)
      if (!hasPermission) {
        const roleQuery = 'SELECT role FROM users WHERE id = $1 AND role IN (\'admin\', \'super_admin\')';
        const roleResult = await client.query(roleQuery, [moderatorId]);
        hasPermission = roleResult.rows.length > 0;
      }

      if (!hasPermission) {
        throw new Error('User not authorized to moderate comments');
      }

      if (action === 'delete') {
        await client.query('DELETE FROM post_comments WHERE id = $1', [commentId]);
      }

      // Log moderation action (if admin_actions table exists)
      try {
        await client.query(`
          INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, reason, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          uuidv4(),
          moderatorId,
          `${action}_comment`,
          'comment',
          commentId,
          reason,
          new Date()
        ]);
      } catch (logError) {
        // Continue if admin_actions table doesn't exist yet
        logger.warn('Could not log moderation action:', logError);
      }

      await client.query('COMMIT');
      logger.info(`Comment ${commentId} ${action}d by moderator ${moderatorId}: ${reason}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error moderating comment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async canViewPost(client: PoolClient, postRow: any, viewerId?: string): Promise<boolean> {
    if (!viewerId) {
      return postRow.visibility === 'public';
    }

    // User can always view their own posts
    if (postRow.author_id === viewerId) {
      return true;
    }

    switch (postRow.visibility) {
      case 'public':
        return true;
      
      case 'community':
        if (!postRow.community_id) return false;
        const membershipQuery = `
          SELECT 1 FROM community_memberships 
          WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        `;
        const membershipResult = await client.query(membershipQuery, [postRow.community_id, viewerId]);
        return membershipResult.rows.length > 0;
      
      case 'followers':
        const followQuery = `
          SELECT 1 FROM user_connections 
          WHERE follower_id = $1 AND following_id = $2 AND status = 'accepted'
        `;
        const followResult = await client.query(followQuery, [viewerId, postRow.author_id]);
        return followResult.rows.length > 0;
      
      default:
        return false;
    }
  }
}