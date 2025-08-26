/**
 * Database Service Tests
 */

import { SQLiteDatabaseService } from '../databaseService'
import { StorageError } from '../types'

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn()
}))

import * as SQLite from 'expo-sqlite'

describe('SQLiteDatabaseService', () => {
  let databaseService: SQLiteDatabaseService
  let mockDb: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
      closeAsync: jest.fn(),
      execAsync: jest.fn()
    }

    const mockSQLite = SQLite as jest.Mocked<typeof SQLite>
    mockSQLite.openDatabaseAsync.mockResolvedValue(mockDb)

    databaseService = new SQLiteDatabaseService('test.db')
  })

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      mockDb.runAsync.mockResolvedValue(undefined)

      await databaseService.initialize()

      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('test.db')
      expect(mockDb.runAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON')
      expect(mockDb.runAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL')
    })

    it('should throw StorageError on initialization failure', async () => {
      const mockSQLite = SQLite as jest.Mocked<typeof SQLite>
      mockSQLite.openDatabaseAsync.mockRejectedValue(new Error('Database error'))

      await expect(databaseService.initialize())
        .rejects.toThrow(StorageError)
    })
  })

  describe('query', () => {
    it('should execute query and return results', async () => {
      const mockResults = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
      mockDb.getAllAsync.mockResolvedValue(mockResults)

      const results = await databaseService.query('SELECT * FROM users')

      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM users', [])
      expect(results).toEqual(mockResults)
    })

    it('should execute query with parameters', async () => {
      const mockResults = [{ id: 1, name: 'John' }]
      mockDb.getAllAsync.mockResolvedValue(mockResults)

      const results = await databaseService.query('SELECT * FROM users WHERE id = ?', [1])

      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1])
      expect(results).toEqual(mockResults)
    })

    it('should initialize database if not already initialized', async () => {
      mockDb.getAllAsync.mockResolvedValue([])
      mockDb.runAsync.mockResolvedValue(undefined)

      await databaseService.query('SELECT * FROM users')

      expect(SQLite.openDatabaseAsync).toHaveBeenCalled()
    })

    it('should throw StorageError on query failure', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Query failed'))

      await expect(databaseService.query('SELECT * FROM users'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('execute', () => {
    it('should execute statement successfully', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 })

      await databaseService.execute('INSERT INTO users (name) VALUES (?)', ['John'])

      expect(mockDb.runAsync).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?)', ['John'])
    })

    it('should throw StorageError on execution failure', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Execution failed'))

      await expect(databaseService.execute('INSERT INTO users (name) VALUES (?)', ['John']))
        .rejects.toThrow(StorageError)
    })
  })

  describe('transaction', () => {
    it('should execute operations in transaction', async () => {
      const operations = jest.fn().mockResolvedValue(undefined)
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => {
        await callback()
      })

      await databaseService.transaction(operations)

      expect(mockDb.withTransactionAsync).toHaveBeenCalled()
      expect(operations).toHaveBeenCalled()
    })

    it('should throw StorageError on transaction failure', async () => {
      const operations = jest.fn().mockRejectedValue(new Error('Operation failed'))
      mockDb.withTransactionAsync.mockImplementation(async (callback: () => Promise<void>) => {
        await callback()
      })

      await expect(databaseService.transaction(operations))
        .rejects.toThrow(StorageError)
    })
  })

  describe('close', () => {
    it('should close database connection', async () => {
      mockDb.closeAsync.mockResolvedValue(undefined)
      
      // Initialize first
      await databaseService.initialize()
      
      await databaseService.close()

      expect(mockDb.closeAsync).toHaveBeenCalled()
    })

    it('should handle closing when database is not initialized', async () => {
      await databaseService.close()

      expect(mockDb.closeAsync).not.toHaveBeenCalled()
    })
  })

  describe('queryFirst', () => {
    it('should return first result', async () => {
      const mockResults = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
      mockDb.getAllAsync.mockResolvedValue(mockResults)

      const result = await databaseService.queryFirst('SELECT * FROM users')

      expect(result).toEqual({ id: 1, name: 'John' })
    })

    it('should return null for empty results', async () => {
      mockDb.getAllAsync.mockResolvedValue([])

      const result = await databaseService.queryFirst('SELECT * FROM users')

      expect(result).toBeNull()
    })
  })

  describe('insert', () => {
    it('should insert record and return ID', async () => {
      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 123, changes: 1 })

      const id = await databaseService.insert('users', { name: 'John', email: 'john@example.com' })

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['John', 'john@example.com']
      )
      expect(id).toBe(123)
    })
  })

  describe('update', () => {
    it('should update records and return changes count', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 2, lastInsertRowId: 0 })

      const changes = await databaseService.update(
        'users',
        { name: 'Updated Name' },
        'id = ?',
        [1]
      )

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Updated Name', 1]
      )
      expect(changes).toBe(2)
    })
  })

  describe('delete', () => {
    it('should delete records and return changes count', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 })

      const changes = await databaseService.delete('users', 'id = ?', [1])

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', [1])
      expect(changes).toBe(1)
    })
  })

  describe('tableExists', () => {
    it('should return true for existing table', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 1 }])

      const exists = await databaseService.tableExists('users')

      expect(exists).toBe(true)
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
        ['users']
      )
    })

    it('should return false for non-existing table', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ count: 0 }])

      const exists = await databaseService.tableExists('nonexistent')

      expect(exists).toBe(false)
    })

    it('should return false on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Query failed'))

      const exists = await databaseService.tableExists('users')

      expect(exists).toBe(false)
    })
  })

  describe('getTableInfo', () => {
    it('should return table information', async () => {
      const mockTableInfo = [
        { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ]
      mockDb.getAllAsync.mockResolvedValue(mockTableInfo)

      const tableInfo = await databaseService.getTableInfo('users')

      expect(tableInfo).toEqual(mockTableInfo)
      expect(mockDb.getAllAsync).toHaveBeenCalledWith('PRAGMA table_info(users)')
    })
  })

  describe('executeRaw', () => {
    it('should execute raw SQL', async () => {
      mockDb.execAsync.mockResolvedValue(undefined)

      await databaseService.executeRaw('CREATE TABLE test (id INTEGER)')

      expect(mockDb.execAsync).toHaveBeenCalledWith('CREATE TABLE test (id INTEGER)')
    })
  })

  describe('getDatabaseSize', () => {
    it('should return database size', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ page_count: 100, page_size: 4096 }])

      const size = await databaseService.getDatabaseSize()

      expect(size).toBe(409600) // 100 * 4096
    })
  })

  describe('vacuum', () => {
    it('should vacuum database', async () => {
      mockDb.runAsync.mockResolvedValue(undefined)

      await databaseService.vacuum()

      expect(mockDb.runAsync).toHaveBeenCalledWith('VACUUM')
    })
  })
})