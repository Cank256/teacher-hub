import { MessagingService } from '../messagingService';
import { ApiClient } from '../apiClient';
import type { 
  Conversation, 
  Message, 
  CreateConversationRequest, 
  SendMessageRequest,
  ConversationFilters,
  MessageFilters,
  UserSearchFilters 
} from '@/types/messaging';

// Mock the ApiClient
jest.mock('../apiClient');
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  uploadFile: jest.fn(),
} as jest.Mocked<Partial<ApiClient>>;

// Mock ApiClient.getInstance
(ApiClient.getInstance as jest.Mock).mockReturnValue(mockApiClient);

describe('MessagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should fetch conversations without filters', async () => {
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

      mockApiClient.get!.mockResolvedValue({
        data: { data: mockConversations },
      });

      const result = await MessagingService.getConversations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/conversations', {});
      expect(result).toEqual(mockConversations);
    });

    it('should fetch conversations with filters', async () => {
      const filters: ConversationFilters = {
        search: 'test',
        unreadOnly: true,
      };

      mockApiClient.get!.mockResolvedValue({
        data: { data: [] },
      });

      await MessagingService.getConversations(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/conversations', {
        search: 'test',
        unreadOnly: 'true',
      });
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const request: CreateConversationRequest = {
        participantIds: ['user-1', 'user-2'],
        isGroup: false,
      };

      const mockConversation: Conversation = {
        id: 'new-conv',
        participants: [],
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockApiClient.post!.mockResolvedValue({
        data: { data: mockConversation },
      });

      const result = await MessagingService.createConversation(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/conversations', request);
      expect(result).toEqual(mockConversation);
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a conversation', async () => {
      const filters: MessageFilters = {
        conversationId: 'conv-1',
        limit: 20,
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
      };

      mockApiClient.get!.mockResolvedValue({
        data: mockResponse,
      });

      const result = await MessagingService.getMessages(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/messages', {
        conversationId: 'conv-1',
        limit: '20',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include before parameter when provided', async () => {
      const beforeDate = new Date();
      const filters: MessageFilters = {
        conversationId: 'conv-1',
        before: beforeDate,
      };

      mockApiClient.get!.mockResolvedValue({
        data: { data: [], pagination: {} },
      });

      await MessagingService.getMessages(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/messages', {
        conversationId: 'conv-1',
        before: beforeDate.toISOString(),
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Hello world',
        type: 'text',
      };

      const mockMessage: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello world',
        type: 'text',
        timestamp: new Date(),
        isRead: false,
        deliveryStatus: 'sent',
      };

      mockApiClient.uploadFile!.mockResolvedValue({
        data: { data: mockMessage },
      });

      const result = await MessagingService.sendMessage(request);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/messages',
        expect.any(FormData)
      );
      expect(result).toEqual(mockMessage);
    });

    it('should send a message with attachments', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Check this out',
        type: 'document',
        attachments: [mockFile as any],
      };

      mockApiClient.uploadFile!.mockResolvedValue({
        data: { data: {} },
      });

      await MessagingService.sendMessage(request);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/messages',
        expect.any(FormData)
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users with basic query', async () => {
      const filters: UserSearchFilters = {
        query: 'john',
      };

      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      ];

      mockApiClient.get!.mockResolvedValue({
        data: { data: mockUsers },
      });

      const result = await MessagingService.searchUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/search', {
        query: 'john',
      });
      expect(result).toEqual(mockUsers);
    });

    it('should search users with all filters', async () => {
      const filters: UserSearchFilters = {
        query: 'teacher',
        subjects: ['math', 'science'],
        location: 'kampala',
        excludeIds: ['user-1', 'user-2'],
      };

      mockApiClient.get!.mockResolvedValue({
        data: { data: [] },
      });

      await MessagingService.searchUsers(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/search', {
        query: 'teacher',
        'subjects[]': ['math', 'science'],
        location: 'kampala',
        'excludeIds[]': ['user-1', 'user-2'],
      });
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark a message as read', async () => {
      const messageId = 'msg-1';

      mockApiClient.post!.mockResolvedValue({});

      await MessagingService.markMessageAsRead(messageId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/messages/${messageId}/read`);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const messageId = 'msg-1';

      mockApiClient.delete!.mockResolvedValue({});

      await MessagingService.deleteMessage(messageId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/messages/${messageId}`);
    });
  });
});