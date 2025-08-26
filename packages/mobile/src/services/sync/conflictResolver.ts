/**
 * Conflict Resolution Manager
 * Handles data conflicts during synchronization
 */

import { 
  SyncConflict, 
  ConflictType, 
  ConflictResolutionStrategy, 
  ResourceType,
  ConflictResolver 
} from './types'

export class ConflictResolutionManager {
  private resolvers: Map<ResourceType, ConflictResolver> = new Map()
  private defaultStrategies: Map<ResourceType, ConflictResolutionStrategy> = new Map()

  constructor() {
    this.initializeDefaultStrategies()
    this.initializeResolvers()
  }

  /**
   * Resolve a sync conflict using the appropriate strategy
   */
  async resolveConflict(conflict: SyncConflict): Promise<any> {
    const strategy = conflict.resolutionStrategy || 
                    this.defaultStrategies.get(conflict.resourceType) ||
                    ConflictResolutionStrategy.LAST_MODIFIED_WINS

    switch (strategy) {
      case ConflictResolutionStrategy.CLIENT_WINS:
        return this.resolveClientWins(conflict)

      case ConflictResolutionStrategy.SERVER_WINS:
        return this.resolveServerWins(conflict)

      case ConflictResolutionStrategy.LAST_MODIFIED_WINS:
        return this.resolveLastModifiedWins(conflict)

      case ConflictResolutionStrategy.MERGE:
        return this.resolveMerge(conflict)

      case ConflictResolutionStrategy.PROMPT_USER:
        return this.resolvePromptUser(conflict)

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`)
    }
  }

  /**
   * Register a custom conflict resolver for a resource type
   */
  registerResolver(resourceType: ResourceType, resolver: ConflictResolver): void {
    this.resolvers.set(resourceType, resolver)
  }

  /**
   * Set default resolution strategy for a resource type
   */
  setDefaultStrategy(resourceType: ResourceType, strategy: ConflictResolutionStrategy): void {
    this.defaultStrategies.set(resourceType, strategy)
  }

  /**
   * Detect conflict type based on client and server data
   */
  detectConflictType(clientData: any, serverData: any): ConflictType {
    if (!serverData) {
      return ConflictType.DELETED_ON_SERVER
    }

    if (!clientData.id && serverData.id) {
      return ConflictType.CREATED_ON_BOTH
    }

    if (clientData.version && serverData.version && 
        clientData.version !== serverData.version) {
      return ConflictType.VERSION_MISMATCH
    }

    if (this.hasModificationConflict(clientData, serverData)) {
      return ConflictType.CONCURRENT_MODIFICATION
    }

    return ConflictType.CONCURRENT_MODIFICATION
  }

  /**
   * Create a conflict object
   */
  createConflict(
    operationId: string,
    resourceType: ResourceType,
    resourceId: string,
    clientData: any,
    serverData: any,
    strategy?: ConflictResolutionStrategy
  ): SyncConflict {
    return {
      operationId,
      resourceType,
      resourceId,
      clientData,
      serverData,
      conflictType: this.detectConflictType(clientData, serverData),
      resolutionStrategy: strategy || this.defaultStrategies.get(resourceType) || ConflictResolutionStrategy.LAST_MODIFIED_WINS,
      timestamp: new Date()
    }
  }

  /**
   * Client wins resolution - use client data
   */
  private async resolveClientWins(conflict: SyncConflict): Promise<any> {
    return conflict.clientData
  }

  /**
   * Server wins resolution - use server data
   */
  private async resolveServerWins(conflict: SyncConflict): Promise<any> {
    return conflict.serverData
  }

  /**
   * Last modified wins resolution - use data with latest timestamp
   */
  private async resolveLastModifiedWins(conflict: SyncConflict): Promise<any> {
    const clientModified = this.getModificationTime(conflict.clientData)
    const serverModified = this.getModificationTime(conflict.serverData)

    if (!clientModified && !serverModified) {
      return conflict.serverData // Default to server if no timestamps
    }

    if (!clientModified) return conflict.serverData
    if (!serverModified) return conflict.clientData

    return clientModified > serverModified ? conflict.clientData : conflict.serverData
  }

  /**
   * Merge resolution - attempt to merge both versions
   */
  private async resolveMerge(conflict: SyncConflict): Promise<any> {
    const customResolver = this.resolvers.get(conflict.resourceType)
    
    if (customResolver) {
      return await customResolver(conflict.clientData, conflict.serverData, conflict)
    }

    // Default merge strategy - merge non-conflicting fields
    return this.performDefaultMerge(conflict.clientData, conflict.serverData)
  }

  /**
   * Prompt user resolution - return null to indicate user intervention needed
   */
  private async resolvePromptUser(conflict: SyncConflict): Promise<any> {
    // This would trigger a UI prompt for user to choose resolution
    // For now, return null to indicate manual resolution needed
    return null
  }

  /**
   * Perform default merge of two objects
   */
  private performDefaultMerge(clientData: any, serverData: any): any {
    const merged = { ...serverData } // Start with server data as base

    // Merge non-conflicting fields from client
    for (const [key, value] of Object.entries(clientData)) {
      if (key === 'id' || key === 'created_at') {
        continue // Skip immutable fields
      }

      if (key === 'updated_at' || key === 'last_modified') {
        // Use latest timestamp
        const clientTime = new Date(value as string)
        const serverTime = new Date(serverData[key])
        merged[key] = clientTime > serverTime ? value : serverData[key]
        continue
      }

      // For arrays, merge unique items
      if (Array.isArray(value) && Array.isArray(serverData[key])) {
        merged[key] = this.mergeArrays(value, serverData[key])
        continue
      }

      // For objects, recursively merge
      if (typeof value === 'object' && value !== null && 
          typeof serverData[key] === 'object' && serverData[key] !== null) {
        merged[key] = this.performDefaultMerge(value, serverData[key])
        continue
      }

      // For primitive values, prefer client if different
      if (value !== serverData[key]) {
        merged[key] = value
      }
    }

    return merged
  }

  /**
   * Merge two arrays, removing duplicates
   */
  private mergeArrays(clientArray: any[], serverArray: any[]): any[] {
    const merged = [...serverArray]
    
    for (const item of clientArray) {
      if (typeof item === 'object' && item.id) {
        // For objects with IDs, replace or add
        const existingIndex = merged.findIndex(existing => 
          typeof existing === 'object' && existing.id === item.id
        )
        
        if (existingIndex >= 0) {
          merged[existingIndex] = item
        } else {
          merged.push(item)
        }
      } else {
        // For primitives, add if not exists
        if (!merged.includes(item)) {
          merged.push(item)
        }
      }
    }

    return merged
  }

  /**
   * Get modification timestamp from data object
   */
  private getModificationTime(data: any): Date | null {
    const timeFields = ['updated_at', 'last_modified', 'modified_at', 'lastModified']
    
    for (const field of timeFields) {
      if (data[field]) {
        return new Date(data[field])
      }
    }

    return null
  }

  /**
   * Check if there's a modification conflict between client and server data
   */
  private hasModificationConflict(clientData: any, serverData: any): boolean {
    const clientTime = this.getModificationTime(clientData)
    const serverTime = this.getModificationTime(serverData)

    if (!clientTime || !serverTime) {
      return false
    }

    // Consider it a conflict if modifications are within 1 second of each other
    // but the data is different
    const timeDiff = Math.abs(clientTime.getTime() - serverTime.getTime())
    const hasDataDifference = JSON.stringify(clientData) !== JSON.stringify(serverData)

    return timeDiff < 1000 && hasDataDifference
  }

  /**
   * Initialize default resolution strategies for different resource types
   */
  private initializeDefaultStrategies(): void {
    this.defaultStrategies.set(ResourceType.POST, ConflictResolutionStrategy.LAST_MODIFIED_WINS)
    this.defaultStrategies.set(ResourceType.COMMENT, ConflictResolutionStrategy.CLIENT_WINS)
    this.defaultStrategies.set(ResourceType.MESSAGE, ConflictResolutionStrategy.CLIENT_WINS)
    this.defaultStrategies.set(ResourceType.RESOURCE, ConflictResolutionStrategy.SERVER_WINS)
    this.defaultStrategies.set(ResourceType.COMMUNITY, ConflictResolutionStrategy.SERVER_WINS)
    this.defaultStrategies.set(ResourceType.USER_PROFILE, ConflictResolutionStrategy.MERGE)
    this.defaultStrategies.set(ResourceType.MEDIA_ATTACHMENT, ConflictResolutionStrategy.SERVER_WINS)
  }

  /**
   * Initialize custom resolvers for specific resource types
   */
  private initializeResolvers(): void {
    // User profile merger
    this.registerResolver(ResourceType.USER_PROFILE, async (clientData, serverData, conflict) => {
      const merged = { ...serverData }

      // Prefer client data for personal information
      const clientPreferredFields = [
        'first_name', 'last_name', 'profile_picture', 'bio',
        'subjects', 'grade_levels', 'school_location'
      ]

      for (const field of clientPreferredFields) {
        if (clientData[field] !== undefined) {
          merged[field] = clientData[field]
        }
      }

      // Use latest timestamp for updated_at
      const clientTime = new Date(clientData.updated_at || 0)
      const serverTime = new Date(serverData.updated_at || 0)
      merged.updated_at = clientTime > serverTime ? clientData.updated_at : serverData.updated_at

      return merged
    })

    // Post merger - handle likes and comments carefully
    this.registerResolver(ResourceType.POST, async (clientData, serverData, conflict) => {
      const merged = { ...serverData }

      // Prefer client data for content changes
      if (clientData.title) merged.title = clientData.title
      if (clientData.content) merged.content = clientData.content
      if (clientData.category_id) merged.category_id = clientData.category_id

      // Server wins for engagement metrics
      merged.likes_count = serverData.likes_count || 0
      merged.comments_count = serverData.comments_count || 0

      // Use latest modification time
      const clientTime = new Date(clientData.updated_at || 0)
      const serverTime = new Date(serverData.updated_at || 0)
      merged.updated_at = clientTime > serverTime ? clientData.updated_at : serverData.updated_at

      return merged
    })
  }
}