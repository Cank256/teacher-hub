/**
 * Base Repository Tests
 */

import { BaseRepository } from '../repositories/baseRepository'
import { BaseModel, QueryFilters } from '../models'
import { DatabaseService, StorageError } from '../types'

// Test model interface
interface TestModel extends BaseModel {
  name: string
  email: string
}

// Test repository implementation
class TestRepository extends BaseRepository<TestModel> {
  constructor(mockDb: DatabaseService) {
    super('test_table', mockDb)
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository
  let mockDb: jest.Mocked<DatabaseService>

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryFirst: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      initialize: jest.fn()
    } as jest.Mocked<DatabaseService>

    repository = new TestRepository(mockDb)
  })

  describe('findById', () => {
    it('should find record by ID', async () => {
      const mockRecord: TestModel = {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      mockDb.queryFirst.mockResolvedValue(mockRecord)

      const result = await repository.findById('1')

      expect(result).toEqual(mockRecord)
      expect(mockDb.queryFirst).toHaveBeenCalledWith('SELECT * FROM test_table WHERE id = ?', ['1'])
    })

    it('should return null for non-existent record', async () => {
      mockDb.queryFirst.mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw StorageError on database error', async () => {
      mockDb.queryFirst.mockRejectedValue(new Error('Database error'))

      await expect(repository.findById('1'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('findAll', () => {
    it('should find all records without filters', async () => {
      const mockRecords: TestModel[] = [
        {
          id: '1',
          name: 'John',
          email: 'john@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      mockDb.query.mockResolvedValue(mockRecords)

      const result = await repository.findAll()

      expect(result).toEqual(mockRecords)
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM test_table', [])
    })

    it('should find records with where filters', async () => {
      const filters: QueryFilters = {
        where: { name: 'John', email: 'john@example.com' }
      }
      mockDb.query.mockResolvedValue([])

      await repository.findAll(filters)

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? AND email = ?',
        ['John', 'john@example.com']
      )
    })

    it('should find records with ordering', async () => {
      const filters: QueryFilters = {
        orderBy: 'created_at',
        orderDirection: 'DESC'
      }
      mockDb.query.mockResolvedValue([])

      await repository.findAll(filters)

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table ORDER BY created_at DESC',
        []
      )
    })

    it('should find records with limit and offset', async () => {
      const filters: QueryFilters = {
        limit: 10,
        offset: 20
      }
      mockDb.query.mockResolvedValue([])

      await repository.findAll(filters)

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table LIMIT ? OFFSET ?',
        [10, 20]
      )
    })
  })

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      const mockRecords: TestModel[] = [
        {
          id: '1',
          name: 'John',
          email: 'john@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockDb.queryFirst.mockResolvedValue({ total: 25 })
      mockDb.query.mockResolvedValue(mockRecords)

      const result = await repository.findPaginated({ limit: 10, offset: 0 })

      expect(result).toEqual({
        data: mockRecords,
        total: 25,
        hasMore: true,
        nextOffset: 10
      })
    })

    it('should indicate no more results when at end', async () => {
      const mockRecords: TestModel[] = []
      
      mockDb.queryFirst.mockResolvedValue({ total: 5 })
      mockDb.query.mockResolvedValue(mockRecords)

      const result = await repository.findPaginated({ limit: 10, offset: 10 })

      expect(result).toEqual({
        data: mockRecords,
        total: 5,
        hasMore: false,
        nextOffset: undefined
      })
    })
  })

  describe('create', () => {
    it('should create new record', async () => {
      const newRecord = { name: 'John', email: 'john@example.com' }
      const createdRecord: TestModel = {
        id: 'generated-id',
        ...newRecord,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockDb.insert.mockResolvedValue(1)
      mockDb.queryFirst.mockResolvedValue(createdRecord)

      const result = await repository.create(newRecord)

      expect(result).toEqual(createdRecord)
      expect(mockDb.insert).toHaveBeenCalledWith('test_table', expect.objectContaining({
        ...newRecord,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      }))
    })

    it('should throw error if created record cannot be retrieved', async () => {
      mockDb.insert.mockResolvedValue(1)
      mockDb.queryFirst.mockResolvedValue(null)

      await expect(repository.create({ name: 'John', email: 'john@example.com' }))
        .rejects.toThrow(StorageError)
    })
  })

  describe('update', () => {
    it('should update existing record', async () => {
      const updatedRecord: TestModel = {
        id: '1',
        name: 'John Updated',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      }

      mockDb.update.mockResolvedValue(1)
      mockDb.queryFirst.mockResolvedValue(updatedRecord)

      const result = await repository.update('1', { name: 'John Updated' })

      expect(result).toEqual(updatedRecord)
      expect(mockDb.update).toHaveBeenCalledWith(
        'test_table',
        expect.objectContaining({
          name: 'John Updated',
          updated_at: expect.any(String)
        }),
        'id = ?',
        ['1']
      )
    })

    it('should return null if no records were updated', async () => {
      mockDb.update.mockResolvedValue(0)

      const result = await repository.update('nonexistent', { name: 'Updated' })

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete record and return true', async () => {
      mockDb.delete.mockResolvedValue(1)

      const result = await repository.delete('1')

      expect(result).toBe(true)
      expect(mockDb.delete).toHaveBeenCalledWith('test_table', 'id = ?', ['1'])
    })

    it('should return false if no records were deleted', async () => {
      mockDb.delete.mockResolvedValue(0)

      const result = await repository.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('deleteMany', () => {
    it('should delete multiple records', async () => {
      mockDb.delete.mockResolvedValue(3)

      const result = await repository.deleteMany(['1', '2', '3'])

      expect(result).toBe(3)
      expect(mockDb.delete).toHaveBeenCalledWith(
        'test_table',
        'id IN (?, ?, ?)',
        ['1', '2', '3']
      )
    })

    it('should return 0 for empty array', async () => {
      const result = await repository.deleteMany([])

      expect(result).toBe(0)
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })

  describe('exists', () => {
    it('should return true for existing record', async () => {
      mockDb.queryFirst.mockResolvedValue({ count: 1 })

      const result = await repository.exists('1')

      expect(result).toBe(true)
      expect(mockDb.queryFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table WHERE id = ?',
        ['1']
      )
    })

    it('should return false for non-existing record', async () => {
      mockDb.queryFirst.mockResolvedValue({ count: 0 })

      const result = await repository.exists('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('should return count without filters', async () => {
      mockDb.queryFirst.mockResolvedValue({ count: 42 })

      const result = await repository.count()

      expect(result).toBe(42)
      expect(mockDb.queryFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table',
        []
      )
    })

    it('should return count with filters', async () => {
      mockDb.queryFirst.mockResolvedValue({ count: 5 })

      const result = await repository.count({ where: { name: 'John' } })

      expect(result).toBe(5)
      expect(mockDb.queryFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table WHERE name = ?',
        ['John']
      )
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple records in transaction', async () => {
      const records = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ]
      const createdRecords: TestModel[] = records.map((record, index) => ({
        id: `${index + 1}`,
        ...record,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }))

      mockDb.transaction.mockImplementation(async (callback) => {
        await callback()
      })
      mockDb.insert.mockResolvedValue(1)
      mockDb.queryFirst
        .mockResolvedValueOnce(createdRecords[0])
        .mockResolvedValueOnce(createdRecords[1])

      const result = await repository.bulkCreate(records)

      expect(result).toEqual(createdRecords)
      expect(mockDb.transaction).toHaveBeenCalled()
    })
  })

  describe('updateWhere', () => {
    it('should update records matching criteria', async () => {
      mockDb.update.mockResolvedValue(3)

      const result = await repository.updateWhere(
        { name: 'John' },
        { email: 'newemail@example.com' }
      )

      expect(result).toBe(3)
      expect(mockDb.update).toHaveBeenCalledWith(
        'test_table',
        expect.objectContaining({
          email: 'newemail@example.com',
          updated_at: expect.any(String)
        }),
        'name = ?',
        ['John']
      )
    })
  })

  describe('deleteWhere', () => {
    it('should delete records matching criteria', async () => {
      mockDb.delete.mockResolvedValue(2)

      const result = await repository.deleteWhere({ name: 'John' })

      expect(result).toBe(2)
      expect(mockDb.delete).toHaveBeenCalledWith(
        'test_table',
        'name = ?',
        ['John']
      )
    })
  })

  describe('getTableName', () => {
    it('should return table name', () => {
      const tableName = repository.getTableName()

      expect(tableName).toBe('test_table')
    })
  })
})