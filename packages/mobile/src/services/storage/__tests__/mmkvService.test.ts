/**
 * MMKV Service Tests
 */

import { MMKVService } from '../mmkvService'
import { StorageError } from '../types'

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(),
    contains: jest.fn(),
    size: 1024
  }))
}))

describe('MMKVService', () => {
  let mmkvService: MMKVService
  let mockStorage: any

  beforeEach(() => {
    jest.clearAllMocks()
    mmkvService = new MMKVService('test')
    mockStorage = (mmkvService as any).storage
  })

  describe('setItem', () => {
    it('should store a value successfully', async () => {
      const testData = { name: 'John', age: 30 }
      mockStorage.set.mockImplementation(() => {})

      await mmkvService.setItem('user', testData)

      expect(mockStorage.set).toHaveBeenCalledWith('user', JSON.stringify(testData))
    })

    it('should throw StorageError on failure', async () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage full')
      })

      await expect(mmkvService.setItem('user', { data: 'test' }))
        .rejects.toThrow(StorageError)
    })
  })

  describe('getItem', () => {
    it('should retrieve a value successfully', async () => {
      const testData = { name: 'John', age: 30 }
      mockStorage.getString.mockReturnValue(JSON.stringify(testData))

      const result = await mmkvService.getItem('user')

      expect(result).toEqual(testData)
      expect(mockStorage.getString).toHaveBeenCalledWith('user')
    })

    it('should return null for non-existent key', async () => {
      mockStorage.getString.mockReturnValue(undefined)

      const result = await mmkvService.getItem('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw StorageError on JSON parse failure', async () => {
      mockStorage.getString.mockReturnValue('invalid json')

      await expect(mmkvService.getItem('user'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('removeItem', () => {
    it('should remove an item successfully', async () => {
      mockStorage.delete.mockImplementation(() => {})

      await mmkvService.removeItem('user')

      expect(mockStorage.delete).toHaveBeenCalledWith('user')
    })

    it('should throw StorageError on failure', async () => {
      mockStorage.delete.mockImplementation(() => {
        throw new Error('Delete failed')
      })

      await expect(mmkvService.removeItem('user'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('clear', () => {
    it('should clear all storage successfully', async () => {
      mockStorage.clearAll.mockImplementation(() => {})

      await mmkvService.clear()

      expect(mockStorage.clearAll).toHaveBeenCalled()
    })
  })

  describe('getAllKeys', () => {
    it('should return all keys', async () => {
      const keys = ['key1', 'key2', 'key3']
      mockStorage.getAllKeys.mockReturnValue(keys)

      const result = await mmkvService.getAllKeys()

      expect(result).toEqual(keys)
    })
  })

  describe('hasKey', () => {
    it('should return true for existing key', async () => {
      mockStorage.contains.mockReturnValue(true)

      const result = await mmkvService.hasKey('user')

      expect(result).toBe(true)
      expect(mockStorage.contains).toHaveBeenCalledWith('user')
    })

    it('should return false for non-existing key', async () => {
      mockStorage.contains.mockReturnValue(false)

      const result = await mmkvService.hasKey('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('setBool', () => {
    it('should store boolean value', async () => {
      mockStorage.set.mockImplementation(() => {})

      await mmkvService.setBool('isEnabled', true)

      expect(mockStorage.set).toHaveBeenCalledWith('isEnabled', true)
    })
  })

  describe('getBool', () => {
    it('should retrieve boolean value', async () => {
      mockStorage.getBoolean.mockReturnValue(true)

      const result = await mmkvService.getBool('isEnabled')

      expect(result).toBe(true)
    })

    it('should return null for undefined value', async () => {
      mockStorage.getBoolean.mockReturnValue(undefined)

      const result = await mmkvService.getBool('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('setNumber', () => {
    it('should store number value', async () => {
      mockStorage.set.mockImplementation(() => {})

      await mmkvService.setNumber('count', 42)

      expect(mockStorage.set).toHaveBeenCalledWith('count', 42)
    })
  })

  describe('getNumber', () => {
    it('should retrieve number value', async () => {
      mockStorage.getNumber.mockReturnValue(42)

      const result = await mmkvService.getNumber('count')

      expect(result).toBe(42)
    })

    it('should return null for undefined value', async () => {
      mockStorage.getNumber.mockReturnValue(undefined)

      const result = await mmkvService.getNumber('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getSize', () => {
    it('should return storage size', () => {
      const size = mmkvService.getSize()

      expect(size).toBe(1024)
    })
  })
})