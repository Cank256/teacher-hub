import { MessageQueue } from '../messageQueue';
import { Message } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    lPush: jest.fn(),
    expire: jest.fn(),
    lRange: jest.fn(),
    del: jest.fn(),
    lLen: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    quit: jest.fn()
  }))
}));

jest.mock('../../utils/logger');

describe('MessageQueue', () => {
  let messageQueue: MessageQueue;
  let mockRedis: any;

  beforeEach(() => {
    const Redis = require('redis');
    mockRedis = Redis.createClient();
    
    // Mock the redis property directly
    messageQueue = new MessageQueue();
    (messageQueue as any).redis = mockRedis;
    
    // Simulate connected state
    (messageQueue as any).isConnected = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queueMessage', () => {
    it('should queue a message for offline user', async () => {
      const message: Message = {
        id: uuidv4(),
        senderId: uuidv4(),
        recipientId: uuidv4(),
        groupId: undefined,
        content: 'Test message',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'pending',
        isEdited: false,
        editedAt: undefined,
        replyToId: undefined
      };

      mockRedis.lPush.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await messageQueue.queueMessage(message);

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        `message_queue:${message.recipientId}`,
        expect.stringContaining(message.id)
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `message_queue:${message.recipientId}`,
        7 * 24 * 60 * 60 // 7 days
      );
    });

    it('should not queue message without recipient ID', async () => {
      const message: Message = {
        id: uuidv4(),
        senderId: uuidv4(),
        recipientId: undefined,
        groupId: uuidv4(),
        content: 'Group message',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'pending',
        isEdited: false,
        editedAt: undefined,
        replyToId: undefined
      };

      await messageQueue.queueMessage(message);

      expect(mockRedis.lPush).not.toHaveBeenCalled();
    });

    it('should handle Redis connection failure gracefully', async () => {
      (messageQueue as any).isConnected = false;

      const message: Message = {
        id: uuidv4(),
        senderId: uuidv4(),
        recipientId: uuidv4(),
        groupId: undefined,
        content: 'Test message',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'pending',
        isEdited: false,
        editedAt: undefined,
        replyToId: undefined
      };

      await messageQueue.queueMessage(message);

      expect(mockRedis.lPush).not.toHaveBeenCalled();
    });
  });

  describe('getQueuedMessages', () => {
    it('should retrieve queued messages for user', async () => {
      const userId = uuidv4();
      const messageId = uuidv4();
      const queuedMessage = {
        id: messageId,
        senderId: uuidv4(),
        recipientId: userId,
        content: 'Queued message',
        type: 'text',
        attachments: [],
        timestamp: new Date().toISOString(),
        readBy: [],
        syncStatus: 'pending',
        isEdited: false,
        queuedAt: new Date().toISOString()
      };

      mockRedis.lRange.mockResolvedValue([JSON.stringify(queuedMessage)]);

      const result = await messageQueue.getQueuedMessages(userId);

      expect(mockRedis.lRange).toHaveBeenCalledWith(
        `message_queue:${userId}`,
        0,
        -1
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(messageId);
      expect(result[0]).not.toHaveProperty('queuedAt'); // Should be removed
    });

    it('should return empty array when Redis not connected', async () => {
      (messageQueue as any).isConnected = false;
      const userId = uuidv4();

      const result = await messageQueue.getQueuedMessages(userId);

      expect(result).toEqual([]);
      expect(mockRedis.lRange).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = uuidv4();
      mockRedis.lRange.mockRejectedValue(new Error('Redis error'));

      const result = await messageQueue.getQueuedMessages(userId);

      expect(result).toEqual([]);
    });
  });

  describe('clearQueuedMessages', () => {
    it('should clear queued messages for user', async () => {
      const userId = uuidv4();
      mockRedis.del.mockResolvedValue(1);

      await messageQueue.clearQueuedMessages(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`message_queue:${userId}`);
    });

    it('should handle Redis connection failure gracefully', async () => {
      (messageQueue as any).isConnected = false;
      const userId = uuidv4();

      await messageQueue.clearQueuedMessages(userId);

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getQueuedMessageCount', () => {
    it('should return queued message count for user', async () => {
      const userId = uuidv4();
      const expectedCount = 3;
      mockRedis.lLen.mockResolvedValue(expectedCount);

      const result = await messageQueue.getQueuedMessageCount(userId);

      expect(mockRedis.lLen).toHaveBeenCalledWith(`message_queue:${userId}`);
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when Redis not connected', async () => {
      (messageQueue as any).isConnected = false;
      const userId = uuidv4();

      const result = await messageQueue.getQueuedMessageCount(userId);

      expect(result).toBe(0);
      expect(mockRedis.lLen).not.toHaveBeenCalled();
    });
  });

  describe('setUserOnlineStatus', () => {
    it('should set user online status', async () => {
      const userId = uuidv4();
      const isOnline = true;
      mockRedis.setEx.mockResolvedValue('OK');

      await messageQueue.setUserOnlineStatus(userId, isOnline);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `user_status:${userId}`,
        300, // 5 minutes
        expect.stringContaining('"isOnline":true')
      );
    });

    it('should set user offline status', async () => {
      const userId = uuidv4();
      const isOnline = false;
      mockRedis.setEx.mockResolvedValue('OK');

      await messageQueue.setUserOnlineStatus(userId, isOnline);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `user_status:${userId}`,
        300, // 5 minutes
        expect.stringContaining('"isOnline":false')
      );
    });
  });

  describe('getUserOnlineStatus', () => {
    it('should return user online status', async () => {
      const userId = uuidv4();
      const statusData = {
        isOnline: true,
        lastSeen: new Date().toISOString()
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(statusData));

      const result = await messageQueue.getUserOnlineStatus(userId);

      expect(mockRedis.get).toHaveBeenCalledWith(`user_status:${userId}`);
      expect(result).toEqual(statusData);
    });

    it('should return offline status when no data found', async () => {
      const userId = uuidv4();
      mockRedis.get.mockResolvedValue(null);

      const result = await messageQueue.getUserOnlineStatus(userId);

      expect(result?.isOnline).toBe(false);
      expect(result?.lastSeen).toBeDefined();
    });

    it('should return null when Redis not connected', async () => {
      (messageQueue as any).isConnected = false;
      const userId = uuidv4();

      const result = await messageQueue.getUserOnlineStatus(userId);

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });

  describe('queueNotification', () => {
    it('should queue notification for user', async () => {
      const userId = uuidv4();
      const notification = {
        type: 'message',
        title: 'New message',
        body: 'You have a new message'
      };

      mockRedis.lPush.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await messageQueue.queueNotification(userId, notification);

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        `notification_queue:${userId}`,
        expect.stringContaining(notification.title)
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `notification_queue:${userId}`,
        3 * 24 * 60 * 60 // 3 days
      );
    });
  });

  describe('cleanup', () => {
    it('should quit Redis connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await messageQueue.cleanup();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});