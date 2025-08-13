import express from 'express';
import { EnhancedMessageService } from '../messaging/messageService';
import { UserSearchService } from '../services/userSearchService';
import { MessageQueue } from '../messaging/messageQueue';
import { authMiddleware } from '../middleware/auth';
import { 
  SendMessageRequest, 
  PaginationOptions, 
  UserSearchFilters,
  MessageSearchFilters 
} from '../types';
import logger from '../utils/logger';

const router = express.Router();
const messageService = new EnhancedMessageService();
const userSearchService = new UserSearchService();
const messageQueue = new MessageQueue();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ===== CONVERSATION MANAGEMENT =====

// Get user conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const pagination: PaginationOptions = { page, limit };
    const result = await messageService.getConversations(userId, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_CONVERSATIONS_ERROR',
        message: 'Failed to fetch conversations',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Create a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { participantIds, type = 'direct' } = req.body;
    const initiatorId = req.user.userId;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Participant IDs are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const conversation = await messageService.createConversation({
      initiatorId,
      participantIds,
      type
    });

    res.status(201).json({ conversation });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_CONVERSATION_ERROR',
        message: 'Failed to create conversation',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const pagination: PaginationOptions = { page, limit };
    const result = await messageService.getConversationMessages(conversationId, userId, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MESSAGES_ERROR',
        message: 'Failed to fetch messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== MESSAGE MANAGEMENT =====

// Send message (REST endpoint as backup to WebSocket)
router.post('/send', async (req, res) => {
  try {
    const senderId = req.user.userId;
    const messageData: SendMessageRequest = req.body;

    if (!messageData.content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!messageData.recipientId && !messageData.groupId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either recipientId or groupId is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const message = await messageService.sendMessage(senderId, messageData);

    // Queue message for offline recipients
    await messageQueue.queueMessage(message);

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      error: {
        code: 'SEND_MESSAGE_ERROR',
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Reply to a message
router.post('/:messageId/reply', async (req, res) => {
  try {
    const originalMessageId = req.params.messageId;
    const senderId = req.user.userId;
    const { content, attachments = [] } = req.body;

    if (!content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const message = await messageService.replyToMessage(originalMessageId, senderId, content, attachments);

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Error replying to message:', error);
    res.status(500).json({
      error: {
        code: 'REPLY_MESSAGE_ERROR',
        message: 'Failed to reply to message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Mark messages as read in a conversation
router.put('/conversations/:conversationId/read', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message IDs array is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    await messageService.markMessagesAsRead(conversationId, userId, messageIds);
    
    res.json({ success: true, markedCount: messageIds.length });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark messages as read',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Edit message
router.put('/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.userId;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updatedMessage = await messageService.editMessage(messageId, userId, content);
    
    res.json({ message: updatedMessage });
  } catch (error) {
    logger.error('Error editing message:', error);
    res.status(500).json({
      error: {
        code: 'EDIT_MESSAGE_ERROR',
        message: 'Failed to edit message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.userId;

    await messageService.deleteMessage(messageId, userId);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_MESSAGE_ERROR',
        message: 'Failed to delete message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get message by ID
router.get('/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    const message = await messageService.getMessageById(messageId);
    
    if (!message) {
      return res.status(404).json({
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({ message });
  } catch (error) {
    logger.error('Error fetching message:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MESSAGE_ERROR',
        message: 'Failed to fetch message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Search messages within a conversation
router.get('/conversations/:conversationId/search', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const filters: MessageSearchFilters = {
      content: req.query.content as string,
      type: req.query.type as 'text' | 'file' | 'image',
      senderId: req.query.senderId as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    const pagination: PaginationOptions = { page, limit };
    const result = await messageService.searchMessages(userId, conversationId, filters, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_MESSAGES_ERROR',
        message: 'Failed to search messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== USER SEARCH AND DISCOVERY =====

// Search for users
router.get('/users/search', async (req, res) => {
  try {
    const searcherId = req.user.userId;
    const query = req.query.q as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const filters: UserSearchFilters = {
      subjects: req.query.subjects ? (req.query.subjects as string).split(',') : undefined,
      gradeLevels: req.query.gradeLevels ? (req.query.gradeLevels as string).split(',') : undefined,
      regions: req.query.regions ? (req.query.regions as string).split(',') : undefined,
      verificationStatus: req.query.verificationStatus as 'pending' | 'verified' | 'rejected'
    };

    const pagination: PaginationOptions = { page, limit };
    const result = await userSearchService.searchUsers(query, searcherId, filters, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_USERS_ERROR',
        message: 'Failed to search users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user suggestions
router.get('/users/suggestions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const pagination: PaginationOptions = { page, limit };
    const result = await userSearchService.getUserSuggestions(userId, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching user suggestions:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_SUGGESTIONS_ERROR',
        message: 'Failed to fetch user suggestions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get recently active users
router.get('/users/recent', async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const pagination: PaginationOptions = { page, limit };
    const result = await userSearchService.getRecentlyActiveUsers(userId, pagination);
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching recently active users:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_RECENT_USERS_ERROR',
        message: 'Failed to fetch recently active users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user by ID for messaging
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const searcherId = req.user.userId;
    
    const user = await userSearchService.getUserById(userId, searcherId);
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or not accessible',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_USER_ERROR',
        message: 'Failed to fetch user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== MESSAGE STATUS AND NOTIFICATIONS =====

// Get unread message count
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const count = await messageService.getUnreadMessageCount(userId);
    
    res.json({ count });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_UNREAD_COUNT_ERROR',
        message: 'Failed to fetch unread count',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get queued messages (for offline sync)
router.get('/queued', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const queuedMessages = await messageQueue.getQueuedMessages(userId);
    
    res.json({ messages: queuedMessages });
  } catch (error) {
    logger.error('Error fetching queued messages:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_QUEUED_MESSAGES_ERROR',
        message: 'Failed to fetch queued messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Clear queued messages
router.delete('/queued', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await messageQueue.clearQueuedMessages(userId);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error clearing queued messages:', error);
    res.status(500).json({
      error: {
        code: 'CLEAR_QUEUED_MESSAGES_ERROR',
        message: 'Failed to clear queued messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== MESSAGE THREADING AND REPLIES =====

// Get message thread (message and its replies)
router.get('/:messageId/thread', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const pagination: PaginationOptions = { page, limit };
    const thread = await messageService.getMessageThread(messageId, pagination);
    
    res.json(thread);
  } catch (error) {
    logger.error('Error fetching message thread:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_THREAD_ERROR',
        message: 'Failed to fetch message thread',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get replies to a specific message
router.get('/:messageId/replies', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const pagination: PaginationOptions = { page, limit };
    const replies = await messageService.getMessageReplies(messageId, pagination);
    
    res.json(replies);
  } catch (error) {
    logger.error('Error fetching message replies:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_REPLIES_ERROR',
        message: 'Failed to fetch message replies',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== CONVERSATION MANAGEMENT EXTENSIONS =====

// Update conversation settings (for group conversations)
router.put('/conversations/:conversationId/settings', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const { name, description } = req.body;

    // TODO: Implement conversation settings update
    // This would require additional database schema for conversation metadata
    
    res.json({ 
      success: true,
      message: 'Conversation settings update not yet implemented'
    });
  } catch (error) {
    logger.error('Error updating conversation settings:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_CONVERSATION_ERROR',
        message: 'Failed to update conversation settings',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Add participant to group conversation
router.post('/conversations/:conversationId/participants', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const { participantIds } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Participant IDs array is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // TODO: Implement adding participants to group conversation
    // This would require checking permissions and updating the conversation
    
    res.json({ 
      success: true,
      message: 'Add participants functionality not yet implemented'
    });
  } catch (error) {
    logger.error('Error adding participants:', error);
    res.status(500).json({
      error: {
        code: 'ADD_PARTICIPANTS_ERROR',
        message: 'Failed to add participants',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Remove participant from group conversation
router.delete('/conversations/:conversationId/participants/:participantId', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const participantId = req.params.participantId;
    const userId = req.user.userId;

    // TODO: Implement removing participants from group conversation
    // This would require checking permissions and updating the conversation
    
    res.json({ 
      success: true,
      message: 'Remove participant functionality not yet implemented'
    });
  } catch (error) {
    logger.error('Error removing participant:', error);
    res.status(500).json({
      error: {
        code: 'REMOVE_PARTICIPANT_ERROR',
        message: 'Failed to remove participant',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Leave conversation
router.post('/conversations/:conversationId/leave', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;

    // TODO: Implement leaving conversation
    // This would require updating the conversation participants list
    
    res.json({ 
      success: true,
      message: 'Leave conversation functionality not yet implemented'
    });
  } catch (error) {
    logger.error('Error leaving conversation:', error);
    res.status(500).json({
      error: {
        code: 'LEAVE_CONVERSATION_ERROR',
        message: 'Failed to leave conversation',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== MESSAGE STATUS EXTENSIONS =====

// Get message delivery status
router.get('/:messageId/status', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    const message = await messageService.getMessageById(messageId);
    
    if (!message) {
      return res.status(404).json({
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      messageId: message.id,
      syncStatus: message.syncStatus,
      readBy: message.readBy,
      isEdited: message.isEdited,
      editedAt: message.editedAt
    });
  } catch (error) {
    logger.error('Error fetching message status:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MESSAGE_STATUS_ERROR',
        message: 'Failed to fetch message status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Update message sync status (for offline sync)
router.put('/:messageId/sync-status', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const { syncStatus } = req.body;

    if (!['synced', 'pending', 'failed'].includes(syncStatus)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sync status',
          timestamp: new Date().toISOString()
        }
      });
    }

    // TODO: Implement sync status update
    // This would require updating the message sync status in the database
    
    res.json({ 
      success: true,
      message: 'Sync status update not yet implemented'
    });
  } catch (error) {
    logger.error('Error updating sync status:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_SYNC_STATUS_ERROR',
        message: 'Failed to update sync status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== NOTIFICATION ENDPOINTS =====

// Get message notifications for user
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // TODO: Implement message notifications
    // This would require a notifications table or service
    
    res.json({
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      },
      message: 'Message notifications not yet implemented'
    });
  } catch (error) {
    logger.error('Error fetching message notifications:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_NOTIFICATIONS_ERROR',
        message: 'Failed to fetch message notifications',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.userId;

    // TODO: Implement marking notification as read
    
    res.json({ 
      success: true,
      message: 'Mark notification as read not yet implemented'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      error: {
        code: 'MARK_NOTIFICATION_READ_ERROR',
        message: 'Failed to mark notification as read',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ===== HEALTH CHECK =====

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'enhanced-messaging-api'
  });
});

export default router;