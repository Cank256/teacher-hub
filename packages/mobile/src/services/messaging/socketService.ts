import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { 
  SocketEvents, 
  Message, 
  TypingIndicator, 
  Conversation 
} from '@/types/messaging';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private currentUserId: string | null = null;
  private activeConversations: Set<string> = new Set();

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isConnected && this.currentUserId) {
        this.connect(this.currentUserId);
      } else if (!state.isConnected && this.isConnected) {
        this.disconnect();
      }
    });
  }

  async connect(userId: string, token: string): Promise<void> {
    if (this.isConnected && this.currentUserId === userId) {
      return;
    }

    this.currentUserId = userId;
    
    try {
      const baseURL = __DEV__ 
        ? Platform.OS === 'ios' 
          ? 'http://localhost:3001' 
          : 'http://10.0.2.2:3001'
        : 'https://api.teacherhub.ug';

      this.socket = io(baseURL, {
        auth: {
          token,
          userId,
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupSocketListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Socket connected successfully');
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('Socket connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to connect socket:', error);
      throw error;
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Socket connected');
      
      // Rejoin active conversations
      this.activeConversations.forEach(conversationId => {
        this.joinConversation(conversationId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error('Socket reconnection error:', error);
    });

    // Message events
    this.socket.on('message:new', (message: Message) => {
      this.emit('message:new', message);
    });

    this.socket.on('message:read', (data: { messageId: string; userId: string }) => {
      this.emit('message:read', data);
    });

    // Typing events
    this.socket.on('typing:start', (data: TypingIndicator) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data: TypingIndicator) => {
      this.emit('typing:stop', data);
    });

    // Conversation events
    this.socket.on('conversation:updated', (conversation: Conversation) => {
      this.emit('conversation:updated', conversation);
    });

    // User presence events
    this.socket.on('user:online', (data: { userId: string; isOnline: boolean }) => {
      this.emit('user:online', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentUserId = null;
    this.activeConversations.clear();
  }

  // Event subscription methods
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          (callback as any)(...args);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Conversation management
  joinConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join:conversation', conversationId);
      this.activeConversations.add(conversationId);
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave:conversation', conversationId);
      this.activeConversations.delete(conversationId);
    }
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing:start', conversationId);
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing:stop', conversationId);
    }
  }

  // Message status
  markMessageAsRead(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message:read', messageId);
    }
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export const socketService = new SocketService();