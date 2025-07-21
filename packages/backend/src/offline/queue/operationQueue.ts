import { v4 as uuidv4 } from 'uuid';
import { SQLiteStorage } from '../storage/sqliteStorage';
import { OfflineOperation, OfflineStorageConfig } from '../types';
import logger from '../../utils/logger';

export class OperationQueue {
  private storage: SQLiteStorage;
  private config: OfflineStorageConfig;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(storage: SQLiteStorage, config: OfflineStorageConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Add an operation to the queue
   */
  enqueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const operationId = uuidv4();
    const fullOperation: OfflineOperation = {
      ...operation,
      id: operationId,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    };

    try {
      this.storage.addOperation(fullOperation);
      logger.debug('Operation enqueued', { operationId, type: operation.type, entity: operation.entity });
      return operationId;
    } catch (error) {
      logger.error('Failed to enqueue operation', { operation, error });
      throw error;
    }
  }

  /**
   * Create a resource operation
   */
  enqueueResourceOperation(
    type: 'create' | 'update' | 'delete',
    resourceId: string,
    resourceData: any,
    userId: string
  ): string {
    return this.enqueue({
      type,
      entity: 'resource',
      entityId: resourceId,
      data: resourceData,
      maxRetries: this.config.maxRetries,
      userId
    });
  }

  /**
   * Create a message operation
   */
  enqueueMessageOperation(
    type: 'create' | 'update' | 'delete',
    messageId: string,
    messageData: any,
    userId: string
  ): string {
    return this.enqueue({
      type,
      entity: 'message',
      entityId: messageId,
      data: messageData,
      maxRetries: this.config.maxRetries,
      userId
    });
  }

  /**
   * Create a profile operation
   */
  enqueueProfileOperation(
    type: 'update',
    profileId: string,
    profileData: any,
    userId: string
  ): string {
    return this.enqueue({
      type,
      entity: 'profile',
      entityId: profileId,
      data: profileData,
      maxRetries: this.config.maxRetries,
      userId
    });
  }

  /**
   * Create a community operation
   */
  enqueueCommunityOperation(
    type: 'create' | 'update' | 'delete',
    communityId: string,
    communityData: any,
    userId: string
  ): string {
    return this.enqueue({
      type,
      entity: 'community',
      entityId: communityId,
      data: communityData,
      maxRetries: this.config.maxRetries,
      userId
    });
  }

  /**
   * Get pending operations for a specific user
   */
  getPendingOperations(userId?: string): OfflineOperation[] {
    try {
      return this.storage.getPendingOperations(userId);
    } catch (error) {
      logger.error('Failed to get pending operations', { userId, error });
      return [];
    }
  }

  /**
   * Mark operation as completed
   */
  markCompleted(operationId: string): void {
    try {
      this.storage.updateOperationStatus(operationId, 'completed');
      logger.debug('Operation marked as completed', { operationId });
    } catch (error) {
      logger.error('Failed to mark operation as completed', { operationId, error });
    }
  }

  /**
   * Mark operation as failed and increment retry count
   */
  markFailed(operationId: string, retryCount: number, maxRetries?: number): void {
    try {
      const effectiveMaxRetries = maxRetries || this.config.maxRetries;
      const status = retryCount >= effectiveMaxRetries ? 'failed' : 'pending';
      this.storage.updateOperationStatus(operationId, status, retryCount);
      
      logger.debug('Operation marked as failed', { 
        operationId, 
        retryCount, 
        maxRetries: effectiveMaxRetries,
        finalStatus: status 
      });
    } catch (error) {
      logger.error('Failed to mark operation as failed', { operationId, error });
    }
  }

  /**
   * Remove operation from queue
   */
  removeOperation(operationId: string): void {
    try {
      this.storage.deleteOperation(operationId);
      logger.debug('Operation removed from queue', { operationId });
    } catch (error) {
      logger.error('Failed to remove operation', { operationId, error });
    }
  }

  /**
   * Start processing operations
   */
  startProcessing(): void {
    if (this.processingInterval) {
      return; // Already processing
    }

    this.processingInterval = setInterval(() => {
      this.processOperations();
    }, this.config.syncInterval);

    logger.info('Operation queue processing started');
  }

  /**
   * Stop processing operations
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Operation queue processing stopped');
    }
  }

  /**
   * Process pending operations
   */
  private async processOperations(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      const pendingOperations = this.getPendingOperations();
      
      if (pendingOperations.length === 0) {
        this.isProcessing = false;
        return;
      }

      logger.debug('Processing operations', { count: pendingOperations.length });

      for (const operation of pendingOperations) {
        await this.processOperation(operation);
        
        // Add delay between operations to prevent overwhelming the server
        await this.delay(100);
      }
    } catch (error) {
      logger.error('Error processing operations', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: OfflineOperation): Promise<void> {
    try {
      // Mark as processing
      this.storage.updateOperationStatus(operation.id, 'processing');

      // Here we would integrate with the actual services to execute the operation
      // For now, we'll simulate the operation processing
      const success = await this.executeOperation(operation);

      if (success) {
        this.markCompleted(operation.id);
      } else {
        this.markFailed(operation.id, operation.retryCount + 1);
      }
    } catch (error) {
      logger.error('Failed to process operation', { operationId: operation.id, error });
      this.markFailed(operation.id, operation.retryCount + 1);
    }
  }

  /**
   * Execute the actual operation (placeholder for service integration)
   */
  private async executeOperation(operation: OfflineOperation): Promise<boolean> {
    // This is a placeholder implementation
    // In a real implementation, this would call the appropriate service methods
    // based on the operation type and entity
    
    logger.debug('Executing operation', {
      id: operation.id,
      type: operation.type,
      entity: operation.entity,
      entityId: operation.entityId
    });

    // Simulate network delay and potential failure
    await this.delay(Math.random() * 1000);
    
    // Simulate 90% success rate
    return Math.random() > 0.1;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  } {
    // This would require additional SQL queries to get accurate counts
    // For now, return basic information
    const pendingOperations = this.getPendingOperations();
    
    return {
      pending: pendingOperations.length,
      processing: 0, // Placeholder
      failed: 0, // Placeholder
      completed: 0 // Placeholder
    };
  }

  /**
   * Clear completed operations older than specified time
   */
  clearOldOperations(olderThanHours: number = 24): void {
    try {
      // This would be implemented in the storage layer
      this.storage.cleanup();
      logger.info('Old operations cleared', { olderThanHours });
    } catch (error) {
      logger.error('Failed to clear old operations', { error });
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get operations by entity type
   */
  getOperationsByEntity(entityType: string, userId?: string): OfflineOperation[] {
    const allOperations = this.getPendingOperations(userId);
    return allOperations.filter(op => op.entity === entityType);
  }

  /**
   * Priority-based operation processing
   */
  private getOperationPriority(operation: OfflineOperation): number {
    // Define priority based on entity type and operation type
    const priorities = {
      message: { create: 1, update: 2, delete: 3 },
      profile: { create: 2, update: 2, delete: 4 },
      resource: { create: 3, update: 3, delete: 4 },
      community: { create: 4, update: 4, delete: 5 }
    };

    return priorities[operation.entity]?.[operation.type] || 5;
  }
}