/**
 * Offline Operation Queue Manager
 * Handles queuing, prioritization, and retry logic for offline operations
 */

import { DatabaseService } from '../storage/types'
import { StorageService } from '../storage/types'
import { 
  OfflineOperation, 
  OperationType, 
  ResourceType, 
  SyncPriority, 
  SyncError, 
  SyncErrorType,
  ConflictResolutionStrategy 
} from './types'

export class OperationQueue {
  private db: DatabaseService
  private storage: StorageService
  private isProcessing = false
  private processingPromise: Promise<void> | null = null

  constructor(db: DatabaseService, storage: StorageService) {
    this.db = db
    this.storage = storage
  }

  /**
   * Add an operation to the queue
   */
  async queueOperation(
    type: OperationType,
    resourceType: ResourceType,
    data: any,
    options: {
      resourceId?: string
      priority?: SyncPriority
      maxRetries?: number
      conflictResolution?: ConflictResolutionStrategy
    } = {}
  ): Promise<string> {
    const operation: OfflineOperation = {
      id: this.generateOperationId(),
      type,
      resourceType,
      resourceId: options.resourceId,
      data,
      priority: options.priority ?? SyncPriority.MEDIUM,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      createdAt: new Date(),
      scheduledAt: new Date(),
      conflictResolution: options.conflictResolution
    }

    await this.saveOperation(operation)
    
    // Trigger processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return operation.id
  }

  /**
   * Get all pending operations sorted by priority and creation time
   */
  async getPendingOperations(limit?: number): Promise<OfflineOperation[]> {
    const sql = `
      SELECT * FROM offline_operations 
      WHERE retry_count < max_retries 
      AND scheduled_at <= datetime('now')
      ORDER BY priority DESC, created_at ASC
      ${limit ? `LIMIT ${limit}` : ''}
    `
    
    const rows = await this.db.query<any>(sql)
    return (rows || []).map(row => this.mapRowToOperation(row))
  }

  /**
   * Get failed operations that have exceeded max retries
   */
  async getFailedOperations(): Promise<OfflineOperation[]> {
    const sql = `
      SELECT * FROM offline_operations 
      WHERE retry_count >= max_retries
      ORDER BY created_at DESC
    `
    
    const rows = await this.db.query<any>(sql)
    return (rows || []).map(row => this.mapRowToOperation(row))
  }

  /**
   * Get operation by ID
   */
  async getOperation(id: string): Promise<OfflineOperation | null> {
    const sql = 'SELECT * FROM offline_operations WHERE id = ?'
    const row = await this.db.queryFirst<any>(sql, [id])
    
    return row ? this.mapRowToOperation(row) : null
  }

  /**
   * Update operation retry count and error message
   */
  async updateOperationRetry(
    id: string, 
    error?: string, 
    scheduleNextRetry = true
  ): Promise<void> {
    const operation = await this.getOperation(id)
    if (!operation) return

    const retryCount = operation.retryCount + 1
    const nextRetryDelay = this.calculateRetryDelay(retryCount)
    const scheduledAt = scheduleNextRetry 
      ? new Date(Date.now() + nextRetryDelay)
      : new Date()

    const sql = `
      UPDATE offline_operations 
      SET retry_count = ?, error_message = ?, scheduled_at = ?, last_attempt_at = datetime('now')
      WHERE id = ?
    `
    
    await this.db.execute(sql, [
      retryCount,
      error || null,
      scheduledAt.toISOString(),
      id
    ])
  }

  /**
   * Remove operation from queue
   */
  async removeOperation(id: string): Promise<void> {
    const sql = 'DELETE FROM offline_operations WHERE id = ?'
    await this.db.execute(sql, [id])
  }

