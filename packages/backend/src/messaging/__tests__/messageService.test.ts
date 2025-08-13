import { EnhancedMessageService } from '../messageService';
import { getConnection } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Mock the database connection
jest.mock('../../database/connection');
jest.mock('../../utils/logger');

const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockClient = {
  query: jest.fn().mockImplementation(() => ({ rows: [] })),
  release: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  (getConnection as jest.Mock).mockReturnValue(mockPool);
  mockPool.connect.mockResolvedValue(mockClient);
});

describe('EnhancedMessageService', () => {
  let messageService: EnhancedMessageService;

  beforeEach(() => {
    messageService = new EnhancedMessageService();
  });

  describe('sendMessage', () => {
    it('should send a direct message successfully', async () => {
      const messageId = uuidv4();
      const senderId = uuidv4();
      const recipientId = uuidv4();
      const content = 'Hello, this is a test message';
      const timestamp = new Date();

      const mockMessageRow = {
        id: messageId,
        sender_id: senderId,
        recipient_id: recipientId,
        group_id: null as string | null,
        conversation_id: uuidv4(),
        content,
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: JSON.stringify([{ userId: senderId, readAt: timestamp }]),
        sync_status: 'synced',
        is_edited: false,
        edited_at: null as Date | null,
        reply_to_id: null as string | null
      };

      // Mock conversation creation/retrieval and message insertion
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing conversation
        .mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }) // Create conversation
        .mockResolvedValueOnce({ rows: [mockMessageRow] }) // Insert message
        .mockResolvedValueOnce({ rows: [] }); // Update conversation

      const result = await messageService.sendMessage(senderId, {
        recipientId,
        content,
        type: 'text',
        attachments: []
      });

      expect(result.senderId).toBe(senderId);
      expect(result.recipientId).toBe(recipientId);
      expect(result.content).toBe(content);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const senderId = uuidv4();
      const recipientId = uuidv4();
      const content = 'Test message';

      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(messageService.sendMessage(senderId, {
        recipientId,
        content,
        type: 'text',
        attachments: []
      })).rejects.toThrow('Failed to send message');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('should create a direct conversation successfully', async () => {
      const conversationId = uuidv4();
      const initiatorId = uuidv4();
      const participantId = uuidv4();

      const mockConversationRow = {
        id: conversationId,
        participants: JSON.stringify([initiatorId, participantId].sort()),
        type: 'direct',
        last_activity: new Date(),
        unread_count: JSON.stringify({ [initiatorId]: 0, [participantId]: 0 })
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing conversation
        .mockResolvedValueOnce({ rows: [mockConversationRow] }); // Create conversation

      const result = await messageService.createConversation({
        initiatorId,
        participantIds: [participantId],
        type: 'direct'
      });

      expect(result.id).toBe(conversationId);
      expect(result.participants).toEqual([initiatorId, participantId].sort());
      expect(result.type).toBe('direct');
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read successfully', async () => {
      const conversationId = uuidv4();
      const userId = uuidv4();
      const messageIds = [uuidv4(), uuidv4()];

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ read_by_json: '[]' }] }) // First message
        .mockResolvedValueOnce({ rows: [] }) // Update first message
        .mockResolvedValueOnce({ rows: [{ read_by_json: '[]' }] }) // Second message
        .mockResolvedValueOnce({ rows: [] }) // Update second message
        .mockResolvedValueOnce({ rows: [] }) // Update conversation unread count
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await messageService.markMessagesAsRead(conversationId, userId, messageIds);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('editMessage', () => {
    it('should edit message successfully', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();
      const newContent = 'Updated message content';
      const timestamp = new Date();

      const mockUpdatedRow = {
        id: messageId,
        sender_id: userId,
        recipient_id: uuidv4(),
        group_id: null as string | null,
        conversation_id: uuidv4(),
        content: newContent,
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: '[]',
        sync_status: 'synced',
        is_edited: true,
        edited_at: new Date(),
        reply_to_id: null as string | null
      };

      mockClient.query.mockResolvedValue({ rows: [mockUpdatedRow] });

      const result = await messageService.editMessage(messageId, userId, newContent);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        [newContent, messageId, userId]
      );

      expect(result.content).toBe(newContent);
      expect(result.isEdited).toBe(true);
    });

    it('should throw error if user not authorized to edit', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();
      const newContent = 'Updated content';

      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(messageService.editMessage(messageId, userId, newContent))
        .rejects.toThrow('Failed to edit message');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rowCount: 1 });

      await messageService.deleteMessage(messageId, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
        [messageId, userId]
      );
    });

    it('should throw error if user not authorized to delete', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await expect(messageService.deleteMessage(messageId, userId))
        .rejects.toThrow('Failed to delete message');
    });
  });

  describe('getConversationMessages', () => {
    it('should fetch messages in a conversation', async () => {
      const conversationId = uuidv4();
      const userId = uuidv4();
      const pagination = { page: 1, limit: 20 };

      const mockMessages = [
        {
          id: uuidv4(),
          sender_id: userId,
          recipient_id: uuidv4(),
          group_id: null as string | null,
          conversation_id: conversationId,
          content: 'Hello',
          type: 'text',
          attachments_json: '[]',
          timestamp: new Date(),
          read_by_json: '[]',
          sync_status: 'synced',
          is_edited: false,
          edited_at: null as Date | null,
          reply_to_id: null as string | null
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ participants: JSON.stringify([userId, uuidv4()]) }] }) // Verify user in conversation
        .mockResolvedValueOnce({ rows: mockMessages }) // Get messages
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // Count messages

      const result = await messageService.getConversationMessages(conversationId, userId, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.senderId).toBe(userId);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return unread message count for user', async () => {
      const userId = uuidv4();
      const expectedCount = 5;

      mockClient.query.mockResolvedValue({ rows: [{ total_unread: expectedCount.toString() }] });

      const result = await messageService.getUnreadMessageCount(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(SUM((unread_count->>$1)::int), 0) as total_unread'),
        [userId]
      );

      expect(result).toBe(expectedCount);
    });
  });
});