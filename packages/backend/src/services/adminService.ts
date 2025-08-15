import { Pool } from 'pg';
import { 
  AdminAction, 
  AdminActionType, 
  ModerationQueue, 
  PlatformAnalytics, 
  UserAnalytics, 
  ContentAnalytics,
  ModerationResolution,
  PaginationOptions,
  PaginatedResponse,
  AdminPostFilters,
  AdminCommunityFilters,
  AdminResourceFilters,
  ModerationFilters,
  DateRange,
  Post,
  EnhancedCommunity,
  EnhancedResource,
  EnhancedMessage
} from '../types';
import logger from '../utils/logger';

export class AdminService {
  constructor(private db: Pool) {}

  // ===== POST MANAGEMENT =====

  async getAllPosts(
    pagination: PaginationOptions,
    filters: AdminPostFilters = {}
  ): Promise<PaginatedResponse<Post & { authorName: string; communityName?: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.authorId) {
        whereConditions.push(`p.author_id = $${paramIndex}`);
        queryParams.push(filters.authorId);
        paramIndex++;
      }

      if (filters.communityId) {
        whereConditions.push(`p.community_id = $${paramIndex}`);
        queryParams.push(filters.communityId);
        paramIndex++;
      }

      if (filters.visibility) {
        whereConditions.push(`p.visibility = $${paramIndex}`);
        queryParams.push(filters.visibility);
        paramIndex++;
      }

      if (filters.flagged !== undefined) {
        // Check if post has been flagged by looking for admin actions
        if (filters.flagged) {
          whereConditions.push(`EXISTS (
            SELECT 1 FROM admin_actions aa 
            WHERE aa.target_type = 'post' 
            AND aa.target_id = p.id::text 
            AND aa.action = 'flag_post'
          )`);
        } else {
          whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM admin_actions aa 
            WHERE aa.target_type = 'post' 
            AND aa.target_id = p.id::text 
            AND aa.action = 'flag_post'
          )`);
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          p.id,
          p.author_id,
          p.community_id,
          p.title,
          p.content,
          p.media_attachments,
          p.tags,
          p.visibility,
          p.like_count,
          p.comment_count,
          p.is_pinned,
          p.created_at,
          p.updated_at,
          u.full_name as author_name,
          c.name as community_name
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE ${whereClause}
        ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const posts = dataResult.rows.map(row => ({
        id: row.id,
        authorId: row.author_id,
        communityId: row.community_id,
        title: row.title,
        content: row.content,
        mediaAttachments: row.media_attachments || [],
        tags: row.tags || [],
        visibility: row.visibility,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: row.author_name,
        communityName: row.community_name
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
      logger.error('Error getting all posts for admin:', error);
      throw new Error('Failed to retrieve posts');
    }
  }

  async moderatePost(
    postId: string,
    adminId: string,
    action: 'approve' | 'flag' | 'delete',
    reason: string
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify post exists
      const postResult = await client.query('SELECT id FROM posts WHERE id = $1', [postId]);
      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      let adminActionType: AdminActionType;
      let postUpdate = '';

      switch (action) {
        case 'approve':
          adminActionType = 'approve_post';
          // Remove any existing flags
          await client.query(`
            DELETE FROM admin_actions 
            WHERE target_type = 'post' AND target_id = $1 AND action = 'flag_post'
          `, [postId]);
          break;
        case 'flag':
          adminActionType = 'flag_post';
          break;
        case 'delete':
          adminActionType = 'delete_post';
          // Delete the post (cascade will handle related data)
          await client.query('DELETE FROM posts WHERE id = $1', [postId]);
          break;
      }

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, 'post', $3, $4, CURRENT_TIMESTAMP)
      `, [adminId, adminActionType, postId, reason]);

