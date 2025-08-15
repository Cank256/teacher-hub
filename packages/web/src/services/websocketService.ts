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
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
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
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.currentUserId = userId;

      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}&userId=${userId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connect', { userId });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnect', { code: event.code, reason: event.reason });
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.currentUserId = null;
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.currentUserId) {
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(this.currentUserId, token).catch(console.error);
        }
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'message':
        this.emit('message', message.data);
        break;
      case 'typing':
        this.emit('typing', message.data as TypingIndicator);
        break;
      case 'presence':
        this.emit('presence', message.data as PresenceUpdate);
        break;
      case 'read_receipt':
        this.emit('read_receipt', message.data as ReadReceipt);
        break;
      case 'notification':
        this.emit('notification', message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: type as any,
        data,
        timestamp: new Date()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Public methods for sending different types of messages
  sendMessage(conversationId: string, content: string, attachments?: any[], replyToId?: string) {
    this.send('message', {
      conversationId,
      content,
      attachments,
      replyToId,
      timestamp: new Date()
    });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    this.send('typing', {
      conversationId,
      isTyping,
      userId: this.currentUserId
    });
  }

  updatePresence(status: 'online' | 'offline' | 'away') {
    this.send('presence', {
      userId: this.currentUserId,
      status,
      timestamp: new Date()
    });
  }

  markMessageAsRead(messageId: string, conversationId: string) {
    this.send('read_receipt', {
      messageId,
      conversationId,
      userId: this.currentUserId,
      readAt: new Date()
    });
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
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
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