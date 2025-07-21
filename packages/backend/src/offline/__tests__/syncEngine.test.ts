import { SyncEngine } from '../sync/syncEngine';
import { SQLiteStorage } from '../storage/sqliteStorage';
import { OperationQueue } from '../queue/operationQueue';
import { OfflineStorageConfig } from '../types';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let storage: SQLiteStorage;
  let operationQueue: OperationQueue;
  let config: OfflineStorageConfig;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `sync-test-${Date.now()}.db`;
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
    syncEngine = new SyncEngine(storage, operationQueue, config);
  });

  afterEach(() => {
    syncEngine.stopBackgroundSync();
    storage.close();
    const fullPath = join(process.cwd(), 'data', 'offline', testDbPath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  describe('Background Sync', () => {
    it('should start and stop background sync', () => {
      expect(() => syncEngine.startBackgroundSync()).not.toThrow();
      expect(() => syncEngine.stopBackgroundSync()).not.toThrow();
    });

    it('should handle multiple start calls gracefully', () => {
      syncEngine.startBackgroundSync();
      syncEngine.startBackgroundSync(); // Should not cause issues
      syncEngine.stopBackgroundSync();
    });
  });

  describe('Manual Sync', () => {
    it('should perform sync with no pending operations', async () => {
      const result = await syncEngine.sync();
      
      expect(result.success).toBe(true);
      expect(result.syncedOperations).toBe(0);
      expect(result.failedOperations).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should sync pending operations', async () => {
      // Add some operations
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'message-1', { content: 'Test Message' }, 'user-1');

      const result = await syncEngine.sync();
      
      expect(result.success).toBe(true);
      expect(result.syncedOperations).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should filter operations by user', async () => {
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'User 1 Resource' }, 'user-1');
      operationQueue.enqueueResourceOperation('create', 'resource-2', { title: 'User 2 Resource' }, 'user-2');

      const result = await syncEngine.sync({ userId: 'user-1' });
      
      expect(result.success).toBe(true);
      // The exact number depends on the random success rate in the mock API
      expect(result.syncedOperations + result.failedOperations).toBeLessThanOrEqual(1);
    });

    it('should filter operations by entity type', async () => {
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'message-1', { content: 'Test Message' }, 'user-1');

      const result = await syncEngine.sync({ entityType: 'resource' });
      
      expect(result.success).toBe(true);
      // Should only sync resource operations
      expect(result.syncedOperations + result.failedOperations).toBeLessThanOrEqual(1);
    });

    it('should limit operations with maxOperations', async () => {
      // Add multiple operations
      for (let i = 0; i < 5; i++) {
        operationQueue.enqueueResourceOperation('create', `resource-${i}`, { title: `Resource ${i}` }, 'user-1');
      }

      const result = await syncEngine.sync({ maxOperations: 2 });
      
      expect(result.success).toBe(true);
      expect(result.syncedOperations + result.failedOperations).toBeLessThanOrEqual(2);
    });

    it('should prevent concurrent sync operations', async () => {
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');

      // Start first sync
      const firstSync = syncEngine.sync();
      
      // Try to start second sync while first is running
      await expect(syncEngine.sync()).rejects.toThrow('Sync already in progress');
      
      // Wait for first sync to complete
      await firstSync;
    });
  });

  describe('Sync Status', () => {
    it('should return current sync status', () => {
      const status = syncEngine.getSyncStatus();
      
      expect(status).toHaveProperty('lastSyncAt');
      expect(status).toHaveProperty('pendingOperations');
      expect(status).toHaveProperty('failedOperations');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('syncInProgress');
      expect(typeof status.pendingOperations).toBe('number');
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.syncInProgress).toBe('boolean');
    });

    it('should show sync in progress during sync', async () => {
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');

      // Start sync but don't wait for completion
      const syncPromise = syncEngine.sync();
      
      // Check status immediately
      const status = syncEngine.getSyncStatus();
      expect(status.syncInProgress).toBe(true);
      
      // Wait for sync to complete
      await syncPromise;
      
      // Check status after completion
      const finalStatus = syncEngine.getSyncStatus();
      expect(finalStatus.syncInProgress).toBe(false);
    });
  });

  describe('Force Sync Entity', () => {
    it('should sync specific entity', async () => {
      operationQueue.enqueueResourceOperation('update', 'resource-123', { title: 'Updated Resource' }, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'message-456', { content: 'Test Message' }, 'user-1');

      const result = await syncEngine.forceSyncEntity('resource', 'resource-123', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.syncedOperations + result.failedOperations).toBeLessThanOrEqual(1);
    });

    it('should return success for non-existent entity', async () => {
      const result = await syncEngine.forceSyncEntity('resource', 'non-existent', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.syncedOperations).toBe(0);
      expect(result.failedOperations).toBe(0);
    });
  });

  describe('Incremental Changes', () => {
    it('should get incremental changes since timestamp', async () => {
      const baseTime = new Date();
      
      // Add operation before base time
      operationQueue.enqueueResourceOperation('create', 'resource-old', { title: 'Old Resource' }, 'user-1');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add operations after base time
      operationQueue.enqueueResourceOperation('create', 'resource-new', { title: 'New Resource' }, 'user-1');
      operationQueue.enqueueMessageOperation('create', 'message-new', { content: 'New Message' }, 'user-1');

      const changes = await syncEngine.getIncrementalChanges(baseTime, 'user-1');
      
      // Should only get the newer operations
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.every(op => op.timestamp > baseTime)).toBe(true);
    });

    it('should return empty array when no changes since timestamp', async () => {
      const futureTime = new Date(Date.now() + 10000); // 10 seconds in future
      
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');

      const changes = await syncEngine.getIncrementalChanges(futureTime, 'user-1');
      
      expect(changes).toHaveLength(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle sync operations with potential conflicts', async () => {
      // Add multiple operations to increase chance of conflicts
      for (let i = 0; i < 20; i++) {
        operationQueue.enqueueResourceOperation('update', `resource-${i}`, { title: `Resource ${i}` }, 'user-1');
      }

      const result = await syncEngine.sync();
      
      expect(result.success).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);
      
      // If there were conflicts, they should be properly structured
      result.conflicts.forEach(conflict => {
        expect(conflict).toHaveProperty('id');
        expect(conflict).toHaveProperty('entityType');
        expect(conflict).toHaveProperty('entityId');
        expect(conflict).toHaveProperty('conflictType');
        expect(conflict).toHaveProperty('resolution');
      });
    });
  });

  describe('Cleanup', () => {
    it('should perform cleanup operations', () => {
      operationQueue.enqueueResourceOperation('create', 'resource-1', { title: 'Test Resource' }, 'user-1');
      
      expect(() => syncEngine.cleanup()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      // Add many operations to increase chance of errors
      for (let i = 0; i < 50; i++) {
        operationQueue.enqueueResourceOperation('create', `resource-${i}`, { title: `Resource ${i}` }, 'user-1');
      }

      const result = await syncEngine.sync();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      
      // Even with errors, the result should be structured properly
      expect(typeof result.syncedOperations).toBe('number');
      expect(typeof result.failedOperations).toBe('number');
    });

    it('should handle network simulation errors', async () => {
      // The mock API has a 5% chance of network errors
      // Run multiple operations to potentially trigger errors
      for (let i = 0; i < 30; i++) {
        operationQueue.enqueueResourceOperation('create', `resource-${i}`, { title: `Resource ${i}` }, 'user-1');
      }

      const result = await syncEngine.sync();
      
      // Should complete without throwing
      expect(result).toHaveProperty('success');
      expect(result.syncedOperations + result.failedOperations).toBeGreaterThan(0);
    });
  });
});