  /**
   * Clear all operations from queue
   */
  async clearQueue(): Promise<void> {
    await this.db.execute('DELETE FROM offline_operations')
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number
    failed: number
    total: number
    byPriority: Record<SyncPriority, number>
    byType: Record<OperationType, number>
  }> {
    const [pendingResult, failedResult, totalResult] = await Promise.all([
      this.db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM offline_operations WHERE retry_count < max_retries'),
      this.db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM offline_operations WHERE retry_count >= max_retries'),
      this.db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM offline_operations')
    ])

    const priorityStats = await this.db.query<{ priority: SyncPriority, count: number }>(
      'SELECT priority, COUNT(*) as count FROM offline_operations GROUP BY priority'
    )

    const typeStats = await this.db.query<{ operation_type: OperationType, count: number }>(
      'SELECT operation_type, COUNT(*) as count FROM offline_operations GROUP BY operation_type'
    )

    const byPriority: Record<SyncPriority, number> = {
      [SyncPriority.LOW]: 0,
      [SyncPriority.MEDIUM]: 0,
      [SyncPriority.HIGH]: 0,
      [SyncPriority.CRITICAL]: 0
    }

    const byType: Record<OperationType, number> = {
      [OperationType.CREATE]: 0,
      [OperationType.UPDATE]: 0,
      [OperationType.DELETE]: 0,
      [OperationType.UPLOAD]: 0,
      [OperationType.DOWNLOAD]: 0
    }

    priorityStats.forEach(stat => {
      byPriority[stat.priority] = stat.count
    })

    typeStats.forEach(stat => {
      byType[stat.operation_type] = stat.count
    })

    return {
      pending: pendingResult?.count ?? 0,
      failed: failedResult?.count ?? 0,
      total: totalResult?.count ?? 0,
      byPriority,
      byType
    }
  }

  /**
   * Process the queue (called internally)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return this.processingPromise || Promise.resolve()
    }

    this.isProcessing = true
    this.processingPromise = this.doProcessQueue()

    try {
      await this.processingPromise
    } finally {
      this.isProcessing = false
      this.processingPromise = null
    }
  }

  private async doProcessQueue(): Promise<void> {
    const batchSize = 10 // Process operations in batches
    let hasMoreOperations = true

    while (hasMoreOperations) {
      const operations = await this.getPendingOperations(batchSize)
      
      if (operations.length === 0) {
        hasMoreOperations = false
        break
      }

      // Process operations in parallel with concurrency limit
      const concurrencyLimit = 3
      const chunks = this.chunkArray(operations, concurrencyLimit)

      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map(operation => this.processOperation(operation))
        )
      }

      // Check if we should continue processing
      hasMoreOperations = operations.length === batchSize
    }
  }

  private async processOperation(operation: OfflineOperation): Promise<void> {
    try {
      // This would be implemented by the SyncEngine
      // For now, we just mark it as processed
      await this.removeOperation(operation.id)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.updateOperationRetry(operation.id, errorMessage)
    }
  }

  /**
   * Save operation to database
   */
  private async saveOperation(operation: OfflineOperation): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO offline_operations (
        id, operation_type, resource_type, resource_id, data, 
        priority, retry_count, max_retries, created_at, scheduled_at,
        conflict_resolution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await this.db.execute(sql, [
      operation.id,
      operation.type,
      operation.resourceType,
      operation.resourceId || null,
      JSON.stringify(operation.data),
      operation.priority,
      operation.retryCount,
      operation.maxRetries,
      operation.createdAt.toISOString(),
      operation.scheduledAt.toISOString(),
      operation.conflictResolution || null
    ])
  }

  /**
   * Map database row to OfflineOperation
   */
  private mapRowToOperation(row: any): OfflineOperation {
    return {
      id: row.id,
      type: row.operation_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      data: row.data ? JSON.parse(row.data) : {},
      priority: row.priority,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      createdAt: new Date(row.created_at),
      scheduledAt: new Date(row.scheduled_at),
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
      errorMessage: row.error_message,
      conflictResolution: row.conflict_resolution
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000 // 1 second
    const maxDelay = 300000 // 5 minutes
    const backoffMultiplier = 2

    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, retryCount - 1),
      maxDelay
    )

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    return delay + jitter
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}