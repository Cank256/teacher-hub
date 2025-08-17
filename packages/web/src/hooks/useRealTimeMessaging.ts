import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService, TypingIndicator, PresenceUpdate, ReadReceipt } from '../services/websocketService';
import { notificationService } from '../services/notificationService';
import { tokenStorage } from '../utils/tokenStorage';

interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: any[];
  timestamp: Date;
  readBy: ReadReceipt[];
  syncStatus: 'synced' | 'pending' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  replyToId?: string;
}

interface UseRealTimeMessagingProps {
  currentUserId: string;
  conversationId?: string;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  onTypingUpdate?: (typing: TypingIndicator) => void;
  onPresenceUpdate?: (presence: PresenceUpdate) => void;
}

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

interface TypingUsers {
  [conversationId: string]: {
    [userId: string]: {
      isTyping: boolean;
      lastUpdate: Date;
    };
  };
}

interface UserPresence {
  [userId: string]: {
    status: 'online' | 'offline' | 'away';
    lastSeen?: Date;
  };
}

export const useRealTimeMessaging = ({
  currentUserId,
  conversationId,
  onNewMessage,
  onMessageUpdate,
  onTypingUpdate,
  onPresenceUpdate
}: UseRealTimeMessagingProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0
  });
  
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({});
  const [userPresence, setUserPresence] = useState<UserPresence>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [conversationId: string]: number }>({});
  
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const lastTypingRef = useRef<Date | null>(null);
  const isTypingRef = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      const token = tokenStorage.getToken();
      console.log('Retrieved token for WebSocket:', token ? `${token.substring(0, 20)}...` : 'null');
      console.log('Current user ID:', currentUserId);
      
      if (!token || !currentUserId) {
        console.log('Missing token or user ID, skipping WebSocket connection');
        return;
      }

      try {
        setConnectionStatus(prev => ({ ...prev, isConnecting: true }));
        await websocketService.connect(currentUserId, token);
        
        setConnectionStatus({
          isConnected: true,
          isConnecting: false,
          lastConnected: new Date(),
          reconnectAttempts: 0
        });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus(prev => ({
          ...prev,
          isConnecting: false,
          reconnectAttempts: prev.reconnectAttempts + 1
        }));
      }
    };

    initializeConnection();

    return () => {
      websocketService.disconnect();
    };
  }, [currentUserId]);

  // Set up event listeners
  useEffect(() => {
    const handleMessage = (message: Message) => {
      // Show notification if not in current conversation
      if (message.senderId !== currentUserId && 
          (!conversationId || message.recipientId !== conversationId)) {
        notificationService.showMessageNotification(
          'Sender Name', // In real app, get from user data
          message.content,
          message.recipientId || message.groupId || ''
        );
      }

      // Update unread count
      const msgConversationId = message.recipientId || message.groupId;
      if (msgConversationId && message.senderId !== currentUserId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgConversationId]: (prev[msgConversationId] || 0) + 1
        }));
      }

      onNewMessage?.(message);
    };

    const handleTyping = (typing: TypingIndicator) => {
      setTypingUsers(prev => {
        const conversationTyping = prev[typing.conversationId] || {};
        
        if (typing.isTyping) {
          conversationTyping[typing.userId] = {
            isTyping: true,
            lastUpdate: new Date()
          };
          
          // Clear existing timeout
          const timeoutKey = `${typing.conversationId}-${typing.userId}`;
          if (typingTimeoutRef.current[timeoutKey]) {
            clearTimeout(typingTimeoutRef.current[timeoutKey]);
          }
          
          // Set timeout to clear typing indicator
          typingTimeoutRef.current[timeoutKey] = setTimeout(() => {
            setTypingUsers(current => {
              const updated = { ...current };
              if (updated[typing.conversationId]) {
                delete updated[typing.conversationId][typing.userId];
                if (Object.keys(updated[typing.conversationId]).length === 0) {
                  delete updated[typing.conversationId];
                }
              }
              return updated;
            });
          }, 3000);
        } else {
          delete conversationTyping[typing.userId];
        }

        return {
          ...prev,
          [typing.conversationId]: conversationTyping
        };
      });

      onTypingUpdate?.(typing);
    };

    const handlePresence = (presence: PresenceUpdate) => {
      setUserPresence(prev => ({
        ...prev,
        [presence.userId]: {
          status: presence.status,
          lastSeen: presence.lastSeen
        }
      }));

      onPresenceUpdate?.(presence);
    };

    const handleReadReceipt = (receipt: ReadReceipt) => {
      // Update message read status
      // This would typically update the message in your state management
      console.log('Message read:', receipt);
    };

    const handleConnect = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date()
      }));
    };

    const handleDisconnect = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
    };

    // Register event listeners
    websocketService.on('message', handleMessage);
    websocketService.on('typing', handleTyping);
    websocketService.on('presence', handlePresence);
    websocketService.on('read_receipt', handleReadReceipt);
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('error', handleError);

    return () => {
      // Cleanup event listeners
      websocketService.off('message', handleMessage);
      websocketService.off('typing', handleTyping);
      websocketService.off('presence', handlePresence);
      websocketService.off('read_receipt', handleReadReceipt);
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('error', handleError);

      // Clear typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [currentUserId, conversationId, onNewMessage, onMessageUpdate, onTypingUpdate, onPresenceUpdate]);

  // Send message
  const sendMessage = useCallback((content: string, attachments?: File[], replyToId?: string) => {
    if (!conversationId) return;

    websocketService.sendMessage({
      conversationId,
      content,
      attachments,
      replyToId
    });
    
    // Stop typing indicator when sending message
    if (isTypingRef.current) {
      websocketService.sendTypingIndicator(conversationId, false);
      isTypingRef.current = false;
    }
  }, [conversationId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!conversationId) return;

    const now = new Date();
    
    // Throttle typing indicators - only send if it's been more than 1 second
    if (isTyping && lastTypingRef.current && 
        now.getTime() - lastTypingRef.current.getTime() < 1000) {
      return;
    }

    websocketService.sendTypingIndicator(conversationId, isTyping);
    isTypingRef.current = isTyping;
    lastTypingRef.current = now;

    // Auto-stop typing indicator after 3 seconds of inactivity
    if (isTyping) {
      setTimeout(() => {
        if (isTypingRef.current) {
          websocketService.sendTypingIndicator(conversationId, false);
          isTypingRef.current = false;
        }
      }, 3000);
    }
  }, [conversationId]);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    if (!conversationId) return;

    websocketService.markMessagesAsRead(conversationId, [messageId]);
    
    // Update local unread count
    setUnreadCounts(prev => ({
      ...prev,
      [conversationId]: Math.max(0, (prev[conversationId] || 0) - 1)
    }));
  }, [conversationId]);

  // Update presence status
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'invisible') => {
    websocketService.updatePresence(status);
  }, []);

  // Get typing users for current conversation
  const getTypingUsers = useCallback(() => {
    if (!conversationId || !typingUsers[conversationId]) return [];
    
    return Object.entries(typingUsers[conversationId])
      .filter(([userId, data]) => data.isTyping && userId !== currentUserId)
      .map(([userId]) => userId);
  }, [conversationId, typingUsers, currentUserId]);

  // Get user presence status
  const getUserPresence = useCallback((userId: string) => {
    return userPresence[userId] || { status: 'offline' as const };
  }, [userPresence]);

  // Get unread count for conversation
  const getUnreadCount = useCallback((convId: string) => {
    return unreadCounts[convId] || 0;
  }, [unreadCounts]);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      if (notificationService.isSupported()) {
        await notificationService.requestPermission();
        notificationService.setupNotificationHandlers();
      }
    };

    initNotifications();
  }, []);

  // Handle page visibility changes for presence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set initial presence
    updatePresence('online');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatePresence]);

  return {
    // Connection status
    connectionStatus,
    
    // Message functions
    sendMessage,
    markMessageAsRead,
    
    // Typing indicators
    sendTypingIndicator,
    getTypingUsers,
    
    // Presence
    updatePresence,
    getUserPresence,
    
    // Unread counts
    getUnreadCount,
    
    // Utility
    isConnected: connectionStatus.isConnected
  };
};