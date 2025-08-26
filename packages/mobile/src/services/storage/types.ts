/**
 * Storage service types and interfaces
 */

export interface StorageService {
  // Key-value storage operations
  setItem<T>(key: string, value: T): Promise<void>
  getItem<T>(key: string): Promise<T | null>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  getAllKeys(): Promise<string[]>
}

export interface SecureStorageService {
  // Secure storage operations
  setSecureItem(key: string, value: string): Promise<void>
  getSecureItem(key: string): Promise<string | null>
  removeSecureItem(key: string): Promise<void>
  clearSecureStorage(): Promise<void>
}

export interface DatabaseService {
  // SQLite database operations
  query<T>(sql: string, params?: any[]): Promise<T[]>
  queryFirst<T>(sql: string, params?: any[]): Promise<T | null>
  execute(sql: string, params?: any[]): Promise<void>
  transaction(operations: () => Promise<void>): Promise<void>
  close(): Promise<void>
  initialize(): Promise<void>
  insert(table: string, data: Record<string, any>): Promise<number>
  update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<number>
  delete(table: string, where: string, whereParams?: any[]): Promise<number>
}

export interface MigrationService {
  getCurrentVersion(): Promise<number>
  runMigrations(): Promise<void>
  addMigration(version: number, migration: Migration): void
}

export interface Migration {
  version: number
  up: (db: DatabaseService) => Promise<void>
  down: (db: DatabaseService) => Promise<void>
}

// Storage keys enum for type safety
export enum StorageKeys {
  // User preferences
  USER_PREFERENCES = 'user_preferences',
  THEME_MODE = 'theme_mode',
  LANGUAGE = 'language',
  
  // App state
  ONBOARDING_COMPLETED = 'onboarding_completed',
  LAST_SYNC_TIME = 'last_sync_time',
  OFFLINE_MODE = 'offline_mode',
  
  // Cache keys
  POSTS_CACHE = 'posts_cache',
  COMMUNITIES_CACHE = 'communities_cache',
  RESOURCES_CACHE = 'resources_cache',
  
  // Sync queue
  PENDING_OPERATIONS = 'pending_operations',
  FAILED_OPERATIONS = 'failed_operations'
}

// Secure storage keys for sensitive data
export enum SecureStorageKeys {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  BIOMETRIC_KEY = 'biometric_key',
  ENCRYPTION_KEY = 'encryption_key',
  USER_CREDENTIALS = 'user_credentials'
}

// Database table names
export enum TableNames {
  USERS = 'users',
  POSTS = 'posts',
  COMMUNITIES = 'communities',
  MESSAGES = 'messages',
  RESOURCES = 'resources',
  OFFLINE_OPERATIONS = 'offline_operations',
  SYNC_STATUS = 'sync_status'
}

// Error types for storage operations
export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export enum StorageErrorCode {
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  STORAGE_FULL = 'STORAGE_FULL',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  MIGRATION_FAILED = 'MIGRATION_FAILED'
}