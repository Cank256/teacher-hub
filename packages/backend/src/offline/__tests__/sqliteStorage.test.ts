import { SQLiteStorage } from '../storage/sqliteStorage';
import { OfflineOperation, OfflineStorageConfig, OfflineResource, OfflineMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('SQLiteStorage', () => {
  let storage: SQLiteStorage;
  let config: OfflineStorageConfig;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `test-${Date.now()}.db`;
    config = {
      dbPath: testDbPath,
      maxCacheSize: 100, // 100MB
      maxRetries: 3,
      retryDelay: 1000,
      syncInterval: 5000,
      priorityLevels: {
        high: 24,
        medium: 12,
        low: 6
      }
    };
    storage = new SQLiteStorage(config);
  });

  afterEach(() => {
    storage.close();
    const fullPath = join(process.cwd(), 'data', 'offline', testDbPath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  describe('Operations Queue', () => {
    it('should add and retrieve operations', () => {
      const operation: OfflineOperation = {
        id: uuidv4(),
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'Test Resource' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        userId: 'user-1'
      };

      storage.addOperation(operation);
      const pendingOps = storage.getPendingOperations();

      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.id).toBe(operation.id);
      expect(pendingOps[0]?.type).toBe('create');
      expect(pendingOps[0]?.entity).toBe('resource');
    });

    it('should update operation status', () => {
      const operation: OfflineOperation = {
        id: uuidv4(),
        type: 'update',
        entity: 'message',
        entityId: 'message-1',
        data: { content: 'Updated message' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        userId: 'user-1'
      };

      storage.addOperation(operation);
      storage.updateOperationStatus(operation.id, 'completed');

      const pendingOps = storage.getPendingOperations();
      expect(pendingOps).toHaveLength(0);
    });

    it('should filter operations by user', () => {
      const operation1: OfflineOperation = {
        id: uuidv4(),
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'Resource 1' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        userId: 'user-1'
      };

      const operation2: OfflineOperation = {
        id: uuidv4(),
        type: 'create',
        entity: 'resource',
        entityId: 'resource-2',
        data: { title: 'Resource 2' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        userId: 'user-2'
      };

      storage.addOperation(operation1);
      storage.addOperation(operation2);

      const user1Ops = storage.getPendingOperations('user-1');
      const user2Ops = storage.getPendingOperations('user-2');

      expect(user1Ops).toHaveLength(1);
      expect(user2Ops).toHaveLength(1);
      expect(user1Ops[0]?.userId).toBe('user-1');
      expect(user2Ops[0]?.userId).toBe('user-2');
    });

    it('should delete operations', () => {
      const operation: OfflineOperation = {
        id: uuidv4(),
        type: 'delete',
        entity: 'resource',
        entityId: 'resource-1',
        data: {},
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        userId: 'user-1'
      };

      storage.addOperation(operation);
      expect(storage.getPendingOperations()).toHaveLength(1);

      storage.deleteOperation(operation.id);
      expect(storage.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should set and get cache entries', () => {
      const testData = { message: 'Hello World', timestamp: Date.now() };
      const key = 'test-key';

      storage.setCache(key, testData, 'medium');
      const retrieved = storage.getCache(key);

      expect(retrieved).toEqual(testData);
    });

    it('should handle cache expiration', () => {
      const testData = { message: 'Expiring data' };
      const key = 'expiring-key';
      const expiresAt = new Date(Date.now() + 100); // Expires in 100ms

      storage.setCache(key, testData, 'low', expiresAt);
      
      // Should be available immediately
      expect(storage.getCache(key)).toEqual(testData);

      // Wait for expiration and check again
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(storage.getCache(key)).toBeNull();
          resolve();
        }, 150);
      });
    });

    it('should delete cache entries', () => {
      const testData = { message: 'To be deleted' };
      const key = 'delete-key';

      storage.setCache(key, testData);
      expect(storage.getCache(key)).toEqual(testData);

      storage.deleteCache(key);
      expect(storage.getCache(key)).toBeNull();
    });

    it('should handle different priority levels', () => {
      const highPriorityData = { priority: 'high' };
      const mediumPriorityData = { priority: 'medium' };
      const lowPriorityData = { priority: 'low' };

      storage.setCache('high-key', highPriorityData, 'high');
      storage.setCache('medium-key', mediumPriorityData, 'medium');
      storage.setCache('low-key', lowPriorityData, 'low');

      expect(storage.getCache('high-key')).toEqual(highPriorityData);
      expect(storage.getCache('medium-key')).toEqual(mediumPriorityData);
      expect(storage.getCache('low-key')).toEqual(lowPriorityData);
    });
  });

  describe('Storage Quota', () => {
    it('should calculate storage quota', () => {
      const quota = storage.getStorageQuota();

      expect(quota).toHaveProperty('total');
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('critical');
      expect(typeof quota.critical).toBe('boolean');
    });
  });

  describe('Offline Resources', () => {
    it('should add and retrieve offline resources', () => {
      const resource: OfflineResource = {
        id: 'resource-1',
        title: 'Test Resource',
        description: 'A test resource for offline access',
        type: 'document',
        localPath: '/local/path/resource.pdf',
        originalUrl: 'https://example.com/resource.pdf',
        size: 1024000,
        downloadedAt: new Date(),
        lastAccessedAt: new Date(),
        priority: 'high',
        isComplete: true
      };

      storage.addOfflineResource(resource);
      const retrieved = storage.getOfflineResource('resource-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe('resource-1');
      expect(retrieved?.title).toBe('Test Resource');
      expect(retrieved?.isComplete).toBe(true);
    });

    it('should return null for non-existent resources', () => {
      const retrieved = storage.getOfflineResource('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Offline Messages', () => {
    it('should add and retrieve offline messages', () => {
      const message: OfflineMessage = {
        id: 'message-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: 'Hello offline world!',
        type: 'text',
        timestamp: new Date(),
        syncStatus: 'pending',
        localOnly: false
      };

      storage.addOfflineMessage(message);
      const messages = storage.getOfflineMessages('user-1');

      expect(messages).toHaveLength(1);
      expect(messages[0]?.id).toBe('message-1');
      expect(messages[0]?.content).toBe('Hello offline world!');
    });

    it('should retrieve messages for both sender and recipient', () => {
      const message1: OfflineMessage = {
        id: 'message-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: 'Message from user 1',
        type: 'text',
        timestamp: new Date(),
        syncStatus: 'synced',
        localOnly: false
      };

      const message2: OfflineMessage = {
        id: 'message-2',
        senderId: 'user-2',
        recipientId: 'user-1',
        content: 'Reply from user 2',
        type: 'text',
        timestamp: new Date(),
        syncStatus: 'pending',
        localOnly: false
      };

      storage.addOfflineMessage(message1);
      storage.addOfflineMessage(message2);

      const user1Messages = storage.getOfflineMessages('user-1');
      const user2Messages = storage.getOfflineMessages('user-2');

      expect(user1Messages).toHaveLength(2);
      expect(user2Messages).toHaveLength(2);
    });

    it('should limit message retrieval', () => {
      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        const message: OfflineMessage = {
          id: `message-${i}`,
          senderId: 'user-1',
          recipientId: 'user-2',
          content: `Message ${i}`,
          type: 'text',
          timestamp: new Date(Date.now() + i * 1000),
          syncStatus: 'synced',
          localOnly: false
        };
        storage.addOfflineMessage(message);
      }

      const messages = storage.getOfflineMessages('user-1', 5);
      expect(messages).toHaveLength(5);
    });
  });

  describe('Cleanup', () => {
    it('should perform cleanup operations', () => {
      // Add some test data
      const operation: OfflineOperation = {
        id: uuidv4(),
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'completed',
        userId: 'user-1'
      };

      storage.addOperation(operation);
      storage.setCache('test-key', { data: 'test' });

      // Cleanup should not throw errors
      expect(() => storage.cleanup()).not.toThrow();
    });
  });
});