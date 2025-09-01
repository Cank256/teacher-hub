import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConversationsListScreen } from '../screens/ConversationsListScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NewConversationScreen } from '../screens/NewConversationScreen';
import { MessagingService } from '@/services/api/messagingService';
import type { MessagesStackParamList } from '@/navigation/types';

// Mock services
jest.mock('@/services/api/messagingService');
jest.mock('@/services/messaging/socketService', () => ({
  socketService: {
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    markMessageAsRead: jest.fn(),
    startTyping: jest.fn(),
    stopTyping: jest.fn(),
  },
}));

jest.mock('@/services/messaging/offlineMessagingService', () => ({
  offlineMessagingService: {
    getSyncStatus: jest.fn(() => Promise.resolve({
      pendingMessages: 0,
      lastSyncTime: new Date(),
      isOnline: true,
      syncInProgress: false,
    })),
    onStatusChange: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock react-native modules
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  isCancel: jest.fn(() => false),
  types: { allFiles: 'allFiles' },
}));

jest.mock('react-native-image-crop-picker', () => ({
  openCamera: jest.fn(),
  openPicker: jest.fn(),
}));

const mockMessagingService = MessagingService as jest.Mocked<typeof MessagingService>;

const Stack = createNativeStackNavigator<MessagesStackParamList>();

const TestNavigator = ({ initialRouteName = 'ConversationsList' as keyof MessagesStackParamList }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen 
            name="ConversationsList" 
            component={ConversationsListScreen}
            options={{ title: 'Messages' }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
          />
          <Stack.Screen 
            name="NewConversation" 
            component={NewConversationScreen}
            options={{ title: 'New Conversation' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('Messaging Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ConversationsListScreen', () => {
    it('should display conversations list', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          participants: [
            {
              id: 'user-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          ],
          unreadCount: 2,
          isGroup: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Hello!',
            type: 'text' as const,
            timestamp: new Date(),
            isRead: false,
            deliveryStatus: 'delivered' as const,
          },
        },
      ];

      mockMessagingService.getConversations.mockResolvedValue(mockConversations);

      render(<TestNavigator />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Hello!')).toBeTruthy();
      });
    });

    it('should navigate to chat when conversation is tapped', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          participants: [
            {
              id: 'user-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          ],
          unreadCount: 0,
          isGroup: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockMessagingService.getConversations.mockResolvedValue(mockConversations);
      mockMessagingService.getMessages.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, hasMore: false },
      });

      render(<TestNavigator />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('John Doe'));

      await waitFor(() => {
        // Should navigate to chat screen
        expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
      });
    });

    it('should navigate to new conversation screen', async () => {
      mockMessagingService.getConversations.mockResolvedValue([]);

      render(<TestNavigator />);

      await waitFor(() => {
        expect(screen.getByText('+ New')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('+ New'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search teachers by name, subject, or location...')).toBeTruthy();
      });
    });

    it('should handle search functionality', async () => {
      mockMessagingService.getConversations.mockResolvedValue([]);

      render(<TestNavigator />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search conversations...')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      fireEvent.changeText(searchInput, 'john');

      await waitFor(() => {
        expect(mockMessagingService.getConversations).toHaveBeenCalledWith({
          search: 'john',
        });
      });
    });

    it('should handle unread filter toggle', async () => {
      mockMessagingService.getConversations.mockResolvedValue([]);

      render(<TestNavigator />);

      await waitFor(() => {
        expect(screen.getByText('Unread Only')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Unread Only'));

      await waitFor(() => {
        expect(mockMessagingService.getConversations).toHaveBeenCalledWith({
          unreadOnly: true,
        });
      });
    });
  });

  describe('ChatScreen', () => {
    it('should display messages in chat', async () => {
      const mockMessages = {
        data: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Hello there!',
            type: 'text' as const,
            timestamp: new Date(),
            isRead: false,
            deliveryStatus: 'delivered' as const,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, hasMore: false },
      };

      mockMessagingService.getMessages.mockResolvedValue(mockMessages);

      render(
        <TestNavigator initialRouteName="Chat" />
      );

      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeTruthy();
      });
    });

    it('should send a message', async () => {
      mockMessagingService.getMessages.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, hasMore: false },
      });

      const newMessage = {
        id: 'msg-new',
        conversationId: 'conv-1',
        senderId: 'current-user-id',
        content: 'New message',
        type: 'text' as const,
        timestamp: new Date(),
        isRead: false,
        deliveryStatus: 'sent' as const,
      };

      mockMessagingService.sendMessage.mockResolvedValue(newMessage);

      render(<TestNavigator initialRouteName="Chat" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const messageInput = screen.getByPlaceholderText('Type a message...');
      fireEvent.changeText(messageInput, 'New message');

      const sendButton = screen.getByText('➤');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockMessagingService.sendMessage).toHaveBeenCalledWith({
          conversationId: 'conv-1',
          content: 'New message',
          type: 'text',
          attachments: undefined,
        });
      });
    });
  });

  describe('NewConversationScreen', () => {
    it('should search for users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          subjects: [{ id: 'math', name: 'Mathematics', code: 'MATH' }],
          gradeLevels: [],
          schoolLocation: {
            id: 'loc-1',
            name: 'Kampala',
            district: 'Kampala',
            region: 'Central',
          },
          yearsOfExperience: 5,
          verificationStatus: 'verified' as const,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        },
      ];

      mockMessagingService.searchUsers.mockResolvedValue(mockUsers);

      render(<TestNavigator initialRouteName="NewConversation" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search teachers by name, subject, or location...')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search teachers by name, subject, or location...');
      fireEvent.changeText(searchInput, 'john');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(mockMessagingService.searchUsers).toHaveBeenCalledWith({
          query: 'john',
          excludeIds: ['current-user-id'],
        });
      });
    });

    it('should create conversation with selected users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          subjects: [],
          gradeLevels: [],
          schoolLocation: {
            id: 'loc-1',
            name: 'Kampala',
            district: 'Kampala',
            region: 'Central',
          },
          yearsOfExperience: 5,
          verificationStatus: 'verified' as const,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        },
      ];

      const newConversation = {
        id: 'new-conv',
        participants: mockUsers,
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMessagingService.searchUsers.mockResolvedValue(mockUsers);
      mockMessagingService.createConversation.mockResolvedValue(newConversation);
      mockMessagingService.getMessages.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, hasMore: false },
      });

      render(<TestNavigator initialRouteName="NewConversation" />);

      // Search for user
      const searchInput = screen.getByPlaceholderText('Search teachers by name, subject, or location...');
      fireEvent.changeText(searchInput, 'john');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
      });

      // Select user
      fireEvent.press(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('Start Conversation')).toBeTruthy();
      });

      // Create conversation
      fireEvent.press(screen.getByText('Start Conversation'));

      await waitFor(() => {
        expect(mockMessagingService.createConversation).toHaveBeenCalledWith({
          participantIds: ['user-1'],
          isGroup: false,
          name: undefined,
        });
      });
    });
  });
});