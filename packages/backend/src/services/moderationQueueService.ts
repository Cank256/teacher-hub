import { Pool } from 'pg';
import { 
  ModerationQueue, 
  ModerationResolution,
  ModerationFilters,
  PaginationOptions,
  PaginatedResponse
} from '../types';
import logger from '../utils/logger';

export class ModerationQueueService {
  constructor(private db: Pool) {}

  // ===== QUEUE MANAGEMENT =====

  async addToQueue(
    itemType: 'post' | 'comment' | 'resource' | 'community' | 'message',
    itemId: string,
    reportReason: string,
    reportedBy: string
  ): Promise<ModerationQueue> {
    try {
      // Check if item is already in queue
      const existingQuery = `
        SELECT id FROM moderation_queue 
        WHERE item_type = $1 AND item_id = $2 AND status IN ('pending', 'reviewed')
      `;
      
      const existingResult = await this.db.query(existingQuery, [itemType, itemId]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('Item is already in moderation queue');
      }

      const query = `
        INSERT INTO moderation_queue (item_type, item_id, report_reason, reported_by, status, created_at)
        VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await this.db.query(query, [itemType, itemId, reportReason, reportedBy]);
      const row = result.rows[0];

      logger.info(`Added ${itemType} ${itemId} to moderation queue, reported by ${reportedBy}`);

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
      throw error;
    }
  }

  async getQueue(
    pagination: PaginationOptions,
    filters: ModerationFilters = {}
  ): Promise<PaginatedResponse<ModerationQueue & { 
    reporterName: string; 
    assigneeName?: string;
    itemDetails?: any;
  }>> {
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

      // Fetch item details for each queue item
      const queueItems = await Promise.all(
        dataResult.rows.map(async (row) => {
          const itemDetails = await this.getItemDetails(row.item_type, row.item_id);
          
          return {
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
            assigneeName: row.assignee_name,
            itemDetails
          };
        })
      );

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

  async assignToModerator(queueItemId: string, moderatorId: string): Promise<void> {
    try {
      const result = await this.db.query(`
        UPDATE moderation_queue 
        SET assigned_to = $1, status = 'reviewed'
        WHERE id = $2 AND status = 'pending'
        RETURNING id
      `, [moderatorId, queueItemId]);

      if (result.rows.length === 0) {
        throw new Error('Queue item not found or already assigned');
      }

      logger.info(`Assigned moderation queue item ${queueItemId} to moderator ${moderatorId}`);
    } catch (error) {
      logger.error('Error assigning queue item to moderator:', error);
      throw error;
    }
  }

  async resolveItem(
    queueItemId: string,
    moderatorId: string,
    resolution: ModerationResolution
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get the queue item
      const itemResult = await client.query(`
        SELECT item_type, item_id, assigned_to, status
        FROM moderation_queue 
        WHERE id = $1
      `, [queueItemId]);

      if (itemResult.rows.length === 0) {
        throw new Error('Queue item not found');
      }

      const { item_type, item_id, assigned_to, status } = itemResult.rows[0];

      // Verify moderator can resolve this item
      if (assigned_to && assigned_to !== moderatorId) {
        // Check if moderator has higher privileges
        const moderatorResult = await client.query(`
          SELECT role FROM user_roles 
          WHERE user_id = $1 AND role IN ('admin', 'super_admin')
        `, [moderatorId]);
        
        if (moderatorResult.rows.length === 0) {
          throw new Error('Not authorized to resolve this queue item');
        }
      }

      // Update queue item
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
      `, [resolution.action, resolution.reason, resolution.notes, moderatorId, queueItemId]);

      await client.query('COMMIT');
      
      logger.info(`Resolved moderation queue item ${queueItemId} with action: ${resolution.action}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error resolving queue item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async escalateItem(
    queueItemId: string,
    moderatorId: string,
    escalationReason: string
  ): Promise<void> {
    try {
      const result = await this.db.query(`
        UPDATE moderation_queue 
        SET 
          status = 'escalated',
          resolution_action = 'escalate',
          resolution_reason = $1,
          assigned_to = NULL
        WHERE id = $2 AND assigned_to = $3
        RETURNING id
      `, [escalationReason, queueItemId, moderatorId]);

      if (result.rows.length === 0) {
        throw new Error('Queue item not found or not assigned to this moderator');
      }

      logger.info(`Escalated moderation queue item ${queueItemId}: ${escalationReason}`);
    } catch (error) {
      logger.error('Error escalating queue item:', error);
      throw error;
    }
  }

  // ===== AUTOMATED FLAGGING =====

  async autoFlagContent(
    itemType: 'post' | 'comment' | 'resource' | 'message',
    itemId: string,
    flagReason: string,
    confidence: number = 0.8
  ): Promise<void> {
    try {
      // Only auto-flag if confidence is high enough
      if (confidence < 0.7) {
        logger.info(`Auto-flag confidence too low (${confidence}) for ${itemType} ${itemId}`);
        return;
      }

      // Use system user ID for automated flagging
      const systemUserId = '00000000-0000-0000-0000-000000000000';

      await this.addToQueue(
        itemType,
        itemId,
        `[AUTOMATED] ${flagReason} (confidence: ${confidence})`,
        systemUserId
      );

      logger.info(`Auto-flagged ${itemType} ${itemId} with confidence ${confidence}: ${flagReason}`);
    } catch (error) {
      logger.error('Error auto-flagging content:', error);
      // Don't throw error for auto-flagging failures
    }
  }

  async scanForInappropriateContent(
    content: string,
    itemType: 'post' | 'comment' | 'message',
    itemId: string
  ): Promise<void> {
    try {
      // Simple keyword-based content scanning
      const inappropriateKeywords = [
        'spam', 'scam', 'fraud', 'hate', 'harassment',
        'inappropriate', 'offensive', 'abusive'
      ];

      const contentLower = content.toLowerCase();
      const foundKeywords = inappropriateKeywords.filter(keyword => 
        contentLower.includes(keyword)
      );

      if (foundKeywords.length > 0) {
        const confidence = Math.min(0.9, foundKeywords.length * 0.3);
        await this.autoFlagContent(
          itemType,
          itemId,
          `Inappropriate content detected: ${foundKeywords.join(', ')}`,
          confidence
        );
      }
    } catch (error) {
      logger.error('Error scanning content:', error);
    }
  }

  // ===== REPORTING SYSTEM =====

  async reportContent(
    itemType: 'post' | 'comment' | 'resource' | 'community' | 'message',
    itemId: string,
    reportReason: string,
    reportedBy: string,
    additionalDetails?: string
  ): Promise<ModerationQueue> {
    try {
      // Verify the item exists
      const itemExists = await this.verifyItemExists(itemType, itemId);
      if (!itemExists) {
        throw new Error(`${itemType} not found`);
      }

      // Verify reporter is not the author (for applicable items)
      const isAuthor = await this.isUserAuthor(itemType, itemId, reportedBy);
      if (isAuthor) {
        throw new Error('Cannot report your own content');
      }

      const fullReason = additionalDetails 
        ? `${reportReason}\n\nAdditional details: ${additionalDetails}`
        : reportReason;

      const queueItem = await this.addToQueue(itemType, itemId, fullReason, reportedBy);

      // Log the report
      await this.db.query(`
        INSERT INTO user_activity_log (user_id, activity, details_json, timestamp)
        VALUES ($1, 'report_content', $2, CURRENT_TIMESTAMP)
      `, [reportedBy, JSON.stringify({
        itemType,
        itemId,
        reason: reportReason
      })]);

      return queueItem;
    } catch (error) {
      logger.error('Error reporting content:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  private async getItemDetails(itemType: string, itemId: string): Promise<any> {
    try {
      let query = '';
      let fields = '';

      switch (itemType) {
        case 'post':
          fields = 'title, content, author_id, created_at';
          query = `SELECT ${fields}, u.full_name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1`;
          break;
        case 'comment':
          fields = 'content, author_id, post_id, created_at';
          query = `SELECT ${fields}, u.full_name as author_name FROM post_comments pc JOIN users u ON pc.author_id = u.id WHERE pc.id = $1`;
          break;
        case 'resource':
          fields = 'title, description, type, author_id, created_at';
          query = `SELECT ${fields}, u.full_name as author_name FROM resources r JOIN users u ON r.author_id = u.id WHERE r.id = $1`;
          break;
        case 'community':
          fields = 'name, description, type, owner_id, created_at';
          query = `SELECT ${fields}, u.full_name as owner_name FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = $1`;
          break;
        case 'message':
          fields = 'content, sender_id, timestamp';
          query = `SELECT ${fields}, u.full_name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1`;
          break;
        default:
          return null;
      }

      const result = await this.db.query(query, [itemId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error getting item details:', error);
      return null;
    }
  }

  private async verifyItemExists(itemType: string, itemId: string): Promise<boolean> {
    try {
      let table = '';
      switch (itemType) {
        case 'post': table = 'posts'; break;
        case 'comment': table = 'post_comments'; break;
        case 'resource': table = 'resources'; break;
        case 'community': table = 'communities'; break;
        case 'message': table = 'messages'; break;
        default: return false;
      }

      const result = await this.db.query(`SELECT 1 FROM ${table} WHERE id = $1`, [itemId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error verifying item exists:', error);
      return false;
    }
  }

  private async isUserAuthor(itemType: string, itemId: string, userId: string): Promise<boolean> {
    try {
      let query = '';
      switch (itemType) {
        case 'post':
          query = 'SELECT 1 FROM posts WHERE id = $1 AND author_id = $2';
          break;
        case 'comment':
          query = 'SELECT 1 FROM post_comments WHERE id = $1 AND author_id = $2';
          break;
        case 'resource':
          query = 'SELECT 1 FROM resources WHERE id = $1 AND author_id = $2';
          break;
        case 'community':
          query = 'SELECT 1 FROM communities WHERE id = $1 AND owner_id = $2';
          break;
        case 'message':
          query = 'SELECT 1 FROM messages WHERE id = $1 AND sender_id = $2';
          break;
        default:
          return false;
      }

      const result = await this.db.query(query, [itemId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking if user is author:', error);
      return false;
    }
  }

  async getQueueStats(): Promise<{
    totalPending: number;
    totalReviewed: number;
    totalResolved: number;
    averageResolutionTime: number;
    itemTypeBreakdown: { [key: string]: number };
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as total_reviewed,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as total_resolved,
          AVG(
            CASE WHEN resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
            END
          ) as avg_resolution_hours
        FROM moderation_queue
      `;

      const statsResult = await this.db.query(statsQuery);
      const stats = statsResult.rows[0];

      // Get item type breakdown
      const typeQuery = `
        SELECT item_type, COUNT(*) as count
        FROM moderation_queue
        WHERE status = 'pending'
        GROUP BY item_type
      `;

      const typeResult = await this.db.query(typeQuery);
      const itemTypeBreakdown: { [key: string]: number } = {};
      typeResult.rows.forEach(row => {
        itemTypeBreakdown[row.item_type] = parseInt(row.count);
      });

      return {
        totalPending: parseInt(stats.total_pending),
        totalReviewed: parseInt(stats.total_reviewed),
        totalResolved: parseInt(stats.total_resolved),
        averageResolutionTime: parseFloat(stats.avg_resolution_hours) || 0,
        itemTypeBreakdown
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw new Error('Failed to retrieve queue statistics');
    }
  }
}