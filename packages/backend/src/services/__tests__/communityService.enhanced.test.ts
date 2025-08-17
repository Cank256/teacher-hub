import { CommunityService } from '../communityService';
import { DatabaseConnection } from '../../database/connection';
import { UserRepository } from '../../database/repositories/userRepository';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../../database/repositories/userRepository');

describe('CommunityService - Enhanced Features', () => {
  let communityService: CommunityService;
  let mockDb: jest.Mocked<DatabaseConnection>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    } as any;

    communityService = new CommunityService(mockDb, mockUserRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCommunity', () => {
    it('should create community with owner successfully', async () => {
      const ownerId = 'user-123';
      const communityData = {
        name: 'Math Teachers',
        description: 'Community for math teachers',
        type: 'subject' as const,
        isPrivate: false,
        requiresApproval: true,
        rules: [
          { title: 'Be respectful', description: 'Treat all members with respect', order: 1 }
        ]
      };

      const mockCommunity = {
        id: 'community-123',
        ownerId,
        ...communityData,
        moderators: [ownerId],
        memberCount: 1,
        postCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMembership = {
        id: 'membership-123',
        communityId: 'community-123',
        userId: ownerId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Insert community
        .mockResolvedValueOnce({ rows: [mockMembership] }); // Insert owner membership

      const result = await communityService.createCommunity(ownerId, communityData);

      expect(result).toEqual(mockCommunity);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should validate community name uniqueness', async () => {
      const ownerId = 'user-123';
      const communityData = {
        name: 'Existing Community',
        description: 'Test description',
        type: 'subject' as const,
        isPrivate: false,
        requiresApproval: false,
        rules: []
      };

      const existingCommunity = { id: 'existing-123', name: 'Existing Community' };
      mockDb.query.mockResolvedValueOnce({ rows: [existingCommunity] });

      await expect(communityService.createCommunity(ownerId, communityData))
        .rejects.toThrow('Community name already exists');
    });
  });

  describe('joinCommunity', () => {
    it('should join public community immediately', async () => {
      const communityId = 'community-123';
      const userId = 'user-456';

      const mockCommunity = {
        id: communityId,
        name: 'Public Community',
        isPrivate: false,
        requiresApproval: false
      };

      const mockMembership = {
        id: 'membership-456',
        communityId,
        userId,
        role: 'member',
        status: 'active',
        joinedAt: new Date()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Get community
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [mockMembership] }) // Insert membership
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      const result = await communityService.joinCommunity(communityId, userId);

      expect(result).toEqual(mockMembership);
      expect(result.status).toBe('active');
    });

    it('should create pending membership for approval-required community', async () => {
      const communityId = 'community-123';
      const userId = 'user-456';

      const mockCommunity = {
        id: communityId,
        name: 'Approval Required Community',
        isPrivate: false,
        requiresApproval: true
      };

      const mockMembership = {
        id: 'membership-456',
        communityId,
        userId,
        role: 'member',
        status: 'pending',
        joinedAt: new Date()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Get community
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [mockMembership] }); // Insert membership

      const result = await communityService.joinCommunity(communityId, userId);

      expect(result.status).toBe('pending');
    });

    it('should reject joining private community without invitation', async () => {
      const communityId = 'community-123';
      const userId = 'user-456';

      const mockCommunity = {
        id: communityId,
        name: 'Private Community',
        isPrivate: true,
        requiresApproval: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCommunity] });

      await expect(communityService.joinCommunity(communityId, userId))
        .rejects.toThrow('Cannot join private community without invitation');
    });
  });

  describe('approveMembership', () => {
    it('should approve pending membership successfully', async () => {
      const communityId = 'community-123';
      const membershipId = 'membership-456';
      const moderatorId = 'user-123';

      const mockMembership = {
        id: membershipId,
        communityId,
        userId: 'user-456',
        status: 'pending'
      };

      const mockModeratorMembership = {
        id: 'membership-123',
        communityId,
        userId: moderatorId,
        role: 'owner'
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockMembership] }) // Get membership
        .mockResolvedValueOnce({ rows: [mockModeratorMembership] }) // Check moderator permissions
        .mockResolvedValueOnce({ rows: [] }) // Update membership status
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      await communityService.approveMembership(communityId, membershipId, moderatorId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should reject approval by non-moderator', async () => {
      const communityId = 'community-123';
      const membershipId = 'membership-456';
      const userId = 'user-789'; // Not a moderator

      const mockMembership = {
        id: membershipId,
        communityId,
        userId: 'user-456',
        status: 'pending'
      };

      const mockUserMembership = {
        id: 'membership-789',
        communityId,
        userId,
        role: 'member' // Not moderator or owner
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockMembership] })
        .mockResolvedValueOnce({ rows: [mockUserMembership] });

      await expect(communityService.approveMembership(communityId, membershipId, userId))
        .rejects.toThrow('Insufficient permissions');
    });
  });

  describe('manageMember', () => {
    it('should promote member to moderator', async () => {
      const communityId = 'community-123';
      const memberId = 'user-456';
      const moderatorId = 'user-123';
      const action = { type: 'promote', role: 'moderator' };

      const mockOwnerMembership = {
        id: 'membership-123',
        communityId,
        userId: moderatorId,
        role: 'owner'
      };

      const mockMemberMembership = {
        id: 'membership-456',
        communityId,
        userId: memberId,
        role: 'member'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockOwnerMembership] }) // Check permissions
        .mockResolvedValueOnce({ rows: [mockMemberMembership] }) // Get member
        .mockResolvedValueOnce({ rows: [] }); // Update role

      await communityService.manageMember(communityId, memberId, moderatorId, action);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE community_memberships SET role'),
        expect.arrayContaining(['moderator', memberId, communityId])
      );
    });

    it('should remove member from community', async () => {
      const communityId = 'community-123';
      const memberId = 'user-456';
      const moderatorId = 'user-123';
      const action = { type: 'remove' };

      const mockModeratorMembership = {
        id: 'membership-123',
        communityId,
        userId: moderatorId,
        role: 'moderator'
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockModeratorMembership] }) // Check permissions
        .mockResolvedValueOnce({ rows: [] }) // Delete membership
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      await communityService.manageMember(communityId, memberId, moderatorId, action);

      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('searchCommunities', () => {
    it('should search communities with filters', async () => {
      const query = 'math';
      const filters = {
        type: 'subject',
        isPrivate: false,
        page: 1,
        limit: 10
      };

      const mockCommunities = [
        {
          id: 'community-1',
          name: 'Math Teachers',
          description: 'Community for math educators',
          type: 'subject',
          memberCount: 25
        },
        {
          id: 'community-2',
          name: 'Advanced Mathematics',
          description: 'For advanced math topics',
          type: 'subject',
          memberCount: 15
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockCommunities }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const result = await communityService.searchCommunities(query, filters);

      expect(result.data).toEqual(mockCommunities);
      expect(result.total).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['%math%'])
      );
    });
  });

  describe('getCommunityMembers', () => {
    it('should return paginated community members', async () => {
      const communityId = 'community-123';
      const pagination = { page: 1, limit: 20 };

      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-123',
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
          user: {
            id: 'user-123',
            fullName: 'John Doe',
            email: 'john@example.com'
          }
        },
        {
          id: 'membership-2',
          userId: 'user-456',
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
          user: {
            id: 'user-456',
            fullName: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockMembers }) // Get members
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const result = await communityService.getCommunityMembers(communityId, pagination);

      expect(result.data).toEqual(mockMembers);
      expect(result.total).toBe(2);
    });
  });
});