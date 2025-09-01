import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useConversations, useSendMessage, useMessages } from '../useMessaging';
import { MessagingService } from '../../messagingService';
import type { Conversation, Message } from '@/types/messaging';

// Mock the messaging service
jest.mock('../../messagingService');
const mockMessagingService = MessagingService as jest.Mocked<typeof MessagingService>;

// Mock socket service
jest.mock('@/services/messaging/socketService', () => ({
  socketService: {
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    markMessageAsRead: jest.fn(),
  },
}));

// Mock offline messaging service
jest.mock('@/services/messaging/offlineMessagingService', () => ({
  offlineMessagingService: {
    queueMessage: jest.fn(),
    getSyncStatus: jest.fn(),
    onStatusChange: jest.fn(() => jest.fn()),
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch conversations successfully', async () => {
    const mockConversations: Conversation[] = [
      {
        id: '1',
        participants: [],
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockMessagingService.getConversations.mockResolvedValue(mockConversations);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConversations);
    expect(mockMessagingService.getConversations).toHaveBeenCalledWith(undefined);
  });

  it('should handle search filters', async () => {
    const filters = { search: 'test', unreadOnly: true };
    mockMessagingService.getConversations.mockResolvedValue([]);

    const { result } = renderHook(() => useConversations(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMessagingService.getConversations).toHaveBeenCalledWith(filters);
  });

  it('should handle errors', async () => {
    const error = new Error('Network error');
    mockMessagingService.getConversations.mockRejectedValue(error);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch messages for a conversation', async () => {
    const conversationId = 'conv-1';
    const mockMessages = {
      data: [
        {
          id: '1',
          conversationId,
          senderId: 'user-1',
          content: 'Hello',
          type: 'text' as const,
          timestamp: new Date(),
          isRead: false,
          deliveryStatus: 'sent' as const,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      },
    };

    mockMessagingService.getMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useMessages(conversationId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]).toEqual(mockMessages);
    expect(mockMessagingService.getMessages).toHaveBeenCalledWith({
      conversationId,
      limit: 20,
      before: undefined,
    });
  });

  it('should not fetch messages when conversationId is empty', () => {
    const { result } = renderHook(() => useMessages(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockMessagingService.getMessages).not.toHaveBeenCalled();
  });
});

describe('useSendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send message when online', async () => {
    const mockMessage: Message = {
      id: '1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello',
      type: 'text',
      timestamp: new Date(),
      isRead: false,
      deliveryStatus: 'sent',
    };

    mockMessagingService.sendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    const sendRequest = {
      conversationId: 'conv-1',
      content: 'Hello',
      type: 'text' as const,
    };

    await result.current.mutateAsync(sendRequest);

    expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(sendRequest);
  });

  it('should handle send message errors', async () => {
    const error = new Error('Send failed');
    mockMessagingService.sendMessage.mockRejectedValue(error);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    const sendRequest = {
      conversationId: 'conv-1',
      content: 'Hello',
      type: 'text' as const,
    };

    await expect(result.current.mutateAsync(sendRequest)).rejects.toThrow('Send failed');
  });
});