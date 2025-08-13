import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnhancedMessage, 
  Conversation, 
  Attachment, 
  MessageRead,
  PaginationOptions,
  PaginatedResponse,
  SendMessageRequest,
  MessageSearchFilters
} from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export interface CreateConversationData {
  initiatorId: string;
  participantIds: string[];
  type: 'direct' | 'group';
}



export class EnhancedMessageService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  // Create or get existing conversation
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // For direct conversations, check if one already exists
      if (data.type === 'direct' && data.participantIds.length === 1) {
        const allParticipants = [data.initiatorId, ...data.participantIds].sort();
        
        const existingQuery = `
          SELECT * FROM conversations 
          WHERE type = 'direct' 
          AND participants::jsonb = $1::jsonb
        `;
        
        const existingResult = await client.query(existingQuery, [JSON.stringify(allParticipants)]);
        
        if (existingResult.rows.length > 0) {
          const row = existingResult.rows[0];
          await client.query('COMMIT');
          return this.mapRowToConversation(row);
        }
      }

      // Create new conversation
      const conversationId = uuidv4();
      const participants = data.type === 'direct' 
        ? [data.initiatorId, ...data.participantIds].sort()
        : [data.initiatorId, ...data.participantIds];

      const unreadCount: { [userId: string]: number } = {};
      participants.forEach(userId => {
        unreadCount[userId] = 0;
      });

      const query = `
        INSERT INTO conversations (
          id, participants, type, last_activity, unread_count
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        RETURNING *
      `;

      const values = [
        conversationId,
        JSON.stringify(participants),
        data.type,
        JSON.stringify(unreadCount)
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      logger.info(`Conversation created: ${conversationId}`);
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    } finally {
      client.release();
    }
  }

  // Send message with conversation support
  async sendMessage(senderId: string, messageData: SendMessageRequest): Promise<EnhancedMessage> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      let conversationId: string;

      // Handle different message types
      if (messageData.recipientId) {
        // Direct message - create or get conversation
        const conversation = await this.createConversation({
          initiatorId: senderId,
          participantIds: [messageData.recipientId],
          type: 'direct'
        });
        conversationId = conversation.id;
      } else if (messageData.groupId) {
        // Group message - find or create group conversation
        const groupConvQuery = `
          SELECT id FROM conversations 
          WHERE participants::jsonb ? $1 AND type = 'group'
          LIMIT 1
        `;
        const groupConvResult = await client.query(groupConvQuery, [messageData.groupId]);
        
        if (groupConvResult.rows.length === 0) {
          throw new Error('Group conversation not found');
        }
        conversationId = groupConvResult.rows[0].id;
      } else {
        throw new Error('Message must have either recipientId or groupId');
      }

      // Create the message
      const messageId = uuidv4();
      const timestamp = new Date();

      const query = `
        INSERT INTO messages (
          id, sender_id, recipient_id, group_id, conversation_id, content, type, 
          attachments_json, timestamp, reply_to_id, sync_status, read_by_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const readBy: MessageRead[] = [{
        userId: senderId,
        readAt: timestamp
      }];

      const values = [
        messageId,
        senderId,
        messageData.recipientId || null,
        messageData.groupId || null,
        conversationId,
        messageData.content,
        messageData.type,
        JSON.stringify(messageData.attachments || []),
        timestamp,
        messageData.replyToId || null,
        'synced',
        JSON.stringify(readBy)
      ];

      const result = await client.query(query, values);

      // Update conversation
      await this.updateConversationActivity(client, conversationId, messageId, senderId);

      await client.query('COMMIT');

      const message = this.mapRowToEnhancedMessage(result.rows[0]);
      logger.info(`Message sent: ${messageId}`);
      return message;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    } finally {
      client.release();
    }
  }

  // Reply to a message
  async replyToMessage(senderId: string, originalMessageId: string, content: string, attachments: Attachment[] = []): Promise<EnhancedMessage> {
    const client = await this.pool.connect();
    
    try {
      // Get original message to find conversation
      const originalQuery = 'SELECT conversation_id, recipient_id, group_id FROM messages WHERE id = $1';
      const originalResult = await client.query(originalQuery, [originalMessageId]);
      
      if (originalResult.rows.length === 0) {
        throw new Error('Original message not found');
      }

      const original = originalResult.rows[0];
      
      const messageData: SendMessageRequest = {
        content,
        type: 'text',
        attachments,
        replyToId: originalMessageId,
        recipientId: original.recipient_id,
        groupId: original.group_id
      };

      return await this.sendMessage(senderId, messageData);
    } catch (error) {
      logger.error('Error replying to message:', error);
      throw new Error('Failed to reply to message');
    } finally {
      client.release();
    }
  }

  // Edit a message
  async editMessage(messageId: string, senderId: string, newContent: string): Promise<EnhancedMessage> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE messages 
        SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND sender_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [newContent, messageId, senderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Message not found or user not authorized to edit');
      }

      const message = this.mapRowToEnhancedMessage(result.rows[0]);
      logger.info(`Message ${messageId} edited by user ${senderId}`);
      return message;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    } finally {
      client.release();
    }
  }

  // Delete a message
  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const deleteQuery = 'DELETE FROM messages WHERE id = $1 AND sender_id = $2';
      const result = await client.query(deleteQuery, [messageId, senderId]);
      
      if (result.rowCount === 0) {
        throw new Error('Message not found or user not authorized to delete');
      }

      logger.info(`Message ${messageId} deleted by user ${senderId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    } finally {
      client.release();
    }
  }

  // Get message by ID
  async getMessageById(messageId: string): Promise<EnhancedMessage | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM messages WHERE id = $1';
      const result = await client.query(query, [messageId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEnhancedMessage(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching message:', error);
      throw new Error('Failed to fetch message');
    } finally {
      client.release();
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const messageId of messageIds) {
        // Get current readBy array
        const selectQuery = 'SELECT read_by_json FROM messages WHERE id = $1 AND conversation_id = $2';
        const selectResult = await client.query(selectQuery, [messageId, conversationId]);
        
        if (selectResult.rows.length === 0) {
          continue; // Skip if message not found
        }

        const currentReadBy: MessageRead[] = JSON.parse(selectResult.rows[0].read_by_json || '[]');
        
        // Check if user already marked as read
        const alreadyRead = currentReadBy.some(read => read.userId === userId);
        
        if (!alreadyRead) {
          currentReadBy.push({
            userId,
            readAt: new Date()
          });
          
          const updateQuery = 'UPDATE messages SET read_by_json = $1 WHERE id = $2';
          await client.query(updateQuery, [JSON.stringify(currentReadBy), messageId]);
        }
      }

      // Update conversation unread count
      await this.updateConversationUnreadCount(client, conversationId, userId, 0);

      await client.query('COMMIT');
      logger.info(`Messages marked as read by user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    } finally {
      client.release();
    }
  }

  // Get conversations for a user
  async getConversations(userId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Conversation>> {
    const client = await this.pool.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT c.*, m.content as last_message_content, m.timestamp as last_message_timestamp,
               m.sender_id as last_message_sender_id, m.type as last_message_type
        FROM conversations c
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE c.participants::jsonb ? $1
        ORDER BY c.last_activity DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM conversations c
        WHERE c.participants::jsonb ? $1
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [userId, pagination.limit, offset]),
        client.query(countQuery, [userId])
      ]);

      const conversations = result.rows.map(row => {
        const conversation = this.mapRowToConversation(row);
        
        if (row.last_message_content) {
          conversation.lastMessage = {
            id: '', // We don't have the full message ID in this query
            senderId: row.last_message_sender_id,
            content: row.last_message_content,
            type: row.last_message_type,
            timestamp: row.last_message_timestamp,
            attachments: [],
            readBy: [],
            syncStatus: 'synced',
            isEdited: false
          } as EnhancedMessage;
        }
        
        return conversation;
      });

      const total = parseInt(countResult.rows[0].total);

      return {
        data: conversations,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    } finally {
      client.release();
    }
  }

  // Get messages in a conversation
  async getConversationMessages(
    conversationId: string, 
    userId: string, 
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<EnhancedMessage>> {
    const client = await this.pool.connect();
    
    try {
      // Verify user is part of conversation
      const convQuery = 'SELECT participants FROM conversations WHERE id = $1';
      const convResult = await client.query(convQuery, [conversationId]);
      
      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const participants: string[] = JSON.parse(convResult.rows[0].participants);
      if (!participants.includes(userId)) {
        throw new Error('User not authorized to view this conversation');
      }

      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT * FROM messages 
        WHERE conversation_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM messages 
        WHERE conversation_id = $1
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [conversationId, pagination.limit, offset]),
        client.query(countQuery, [conversationId])
      ]);

      const messages = result.rows.map(row => this.mapRowToEnhancedMessage(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: messages,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching conversation messages:', error);
      throw new Error('Failed to fetch conversation messages');
    } finally {
      client.release();
    }
  }

  // Search messages within conversations
  async searchMessages(
    userId: string, 
    conversationId: string, 
    filters: MessageSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<EnhancedMessage>> {
    const client = await this.pool.connect();
    
    try {
      // Verify user is part of conversation
      const convQuery = 'SELECT participants FROM conversations WHERE id = $1';
      const convResult = await client.query(convQuery, [conversationId]);
      
      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const participants: string[] = JSON.parse(convResult.rows[0].participants);
      if (!participants.includes(userId)) {
        throw new Error('User not authorized to search this conversation');
      }

      let whereClause = 'WHERE conversation_id = $1';
      const queryParams: any[] = [conversationId];
      let paramIndex = 2;

      if (filters.content) {
        whereClause += ` AND content ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.content}%`);
        paramIndex++;
      }

      if (filters.type) {
        whereClause += ` AND type = $${paramIndex}`;
        queryParams.push(filters.type);
        paramIndex++;
      }

      if (filters.senderId) {
        whereClause += ` AND sender_id = $${paramIndex}`;
        queryParams.push(filters.senderId);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereClause += ` AND timestamp >= $${paramIndex}`;
        queryParams.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        whereClause += ` AND timestamp <= $${paramIndex}`;
        queryParams.push(filters.dateTo);
        paramIndex++;
      }

      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT * FROM messages 
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM messages 
        ${whereClause}
      `;

      queryParams.push(pagination.limit, offset);

      const [result, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
      ]);

      const messages = result.rows.map(row => this.mapRowToEnhancedMessage(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: messages,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
    } finally {
      client.release();
    }
  }

  // Get unread message count for user
  async getUnreadMessageCount(userId: string): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT COALESCE(SUM((unread_count->>$1)::int), 0) as total_unread
        FROM conversations 
        WHERE participants::jsonb ? $1
      `;

      const result = await client.query(query, [userId]);
      return parseInt(result.rows[0].total_unread || '0');
    } catch (error) {
      logger.error('Error getting unread message count:', error);
      throw new Error('Failed to get unread message count');
    } finally {
      client.release();
    }
  }

  // Get replies to a specific message
  async getMessageReplies(messageId: string, pagination: PaginationOptions): Promise<PaginatedResponse<EnhancedMessage>> {
    const client = await this.pool.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT * FROM messages 
        WHERE reply_to_id = $1
        ORDER BY timestamp ASC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM messages 
        WHERE reply_to_id = $1
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [messageId, pagination.limit, offset]),
        client.query(countQuery, [messageId])
      ]);

      const replies = result.rows.map(row => this.mapRowToEnhancedMessage(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: replies,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching message replies:', error);
      throw new Error('Failed to fetch message replies');
    } finally {
      client.release();
    }
  }

  // Get message thread (original message + replies)
  async getMessageThread(messageId: string, pagination: PaginationOptions): Promise<{
    originalMessage: EnhancedMessage;
    replies: PaginatedResponse<EnhancedMessage>;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get the original message
      const originalMessage = await this.getMessageById(messageId);
      
      if (!originalMessage) {
        throw new Error('Original message not found');
      }

      // Get replies to the message
      const replies = await this.getMessageReplies(messageId, pagination);

      return {
        originalMessage,
        replies
      };
    } catch (error) {
      logger.error('Error fetching message thread:', error);
      throw new Error('Failed to fetch message thread');
    } finally {
      client.release();
    }
  }

  // Helper method to update conversation activity
  private async updateConversationActivity(client: any, conversationId: string, lastMessageId: string, senderId: string): Promise<void> {
    // Update last message and activity
    await client.query(
      'UPDATE conversations SET last_message_id = $1, last_activity = CURRENT_TIMESTAMP WHERE id = $2',
      [lastMessageId, conversationId]
    );

    // Update unread counts for all participants except sender
    const convQuery = 'SELECT participants, unread_count FROM conversations WHERE id = $1';
    const convResult = await client.query(convQuery, [conversationId]);
    
    if (convResult.rows.length > 0) {
      const participants: string[] = JSON.parse(convResult.rows[0].participants);
      const unreadCount: { [userId: string]: number } = JSON.parse(convResult.rows[0].unread_count);

      // Increment unread count for all participants except sender
      participants.forEach(userId => {
        if (userId !== senderId) {
          unreadCount[userId] = (unreadCount[userId] || 0) + 1;
        }
      });

      await client.query(
        'UPDATE conversations SET unread_count = $1 WHERE id = $2',
        [JSON.stringify(unreadCount), conversationId]
      );
    }
  }

  // Helper method to update conversation unread count
  private async updateConversationUnreadCount(client: any, conversationId: string, userId: string, count: number): Promise<void> {
    const query = `
      UPDATE conversations 
      SET unread_count = jsonb_set(unread_count, '{${userId}}', '${count}')
      WHERE id = $1
    `;
    await client.query(query, [conversationId]);
  }

  // Helper method to map database row to Conversation
  private mapRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      participants: JSON.parse(row.participants),
      type: row.type,
      lastActivity: row.last_activity,
      unreadCount: JSON.parse(row.unread_count || '{}')
    };
  }

  // Helper method to map database row to EnhancedMessage
  private mapRowToEnhancedMessage(row: any): EnhancedMessage {
    const readByJson = row.read_by_json || '[]';
    let readBy: MessageRead[] = [];
    
    try {
      const parsed = JSON.parse(readByJson);
      // Handle both old format (string array) and new format (MessageRead array)
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'string') {
          // Old format - convert to new format
          readBy = parsed.map(userId => ({
            userId,
            readAt: row.timestamp // Use message timestamp as fallback
          }));
        } else {
          // New format
          readBy = parsed;
        }
      }
    } catch (error) {
      logger.warn('Error parsing read_by_json:', error);
      readBy = [];
    }

    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      groupId: row.group_id,
      content: row.content,
      type: row.type,
      attachments: JSON.parse(row.attachments_json || '[]'),
      timestamp: row.timestamp,
      readBy,
      syncStatus: row.sync_status,
      isEdited: row.is_edited || false,
      editedAt: row.edited_at,
      replyToId: row.reply_to_id
    };
  }
}