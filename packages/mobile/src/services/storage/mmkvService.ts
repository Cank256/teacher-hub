/**
 * MMKV Storage Service
 * High-performance key-value storage using react-native-mmkv
 */

import { MMKV } from 'react-native-mmkv'
import { StorageService, StorageError, StorageErrorCode } from './types'

class MMKVService implements StorageService {
  private storage: MMKV

  constructor(id: string = 'default') {
    this.storage = new MMKV({
      id,
      encryptionKey: this.getEncryptionKey()
    })
  }

  /**
   * Store a value with the given key
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      this.storage.set(key, serializedValue)
    } catch (error) {
      throw new StorageError(
        `Failed to set item with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Retrieve a value by key
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = this.storage.getString(key)
      if (value === undefined) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      throw new StorageError(
        `Failed to get item with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Remove an item by key
   */
  async removeItem(key: string): Promise<void> {
    try {
      this.storage.delete(key)
    } catch (error) {
      throw new StorageError(
        `Failed to remove item with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      this.storage.clearAll()
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get all keys in storage
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return this.storage.getAllKeys()
    } catch (error) {
      throw new StorageError(
        'Failed to get all keys',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Check if a key exists
   */
  async hasKey(key: string): Promise<boolean> {
    try {
      return this.storage.contains(key)
    } catch (error) {
      throw new StorageError(
        `Failed to check key existence: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get storage size in bytes
   */
  getSize(): number {
    try {
      return this.storage.size
    } catch (error) {
      throw new StorageError(
        'Failed to get storage size',
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Set a boolean value
   */
  async setBool(key: string, value: boolean): Promise<void> {
    try {
      this.storage.set(key, value)
    } catch (error) {
      throw new StorageError(
        `Failed to set boolean with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get a boolean value
   */
  async getBool(key: string): Promise<boolean | null> {
    try {
      const value = this.storage.getBoolean(key)
      return value === undefined ? null : value
    } catch (error) {
      throw new StorageError(
        `Failed to get boolean with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Set a number value
   */
  async setNumber(key: string, value: number): Promise<void> {
    try {
      this.storage.set(key, value)
    } catch (error) {
      throw new StorageError(
        `Failed to set number with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Get a number value
   */
  async getNumber(key: string): Promise<number | null> {
    try {
      const value = this.storage.getNumber(key)
      return value === undefined ? null : value
    } catch (error) {
      throw new StorageError(
        `Failed to get number with key: ${key}`,
        StorageErrorCode.DATABASE_ERROR,
        error as Error
      )
    }
  }

  /**
   * Generate encryption key for MMKV
   */
  private getEncryptionKey(): string {
    // In production, this should be derived from device-specific data
    // For now, using a static key - should be improved with device keychain integration
    return 'teacher-hub-mmkv-encryption-key-2024'
  }
}

// Create singleton instances for different storage contexts
export const defaultStorage = new MMKVService('default')
export const cacheStorage = new MMKVService('cache')
export const userStorage = new MMKVService('user')

export { MMKVService }