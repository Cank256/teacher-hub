import { CommunityService } from '../communityService';
import { getConnection } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Mock the database connection
jest.mock('../../database/connection');
jest.mock('../../utils/logger');

const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  (getConnection as jest.Mock).mockReturnValue(mockPool);
  mockPool.connect.mockResolvedValue(mockClient);
});

describe('CommunityService', () => {
  let communityService: CommunityService;

  beforeEach(() => {
    communityService = new CommunityService();
  });

  describe('createCommunity', () => {
    it('should create a community successfully', async () => {
      const communityId = uuidv4();
      const ownerId = uuidv4();
      const timestamp = new Date();

      const mockCommunityRow = {
        id: communityId,
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        owner_id: ownerId,
        moderators_json: JSON.stringify([]),
        is_private: false,
        requires_approval: false,
        rules_json: JSON.stringify([
          { id: expect.any(String), title: 'Be respectful', description: 'Treat all members with respect and courtesy', order: 1 },
          { id: expect.any(String), title: 'Stay on topic', description: 'Keep discussions relevant to the community purpose', order: 2 }
        ]),
        image_url: null,
        member_count: 1,
        post_count: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // INSERT community
        .mockResolvedValueOnce({ rows: [] }) // INSERT membership
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await communityService.createCommunity(ownerId, {
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        isPrivate: false,
        requiresApproval: false
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO communities'),
        expect.arrayContaining([
          expect.any(String), // communityId
          'Math Teachers Uganda',
          'A community for mathematics teachers',
          'subject',
          ownerId,
          JSON.stringify([]),
          false,
          false,
          expect.any(String), // rules JSON
          null,
          1,
          0,
          true,
          expect.any(Date),
          expect.any(Date)
        ])
      );

      expect(result).toEqual({
        id: communityId,
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        ownerId: ownerId,
        moderators: [],
        isPrivate: false,
        requiresApproval: false,
        rules: expect.any(Array),
        imageUrl: null,
        memberCount: 1,
        postCount: 0,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors and rollback transaction', async () => {
      const ownerId = uuidv4();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // INSERT community fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.createCommunity(ownerId, {
        name: 'Test Community',
        description: 'Test description',
        type: 'general',
        isPrivate: false,
        requiresApproval: false
      })).rejects.toThrow('Failed to create community');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getCommunityById', () => {
    it('should return community when found', async () => {
      const communityId = uuidv4();
      const ownerId = uuidv4();
      const timestamp = new Date();

      const mockCommunityRow = {
        id: communityId,
        name: 'Test Community',
        description: 'Test description',
        type: 'general',
        owner_id: ownerId,
        moderators_json: JSON.stringify(['user1']),
        is_private: false,
        requires_approval: false,
        rules_json: JSON.stringify([{ id: '1', title: 'Rule 1', description: 'First rule', order: 1 }]),
        image_url: 'https://example.com/image.jpg',
        member_count: 2,
        post_count: 5,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      };

      mockClient.query.mockResolvedValue({ rows: [mockCommunityRow] });

      const result = await communityService.getCommunityById(communityId);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM communities WHERE id = $1 AND is_active = true',
        [communityId]
      );

      expect(result).toEqual({
        id: communityId,
        name: 'Test Community',
        description: 'Test description',
        type: 'general',
        ownerId: ownerId,
        moderators: ['user1'],
        isPrivate: false,
        requiresApproval: false,
        rules: [{ id: '1', title: 'Rule 1', description: 'First rule', order: 1 }],
        imageUrl: 'https://example.com/image.jpg',
        memberCount: 2,
        postCount: 5,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    });

    it('should return null when community not found', async () => {
      const communityId = uuidv4();
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await communityService.getCommunityById(communityId);

      expect(result).toBeNull();
    });

    it('should check private community access', async () => {
      const communityId = uuidv4();
      const viewerId = uuidv4();
      const ownerId = uuidv4();

      const mockCommunityRow = {
        id: communityId,
        name: 'Private Community',
        description: 'Private test community',
        type: 'general',
        owner_id: ownerId,
        moderators_json: JSON.stringify([]),
        is_private: true,
        requires_approval: false,
        rules_json: JSON.stringify([]),
        image_url: null,
        member_count: 1,
        post_count: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Get community
        .mockResolvedValueOnce({ rows: [] }); // Check membership - not found

      const result = await communityService.getCommunityById(communityId, viewerId);

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT status FROM community_memberships'),
        [communityId, viewerId]
      );
    });
  });

  describe('joinCommunity', () => {
    it('should allow user to join community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockCommunityRow = {
        id: communityId,
        requires_approval: false,
        is_active: true
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Check community exists
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [] }) // INSERT new membership
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community member count
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await communityService.joinCommunity(communityId, userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO community_memberships'),
        expect.arrayContaining([
          expect.any(String), // membershipId
          communityId,
          userId,
          'member',
          'active',
          expect.any(Date),
          expect.any(String) // permissions JSON
        ])
      );

      expect(result.status).toBe('active');
      expect(result.role).toBe('member');
    });

    it('should create pending membership for approval-required communities', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockCommunityRow = {
        id: communityId,
        requires_approval: true,
        is_active: true
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Check community exists
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [] }) // INSERT new membership
        .mockResolvedValueOnce({ rows: [] }); // COMMIT (no member count update for pending)

      const result = await communityService.joinCommunity(communityId, userId);

      expect(result.status).toBe('pending');
    });

    it('should throw error if user is already a member', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockCommunityRow = {
        id: communityId,
        requires_approval: false,
        is_active: true
      };

      const mockMembershipRow = {
        id: uuidv4(),
        community_id: communityId,
        user_id: userId,
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Check community exists
        .mockResolvedValueOnce({ rows: [mockMembershipRow] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.joinCommunity(communityId, userId))
        .rejects.toThrow('User is already a member of this community');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('leaveCommunity', () => {
    it('should allow user to leave community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockMembershipRow = {
        id: uuidv4(),
        community_id: communityId,
        user_id: userId,
        role: 'member',
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMembershipRow] }) // Check membership
        .mockResolvedValueOnce({ rows: [] }) // DELETE membership
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community member count
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.leaveCommunity(communityId, userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [communityId, userId]
      );
    });

    it('should prevent owner from leaving', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockMembershipRow = {
        id: uuidv4(),
        community_id: communityId,
        user_id: userId,
        role: 'owner',
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMembershipRow] }) // Check membership
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.leaveCommunity(communityId, userId))
        .rejects.toThrow('Community owner cannot leave. Transfer ownership first.');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('searchCommunities', () => {
    it('should search communities with filters and pagination', async () => {
      const timestamp = new Date();
      const mockCommunities = [
        {
          id: uuidv4(),
          name: 'Math Community',
          description: 'For math teachers',
          type: 'subject',
          owner_id: uuidv4(),
          moderators_json: JSON.stringify(['user1']),
          is_private: false,
          requires_approval: false,
          rules_json: JSON.stringify([]),
          image_url: null,
          member_count: 2,
          post_count: 5,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockCommunities }); // Data query

      const result = await communityService.searchCommunities('math', {
        type: 'subject'
      }, {
        page: 1,
        limit: 10
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total FROM communities'),
        ['%math%', 'subject']
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.name).toBe('Math Community');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('deleteCommunity', () => {
    it('should soft delete community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockOwnerRow = {
        role: 'owner'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockOwnerRow] }) // Check owner permission
        .mockResolvedValueOnce({ rows: [] }); // UPDATE community to inactive

      await communityService.deleteCommunity(communityId, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT role FROM community_memberships'),
        [communityId, userId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE communities SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [communityId]
      );
    });

    it('should throw error if user is not owner', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rows: [] }); // Check owner permission - not owner

      await expect(communityService.deleteCommunity(communityId, userId))
        .rejects.toThrow('User not authorized to delete community');
    });
  });

  describe('approveMembership', () => {
    it('should approve membership request successfully', async () => {
      const communityId = uuidv4();
      const membershipId = uuidv4();
      const moderatorId = uuidv4();

      const mockModeratorRow = {
        role: 'moderator'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockModeratorRow] }) // Check moderator permission
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'user123' }] }) // UPDATE membership status
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community member count
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.approveMembership(communityId, membershipId, moderatorId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE community_memberships'),
        [membershipId, communityId]
      );
    });
  });

  describe('manageMember', () => {
    it('should remove member successfully', async () => {
      const communityId = uuidv4();
      const memberId = uuidv4();
      const moderatorId = uuidv4();

      const mockModeratorRow = {
        role: 'moderator'
      };

      const mockMemberRow = {
        id: uuidv4(),
        role: 'member',
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockModeratorRow] }) // Check moderator permission
        .mockResolvedValueOnce({ rows: [mockMemberRow] }) // Get member info
        .mockResolvedValueOnce({ rows: [] }) // DELETE membership (remove member)
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community member count
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.manageMember(communityId, memberId, moderatorId, 'remove');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});