      await client.query('COMMIT');
      logger.info(`Admin ${adminId} performed ${action} on post ${postId}: ${reason}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error moderating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== COMMUNITY MANAGEMENT =====

  async getAllCommunities(
    pagination: PaginationOptions,
    filters: AdminCommunityFilters = {}
  ): Promise<PaginatedResponse<EnhancedCommunity & { ownerName?: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.ownerId) {
        whereConditions.push(`c.owner_id = $${paramIndex}`);
        queryParams.push(filters.ownerId);
        paramIndex++;
      }

      if (filters.type) {
        whereConditions.push(`c.type = $${paramIndex}`);
        queryParams.push(filters.type);
        paramIndex++;
      }

      if (filters.isPrivate !== undefined) {
        whereConditions.push(`c.is_private = $${paramIndex}`);
        queryParams.push(filters.isPrivate);
        paramIndex++;
      }

      if (filters.suspended !== undefined) {
        if (filters.suspended) {
          whereConditions.push(`EXISTS (
            SELECT 1 FROM admin_actions aa 
            WHERE aa.target_type = 'community' 
            AND aa.target_id = c.id::text 
            AND aa.action = 'suspend_community'
          )`);
        } else {
          whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM admin_actions aa 
            WHERE aa.target_type = 'community' 
            AND aa.target_id = c.id::text 
            AND aa.action = 'suspend_community'
          )`);
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM communities c
        LEFT JOIN users u ON c.owner_id = u.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.type,
          c.owner_id,
          c.moderators_json,
          c.is_private,
          c.requires_approval,
          c.rules_json,
          c.image_url,
          c.member_count,
          c.post_count,
          c.is_active,
          c.created_at,
          c.updated_at,
          u.full_name as owner_name
        FROM communities c
        LEFT JOIN users u ON c.owner_id = u.id
        WHERE ${whereClause}
        ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const communities = dataResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        ownerId: row.owner_id,
        moderators: JSON.parse(row.moderators_json || '[]'),
        isPrivate: row.is_private,
        requiresApproval: row.requires_approval,
        rules: JSON.parse(row.rules_json || '[]'),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        postCount: row.post_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ownerName: row.owner_name
      }));

      return {
        data: communities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all communities for admin:', error);
      throw new Error('Failed to retrieve communities');
    }
  }

  async moderateCommunity(
    communityId: string,
    adminId: string,
    action: 'approve' | 'suspend' | 'delete',
    reason: string
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify community exists
      const communityResult = await client.query('SELECT id FROM communities WHERE id = $1', [communityId]);
      if (communityResult.rows.length === 0) {
        throw new Error('Community not found');
      }

      let adminActionType: AdminActionType;

      switch (action) {
        case 'approve':
          adminActionType = 'approve_community';
          // Remove any existing suspensions
          await client.query(`
            DELETE FROM admin_actions 
            WHERE target_type = 'community' AND target_id = $1 AND action = 'suspend_community'
          `, [communityId]);
          // Ensure community is active
          await client.query('UPDATE communities SET is_active = true WHERE id = $1', [communityId]);
          break;
        case 'suspend':
          adminActionType = 'suspend_community';
          // Deactivate community
          await client.query('UPDATE communities SET is_active = false WHERE id = $1', [communityId]);
          break;
        case 'delete':
          adminActionType = 'delete_community';
          // Delete the community (cascade will handle related data)
          await client.query('DELETE FROM communities WHERE id = $1', [communityId]);
          break;
      }

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, 'community', $3, $4, CURRENT_TIMESTAMP)
      `, [adminId, adminActionType, communityId, reason]);

      await client.query('COMMIT');
      logger.info(`Admin ${adminId} performed ${action} on community ${communityId}: ${reason}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error moderating community:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== MESSAGE MANAGEMENT =====

  async getFlaggedMessages(
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<EnhancedMessage & { senderName: string; recipientName?: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Count query for flagged messages
      const countQuery = `
        SELECT COUNT(DISTINCT m.id) as total
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users recipient ON m.recipient_id = recipient.id
        WHERE EXISTS (
          SELECT 1 FROM admin_actions aa 
          WHERE aa.target_type = 'message' 
          AND aa.target_id = m.id::text 
          AND aa.action IN ('flag_message', 'report_message')
        )
      `;

      const countResult = await this.db.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      // Data query for flagged messages
      const dataQuery = `
        SELECT DISTINCT
          m.id,
          m.sender_id,
          m.recipient_id,
          m.group_id,
          m.conversation_id,
          m.content,
          m.type,
          m.attachments_json,
          m.timestamp,
          m.read_by_json,
          m.sync_status,
          m.is_edited,
          m.edited_at,
          m.reply_to_id,
          sender.full_name as sender_name,
          recipient.full_name as recipient_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users recipient ON m.recipient_id = recipient.id
        WHERE EXISTS (
          SELECT 1 FROM admin_actions aa 
          WHERE aa.target_type = 'message' 
          AND aa.target_id = m.id::text 
          AND aa.action IN ('flag_message', 'report_message')
        )
        ORDER BY m.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $1 OFFSET $2
      `;

      const dataResult = await this.db.query(dataQuery, [limit, offset]);

      const messages = dataResult.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        groupId: row.group_id,
        content: row.content,
        type: row.type,
        attachments: JSON.parse(row.attachments_json || '[]'),
        timestamp: row.timestamp,
        readBy: JSON.parse(row.read_by_json || '[]').map((read: any) => ({
          userId: read.userId,
          readAt: new Date(read.readAt)
        })),
        syncStatus: row.sync_status,
        isEdited: row.is_edited,
        editedAt: row.edited_at,
        replyToId: row.reply_to_id,
        senderName: row.sender_name,
        recipientName: row.recipient_name
      }));

      return {
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting flagged messages for admin:', error);
      throw new Error('Failed to retrieve flagged messages');
    }
  }

  async moderateMessage(
    messageId: string,
    adminId: string,
    action: 'approve' | 'delete',
    reason: string
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify message exists
      const messageResult = await client.query('SELECT id FROM messages WHERE id = $1', [messageId]);
      if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
      }

      let adminActionType: AdminActionType;

      switch (action) {
        case 'approve':
          adminActionType = 'approve_message';
          // Remove any existing flags
          await client.query(`
            DELETE FROM admin_actions 
            WHERE target_type = 'message' AND target_id = $1 AND action IN ('flag_message', 'report_message')
          `, [messageId]);
          break;
        case 'delete':
          adminActionType = 'delete_message';
          // Delete the message
          await client.query('DELETE FROM messages WHERE id = $1', [messageId]);
          break;
      }

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, 'message', $3, $4, CURRENT_TIMESTAMP)
      `, [adminId, adminActionType, messageId, reason]);

      await client.query('COMMIT');
      logger.info(`Admin ${adminId} performed ${action} on message ${messageId}: ${reason}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error moderating message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== RESOURCE MANAGEMENT =====

  async getAllResources(
    pagination: PaginationOptions,
    filters: AdminResourceFilters = {}
  ): Promise<PaginatedResponse<EnhancedResource & { authorName: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.authorId) {
        whereConditions.push(`r.author_id = $${paramIndex}`);
        queryParams.push(filters.authorId);
        paramIndex++;
      }

      if (filters.type) {
        whereConditions.push(`r.type = $${paramIndex}`);
        queryParams.push(filters.type);
        paramIndex++;
      }

      if (filters.verificationStatus) {
        whereConditions.push(`r.verification_status = $${paramIndex}`);
        queryParams.push(filters.verificationStatus);
        paramIndex++;
      }

      if (filters.securityScanStatus) {
        whereConditions.push(`r.security_scan_status = $${paramIndex}`);
        queryParams.push(filters.securityScanStatus);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM resources r
        JOIN users u ON r.author_id = u.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.type,
          r.format,
          r.size,
          r.url,
          r.thumbnail_url,
          r.subjects_json,
          r.grade_levels_json,
          r.curriculum_alignment_json,
          r.author_id,
          r.is_government_content,
          r.verification_status,
          r.download_count,
          r.rating,
          r.rating_count,
          r.tags_json,
          r.attachments_json,
          r.youtube_video_id,
          r.security_scan_status,
          r.security_scan_results_json,
          r.is_active,
          r.created_at,
          r.updated_at,
          u.full_name as author_name
        FROM resources r
        JOIN users u ON r.author_id = u.id
        WHERE ${whereClause}
        ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const resources = dataResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        format: row.format,
        size: row.size,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        subjects: JSON.parse(row.subjects_json || '[]'),
        gradeLevels: JSON.parse(row.grade_levels_json || '[]'),
        curriculumAlignment: JSON.parse(row.curriculum_alignment_json || '[]'),
        authorId: row.author_id,
        isGovernmentContent: row.is_government_content,
        verificationStatus: row.verification_status,
        downloadCount: row.download_count,
        rating: row.rating,
        ratingCount: row.rating_count,
        tags: JSON.parse(row.tags_json || '[]'),
        attachments: JSON.parse(row.attachments_json || '[]'),
        youtubeVideoId: row.youtube_video_id,
        securityScanStatus: row.security_scan_status,
        securityScanResults: row.security_scan_results_json ? JSON.parse(row.security_scan_results_json) : undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: row.author_name
      }));

      return {
        data: resources,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all resources for admin:', error);
      throw new Error('Failed to retrieve resources');
    }
  }

  async moderateResource(
    resourceId: string,
    adminId: string,
    action: 'approve' | 'flag' | 'delete',
    reason: string
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify resource exists
      const resourceResult = await client.query('SELECT id FROM resources WHERE id = $1', [resourceId]);
      if (resourceResult.rows.length === 0) {
        throw new Error('Resource not found');
      }

      let adminActionType: AdminActionType;

      switch (action) {
        case 'approve':
          adminActionType = 'approve_resource';
          // Update verification status and remove flags
          await client.query('UPDATE resources SET verification_status = $1 WHERE id = $2', ['verified', resourceId]);
          await client.query(`
            DELETE FROM admin_actions 
            WHERE target_type = 'resource' AND target_id = $1 AND action = 'flag_resource'
          `, [resourceId]);
          break;
        case 'flag':
          adminActionType = 'flag_resource';
          // Update verification status
          await client.query('UPDATE resources SET verification_status = $1 WHERE id = $2', ['flagged', resourceId]);
          break;
        case 'delete':
          adminActionType = 'delete_resource';
          // Delete the resource (cascade will handle related data)
          await client.query('DELETE FROM resources WHERE id = $1', [resourceId]);
          break;
      }

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, 'resource', $3, $4, CURRENT_TIMESTAMP)
      `, [adminId, adminActionType, resourceId, reason]);

      await client.query('COMMIT');
      logger.info(`Admin ${adminId} performed ${action} on resource ${resourceId}: ${reason}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error moderating resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== ANALYTICS =====

  async getPlatformAnalytics(dateRange?: DateRange): Promise<PlatformAnalytics> {
    try {
      let dateFilter = '';
      const queryParams: any[] = [];

      if (dateRange) {
        dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
        queryParams.push(dateRange.startDate, dateRange.endDate);
      }

      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as active_users,
          (SELECT COUNT(*) FROM posts ${dateFilter}) as total_posts,
          (SELECT COUNT(*) FROM communities WHERE is_active = true ${dateFilter}) as total_communities,
          (SELECT COUNT(*) FROM resources WHERE is_active = true ${dateFilter}) as total_resources,
          (SELECT COUNT(*) FROM messages ${dateFilter}) as total_messages,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '1 day') as daily_active_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as weekly_active_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as monthly_active_users
      `;

      const result = await this.db.query(query, queryParams);
      const row = result.rows[0];

      return {
        totalUsers: parseInt(row.total_users),
        activeUsers: parseInt(row.active_users),
        totalPosts: parseInt(row.total_posts),
        totalCommunities: parseInt(row.total_communities),
        totalResources: parseInt(row.total_resources),
        totalMessages: parseInt(row.total_messages),
        dailyActiveUsers: parseInt(row.daily_active_users),
        weeklyActiveUsers: parseInt(row.weekly_active_users),
        monthlyActiveUsers: parseInt(row.monthly_active_users)
      };
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw new Error('Failed to retrieve platform analytics');
    }
  }

  async getUserAnalytics(dateRange: DateRange): Promise<UserAnalytics> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE created_at BETWEEN $1 AND $2) as new_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at BETWEEN $1 AND $2) as active_users,
          (SELECT AVG(EXTRACT(EPOCH FROM (last_login_at - created_at))/3600) FROM users WHERE created_at BETWEEN $1 AND $2 AND last_login_at IS NOT NULL) as avg_session_duration,
          (SELECT json_agg(subject_data) FROM (
            SELECT unnest(subjects_json::json#>>'{}') as subject, COUNT(*) as count
            FROM users 
            WHERE created_at BETWEEN $1 AND $2 
            GROUP BY subject 
            ORDER BY count DESC 
            LIMIT 10
          ) as subject_data) as top_subjects,
          (SELECT json_agg(region_data) FROM (
            SELECT school_location_json->>'region' as region, COUNT(*) as count
            FROM users 
            WHERE created_at BETWEEN $1 AND $2 
            GROUP BY region 
            ORDER BY count DESC 
            LIMIT 10
          ) as region_data) as top_regions
      `;

      const result = await this.db.query(query, [dateRange.startDate, dateRange.endDate]);
      const row = result.rows[0];

      // Calculate retention rate (users who logged in within the date range vs total users created in that range)
      const retentionQuery = `
        SELECT 
          COUNT(CASE WHEN last_login_at BETWEEN $1 AND $2 THEN 1 END)::float / 
          NULLIF(COUNT(*), 0) * 100 as retention_rate
        FROM users 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const retentionResult = await this.db.query(retentionQuery, [dateRange.startDate, dateRange.endDate]);
      const retentionRate = parseFloat(retentionResult.rows[0].retention_rate) || 0;

      return {
        newUsers: parseInt(row.new_users),
        activeUsers: parseInt(row.active_users),
        retentionRate,
        averageSessionDuration: parseFloat(row.avg_session_duration) || 0,
        topSubjects: row.top_subjects || [],
        topRegions: row.top_regions || []
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw new Error('Failed to retrieve user analytics');
    }
  }

  async getContentAnalytics(dateRange: DateRange): Promise<ContentAnalytics> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM posts WHERE created_at BETWEEN $1 AND $2) as total_posts,
          (SELECT COUNT(*) FROM post_comments WHERE created_at BETWEEN $1 AND $2) as total_comments,
          (SELECT COUNT(*) FROM post_likes WHERE created_at BETWEEN $1 AND $2) as total_likes,
          (SELECT COUNT(*) FROM posts WHERE created_at BETWEEN $1 AND $2) as total_shares,
          (SELECT json_agg(tag_data) FROM (
            SELECT unnest(tags::text[]::text[]) as tag, COUNT(*) as count
            FROM posts 
            WHERE created_at BETWEEN $1 AND $2 
            GROUP BY tag 
            ORDER BY count DESC 
            LIMIT 10
          ) as tag_data) as top_tags,
          (SELECT AVG(posts_per_user) FROM (
            SELECT author_id, COUNT(*) as posts_per_user
            FROM posts 
            WHERE created_at BETWEEN $1 AND $2 
            GROUP BY author_id
          ) as user_posts) as avg_posts_per_user
      `;

      const result = await this.db.query(query, [dateRange.startDate, dateRange.endDate]);
      const row = result.rows[0];

      // Calculate engagement rate (likes + comments / posts)
      const totalPosts = parseInt(row.total_posts);
      const totalLikes = parseInt(row.total_likes);
      const totalComments = parseInt(row.total_comments);
      const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts) * 100 : 0;

      return {
        totalPosts,
        totalComments,
        totalLikes,
        totalShares: parseInt(row.total_shares), // Using posts count as proxy for shares
        topTags: row.top_tags || [],
        engagementRate,
        averagePostsPerUser: parseFloat(row.avg_posts_per_user) || 0
      };
    } catch (error) {
      logger.error('Error getting content analytics:', error);
      throw new Error('Failed to retrieve content analytics');
    }
  }

  // ===== ADMIN ACTION LOGGING =====

  async logAdminAction(
    adminId: string,
    action: AdminActionType,
    targetType: 'post' | 'comment' | 'community' | 'user' | 'resource' | 'message',
    targetId: string,
    reason: string,
    details?: any
  ): Promise<AdminAction> {
    try {
      const query = `
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, details_json, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        adminId,
        action,
        targetType,
        targetId,
        reason,
        details ? JSON.stringify(details) : null
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        adminId: row.admin_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        details: row.details_json ? JSON.parse(row.details_json) : undefined,
        timestamp: row.timestamp
      };
    } catch (error) {
      logger.error('Error logging admin action:', error);
      throw new Error('Failed to log admin action');
    }
  }

  async getAdminActions(
    pagination: PaginationOptions,
    adminId?: string
  ): Promise<PaginatedResponse<AdminAction & { adminName: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (adminId) {
        whereClause = `aa.admin_id = $${paramIndex}`;
        queryParams.push(adminId);
        paramIndex++;
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM admin_actions aa
        JOIN users u ON aa.admin_id = u.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          aa.id,
          aa.admin_id,
          aa.action,
          aa.target_type,
          aa.target_id,
          aa.reason,
          aa.details_json,
          aa.timestamp,
          u.full_name as admin_name
        FROM admin_actions aa
        JOIN users u ON aa.admin_id = u.id
        WHERE ${whereClause}
        ORDER BY aa.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const actions = dataResult.rows.map(row => ({
        id: row.id,
        adminId: row.admin_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        details: row.details_json ? JSON.parse(row.details_json) : undefined,
        timestamp: row.timestamp,
        adminName: row.admin_name
      }));

      return {
        data: actions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting admin actions:', error);
      throw new Error('Failed to retrieve admin actions');
    }
  }

  // ===== MODERATION QUEUE =====

  async getModerationQueue(
    pagination: PaginationOptions,
    filters: ModerationFilters = {}
  ): Promise<PaginatedResponse<ModerationQueue & { reporterName: string; assigneeName?: string }>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.itemType) {
        whereConditions.push(`mq.item_type = $${paramIndex}`);
        queryParams.push(filters.itemType);
        paramIndex++;
      }

      if (filters.status) {
        whereConditions.push(`mq.status = $${paramIndex}`);
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.assignedTo) {
        whereConditions.push(`mq.assigned_to = $${paramIndex}`);
        queryParams.push(filters.assignedTo);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM moderation_queue mq
        JOIN users reporter ON mq.reported_by = reporter.id
        LEFT JOIN users assignee ON mq.assigned_to = assignee.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          mq.id,
          mq.item_type,
          mq.item_id,
          mq.report_reason,
          mq.reported_by,
          mq.status,
          mq.assigned_to,
          mq.resolution_action,
          mq.resolution_reason,
          mq.resolution_notes,
          mq.created_at,
          mq.resolved_at,
          reporter.full_name as reporter_name,
          assignee.full_name as assignee_name
        FROM moderation_queue mq
        JOIN users reporter ON mq.reported_by = reporter.id
        LEFT JOIN users assignee ON mq.assigned_to = assignee.id
        WHERE ${whereClause}
        ORDER BY mq.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const queueItems = dataResult.rows.map(row => ({
        id: row.id,
        itemType: row.item_type,
        itemId: row.item_id,
        reportReason: row.report_reason,
        reportedBy: row.reported_by,
        status: row.status,
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        reporterName: row.reporter_name,
        assigneeName: row.assignee_name
      }));

      return {
        data: queueItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting moderation queue:', error);
      throw new Error('Failed to retrieve moderation queue');
    }
  }

  async assignModerationItem(itemId: string, adminId: string): Promise<void> {
    try {
      const result = await this.db.query(`
        UPDATE moderation_queue 
        SET assigned_to = $1, status = 'reviewed'
        WHERE id = $2 AND status = 'pending'
        RETURNING id
      `, [adminId, itemId]);

      if (result.rows.length === 0) {
        throw new Error('Moderation item not found or already assigned');
      }

      logger.info(`Admin ${adminId} assigned to moderation item ${itemId}`);
    } catch (error) {
      logger.error('Error assigning moderation item:', error);
      throw error;
    }
  }

  async resolveModerationItem(
    itemId: string,
    adminId: string,
    resolution: ModerationResolution
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get the moderation item
      const itemResult = await client.query(`
        SELECT item_type, item_id, assigned_to 
        FROM moderation_queue 
        WHERE id = $1
      `, [itemId]);

      if (itemResult.rows.length === 0) {
        throw new Error('Moderation item not found');
      }

      const { item_type, item_id: targetId, assigned_to } = itemResult.rows[0];

      // Verify admin is assigned to this item or is authorized
      if (assigned_to && assigned_to !== adminId) {
        // Check if admin has super admin privileges
        const adminResult = await client.query(`
          SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'super_admin')
        `, [adminId]);
        
        if (adminResult.rows.length === 0) {
          throw new Error('Not authorized to resolve this moderation item');
        }
      }

      // Update moderation queue item
      await client.query(`
        UPDATE moderation_queue 
        SET 
          status = 'resolved',
          resolution_action = $1,
          resolution_reason = $2,
          resolution_notes = $3,
          resolved_at = CURRENT_TIMESTAMP,
          assigned_to = COALESCE(assigned_to, $4)
        WHERE id = $5
      `, [resolution.action, resolution.reason, resolution.notes, adminId, itemId]);

      // Take action based on resolution
      if (resolution.action === 'approve') {
        // Remove any flags and approve the content
        switch (item_type) {
          case 'post':
            await this.moderatePost(targetId, adminId, 'approve', resolution.reason);
            break;
          case 'community':
            await this.moderateCommunity(targetId, adminId, 'approve', resolution.reason);
            break;
          case 'resource':
            await this.moderateResource(targetId, adminId, 'approve', resolution.reason);
            break;
          case 'message':
            await this.moderateMessage(targetId, adminId, 'approve', resolution.reason);
            break;
        }
      } else if (resolution.action === 'reject') {
        // Take appropriate action (delete, flag, etc.)
        switch (item_type) {
          case 'post':
            await this.moderatePost(targetId, adminId, 'delete', resolution.reason);
            break;
          case 'community':
            await this.moderateCommunity(targetId, adminId, 'suspend', resolution.reason);
            break;
          case 'resource':
            await this.moderateResource(targetId, adminId, 'flag', resolution.reason);
            break;
          case 'message':
            await this.moderateMessage(targetId, adminId, 'delete', resolution.reason);
            break;
        }
      }
      // For 'escalate', we just update the queue item without taking action

      await client.query('COMMIT');
      logger.info(`Admin ${adminId} resolved moderation item ${itemId} with action: ${resolution.action}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error resolving moderation item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addToModerationQueue(
    itemType: 'post' | 'comment' | 'resource' | 'community' | 'message',
    itemId: string,
    reportReason: string,
    reportedBy: string
  ): Promise<ModerationQueue> {
    try {
      const query = `
        INSERT INTO moderation_queue (item_type, item_id, report_reason, reported_by, status, created_at)
        VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await this.db.query(query, [itemType, itemId, reportReason, reportedBy]);
      const row = result.rows[0];

      // Also create an admin action for the flag
      await this.logAdminAction(
        reportedBy,
        `flag_${itemType}` as AdminActionType,
        itemType,
        itemId,
        reportReason
      );

      return {
        id: row.id,
        itemType: row.item_type,
        itemId: row.item_id,
        reportReason: row.report_reason,
        reportedBy: row.reported_by,
        status: row.status,
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at
      };
    } catch (error) {
      logger.error('Error adding item to moderation queue:', error);
      throw new Error('Failed to add item to moderation queue');
    }
  }

  // ===== UTILITY METHODS =====

  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(`
        SELECT 1 FROM users 
        WHERE id = $1 AND role IN ('admin', 'super_admin', 'moderator')
      `, [userId]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  async getUserRole(userId: string): Promise<string | null> {
    try {
      const result = await this.db.query(`
        SELECT role FROM users 
        WHERE id = $1
      `, [userId]);

      return result.rows.length > 0 ? result.rows[0].role : null;
    } catch (error) {
      logger.error('Error getting user role:', error);
      return null;
    }
  }

  async getAdminStats(): Promise<{
    pendingModerations: number;
    totalActions: number;
    flaggedContent: number;
    activeAdmins: number;
  }> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as pending_moderations,
          (SELECT COUNT(*) FROM admin_actions WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as total_actions,
          (SELECT COUNT(*) FROM admin_actions WHERE action LIKE '%flag%' AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as flagged_content,
          (SELECT COUNT(DISTINCT admin_id) FROM admin_actions WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_admins
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      return {
        pendingModerations: parseInt(row.pending_moderations),
        totalActions: parseInt(row.total_actions),
        flaggedContent: parseInt(row.flagged_content),
        activeAdmins: parseInt(row.active_admins)
      };
    } catch (error) {
      logger.error('Error getting admin stats:', error);
      throw new Error('Failed to retrieve admin statistics');
    }
  }
}