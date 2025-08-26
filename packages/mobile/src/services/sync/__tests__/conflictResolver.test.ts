/**
 * Conflict Resolution Manager Tests
 */

import { ConflictResolutionManager } from '../conflictResolver'
import { 
  ConflictType, 
  ConflictResolutionStrategy, 
  ResourceType,
  SyncConflict 
} from '../types'

describe('ConflictResolutionManager', () => {
  let conflictResolver: ConflictResolutionManager

  beforeEach(() => {
    conflictResolver = new ConflictResolutionManager()
  })

  describe('detectConflictType', () => {
    it('should detect deleted on server', () => {
      const clientData = { id: '123', title: 'Test' }
      const serverData = null

      const conflictType = conflictResolver.detectConflictType(clientData, serverData)

      expect(conflictType).toBe(ConflictType.DELETED_ON_SERVER)
    })

    it('should detect created on both', () => {
      const clientData = { title: 'Test' } // No ID
      const serverData = { id: '123', title: 'Test' }

      const conflictType = conflictResolver.detectConflictType(clientData, serverData)

      expect(conflictType).toBe(ConflictType.CREATED_ON_BOTH)
    })

    it('should detect version mismatch', () => {
      const clientData = { id: '123', version: 1, title: 'Test' }
      const serverData = { id: '123', version: 2, title: 'Test Updated' }

      const conflictType = conflictResolver.detectConflictType(clientData, serverData)

      expect(conflictType).toBe(ConflictType.VERSION_MISMATCH)
    })

    it('should detect concurrent modification', () => {
      const clientData = { id: '123', title: 'Client Version' }
      const serverData = { id: '123', title: 'Server Version' }

      const conflictType = conflictResolver.detectConflictType(clientData, serverData)

      expect(conflictType).toBe(ConflictType.CONCURRENT_MODIFICATION)
    })
  })

  describe('createConflict', () => {
    it('should create a conflict object', () => {
      const clientData = { id: '123', title: 'Client' }
      const serverData = { id: '123', title: 'Server' }

      const conflict = conflictResolver.createConflict(
        'op1',
        ResourceType.POST,
        '123',
        clientData,
        serverData,
        ConflictResolutionStrategy.CLIENT_WINS
      )

      expect(conflict.operationId).toBe('op1')
      expect(conflict.resourceType).toBe(ResourceType.POST)
      expect(conflict.resourceId).toBe('123')
      expect(conflict.clientData).toEqual(clientData)
      expect(conflict.serverData).toEqual(serverData)
      expect(conflict.resolutionStrategy).toBe(ConflictResolutionStrategy.CLIENT_WINS)
      expect(conflict.conflictType).toBe(ConflictType.CONCURRENT_MODIFICATION)
      expect(conflict.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('resolveConflict', () => {
    let conflict: SyncConflict

    beforeEach(() => {
      conflict = {
        operationId: 'op1',
        resourceType: ResourceType.POST,
        resourceId: '123',
        clientData: { id: '123', title: 'Client Version', updated_at: '2023-01-01T10:00:00Z' },
        serverData: { id: '123', title: 'Server Version', updated_at: '2023-01-01T09:00:00Z' },
        conflictType: ConflictType.CONCURRENT_MODIFICATION,
        resolutionStrategy: ConflictResolutionStrategy.CLIENT_WINS,
        timestamp: new Date()
      }
    })

    it('should resolve with client wins strategy', async () => {
      conflict.resolutionStrategy = ConflictResolutionStrategy.CLIENT_WINS

      const result = await conflictResolver.resolveConflict(conflict)

      expect(result).toEqual(conflict.clientData)
    })

    it('should resolve with server wins strategy', async () => {
      conflict.resolutionStrategy = ConflictResolutionStrategy.SERVER_WINS

      const result = await conflictResolver.resolveConflict(conflict)

      expect(result).toEqual(conflict.serverData)
    })

    it('should resolve with last modified wins strategy', async () => {
      conflict.resolutionStrategy = ConflictResolutionStrategy.LAST_MODIFIED_WINS

      const result = await conflictResolver.resolveConflict(conflict)

      // Client data has later timestamp, should win
      expect(result).toEqual(conflict.clientData)
    })

    it('should resolve with last modified wins - server wins', async () => {
      conflict.clientData.updated_at = '2023-01-01T08:00:00Z'
      conflict.serverData.updated_at = '2023-01-01T09:00:00Z'
      conflict.resolutionStrategy = ConflictResolutionStrategy.LAST_MODIFIED_WINS

      const result = await conflictResolver.resolveConflict(conflict)

      // Server data has later timestamp, should win
      expect(result).toEqual(conflict.serverData)
    })

    it('should resolve with merge strategy using default merger', async () => {
      conflict.clientData = {
        id: '123',
        title: 'Client Title',
        content: 'Client Content',
        updated_at: '2023-01-01T10:00:00Z'
      }
      conflict.serverData = {
        id: '123',
        title: 'Server Title',
        content: 'Server Content',
        likes_count: 5,
        updated_at: '2023-01-01T09:00:00Z'
      }
      conflict.resolutionStrategy = ConflictResolutionStrategy.MERGE

      const result = await conflictResolver.resolveConflict(conflict)

      expect(result.id).toBe('123')
      expect(result.title).toBe('Client Title') // Client wins for content fields
      expect(result.content).toBe('Client Content')
      expect(result.likes_count).toBe(5) // Server data preserved
      expect(result.updated_at).toBe('2023-01-01T10:00:00Z') // Latest timestamp
    })

    it('should return null for prompt user strategy', async () => {
      conflict.resolutionStrategy = ConflictResolutionStrategy.PROMPT_USER

      const result = await conflictResolver.resolveConflict(conflict)

      expect(result).toBeNull()
    })
  })

  describe('custom resolvers', () => {
    it('should use custom resolver for user profile', async () => {
      const conflict: SyncConflict = {
        operationId: 'op1',
        resourceType: ResourceType.USER_PROFILE,
        resourceId: '123',
        clientData: {
          id: '123',
          first_name: 'John',
          last_name: 'Doe',
          bio: 'Client bio',
          updated_at: '2023-01-01T10:00:00Z'
        },
        serverData: {
          id: '123',
          first_name: 'Jane',
          last_name: 'Smith',
          bio: 'Server bio',
          verification_status: 'verified',
          updated_at: '2023-01-01T09:00:00Z'
        },
        conflictType: ConflictType.CONCURRENT_MODIFICATION,
        resolutionStrategy: ConflictResolutionStrategy.MERGE,
        timestamp: new Date()
      }

      const result = await conflictResolver.resolveConflict(conflict)

      // Should prefer client data for personal fields
      expect(result.first_name).toBe('John')
      expect(result.last_name).toBe('Doe')
      expect(result.bio).toBe('Client bio')
      
      // Should preserve server data for system fields
      expect(result.verification_status).toBe('verified')
      
      // Should use latest timestamp
      expect(result.updated_at).toBe('2023-01-01T10:00:00Z')
    })

    it('should use custom resolver for posts', async () => {
      const conflict: SyncConflict = {
        operationId: 'op1',
        resourceType: ResourceType.POST,
        resourceId: '123',
        clientData: {
          id: '123',
          title: 'Updated Title',
          content: 'Updated Content',
          likes_count: 3,
          updated_at: '2023-01-01T10:00:00Z'
        },
        serverData: {
          id: '123',
          title: 'Original Title',
          content: 'Original Content',
          likes_count: 10,
          comments_count: 5,
          updated_at: '2023-01-01T09:00:00Z'
        },
        conflictType: ConflictType.CONCURRENT_MODIFICATION,
        resolutionStrategy: ConflictResolutionStrategy.MERGE,
        timestamp: new Date()
      }

      const result = await conflictResolver.resolveConflict(conflict)

      // Should prefer client data for content
      expect(result.title).toBe('Updated Title')
      expect(result.content).toBe('Updated Content')
      
      // Should prefer server data for engagement metrics
      expect(result.likes_count).toBe(10)
      expect(result.comments_count).toBe(5)
      
      // Should use latest timestamp
      expect(result.updated_at).toBe('2023-01-01T10:00:00Z')
    })
  })

  describe('registerResolver', () => {
    it('should register and use custom resolver', async () => {
      const customResolver = jest.fn().mockResolvedValue({ custom: 'resolved' })
      
      conflictResolver.registerResolver(ResourceType.COMMENT, customResolver)

      const conflict: SyncConflict = {
        operationId: 'op1',
        resourceType: ResourceType.COMMENT,
        resourceId: '123',
        clientData: { id: '123', text: 'Client comment' },
        serverData: { id: '123', text: 'Server comment' },
        conflictType: ConflictType.CONCURRENT_MODIFICATION,
        resolutionStrategy: ConflictResolutionStrategy.MERGE,
        timestamp: new Date()
      }

      const result = await conflictResolver.resolveConflict(conflict)

      expect(customResolver).toHaveBeenCalledWith(
        conflict.clientData,
        conflict.serverData,
        conflict
      )
      expect(result).toEqual({ custom: 'resolved' })
    })
  })

  describe('setDefaultStrategy', () => {
    it('should set and use default strategy', async () => {
      conflictResolver.setDefaultStrategy(ResourceType.MESSAGE, ConflictResolutionStrategy.SERVER_WINS)

      const conflict: SyncConflict = {
        operationId: 'op1',
        resourceType: ResourceType.MESSAGE,
        resourceId: '123',
        clientData: { id: '123', content: 'Client message' },
        serverData: { id: '123', content: 'Server message' },
        conflictType: ConflictType.CONCURRENT_MODIFICATION,
        resolutionStrategy: undefined as any, // Will use default
        timestamp: new Date()
      }

      const result = await conflictResolver.resolveConflict(conflict)

      expect(result).toEqual(conflict.serverData)
    })
  })
})