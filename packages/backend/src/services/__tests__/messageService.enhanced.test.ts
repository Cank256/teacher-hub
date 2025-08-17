import { MessageService } from '../messageService';
import { UserSearchService } from '../userSearchService';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../userSearchService');

describe('MessageService - Enhanced Features', () => {
  let messageService: MessageService;
  let userSearchService: UserSearchService;
  let mockDb: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    userSearchService = new UserSearchService(mockDb);
    messageService = new MessageService(mockDb, userSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send direct message successfully', async () => {
      const senderId = 'user-123';
      const messageData = {
        recipientId: 'user-456',
        content: 'Hello there!',
        type: 'text' as const,
        attachments: []
      };

      const mockMessage = {
        id: 'message-123',
        senderId,
        recipientId: messageData.recipientId,
        content: messageData.content,
        type: messageData.type,
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      const mockConversation = {
        id: 'conversation-123',
        participants: [senderId, messageData.recipientId],
        type: 'direct',
        lastActivity: new Date(),
        unreadCount: { [messageData.recipientId]: 1 }
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockConversation] }) // Get or create conversation
        .mockResolvedValueOnce({ rows: [mockMessage] }) // Insert message
        .mockResolvedValueOnce({ rows: [] }); // Update conversation

      const result = await messageService.sendMessage(senderId, messageData);

      expect(result).toEqual(mockMessage);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle message with attachments', async () => {
      const senderId = 'user-123';
      const messageData = {
        recipientId: 'user-456',
        content: 'Check out this file',
        type: 'file' as const,
        attachments: [
          {
            id: 'attachment-123',
            type: 'document',
            url: '/uploads/document.pdf',
            filename: 'document.pdf',
            size: 1024000
          }
        ]
      };

      const mockMessage = {
        id: 'message-123',
        senderId,
        recipientId: messageData.recipientId,
        content: messageData.content,
        type: messageData.type,
        attachments: messageData.attachments,
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'conversation-123' }] })
        .mockResolvedValueOnce({ rows: [mockMessage] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await messageService.sendMessage(senderId, messageData);

      expect(result.attachments).toEqual(messageData.attachments);
    });
  });

  describe('replyToMessage', () => {
    it('should reply to message successfully', async () => {
      const senderId = 'user-123';
      const originalMessageId = 'message-456';
      const content = 'Thanks for the message!';

      const mockOriginalMessage = {
        id: originalMessageId,
        senderId: 'user-456',
        recipientId: senderId,
        content: 'Hello there!',
        conversationId: 'conversation-123'
      };

      const mockReply = {
        id: 'message-789',
        senderId,
        recipientId: 'user-456',
        content,
        type: 'text',
        replyToId: originalMessageId,
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockOriginalMessage] }) // Get original message
        .mockResolvedValueOnce({ rows: [mockReply] }) // Insert reply
        .mockResolvedValueOnce({ rows: [] }); // Update conversation

      const result = await messageService.replyToMessage(senderId, originalMessageId, content);

      expect(result.replyToId).toBe(originalMessageId);
      expect(result.content).toBe(content);
    });

    it('should throw error for non-existent original message', async () => {
      const senderId = 'user-123';
      const originalMessageId = 'non-existent';
      const content = 'Reply content';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(messageService.replyToMessage(senderId, originalMessageId, content))
        .rejects.toThrow('Original message not found');
    });
  });

  describe('editMessage', () => {
    it('should edit message successfully', async () => {
      const messageId = 'message-123';
      const senderId = 'user-123';
      const newContent = 'Updated message content';

      const mockExistingMessage = {
        id: messageId,
        senderId,
        content: 'Original content',
        isEdited: false
      };

      const mockUpdatedMessage = {
        ...mockExistingMessage,
        content: newContent,
        isEdited: true,
        editedAt: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockExistingMessage] }) // Get existing message
        .mockResolvedValueOnce({ rows: [mockUpdatedMessage] }); // Update message

      const result = await messageService.editMessage(messageId, senderId, newContent);

      expect(result.content).toBe(newContent);
      expect(result.isEdited).toBe(true);
    });

    it('should throw error for unauthorized edit', async () => {
      const messageId = 'message-123';
      const senderId = 'user-123';
      const wrongSenderId = 'user-456';
      const newContent = 'Updated content';

      const mockExistingMessage = {
        id: messageId,
        senderId: wrongSenderId,
        content: 'Original content'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockExistingMessage] });

      await expect(messageService.editMessage(messageId, senderId, newContent))
        .rejects.toThrow('Unauthorized to edit this message');
    });
  });

  describe('getConversations', () => {
    it('should return user conversations with pagination', async () => {
      const userId = 'user-123';
      const pagination = { page: 1, limit: 20 };

      const mockConversations = [
        {
          id: 'conversation-1',
          participants: [userId, 'user-456'],
          type: 'direct',
          lastMessage: {
            id: 'message-1',
            content: 'Latest message',
            timestamp: new Date()
          },
          lastActivity: new Date(),
          unreadCount: { [userId]: 0 }
        },
        {
          id: 'conversation-2',
          participants: [userId, 'user-789'],
          type: 'direct',
          lastMessage: {
            id: 'message-2',
            content: 'Another message',
            timestamp: new Date()
          },
          lastActivity: new Date(),
          unreadCount: { [userId]: 2 }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockConversations }) // Get conversations
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const result = await messageService.getConversations(userId, pagination);

      expect(result.data).toEqual(mockConversations);
      expect(result.total).toBe(2);
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read successfully', async () => {
      const conversationId = 'conversation-123';
      const userId = 'user-123';
      const messageIds = ['message-1', 'message-2', 'message-3'];

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Insert read receipts
        .mockResolvedValueOnce({ rows: [] }); // Update unread count

      await messageService.markMessagesAsRead(conversationId, userId, messageIds);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('createConversation', () => {
    it('should create new conversation successfully', async () => {
      const initiatorId = 'user-123';
      const participantIds = ['user-456', 'user-789'];

      const mockConversation = {
        id: 'conversation-123',
        participants: [initiatorId, ...participantIds],
        type: 'group',
        lastActivity: new Date(),
        unreadCount: {}
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing conversation
        .mockResolvedValueOnce({ rows: [mockConversation] }); // Create conversation

      const result = await messageService.createConversation(initiatorId, participantIds);

      expect(result).toEqual(mockConversation);
      expect(result.participants).toContain(initiatorId);
      expect(result.participants).toContain('user-456');
      expect(result.participants).toContain('user-789');
    });

    it('should return existing conversation if already exists', async () => {
      const initiatorId = 'user-123';
      const participantIds = ['user-456'];

      const existingConversation = {
        id: 'conversation-existing',
        participants: [initiatorId, 'user-456'],
        type: 'direct'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [existingConversation] });

      const result = await messageService.createConversation(initiatorId, participantIds);

      expect(result).toEqual(existingConversation);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only check, no create
    });
  });
});