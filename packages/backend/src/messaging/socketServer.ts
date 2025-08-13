import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { EnhancedMessageService } from './messageService';
import { MessageQueue } from './messageQueue';
import { SendMessageRequest } from '../types';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userProfile: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class EnhancedSocketServer {
  private io: SocketIOServer;
  private messageService: EnhancedMessageService;
  private messageQueue: MessageQueue;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userPresence: Map<string, { status: string; lastSeen: Date }> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // conversationId -> Set of userIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.messageService = new EnhancedMessageService();
    this.messageQueue = new MessageQueue();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next: any) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // In a real implementation, you'd fetch user details from database
        socket.userId = decoded.userId;
        socket.userProfile = {
          id: decoded.userId,
          fullName: decoded.fullName,
          email: decoded.email
        };

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: any) => {
      logger.info(`User ${socket.userProfile.fullName} connected with socket ${socket.id}`);
      
      // Track connected user and presence
      this.connectedUsers.set(socket.userId, socket.id);
      this.userPresence.set(socket.userId, { status: 'online', lastSeen: new Date() });

      // Join user to their personal room for direct messages
      socket.join(`user:${socket.userId}`);

      // Broadcast user online status
      socket.broadcast.emit('user_presence_updated', {
        userId: socket.userId,
        status: 'online',
        lastSeen: new Date()
      });

      // Handle joining conversation rooms
      socket.on('join_conversation', async (conversationId: string) => {
        try {
          // TODO: Verify user is participant in the conversation
          socket.join(`conversation:${conversationId}`);
          logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
          
          // Notify other participants
          socket.to(`conversation:${conversationId}`).emit('user_joined_conversation', {
            userId: socket.userId,
            userName: socket.userProfile.fullName,
            conversationId,
            timestamp: new Date()
          });
        } catch (error) {
          logger.error('Error joining conversation:', error);
          socket.emit('conversation_error', { error: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        logger.info(`User ${socket.userId} left conversation ${conversationId}`);
        
        // Stop typing if user was typing
        this.handleTypingStop(conversationId, socket.userId);
        
        // Notify other participants
        socket.to(`conversation:${conversationId}`).emit('user_left_conversation', {
          userId: socket.userId,
          userName: socket.userProfile.fullName,
          conversationId,
          timestamp: new Date()
        });
      });

      // Handle sending messages (unified for direct and group)
      socket.on('send_message', async (data: SendMessageRequest & { conversationId?: string }) => {
        try {
          const message = await this.messageService.sendMessage(socket.userId, data);

          // Determine the room to broadcast to
          let room: string;
          if (data.conversationId) {
            room = `conversation:${data.conversationId}`;
          } else if (data.recipientId) {
            room = `user:${data.recipientId}`;
          } else if (data.groupId) {
            room = `group:${data.groupId}`;
          } else {
            throw new Error('Invalid message target');
          }

          // Broadcast to conversation participants
          this.io.to(room).emit('new_message', message);
          
          // Send confirmation to sender
          socket.emit('message_sent', { 
            messageId: message.id, 
            status: 'delivered',
            timestamp: message.timestamp
          });

          // Send delivery receipts to sender
          this.sendDeliveryReceipt(message, socket.userId);

          // Queue message for offline users if direct message
          if (data.recipientId && !this.connectedUsers.has(data.recipientId)) {
            await this.messageQueue.queueMessage(message);
          }

          logger.info(`Message sent by ${socket.userId} in ${room}`);
        } catch (error) {
          logger.error('Error sending message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle message replies
      socket.on('reply_to_message', async (data: {
        originalMessageId: string;
        content: string;
        attachments?: any[];
      }) => {
        try {
          const message = await this.messageService.replyToMessage(
            socket.userId, 
            data.originalMessageId, 
            data.content, 
            data.attachments || []
          );

          // Broadcast reply to conversation
          const room = message.recipientId ? `user:${message.recipientId}` : `group:${message.groupId}`;
          this.io.to(room).emit('new_message', message);
          
          socket.emit('message_sent', { 
            messageId: message.id, 
            status: 'delivered',
            isReply: true
          });

          logger.info(`Reply sent by ${socket.userId}`);
        } catch (error) {
          logger.error('Error sending reply:', error);
          socket.emit('message_error', { error: 'Failed to send reply' });
        }
      });

      // Handle message read receipts (enhanced)
      socket.on('mark_messages_read', async (data: { 
        conversationId: string; 
        messageIds: string[] 
      }) => {
        try {
          await this.messageService.markMessagesAsRead(
            data.conversationId, 
            socket.userId, 
            data.messageIds
          );
          
          // Notify conversation participants about read receipts
          socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
            conversationId: data.conversationId,
            messageIds: data.messageIds,
            readBy: socket.userId,
            readAt: new Date()
          });

          socket.emit('messages_marked_read', {
            conversationId: data.conversationId,
            count: data.messageIds.length
          });
        } catch (error) {
          logger.error('Error marking messages as read:', error);
          socket.emit('read_receipt_error', { error: 'Failed to mark messages as read' });
        }
      });

      // Handle typing indicators (enhanced)
      socket.on('typing_start', (data: { conversationId: string }) => {
        this.handleTypingStart(data.conversationId, socket.userId, socket.userProfile.fullName);
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        this.handleTypingStop(data.conversationId, socket.userId);
      });

      // Handle presence status updates
      socket.on('update_presence', (data: { status: 'online' | 'away' | 'busy' | 'invisible' }) => {
        this.userPresence.set(socket.userId, { 
          status: data.status, 
          lastSeen: new Date() 
        });
        
        socket.broadcast.emit('user_presence_updated', {
          userId: socket.userId,
          status: data.status,
          lastSeen: new Date()
        });
      });

      // Handle presence queries
      socket.on('get_user_presence', (data: { userIds: string[] }) => {
        const presenceData = data.userIds.map(userId => ({
          userId,
          ...this.getUserPresence(userId)
        }));
        
        socket.emit('user_presence_data', presenceData);
      });

      // Handle message editing
      socket.on('edit_message', async (data: { messageId: string; newContent: string }) => {
        try {
          const updatedMessage = await this.messageService.editMessage(data.messageId, socket.userId, data.newContent);
          
          // Broadcast updated message to relevant room
          const room = updatedMessage.recipientId ? `user:${updatedMessage.recipientId}` : `group:${updatedMessage.groupId}`;
          this.io.to(room).emit('message_updated', updatedMessage);
          
          socket.emit('message_edited', { messageId: data.messageId, status: 'success' });
        } catch (error) {
          logger.error('Error editing message:', error);
          socket.emit('message_error', { error: 'Failed to edit message' });
        }
      });

      // Handle message deletion
      socket.on('delete_message', async (data: { messageId: string }) => {
        try {
          await this.messageService.deleteMessage(data.messageId, socket.userId);
          
          // Broadcast deletion to relevant room - we need to get the message first
          // Since we can't get it after deletion, we'll broadcast to user's conversations
          socket.broadcast.emit('message_deleted', { 
            messageId: data.messageId,
            deletedBy: socket.userId,
            timestamp: new Date()
          });
          
          socket.emit('message_deleted_confirm', { messageId: data.messageId, status: 'success' });
        } catch (error) {
          logger.error('Error deleting message:', error);
          socket.emit('message_error', { error: 'Failed to delete message' });
        }
      });

      // Handle notification acknowledgments
      socket.on('notification_read', (data: { notificationId: string }) => {
        // Mark notification as read
        socket.emit('notification_acknowledged', { 
          notificationId: data.notificationId,
          timestamp: new Date()
        });
      });

      // Handle connection quality reporting
      socket.on('connection_quality', (data: { quality: 'good' | 'poor' | 'disconnected' }) => {
        logger.info(`Connection quality for user ${socket.userId}: ${data.quality}`);
        
        // Could be used for adaptive features or monitoring
        socket.emit('quality_acknowledged', { 
          quality: data.quality,
          timestamp: new Date()
        });
      });



      // Handle disconnection
      socket.on('disconnect', (reason: any) => {
        logger.info(`User ${socket.userProfile.fullName} disconnected: ${reason}`);
        
        // Clean up user data
        this.connectedUsers.delete(socket.userId);
        this.userPresence.set(socket.userId, { 
          status: 'offline', 
          lastSeen: new Date() 
        });
        
        // Stop typing in all conversations
        this.typingUsers.forEach((typingSet, conversationId) => {
          if (typingSet.has(socket.userId)) {
            this.handleTypingStop(conversationId, socket.userId);
          }
        });
        
        // Broadcast user offline status
        socket.broadcast.emit('user_presence_updated', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date()
        });
      });

      // Send queued messages when user comes online
      this.sendQueuedMessages(socket.userId);
    });
  }

  private async sendQueuedMessages(userId: string) {
    try {
      const queuedMessages = await this.messageQueue.getQueuedMessages(userId);
      
      if (queuedMessages.length > 0) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
          this.io.to(socketId).emit('queued_messages', queuedMessages);
          await this.messageQueue.clearQueuedMessages(userId);
        }
      }
    } catch (error) {
      logger.error('Error sending queued messages:', error);
    }
  }

  // Helper method to handle typing start
  private handleTypingStart(conversationId: string, userId: string, userName: string) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    
    const typingSet = this.typingUsers.get(conversationId)!;
    typingSet.add(userId);
    
    // Broadcast typing indicator to conversation participants
    this.io.to(`conversation:${conversationId}`).emit('user_typing', {
      conversationId,
      userId,
      userName,
      isTyping: true,
      timestamp: new Date()
    });
    
    // Auto-stop typing after 10 seconds
    setTimeout(() => {
      if (typingSet.has(userId)) {
        this.handleTypingStop(conversationId, userId);
      }
    }, 10000);
  }

  // Helper method to handle typing stop
  private handleTypingStop(conversationId: string, userId: string) {
    const typingSet = this.typingUsers.get(conversationId);
    if (typingSet && typingSet.has(userId)) {
      typingSet.delete(userId);
      
      // Broadcast typing stop to conversation participants
      this.io.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping: false,
        timestamp: new Date()
      });
      
      // Clean up empty typing sets
      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  // Helper method to send delivery receipts
  private sendDeliveryReceipt(message: any, senderId: string) {
    // Send delivery receipt to sender
    const senderSocketId = this.connectedUsers.get(senderId);
    if (senderSocketId) {
      this.io.to(senderSocketId).emit('message_delivered', {
        messageId: message.id,
        deliveredAt: new Date(),
        status: 'delivered'
      });
    }
  }

  // Helper method to get user presence
  private getUserPresence(userId: string): { status: string; lastSeen: Date; isOnline: boolean } {
    const presence = this.userPresence.get(userId);
    const isOnline = this.connectedUsers.has(userId);
    
    return {
      status: isOnline ? (presence?.status || 'online') : 'offline',
      lastSeen: presence?.lastSeen || new Date(),
      isOnline
    };
  }

  // Public methods
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getUserPresenceStatus(userId: string) {
    return this.getUserPresence(userId);
  }

  public getTypingUsers(conversationId: string): string[] {
    const typingSet = this.typingUsers.get(conversationId);
    return typingSet ? Array.from(typingSet) : [];
  }

  public sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  public broadcastToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public sendMessageNotification(userId: string, message: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_message_notification', {
        messageId: message.id,
        senderId: message.senderId,
        content: message.content.substring(0, 100), // Preview
        timestamp: message.timestamp,
        conversationId: message.conversationId
      });
    }
  }
}