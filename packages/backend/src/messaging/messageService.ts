import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Message, Attachment } from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export interface CreateDirectMessageData {
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: Attachment[];
  replyToId?: string;
}

export interface CreateGroupMessageData {
  senderId: string;
  groupId: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: Attachment[];
  replyToId?: string;
}

export class MessageService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  async createDirectMessage(data: CreateDirectMessageData): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      const messageId = uuidv4();
      const timestamp = new Date();

      const query = `
        INSERT INTO messages (
          id, sender_id, recipient_id, content, type, 
          attachments_json, timestamp, reply_to_id, sync_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        messageId,
        data.senderId,
        data.recipientId,
        data.content,
        data.type,
        JSON.stringify(data.attachments),
        timestamp,
        data.replyToId || null,
        'synced'
      ];

      const result = await client.query(query, values);
      const messageRow = result.rows[0];

      const message: Message = {
        id: messageRow.id,
        senderId: messageRow.sender_id,
        recipientId: messageRow.recipient_id,
        groupId: messageRow.group_id,
        content: messageRow.content,
        type: messageRow.type,
        attachments: JSON.parse(messageRow.attachments_json || '[]'),
        timestamp: messageRow.timestamp,
        readBy: JSON.parse(messageRow.read_by_json || '[]'),
        syncStatus: messageRow.sync_status,
        isEdited: messageRow.is_edited,
        editedAt: messageRow.edited_at,
        replyToId: messageRow.reply_to_id
      };

      logger.info(`Direct message created: ${messageId}`);
      return message;
    } catch (error) {
      logger.error('Error creating direct message:', error);
      throw new Error('Failed to create direct message');
    } finally {
      client.release();
    }
  }

  async createGroupMessage(data: CreateGroupMessageData): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      const messageId = uuidv4();
      const timestamp = new Date();

      const query = `
        INSERT INTO messages (
          id, sender_id, group_id, content, type, 
          attachments_json, timestamp, reply_to_id, sync_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        messageId,
        data.senderId,
        data.groupId,
        data.content,
        data.type,
        JSON.stringify(data.attachments),
        timestamp,
        data.replyToId || null,
        'synced'
      ];

      const result = await client.query(query, values);
      const messageRow = result.rows[0];

      const message: Message = {
        id: messageRow.id,
        senderId: messageRow.sender_id,
        recipientId: messageRow.recipient_id,
        groupId: messageRow.group_id,
        content: messageRow.content,
        type: messageRow.type,
        attachments: JSON.parse(messageRow.attachments_json || '[]'),
        timestamp: messageRow.timestamp,
        readBy: JSON.parse(messageRow.read_by_json || '[]'),
        syncStatus: messageRow.sync_status,
        isEdited: messageRow.is_edited,
        editedAt: messageRow.edited_at,
        replyToId: messageRow.reply_to_id
      };

      logger.info(`Group message created: ${messageId}`);
      return message;
    } catch (error) {
      logger.error('Error creating group message:', error);
      throw new Error('Failed to create group message');
    } finally {
      client.release();
    }
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM messages WHERE id = $1';
      const result = await client.query(query, [messageId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const messageRow = result.rows[0];
      return {
        id: messageRow.id,
        senderId: messageRow.sender_id,
        recipientId: messageRow.recipient_id,
        groupId: messageRow.group_id,
        content: messageRow.content,
        type: messageRow.type,
        attachments: JSON.parse(messageRow.attachments_json || '[]'),
        timestamp: messageRow.timestamp,
        readBy: JSON.parse(messageRow.read_by_json || '[]'),
        syncStatus: messageRow.sync_status,
        isEdited: messageRow.is_edited,
        editedAt: messageRow.edited_at,
        replyToId: messageRow.reply_to_id
      };
    } catch (error) {
      logger.error('Error fetching message:', error);
      throw new Error('Failed to fetch message');
    } finally {
      client.release();
    }
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get current readBy array
      const selectQuery = 'SELECT read_by_json FROM messages WHERE id = $1';
      const selectResult = await client.query(selectQuery, [messageId]);
      
      if (selectResult.rows.length === 0) {
        throw new Error('Message not found');
      }

      const currentReadBy = JSON.parse(selectResult.rows[0].read_by_json || '[]');
      
      // Add user to readBy array if not already present
      if (!currentReadBy.includes(userId)) {
        currentReadBy.push(userId);
        
        const updateQuery = 'UPDATE messages SET read_by_json = $1 WHERE id = $2';
        await client.query(updateQuery, [JSON.stringify(currentReadBy), messageId]);
        
        logger.info(`Message ${messageId} marked as read by user ${userId}`);
      }
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    } finally {
      client.release();
    }
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE messages 
        SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND sender_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [newContent, messageId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Message not found or user not authorized to edit');
      }

      const messageRow = result.rows[0];
      const message: Message = {
        id: messageRow.id,
        senderId: messageRow.sender_id,
        recipientId: messageRow.recipient_id,
        groupId: messageRow.group_id,
        content: messageRow.content,
        type: messageRow.type,
        attachments: JSON.parse(messageRow.attachments_json || '[]'),
        timestamp: messageRow.timestamp,
        readBy: JSON.parse(messageRow.read_by_json || '[]'),
        syncStatus: messageRow.sync_status,
        isEdited: messageRow.is_edited,
        editedAt: messageRow.edited_at,
        replyToId: messageRow.reply_to_id
      };

      logger.info(`Message ${messageId} edited by user ${userId}`);
      return message;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    } finally {
      client.release();
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      // First get the message to return it
      const selectQuery = 'SELECT * FROM messages WHERE id = $1 AND sender_id = $2';
      const selectResult = await client.query(selectQuery, [messageId, userId]);
      
      if (selectResult.rows.length === 0) {
        throw new Error('Message not found or user not authorized to delete');
      }

      const messageRow = selectResult.rows[0];
      
      // Delete the message
      const deleteQuery = 'DELETE FROM messages WHERE id = $1 AND sender_id = $2';
      await client.query(deleteQuery, [messageId, userId]);

      const message: Message = {
        id: messageRow.id,
        senderId: messageRow.sender_id,
        recipientId: messageRow.recipient_id,
        groupId: messageRow.group_id,
        content: messageRow.content,
        type: messageRow.type,
        attachments: JSON.parse(messageRow.attachments_json || '[]'),
        timestamp: messageRow.timestamp,
        readBy: JSON.parse(messageRow.read_by_json || '[]'),
        syncStatus: messageRow.sync_status,
        isEdited: messageRow.is_edited,
        editedAt: messageRow.edited_at,
        replyToId: messageRow.reply_to_id
      };

      logger.info(`Message ${messageId} deleted by user ${userId}`);
      return message;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    } finally {
      client.release();
    }
  }

  async getDirectMessages(userId1: string, userId2: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM messages 
        WHERE (sender_id = $1 AND recipient_id = $2) 
           OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY timestamp DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await client.query(query, [userId1, userId2, limit, offset]);
      
      return result.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        groupId: row.group_id,
        content: row.content,
        type: row.type,
        attachments: JSON.parse(row.attachments_json || '[]'),
        timestamp: row.timestamp,
        readBy: JSON.parse(row.read_by_json || '[]'),
        syncStatus: row.sync_status,
        isEdited: row.is_edited,
        editedAt: row.edited_at,
        replyToId: row.reply_to_id
      }));
    } catch (error) {
      logger.error('Error fetching direct messages:', error);
      throw new Error('Failed to fetch direct messages');
    } finally {
      client.release();
    }
  }

  async getGroupMessages(groupId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM messages 
        WHERE group_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [groupId, limit, offset]);
      
      return result.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        groupId: row.group_id,
        content: row.content,
        type: row.type,
        attachments: JSON.parse(row.attachments_json || '[]'),
        timestamp: row.timestamp,
        readBy: JSON.parse(row.read_by_json || '[]'),
        syncStatus: row.sync_status,
        isEdited: row.is_edited,
        editedAt: row.edited_at,
        replyToId: row.reply_to_id
      }));
    } catch (error) {
      logger.error('Error fetching group messages:', error);
      throw new Error('Failed to fetch group messages');
    } finally {
      client.release();
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT COUNT(*) as count FROM messages 
        WHERE (recipient_id = $1 OR group_id IN (
          SELECT community_id FROM community_memberships 
          WHERE user_id = $1 AND is_active = true
        ))
        AND NOT (read_by_json::jsonb ? $1)
      `;

      const result = await client.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread message count:', error);
      throw new Error('Failed to get unread message count');
    } finally {
      client.release();
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        WITH latest_messages AS (
          SELECT DISTINCT ON (
            CASE 
              WHEN sender_id = $1 THEN recipient_id 
              ELSE sender_id 
            END
          )
          CASE 
            WHEN sender_id = $1 THEN recipient_id 
            ELSE sender_id 
          END as other_user_id,
          content,
          timestamp,
          type,
          CASE WHEN read_by_json::jsonb ? $1 THEN true ELSE false END as is_read
          FROM messages 
          WHERE recipient_id = $1 OR sender_id = $1
          ORDER BY 
            CASE 
              WHEN sender_id = $1 THEN recipient_id 
              ELSE sender_id 
            END,
            timestamp DESC
        )
        SELECT 
          lm.*,
          u.full_name,
          u.profile_image_url
        FROM latest_messages lm
        JOIN users u ON u.id = lm.other_user_id
        ORDER BY lm.timestamp DESC
      `;

      const result = await client.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user conversations:', error);
      throw new Error('Failed to fetch user conversations');
    } finally {
      client.release();
    }
  }
}