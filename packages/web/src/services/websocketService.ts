import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../utils/tokenStorage';

interface WebSocketMessage {
  type: 'message' | 'typing' | 'presence' | 'read_receipt' | 'notification';
  data: any;
  timestamp: Date;
}

interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
}

interface MessageDelivery {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
}

type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isConnecting = false;
  private currentUserId: string | null = null;

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Initialize event handler maps
    this.eventHandlers.set('message', []);
    this.eventHandlers.set('typing', []);
    this.eventHandlers.set('presence', []);
    this.eventHandlers.set('read_receipt', []);
    this.eventHandlers.set('notification', []);
    this.eventHandlers.set('connect', []);
    this.eventHandlers.set('disconnect', []);
    this.eventHandlers.set('error', []);
  }

  connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      // Validate token before attempting connection
      if (!token || token.trim() === '') {
        reject(new Error('Invalid or missing authentication token'));
        return;
      }

      this.isConnecting = true;
      this.currentUserId = userId;

      try {
        // Get backend URL from environment or default to localhost
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
        
        console.log('Attempting Socket.IO connection to:', backendUrl);
        console.log('User ID:', userId);
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 20) + '...');
        
        this.socket = io(backendUrl, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          autoConnect: false
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connect', { userId });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
          this.isConnecting = false;
          this.emit('disconnect', { reason });
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        });

        // Set up Socket.IO event listeners
        this.setupSocketEventListeners();

        // Connect the socket
        this.socket.connect();

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
  }

  private setupSocketEventListeners() {
    if (!this.socket) return;

    // Message events
    this.socket.on('new_message', (data) => {
      this.emit('message', data);
    });

    this.socket.on('message_sent', (data) => {
      this.emit('message_sent', data);
    });

    this.socket.on('message_delivered', (data) => {
      this.emit('message_delivered', data);
    });

    this.socket.on('messages_read', (data) => {
      this.emit('messages_read', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('typing', data);
    });

    // Presence updates
    this.socket.on('user_presence_updated', (data) => {
      this.emit('presence', data);
    });

    this.socket.on('user_presence_data', (data) => {
      this.emit('presence_data', data);
    });

    // Conversation events
    this.socket.on('user_joined_conversation', (data) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left_conversation', (data) => {
      this.emit('user_left', data);
    });

    // Notifications
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('new_message_notification', (data) => {
      this.emit('message_notification', data);
    });

    // Message updates
    this.socket.on('message_updated', (data) => {
      this.emit('message_updated', data);
    });

    this.socket.on('message_deleted', (data) => {
      this.emit('message_deleted', data);
    });

    // Error handling
    this.socket.on('conversation_error', (data) => {
      this.emit('error', data);
    });

    this.socket.on('message_error', (data) => {
      this.emit('error', data);
    });

    // Queued messages for when user comes online
    this.socket.on('queued_messages', (data) => {
      this.emit('queued_messages', data);
    });
  }

  // Public methods for sending different types of messages
  sendMessage(data: {
    conversationId?: string;
    recipientId?: string;
    groupId?: string;
    content: string;
    attachments?: any[];
    replyToId?: string;
  }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', data);
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  replyToMessage(originalMessageId: string, content: string, attachments?: any[]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reply_to_message', {
        originalMessageId,
        content,
        attachments
      });
    } else {
      console.warn('Socket not connected, cannot send reply');
    }
  }

  editMessage(messageId: string, newContent: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('edit_message', {
        messageId,
        newContent
      });
    } else {
      console.warn('Socket not connected, cannot edit message');
    }
  }

  deleteMessage(messageId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('delete_message', { messageId });
    } else {
      console.warn('Socket not connected, cannot delete message');
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_conversation', conversationId);
    } else {
      console.warn('Socket not connected, cannot join conversation');
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_conversation', conversationId);
    } else {
      console.warn('Socket not connected, cannot leave conversation');
    }
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      if (isTyping) {
        this.socket.emit('typing_start', { conversationId });
      } else {
        this.socket.emit('typing_stop', { conversationId });
      }
    } else {
      console.warn('Socket not connected, cannot send typing indicator');
    }
  }

  updatePresence(status: 'online' | 'away' | 'busy' | 'invisible') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_presence', { status });
    } else {
      console.warn('Socket not connected, cannot update presence');
    }
  }

  getUserPresence(userIds: string[]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_user_presence', { userIds });
    } else {
      console.warn('Socket not connected, cannot get user presence');
    }
  }

  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_messages_read', {
        conversationId,
        messageIds
      });
    } else {
      console.warn('Socket not connected, cannot mark messages as read');
    }
  }

  acknowledgeNotification(notificationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('notification_read', { notificationId });
    } else {
      console.warn('Socket not connected, cannot acknowledge notification');
    }
  }

  // Event handling methods
  on(event: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    
    if (this.socket.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

// Export types for use in components
export type {
  WebSocketMessage,
  TypingIndicator,
  PresenceUpdate,
  ReadReceipt,
  MessageDelivery,
  WebSocketEventHandler
};