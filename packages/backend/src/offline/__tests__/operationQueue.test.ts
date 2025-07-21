import { OperationQueue } from '../queue/operationQueue';
import { SQLiteStorage } from '../storage/sqliteStorage';
import { OfflineStorageConfig } from '../types';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('OperationQueue', () => {
  let operationQueue: OperationQueue;
  let storage: SQLiteStorage;
  let config: OfflineStorageConfig;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `queue-test-${Date.now()}.db`;
    config = {
      dbPath: testDbPath,
      maxCacheSize: 50,
      maxRetries: 3,
      retryDelay: 100,
      syncInterval: 1000,
      priorityLevels: {
        high: 24,
        medium: 12,
        low: 6
      }
    };
    storage = new SQLiteStorage(config);
    operationQueue = new OperationQueue(storage, config);
  });

  afterEach(() => {
    operationQueue.stopProcessing();
    storage.close();
    const fullPath = join(process.cwd(), 'data', 'offline', testDbPath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  describe('Basic Queue Operations', () => {
    it('should enqueue operations', () => {
      const operationId = operationQueue.enqueue({
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'Test Resource' },
        maxRetries: 3,
        userId: 'user-1'
      });

      expect(operationId).toBeTruthy();
      expect(typeof operationId).toBe('string');

      const pendingOps = operationQueue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.id).toBe(operationId);
    });

    it('should get pending operations for specific user', () => {
      const user1OpId = operationQueue.enqueue({
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'User 1 Resource' },
        maxRetries: 3,
        userId: 'user-1'
      });

      const user2OpId = operationQueue.enqueue({
        type: 'update',
        entity: 'profile',
        entityId: 'profile-2',
        data: { name: 'Updated Name' },
        maxRetries: 3,
        userId: 'user-2'
      });

      const user1Ops = operationQueue.getPendingOperations('user-1');
      const user2Ops = operationQueue.getPendingOperations('user-2');
      const allOps = operationQueue.getPendingOperations();

      expect(user1Ops).toHaveLength(1);
      expect(user2Ops).toHaveLength(1);
      expect(allOps).toHaveLength(2);
      expect(user1Ops[0]?.userId).toBe('user-1');
      expect(user2Ops[0]?.userId).toBe('user-2');
    });

    it('should mark operations as completed', () => {
      const operationId = operationQueue.enqueue({
        type: 'delete',
        entity: 'message',
        entityId: 'message-1',
        data: {},
        maxRetries: 3,
        userId: 'user-1'
      });

      expect(operationQueue.getPendingOperations()).toHaveLength(1);

      operationQueue.markCompleted(operationId);
      expect(operationQueue.getPendingOperations()).toHaveLength(0);
    });

    it('should mark operations as failed and handle retries', () => {
      const operationId = operationQueue.enqueue({
        type: 'update',
        entity: 'community',
        entityId: 'community-1',
        data: { name: 'Updated Community' },
        maxRetries: 2,
        userId: 'user-1'
      });

      // First failure - should still be pending
      operationQueue.markFailed(operationId, 1, 2);
      expect(operationQueue.getPendingOperations()).toHaveLength(1);

      // Second failure - should reach max retries and be marked as failed
      operationQueue.markFailed(operationId, 2, 2);
      expect(operationQueue.getPendingOperations()).toHaveLength(0);
    });

    it('should remove operations from queue', () => {
      const operationId = operationQueue.enqueue({
        type: 'create',
        entity: 'resource',
        entityId: 'resource-1',
        data: { title: 'To be removed' },
        maxRetries: 3,
        userId: 'user-1'
      });

      expect(operationQueue.getPendingOperations()).toHaveLength(1);

      operationQueue.removeOperation(operationId);
      expect(operationQueue.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('Specific Operation Types', () => {
    it('should enqueue resource operations', () => {
      const resourceData = {
        title: 'Math Worksheet',
        description: 'Basic algebra problems',
        type: 'document'
      };

      const operationId = operationQueue.enqueueResourceOperation(
        'create',
        'resource-123',
        resourceData,
        'teacher-1'
      );

      const pendingOps = operationQueue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.entity).toBe('resource');
      expect(pendingOps[0]?.type).toBe('create');
      expect(pendingOps[0]?.data).toEqual(resourceData);
    });

    it('should enqueue message operations', () => {
      const messageData = {
        content: 'Hello, how are you?',
        recipientId: 'teacher-2',
        type: 'text'
      };

      const operationId = operationQueue.enqueueMessageOperation(
        'create',
        'message-456',
        messageData,
        'teacher-1'
      );

      const pendingOps = operationQueue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.entity).toBe('message');
      expect(pendingOps[0]?.data).toEqual(messageData);
    });

    it('should enqueue profile operations', () => {
      const profileData = {
        fullName: 'John Teacher',
        subjects: ['Mathematics', 'Physics'],
        yearsExperience: 5
      };

      const operationId = operationQueue.enqueueProfileOperation(
        'update',
        'profile-789',
        profileData,
        'teacher-1'
      );

      const pendingOps = operationQueue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.entity).toBe('profile');
      expect(pendingOps[0]?.type).toBe('update');
    });

    it('should enqueue community operations', () => {
      const communityData = {
        name: 'Science Teachers Uganda',
        description: 'A community for science educators',
        type: 'subject'
      };

      const operationId = operationQueue.enqueueCommunityOperation(
        'create',
        'community-101',
        communityData,
        'teacher-1'
      );

      const pendingOps = operationQueue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0]?.entity).toBe('community');
      expect(pendingOps[0]?.data).toEqual(communityData);
    });
  });

  describe('Queue Statistics', () => {
    it('should return queue statistics', () => {
      // Add some operations
      operationQueue.enqueueResourceOperation('create', 'res-1', {}, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'msg-1', {}, 'user-1');

      const stats = operationQueue.getQueueStats();

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('completed');
      expect(stats.pending).toBeGreaterThan(0);
    });

    it('should get operations by entity type', () => {
      operationQueue.enqueueResourceOperation('create', 'res-1', {}, 'user-1');
      operationQueue.enqueueResourceOperation('update', 'res-2', {}, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'msg-1', {}, 'user-1');

      const resourceOps = operationQueue.getOperationsByEntity('resource');
      const messageOps = operationQueue.getOperationsByEntity('message');

      expect(resourceOps).toHaveLength(2);
      expect(messageOps).toHaveLength(1);
      expect(resourceOps.every(op => op.entity === 'resource')).toBe(true);
      expect(messageOps.every(op => op.entity === 'message')).toBe(true);
    });

    it('should filter operations by entity and user', () => {
      operationQueue.enqueueResourceOperation('create', 'res-1', {}, 'user-1');
      operationQueue.enqueueResourceOperation('create', 'res-2', {}, 'user-2');
      operationQueue.enqueueMessageOperation('create', 'msg-1', {}, 'user-1');

      const user1ResourceOps = operationQueue.getOperationsByEntity('resource', 'user-1');
      const user2ResourceOps = operationQueue.getOperationsByEntity('resource', 'user-2');

      expect(user1ResourceOps).toHaveLength(1);
      expect(user2ResourceOps).toHaveLength(1);
      expect(user1ResourceOps[0]?.userId).toBe('user-1');
      expect(user2ResourceOps[0]?.userId).toBe('user-2');
    });
  });

  describe('Queue Processing', () => {
    it('should start and stop processing', () => {
      expect(() => operationQueue.startProcessing()).not.toThrow();
      expect(() => operationQueue.stopProcessing()).not.toThrow();
    });

    it('should handle multiple start/stop calls gracefully', () => {
      operationQueue.startProcessing();
      operationQueue.startProcessing(); // Should not cause issues
      
      operationQueue.stopProcessing();
      operationQueue.stopProcessing(); // Should not cause issues
    });
  });

  describe('Cleanup Operations', () => {
    it('should clear old operations', () => {
      // Add some operations
      operationQueue.enqueueResourceOperation('create', 'res-1', {}, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'msg-1', {}, 'user-1');

      expect(() => operationQueue.clearOldOperations(24)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operation data gracefully', () => {
      // Test with circular reference that can't be JSON serialized
      const circularData: any = {};
      circularData.self = circularData;

      expect(() => {
        operationQueue.enqueue({
          type: 'create',
          entity: 'resource',
          entityId: 'resource-1',
          data: circularData,
          maxRetries: 3,
          userId: 'user-1'
        });
      }).toThrow();
    });

    it('should handle non-existent operation IDs gracefully', () => {
      expect(() => operationQueue.markCompleted('non-existent-id')).not.toThrow();
      expect(() => operationQueue.markFailed('non-existent-id', 1)).not.toThrow();
      expect(() => operationQueue.removeOperation('non-existent-id')).not.toThrow();
    });

    it('should return empty array for pending operations when storage fails', () => {
      // Close storage to simulate failure
      storage.close();
      
      const pendingOps = operationQueue.getPendingOperations();
      expect(Array.isArray(pendingOps)).toBe(true);
      expect(pendingOps).toHaveLength(0);
    });
  });
});