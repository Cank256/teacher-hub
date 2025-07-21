import express from 'express';
import { MessageService } from '../messaging/messageService';
import { MessageQueue } from '../messaging/messageQueue';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const messageService = new MessageService();
const messageQueue = new MessageQueue();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get direct messages between two users
router.get('/direct/:userId', async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await messageService.getDirectMessages(currentUserId, otherUserId, limit, offset);
    
    res.json({
      messages,
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Error fetching direct messages:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MESSAGES_ERROR',
        message: 'Failed to fetch messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get group messages
router.get('/group/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // TODO: Add authorization check to ensure user is member of the group
    
    const messages = await messageService.getGroupMessages(groupId, limit, offset);
    
    res.json({
      messages,
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Error fetching group messages:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MESSAGES_ERROR',
        message: 'Failed to fetch messages',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Send direct message (REST endpoint as backup to WebSocket)
router.post('/direct', async (req, res) => {
  try {
    const { recipientId, content, type = 'text', attachments = [], replyToId } = req.body;
    const senderId = req.user.userId;

    if (!recipientId || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Recipient ID and content are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const message = await messageService.createDirectMessage({
      senderId,
      recipientId,
      content,
      type,
      attachments,
      replyToId
    });

    // Queue message for offline recipient
    await messageQueue.queueMessage(message);

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Error sending direct message:', error);
    res.status(500).json({
      error: {
        code: 'SEND_MESSAGE_ERROR',
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Send group message (REST endpoint as backup to WebSocket)
router.post('/group', async (req, res) => {
  try {
    const { groupId, content, type = 'text', attachments = [], replyToId } = req.body;
    const senderId = req.user.userId;

    if (!groupId || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Group ID and content are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // TODO: Add authorization check to ensure user is member of the group

    const message = await messageService.createGroupMessage({
      senderId,
      groupId,
      content,
      type,
      attachments,
      replyToId
    });

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Error sending group message:', error);
    res.status(500).json({
      error: {
        code: 'SEND_MESSAGE_ERROR',
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Mark message as read
router.put('/:messageId/read', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.userId;

    await messageService.markMessageAsRead(messageId, userId);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark message as read',
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

// Get user conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const conversations = await messageService.getUserConversations(userId);
    
    res.json({ conversations });
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

export default router;