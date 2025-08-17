import { io, Socket } from 'socket.io-client';

// Simplified WebSocket service for debugging
class SimpleWebSocketService {
  private socket: Socket | null = null;
  
  async testConnection(token: string, userId: string) {
    console.log('=== Simple WebSocket Connection Test ===');
    console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL);
    console.log('User ID:', userId);
    console.log('Token length:', token?.length || 0);
    console.log('Token preview:', token ? `${token.substring(0, 30)}...` : 'null');
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('✅ Simple WebSocket connected successfully!');
          console.log('Socket ID:', this.socket?.id);
          resolve({ success: true, socketId: this.socket?.id });
        });

        this.socket.on('connect_error', (error) => {
          console.log('❌ Simple WebSocket connection error:', error.message);
          console.log('Error details:', error);
          reject({ success: false, error: error.message });
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Simple WebSocket disconnected:', reason);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            console.log('⏰ Simple WebSocket connection timeout');
            this.socket.disconnect();
            reject({ success: false, error: 'Connection timeout' });
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Simple WebSocket setup error:', error);
        reject({ success: false, error: error.message });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const simpleWebSocketService = new SimpleWebSocketService();

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testSimpleWebSocket = async (token?: string, userId?: string) => {
    const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const userIdToUse = userId || 'test-user-id';
    
    if (!authToken) {
      console.log('❌ No token available for testing');
      return;
    }
    
    try {
      const result = await simpleWebSocketService.testConnection(authToken, userIdToUse);
      console.log('Test result:', result);
      return result;
    } catch (error) {
      console.log('Test failed:', error);
      return error;
    }
  };
}