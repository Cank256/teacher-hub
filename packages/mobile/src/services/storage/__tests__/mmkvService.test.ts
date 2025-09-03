import { MMKV } from 'react-native-mmkv';
import { MMKVService } from '../mmkvService';

// Mock MMKV
jest.mock('react-native-mmkv');

const mockMMKV = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(),
  contains: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
};

(MMKV as jest.MockedClass<typeof MMKV>).mockImplementation(() => mockMMKV as any);

describe('MMKVService', () => {
  let mmkvService: MMKVService;

  beforeEach(() => {
    mmkvService = new MMKVService();
    jest.clearAllMocks();
  });

  describe('String operations', () => {
    it('should store and retrieve string values', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await mmkvService.setString(key, value);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, value);

      mockMMKV.getString.mockReturnValue(value);
      const retrieved = await mmkvService.getString(key);
      expect(retrieved).toBe(value);
      expect(mockMMKV.getString).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent string keys', async () => {
      mockMMKV.getString.mockReturnValue(undefined);
      const result = await mmkvService.getString('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Number operations', () => {
    it('should store and retrieve number values', async () => {
      const key = 'number-key';
      const value = 42;

      await mmkvService.setNumber(key, value);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, value);

      mockMMKV.getNumber.mockReturnValue(value);
      const retrieved = await mmkvService.getNumber(key);
      expect(retrieved).toBe(value);
      expect(mockMMKV.getNumber).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent number keys', async () => {
      mockMMKV.getNumber.mockReturnValue(undefined);
      const result = await mmkvService.getNumber('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Boolean operations', () => {
    it('should store and retrieve boolean values', async () => {
      const key = 'boolean-key';
      const value = true;

      await mmkvService.setBoolean(key, value);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, value);

      mockMMKV.getBoolean.mockReturnValue(value);
      const retrieved = await mmkvService.getBoolean(key);
      expect(retrieved).toBe(value);
      expect(mockMMKV.getBoolean).toHaveBeenCalledWith(key);
    });

    it('should handle false boolean values correctly', async () => {
      const key = 'boolean-key';
      const value = false;

      await mmkvService.setBoolean(key, value);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, value);

      mockMMKV.getBoolean.mockReturnValue(value);
      const retrieved = await mmkvService.getBoolean(key);
      expect(retrieved).toBe(false);
    });
  });

  describe('Object operations', () => {
    it('should store and retrieve object values', async () => {
      const key = 'object-key';
      const value = { name: 'John', age: 30 };
      const serialized = JSON.stringify(value);

      await mmkvService.setObject(key, value);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, serialized);

      mockMMKV.getString.mockReturnValue(serialized);
      const retrieved = await mmkvService.getObject(key);
      expect(retrieved).toEqual(value);
    });

    it('should handle complex nested objects', async () => {
      const key = 'complex-object';
      const value = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
      };

      await mmkvService.setObject(key, value);
      mockMMKV.getString.mockReturnValue(JSON.stringify(value));
      
      const retrieved = await mmkvService.getObject(key);
      expect(retrieved).toEqual(value);
    });

    it('should return null for invalid JSON', async () => {
      mockMMKV.getString.mockReturnValue('invalid-json');
      const result = await mmkvService.getObject('invalid-key');
      expect(result).toBeNull();
    });
  });

  describe('Array operations', () => {
    it('should store and retrieve array values', async () => {
      const key = 'array-key';
      const value = [1, 2, 3, 'test', { id: 1 }];

      await mmkvService.setArray(key, value);
      mockMMKV.getString.mockReturnValue(JSON.stringify(value));
      
      const retrieved = await mmkvService.getArray(key);
      expect(retrieved).toEqual(value);
    });

    it('should handle empty arrays', async () => {
      const key = 'empty-array';
      const value: any[] = [];

      await mmkvService.setArray(key, value);
      mockMMKV.getString.mockReturnValue(JSON.stringify(value));
      
      const retrieved = await mmkvService.getArray(key);
      expect(retrieved).toEqual([]);
    });
  });

  describe('Key management', () => {
    it('should check if key exists', async () => {
      const key = 'existing-key';
      mockMMKV.contains.mockReturnValue(true);

      const exists = await mmkvService.hasKey(key);
      expect(exists).toBe(true);
      expect(mockMMKV.contains).toHaveBeenCalledWith(key);
    });

    it('should return false for non-existent keys', async () => {
      mockMMKV.contains.mockReturnValue(false);
      const exists = await mmkvService.hasKey('non-existent');
      expect(exists).toBe(false);
    });

    it('should get all keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockMMKV.getAllKeys.mockReturnValue(keys);

      const allKeys = await mmkvService.getAllKeys();
      expect(allKeys).toEqual(keys);
      expect(mockMMKV.getAllKeys).toHaveBeenCalled();
    });

    it('should delete specific key', async () => {
      const key = 'key-to-delete';
      
      await mmkvService.delete(key);
      expect(mockMMKV.delete).toHaveBeenCalledWith(key);
    });

    it('should clear all data', async () => {
      await mmkvService.clearAll();
      expect(mockMMKV.clearAll).toHaveBeenCalled();
    });
  });

  describe('Batch operations', () => {
    it('should perform batch set operations', async () => {
      const operations = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 42 },
        { key: 'key3', value: { test: true } },
      ];

      await mmkvService.batchSet(operations);

      expect(mockMMKV.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockMMKV.set).toHaveBeenCalledWith('key2', 42);
      expect(mockMMKV.set).toHaveBeenCalledWith('key3', JSON.stringify({ test: true }));
    });

    it('should perform batch get operations', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockMMKV.getString
        .mockReturnValueOnce('value1')
        .mockReturnValueOnce('42')
        .mockReturnValueOnce('{"test":true}');

      const results = await mmkvService.batchGet(keys);

      expect(results).toEqual({
        key1: 'value1',
        key2: '42',
        key3: '{"test":true}',
      });
    });

    it('should perform batch delete operations', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await mmkvService.batchDelete(keys);

      keys.forEach(key => {
        expect(mockMMKV.delete).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle MMKV errors gracefully', async () => {
      mockMMKV.set.mockImplementation(() => {
        throw new Error('MMKV error');
      });

      await expect(mmkvService.setString('key', 'value')).rejects.toThrow('MMKV error');
    });

    it('should handle JSON parsing errors', async () => {
      mockMMKV.getString.mockReturnValue('invalid-json{');
      
      const result = await mmkvService.getObject('key');
      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large objects efficiently', async () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
        })),
      };

      const startTime = Date.now();
      await mmkvService.setObject('large-object', largeObject);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(mockMMKV.set).toHaveBeenCalledWith('large-object', JSON.stringify(largeObject));
    });

    it('should handle many concurrent operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        mmkvService.setString(`key-${i}`, `value-${i}`)
      );

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(mockMMKV.set).toHaveBeenCalledTimes(100);
    });
  });

  describe('Data integrity', () => {
    it('should maintain data consistency across operations', async () => {
      const testData = {
        string: 'test-string',
        number: 42,
        boolean: true,
        object: { nested: { value: 'deep' } },
        array: [1, 2, 3, { item: 'test' }],
      };

      // Store all data
      await mmkvService.setString('string', testData.string);
      await mmkvService.setNumber('number', testData.number);
      await mmkvService.setBoolean('boolean', testData.boolean);
      await mmkvService.setObject('object', testData.object);
      await mmkvService.setArray('array', testData.array);

      // Mock retrieval
      mockMMKV.getString.mockImplementation((key: string) => {
        switch (key) {
          case 'string': return testData.string;
          case 'object': return JSON.stringify(testData.object);
          case 'array': return JSON.stringify(testData.array);
          default: return undefined;
        }
      });
      mockMMKV.getNumber.mockReturnValue(testData.number);
      mockMMKV.getBoolean.mockReturnValue(testData.boolean);

      // Verify all data
      expect(await mmkvService.getString('string')).toBe(testData.string);
      expect(await mmkvService.getNumber('number')).toBe(testData.number);
      expect(await mmkvService.getBoolean('boolean')).toBe(testData.boolean);
      expect(await mmkvService.getObject('object')).toEqual(testData.object);
      expect(await mmkvService.getArray('array')).toEqual(testData.array);
    });
  });
});