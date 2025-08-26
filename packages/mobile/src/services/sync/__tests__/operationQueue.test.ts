/**
 * Operation Queue Tests
 */

import { OperationQueue } from '../operationQueue'
import { OperationType, ResourceType, SyncPriority } from '../types'
import { DatabaseService, StorageService } from '../../storage/types'

// Mock database service
const mockDb: jest.Mocked<DatabaseService> = {
  query: jest.fn(),
  queryFirst: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
  initialize: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

// Mock storage service
const mockStorage: jest.Mocked<StorageService> = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn()
}

describe('OperationQueue', () => {
  let operationQueue: OperationQueue

  beforeEach(() => {
    jest.clearAllMocks()
    operationQueue = new OperationQueue(mockDb, mockStorage)
  })

  describe('queueOperation', () => {
    it('should queue a new operation', async () => {
      const operationId = await operationQueue.queueOperation(
        OperationType.CREATE,
        ResourceType.POST,
        { title: 'Test Post', content: 'Test content' }
      )

      expect(operationId).toBeDefined()
      expect(operationId).toMatch(/^op_\d+_[a-z0-9]+$/)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO offline_operations'),
        expect.arrayContaining([
          operationId,
          OperationType.CREATE,
          ResourceType.POST,
          null,
          expect.stringContaining('Test Post'),
          SyncPriority.MEDIUM,
          0,
          3,
          expect.any(String),
          expect.any(String),
          null
        ])
      )
    })

    it('should queue operation with custom options', async () => {
      const operationId = await operationQueue.queueOperation(
        OperationType.UPDATE,
        ResourceType.POST,
        { id: '123', title: 'Updated Post' },
        {
          resourceId: '123',
          priority: SyncPriority.HIGH,
          maxRetries: 5
        }
      )

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO offline_operations'),
        expect.arrayContaining([
          operationId,
          OperationType.UPDATE,
          ResourceType.POST,
          '123',
          expect.stringContaining('Updated Post'),
          SyncPriority.HIGH,
          0,
          5,
          expect.any(String),
          expect.any(String),
          null
        ])
      )
    })
  })

  describe('getPendingOperations', () => {
    it('should return pending operations sorted by priority', async () => {
      const mockRows = [
        {
          id: 'op1',
          operation_type: OperationType.CREATE,
          resource_type: ResourceType.POST,
          resource_id: null,
          data: '{"title":"Post 1"}',
          priority: SyncPriority.HIGH,
          retry_count: 0,
          max_retries: 3,
          created_at: '2023-01-01T00:00:00Z',
          scheduled_at: '2023-01-01T00:00:00Z',
          last_attempt_at: null,
          error_message: null,
          conflict_resolution: null
        },
        {
          id: 'op2',
          operation_type: OperationType.UPDATE,
          resource_type: ResourceType.POST,
          resource_id: '123',
          data: '{"title":"Post 2"}',
          priority: SyncPriority.MEDIUM,
          retry_count: 1,
          max_retries: 3,
          created_at: '2023-01-01T00:01:00Z',
          scheduled_at: '2023-01-01T00:01:00Z',
          last_attempt_at: '2023-01-01T00:02:00Z',
          error_message: 'Network error',
          conflict_resolution: null
        }
      ]

      mockDb.query.mockResolvedValue(mockRows)

      const operations = await operationQueue.getPendingOperations()

      expect(operations).toHaveLength(2)
      expect(operations[0].id).toBe('op1')
      expect(operations[0].type).toBe(OperationType.CREATE)
      expect(operations[0].priority).toBe(SyncPriority.HIGH)
      expect(operations[0].data).toEqual({ title: 'Post 1' })

      expect(operations[1].id).toBe('op2')
      expect(operations[1].retryCount).toBe(1)
      expect(operations[1].errorMessage).toBe('Network error')
    })

    it('should limit results when limit is specified', async () => {
      mockDb.query.mockResolvedValue([])

      await operationQueue.getPendingOperations(5)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5')
      )
    })
  })

  describe('getFailedOperations', () => {
    it('should return operations that exceeded max retries', async () => {
      const mockRows = [
        {
          id: 'failed_op',
          operation_type: OperationType.CREATE,
          resource_type: ResourceType.POST,
          resource_id: null,
          data: '{"title":"Failed Post"}',
          priority: SyncPriority.MEDIUM,
          retry_count: 3,
          max_retries: 3,
          created_at: '2023-01-01T00:00:00Z',
          scheduled_at: '2023-01-01T00:00:00Z',
          last_attempt_at: '2023-01-01T00:05:00Z',
          error_message: 'Validation failed',
          conflict_resolution: null
        }
      ]

      mockDb.query.mockResolvedValue(mockRows)

      const failedOps = await operationQueue.getFailedOperations()

      expect(failedOps).toHaveLength(1)
      expect(failedOps[0].id).toBe('failed_op')
      expect(failedOps[0].retryCount).toBe(3)
      expect(failedOps[0].maxRetries).toBe(3)
    })
  })

  describe('updateOperationRetry', () => {
    it('should update retry count and error message', async () => {
      const mockOperation = {
        id: 'op1',
        operation_type: OperationType.CREATE,
        resource_type: ResourceType.POST,
        resource_id: null,
        data: '{}',
        priority: SyncPriority.MEDIUM,
        retry_count: 1,
        max_retries: 3,
        created_at: '2023-01-01T00:00:00Z',
        scheduled_at: '2023-01-01T00:00:00Z',
        last_attempt_at: null,
        error_message: null,
        conflict_resolution: null
      }

      mockDb.queryFirst.mockResolvedValue(mockOperation)

      await operationQueue.updateOperationRetry('op1', 'Network timeout')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offline_operations'),
        expect.arrayContaining([
          2, // retry_count + 1
          'Network timeout',
          expect.any(String), // scheduled_at
          'op1'
        ])
      )
    })

    it('should schedule next retry with exponential backoff', async () => {
      const mockOperation = {
        id: 'op1',
        operation_type: OperationType.CREATE,
        resource_type: ResourceType.POST,
        resource_id: null,
        data: '{}',
        priority: SyncPriority.MEDIUM,
        retry_count: 2,
        max_retries: 3,
        created_at: '2023-01-01T00:00:00Z',
        scheduled_at: '2023-01-01T00:00:00Z',
        last_attempt_at: null,
        error_message: null,
        conflict_resolution: null
      }

      mockDb.queryFirst.mockResolvedValue(mockOperation)

      const beforeTime = Date.now()
      await operationQueue.updateOperationRetry('op1', 'Another error')
      const afterTime = Date.now()

      // Verify that scheduled_at is in the future (with backoff)
      const scheduledAtArg = mockDb.execute.mock.calls[0][1][2]
      const scheduledTime = new Date(scheduledAtArg).getTime()
      
      // Should be scheduled at least 4 seconds in the future (2^2 * 1000ms base delay)
      expect(scheduledTime).toBeGreaterThan(beforeTime + 3000)
    })
  })

  describe('removeOperation', () => {
    it('should delete operation from database', async () => {
      await operationQueue.removeOperation('op1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM offline_operations WHERE id = ?',
        ['op1']
      )
    })
  })

  describe('clearQueue', () => {
    it('should delete all operations', async () => {
      await operationQueue.clearQueue()

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM offline_operations'
      )
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Mock count queries
      mockDb.queryFirst
        .mockResolvedValueOnce({ count: 5 }) // pending
        .mockResolvedValueOnce({ count: 2 }) // failed
        .mockResolvedValueOnce({ count: 7 }) // total

      // Mock priority stats
      mockDb.query
        .mockResolvedValueOnce([
          { priority: SyncPriority.HIGH, count: 3 },
          { priority: SyncPriority.MEDIUM, count: 2 }
        ])
        .mockResolvedValueOnce([
          { operation_type: OperationType.CREATE, count: 4 },
          { operation_type: OperationType.UPDATE, count: 3 }
        ])

      const stats = await operationQueue.getQueueStats()

      expect(stats.pending).toBe(5)
      expect(stats.failed).toBe(2)
      expect(stats.total).toBe(7)
      expect(stats.byPriority[SyncPriority.HIGH]).toBe(3)
      expect(stats.byPriority[SyncPriority.MEDIUM]).toBe(2)
      expect(stats.byType[OperationType.CREATE]).toBe(4)
      expect(stats.byType[OperationType.UPDATE]).toBe(3)
    })
  })
})