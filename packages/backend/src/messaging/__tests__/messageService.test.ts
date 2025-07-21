import { MessageService } from '../messageService';
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
  query: jest.fn(),
  release: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  (getConnection as jest.Mock).mockReturnValue(mockPool);
  mockPool.connect.mockResolvedValue(mockClient);
});

describe('MessageService', () => {
  let messageService: MessageService;

  beforeEach(() => {
    messageService = new MessageService();
  });

  describe('createDirectMessage', () => {
    it('should create a direct message successfully', async () => {
      const messageId = uuidv4();
      const senderId = uuidv4();
      const recipientId = uuidv4();
      const content = 'Hello, this is a test message';
      const timestamp = new Date();

      const mockMessageRow = {
        id: messageId,
        sender_id: senderId,
        recipient_id: recipientId,
        group_id: null,
        content,
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: '[]',
        sync_status: 'synced',
        is_edited: false,
        edited_at: null,
        reply_to_id: null
      };

      mockClient.query.mockResolvedValue({ rows: [mockMessageRow] });

      const result = await messageService.createDirectMessage({
        senderId,
        recipientId,
        content,
        type: 'text',
        attachments: []
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining([
          expect.any(String), // messageId
          senderId,
          recipientId,
          content,
          'text',
          '[]', // attachments
          expect.any(Date), // timestamp
          null, // replyToId
          'synced'
        ])
      );

      expect(result).toEqual({
        id: messageId,
        senderId,
        recipientId,
        groupId: null,
        content,
        type: 'text',
        attachments: [],
        timestamp,
        readBy: [],
        syncStatus: 'synced',
        isEdited: false,
        editedAt: null,
        replyToId: null
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const senderId = uuidv4();
      const recipientId = uuidv4();
      const content = 'Test message';

      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(messageService.createDirectMessage({
        senderId,
        recipientId,
        content,
        type: 'text',
        attachments: []
      })).rejects.toThrow('Failed to create direct message');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createGroupMessage', () => {
    it('should create a group message successfully', async () => {
      const messageId = uuidv4();
      const senderId = uuidv4();
      const groupId = uuidv4();
      const content = 'Hello group!';
      const timestamp = new Date();

      const mockMessageRow = {
        id: messageId,
        sender_id: senderId,
        recipient_id: null,
        group_id: groupId,
        content,
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: '[]',
        sync_status: 'synced',
        is_edited: false,
        edited_at: null,
        reply_to_id: null
      };

      mockClient.query.mockResolvedValue({ rows: [mockMessageRow] });

      const result = await messageService.createGroupMessage({
        senderId,
        groupId,
        content,
        type: 'text',
        attachments: []
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining([
          expect.any(String), // messageId
          senderId,
          groupId,
          content,
          'text',
          '[]', // attachments
          expect.any(Date), // timestamp
          null, // replyToId
          'synced'
        ])
      );

      expect(result).toEqual({
        id: messageId,
        senderId,
        recipientId: null,
        groupId,
        content,
        type: 'text',
        attachments: [],
        timestamp,
        readBy: [],
        syncStatus: 'synced',
        isEdited: false,
        editedAt: null,
        replyToId: null
      });
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read successfully', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();
      const currentReadBy = ['user1', 'user2'];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ read_by_json: JSON.stringify(currentReadBy) }] })
        .mockResolvedValueOnce({ rows: [] });

      await messageService.markMessageAsRead(messageId, userId);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        'SELECT read_by_json FROM messages WHERE id = $1',
        [messageId]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        'UPDATE messages SET read_by_json = $1 WHERE id = $2',
        [JSON.stringify([...currentReadBy, userId]), messageId]
      );
    });

    it('should not add user to readBy if already present', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();
      const currentReadBy = ['user1', userId, 'user2'];

      mockClient.query.mockResolvedValue({ rows: [{ read_by_json: JSON.stringify(currentReadBy) }] });

      await messageService.markMessageAsRead(messageId, userId);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT read_by_json FROM messages WHERE id = $1',
        [messageId]
      );
    });

    it('should throw error if message not found', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(messageService.markMessageAsRead(messageId, userId))
        .rejects.toThrow('Failed to mark message as read');
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
        group_id: null,
        content: newContent,
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: '[]',
        sync_status: 'synced',
        is_edited: true,
        edited_at: new Date(),
        reply_to_id: null
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
      const timestamp = new Date();

      const mockMessageRow = {
        id: messageId,
        sender_id: userId,
        recipient_id: uuidv4(),
        group_id: null,
        content: 'Message to delete',
        type: 'text',
        attachments_json: '[]',
        timestamp,
        read_by_json: '[]',
        sync_status: 'synced',
        is_edited: false,
        edited_at: null,
        reply_to_id: null
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockMessageRow] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await messageService.deleteMessage(messageId, userId);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
        [messageId, userId]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
        [messageId, userId]
      );

      expect(result.id).toBe(messageId);
    });

    it('should throw error if user not authorized to delete', async () => {
      const messageId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(messageService.deleteMessage(messageId, userId))
        .rejects.toThrow('Failed to delete message');
    });
  });

  describe('getDirectMessages', () => {
    it('should fetch direct messages between two users', async () => {
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const limit = 50;
      const offset = 0;

      const mockMessages = [
        {
          id: uuidv4(),
          sender_id: userId1,
          recipient_id: userId2,
          group_id: null,
          content: 'Hello',
          type: 'text',
          attachments_json: '[]',
          timestamp: new Date(),
          read_by_json: '[]',
          sync_status: 'synced',
          is_edited: false,
          edited_at: null,
          reply_to_id: null
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageService.getDirectMessages(userId1, userId2, limit, offset);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (sender_id = $1 AND recipient_id = $2)'),
        [userId1, userId2, limit, offset]
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.senderId).toBe(userId1);
      expect(result[0]?.recipientId).toBe(userId2);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return unread message count for user', async () => {
      const userId = uuidv4();
      const expectedCount = 5;

      mockClient.query.mockResolvedValue({ rows: [{ count: expectedCount.toString() }] });

      const result = await messageService.getUnreadMessageCount(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM messages'),
        [userId]
      );

      expect(result).toBe(expectedCount);
    });
  });
});