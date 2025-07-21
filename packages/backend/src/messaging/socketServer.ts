import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { MessageService } from './messageService';
import { MessageQueue } from './messageQueue';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userProfile: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class SocketServer {
  private io: SocketIOServer;
  private messageService: MessageService;
  private messageQueue: MessageQueue;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.messageService = new MessageService();
    this.messageQueue = new MessageQueue();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
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
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User ${socket.userProfile.fullName} connected with socket ${socket.id}`);
      
      // Track connected user
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user to their personal room for direct messages
      socket.join(`user:${socket.userId}`);

      // Handle joining group rooms
      socket.on('join_group', async (groupId: string) => {
        try {
          // TODO: Verify user is member of the group before allowing join
          socket.join(`group:${groupId}`);
          logger.info(`User ${socket.userId} joined group ${groupId}`);
          
          // Notify other group members
          socket.to(`group:${groupId}`).emit('user_joined_group', {
            userId: socket.userId,
            userName: socket.userProfile.fullName,
            groupId,
            timestamp: new Date()
          });
        } catch (error) {
          logger.error('Error joining group:', error);
          socket.emit('group_error', { error: 'Failed to join group' });
        }
      });

      // Handle leaving group rooms
      socket.on('leave_group', (groupId: string) => {
        socket.leave(`group:${groupId}`);
        logger.info(`User ${socket.userId} left group ${groupId}`);
        
        // Notify other group members
        socket.to(`group:${groupId}`).emit('user_left_group', {
          userId: socket.userId,
          userName: socket.userProfile.fullName,
          groupId,
          timestamp: new Date()
        });
      });

      // Handle direct messages
      socket.on('send_direct_message', async (data: {
        recipientId: string;
        content: string;
        type: 'text' | 'file' | 'image';
        attachments?: any[];
        replyToId?: string;
      }) => {
        try {
          const message = await this.messageService.createDirectMessage({
            senderId: socket.userId,
            recipientId: data.recipientId,
            content: data.content,
            type: data.type,
            attachments: data.attachments || [],
            replyToId: data.replyToId
          });

          // Send to recipient if online
          this.io.to(`user:${data.recipientId}`).emit('new_message', message);
          
          // Send confirmation to sender
          socket.emit('message_sent', { messageId: message.id, status: 'delivered' });

          // Queue message for offline users
          if (!this.connectedUsers.has(data.recipientId)) {
            await this.messageQueue.queueMessage(message);
          }

          logger.info(`Direct message sent from ${socket.userId} to ${data.recipientId}`);
        } catch (error) {
          logger.error('Error sending direct message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle group messages
      socket.on('send_group_message', async (data: {
        groupId: string;
        content: string;
        type: 'text' | 'file' | 'image';
        attachments?: any[];
        replyToId?: string;
      }) => {
        try {
          const message = await this.messageService.createGroupMessage({
            senderId: socket.userId,
            groupId: data.groupId,
            content: data.content,
            type: data.type,
            attachments: data.attachments || [],
            replyToId: data.replyToId
          });

          // Send to all group members
          this.io.to(`group:${data.groupId}`).emit('new_message', message);
          
          // Send confirmation to sender
          socket.emit('message_sent', { messageId: message.id, status: 'delivered' });

          logger.info(`Group message sent by ${socket.userId} to group ${data.groupId}`);
        } catch (error) {
          logger.error('Error sending group message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle message read receipts
      socket.on('mark_message_read', async (data: { messageId: string }) => {
        try {
          await this.messageService.markMessageAsRead(data.messageId, socket.userId);
          
          // Notify sender about read receipt
          const message = await this.messageService.getMessageById(data.messageId);
          if (message) {
            this.io.to(`user:${message.senderId}`).emit('message_read', {
              messageId: data.messageId,
              readBy: socket.userId,
              timestamp: new Date()
            });
          }
        } catch (error) {
          logger.error('Error marking message as read:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { recipientId?: string; groupId?: string }) => {
        const room = data.recipientId ? `user:${data.recipientId}` : `group:${data.groupId}`;
        socket.to(room).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userProfile.fullName,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { recipientId?: string; groupId?: string }) => {
        const room = data.recipientId ? `user:${data.recipientId}` : `group:${data.groupId}`;
        socket.to(room).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userProfile.fullName,
          isTyping: false
        });
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
          const message = await this.messageService.deleteMessage(data.messageId, socket.userId);
          
          // Broadcast deletion to relevant room
          const room = message.recipientId ? `user:${message.recipientId}` : `group:${message.groupId}`;
          this.io.to(room).emit('message_deleted', { messageId: data.messageId });
          
          socket.emit('message_deleted_confirm', { messageId: data.messageId, status: 'success' });
        } catch (error) {
          logger.error('Error deleting message:', error);
          socket.emit('message_error', { error: 'Failed to delete message' });
        }
      });

      // Handle group moderation actions
      socket.on('moderate_group_message', async (data: {
        messageId: string;
        groupId: string;
        action: 'delete' | 'flag' | 'warn';
        reason?: string;
      }) => {
        try {
          // TODO: Verify user is moderator/admin of the group
          const message = await this.messageService.getMessageById(data.messageId);
          
          if (!message || message.groupId !== data.groupId) {
            socket.emit('moderation_error', { error: 'Message not found or not in specified group' });
            return;
          }

          if (data.action === 'delete') {
            await this.messageService.deleteMessage(data.messageId, socket.userId);
            
            // Notify group about message deletion
            this.io.to(`group:${data.groupId}`).emit('message_moderated', {
              messageId: data.messageId,
              action: 'deleted',
              moderatorId: socket.userId,
              reason: data.reason,
              timestamp: new Date()
            });
          }

          socket.emit('moderation_success', { 
            messageId: data.messageId, 
            action: data.action 
          });

          logger.info(`Message ${data.messageId} ${data.action}ed by moderator ${socket.userId} in group ${data.groupId}`);
        } catch (error) {
          logger.error('Error moderating message:', error);
          socket.emit('moderation_error', { error: 'Failed to moderate message' });
        }
      });

      // Handle group member management
      socket.on('manage_group_member', async (data: {
        groupId: string;
        targetUserId: string;
        action: 'kick' | 'ban' | 'mute' | 'unmute';
        duration?: number; // in minutes for temporary actions
        reason?: string;
      }) => {
        try {
          // TODO: Verify user is moderator/admin of the group
          // TODO: Implement member management logic
          
          // Notify the target user
          this.io.to(`user:${data.targetUserId}`).emit('group_member_action', {
            groupId: data.groupId,
            action: data.action,
            moderatorId: socket.userId,
            reason: data.reason,
            duration: data.duration,
            timestamp: new Date()
          });

          // Notify group members about the action
          this.io.to(`group:${data.groupId}`).emit('group_moderation_action', {
            targetUserId: data.targetUserId,
            action: data.action,
            moderatorId: socket.userId,
            reason: data.reason,
            timestamp: new Date()
          });

          socket.emit('member_management_success', {
            targetUserId: data.targetUserId,
            action: data.action
          });

          logger.info(`User ${data.targetUserId} ${data.action}ed by moderator ${socket.userId} in group ${data.groupId}`);
        } catch (error) {
          logger.error('Error managing group member:', error);
          socket.emit('member_management_error', { error: 'Failed to manage group member' });
        }
      });

      // Handle group announcements (admin/moderator only)
      socket.on('send_group_announcement', async (data: {
        groupId: string;
        content: string;
        priority: 'low' | 'medium' | 'high';
      }) => {
        try {
          // TODO: Verify user is moderator/admin of the group
          
          const announcement = await this.messageService.createGroupMessage({
            senderId: socket.userId,
            groupId: data.groupId,
            content: data.content,
            type: 'text',
            attachments: []
          });

          // Send announcement to all group members with special formatting
          this.io.to(`group:${data.groupId}`).emit('group_announcement', {
            ...announcement,
            isAnnouncement: true,
            priority: data.priority,
            announcerName: socket.userProfile.fullName
          });

          socket.emit('announcement_sent', { 
            messageId: announcement.id, 
            status: 'delivered' 
          });

          logger.info(`Announcement sent by ${socket.userId} to group ${data.groupId}`);
        } catch (error) {
          logger.error('Error sending announcement:', error);
          socket.emit('announcement_error', { error: 'Failed to send announcement' });
        }
      });

      // Handle user presence
      socket.on('update_presence', (status: 'online' | 'away' | 'busy') => {
        socket.broadcast.emit('user_presence_updated', {
          userId: socket.userId,
          status,
          lastSeen: new Date()
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`User ${socket.userProfile.fullName} disconnected: ${reason}`);
        this.connectedUsers.delete(socket.userId);
        
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

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }
}