import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { MessagingService } from '../messagingService';
import { socketService } from '@/services/messaging/socketService';
import { offlineMessagingService } from '@/services/messaging/offlineMessagingService';
import type {
  Conversation,
  Message,
  CreateConversationRequest,
  SendMessageRequest,
  ConversationFilters,
  MessageFilters,
  UserSearchFilters,
  User,
  TypingIndicator,
  MessageSyncStatus,
} from '@/types/messaging';

// Query keys
export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: () => [...messagingKeys.all, 'conversations'] as const,
  conversationsList: (filters?: ConversationFilters) => 
    [...messagingKeys.conversations(), 'list', filters] as const,
  conversation: (id: string) => [...messagingKeys.conversations(), id] as const,
  messages: (conversationId: string) => [...messagingKeys.all, 'messages', conversationId] as const,
  users: () => [...messagingKeys.all, 'users'] as const,
  userSearch: (filters: UserSearchFilters) => [...messagingKeys.users(), 'search', filters] as const,
};

// Conversations hooks
export function useConversations(filters?: ConversationFilters) {
  return useQuery({
    queryKey: messagingKeys.conversationsList(filters),
    queryFn: () => MessagingService.getConversations(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: messagingKeys.conversation(conversationId),
    queryFn: () => MessagingService.getConversation(conversationId),
    enabled: !!conversationId,
    staleTime: 60000, // 1 minute
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateConversationRequest) => 
      MessagingService.createConversation(request),
    onSuccess: (newConversation) => {
      // Add to conversations list
      queryClient.setQueryData(
        messagingKeys.conversationsList(),
        (old: Conversation[] = []) => [newConversation, ...old]
      );
      
      // Set individual conversation data
      queryClient.setQueryData(
        messagingKeys.conversation(newConversation.id),
        newConversation
      );
    },
  });
}

// Messages hooks
export function useMessages(conversationId: string, limit = 20) {
  return useInfiniteQuery({
    queryKey: messagingKeys.messages(conversationId),
    queryFn: ({ pageParam }) => {
      const filters: MessageFilters = {
        conversationId,
        limit,
        before: pageParam,
      };
      return MessagingService.getMessages(filters);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore && lastPage.data.length > 0) {
        return lastPage.data[lastPage.data.length - 1].timestamp;
      }
      return undefined;
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected || false);
    });
    return unsubscribe;
  }, []);

  return useMutation({
    mutationFn: async (request: SendMessageRequest) => {
      if (isOnline) {
        return MessagingService.sendMessage(request);
      } else {
        // Queue for offline sending
        const offlineMessage = await offlineMessagingService.queueMessage(request);
        // Return a temporary message object
        return {
          id: offlineMessage.id,
          conversationId: request.conversationId,
          senderId: 'current-user', // This should come from auth context
          content: request.content,
          type: request.type,
          timestamp: offlineMessage.timestamp,
          isRead: false,
          deliveryStatus: 'sending' as const,
        } as Message;
      }
    },
    onSuccess: (newMessage, variables) => {
      // Add message to the conversation's message list
      queryClient.setQueryData(
        messagingKeys.messages(variables.conversationId),
        (old: any) => {
          if (!old) return { pages: [{ data: [newMessage], pagination: { hasMore: false } }] };
          
          const newPages = [...old.pages];
          if (newPages[0]) {
            newPages[0] = {
              ...newPages[0],
              data: [newMessage, ...newPages[0].data],
            };
          }
          return { ...old, pages: newPages };
        }
      );

      // Update conversation's last message
      queryClient.setQueryData(
        messagingKeys.conversationsList(),
        (old: Conversation[] = []) => 
          old.map(conv => 
            conv.id === variables.conversationId
              ? { ...conv, lastMessage: newMessage, updatedAt: newMessage.timestamp }
              : conv
          )
      );
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      // Also mark via socket for real-time updates
      socketService.markMessageAsRead(messageId);
      return MessagingService.markMessageAsRead(messageId);
    },
    onSuccess: (_, { conversationId }) => {
      // Update conversation unread count
      queryClient.setQueryData(
        messagingKeys.conversationsList(),
        (old: Conversation[] = []) =>
          old.map(conv =>
            conv.id === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
      );
    },
  });
}

// User search hook
export function useUserSearch(filters: UserSearchFilters) {
  return useQuery({
    queryKey: messagingKeys.userSearch(filters),
    queryFn: () => MessagingService.searchUsers(filters),
    enabled: filters.query.length >= 2, // Only search with 2+ characters
    staleTime: 60000, // 1 minute
  });
}

// Real-time messaging hooks
export function useRealTimeMessaging(conversationId?: string) {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    // Join conversation for real-time updates
    socketService.joinConversation(conversationId);

    // Handle new messages
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        queryClient.setQueryData(
          messagingKeys.messages(conversationId),
          (old: any) => {
            if (!old) return { pages: [{ data: [message], pagination: { hasMore: false } }] };
            
            const newPages = [...old.pages];
            if (newPages[0]) {
              // Check if message already exists (avoid duplicates)
              const exists = newPages[0].data.some((msg: Message) => msg.id === message.id);
              if (!exists) {
                newPages[0] = {
                  ...newPages[0],
                  data: [message, ...newPages[0].data],
                };
              }
            }
            return { ...old, pages: newPages };
          }
        );

        // Update conversations list
        queryClient.setQueryData(
          messagingKeys.conversationsList(),
          (old: Conversation[] = []) =>
            old.map(conv =>
              conv.id === conversationId
                ? { 
                    ...conv, 
                    lastMessage: message, 
                    updatedAt: message.timestamp,
                    unreadCount: conv.unreadCount + 1 
                  }
                : conv
            )
        );
      }
    };

    // Handle typing indicators
    const handleTypingStart = (indicator: TypingIndicator) => {
      if (indicator.conversationId === conversationId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(t => t.userId !== indicator.userId);
          return [...filtered, indicator];
        });
      }
    };

    const handleTypingStop = (indicator: TypingIndicator) => {
      if (indicator.conversationId === conversationId) {
        setTypingUsers(prev => prev.filter(t => t.userId !== indicator.userId));
      }
    };

    // Handle message read status
    const handleMessageRead = ({ messageId }: { messageId: string; userId: string }) => {
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        (old: any) => {
          if (!old) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((msg: Message) =>
              msg.id === messageId ? { ...msg, isRead: true } : msg
            ),
          }));
          
          return { ...old, pages: newPages };
        }
      );
    };

    // Subscribe to socket events
    socketService.on('message:new', handleNewMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);
    socketService.on('message:read', handleMessageRead);

    return () => {
      // Cleanup
      socketService.off('message:new', handleNewMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.off('message:read', handleMessageRead);
      socketService.leaveConversation(conversationId);
    };
  }, [conversationId, queryClient]);

  const startTyping = useCallback(() => {
    if (conversationId) {
      socketService.startTyping(conversationId);
    }
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (conversationId) {
      socketService.stopTyping(conversationId);
    }
  }, [conversationId]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

// Offline sync status hook
export function useMessageSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<MessageSyncStatus | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await offlineMessagingService.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const unsubscribe = offlineMessagingService.onStatusChange(setSyncStatus);

    return unsubscribe;
  }, []);

  const forceSync = useCallback(async () => {
    await offlineMessagingService.forcSync();
  }, []);

  return {
    syncStatus,
    forceSync,
  };
}