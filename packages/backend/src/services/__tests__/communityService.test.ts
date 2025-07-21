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
      const creatorId = uuidv4();
      const timestamp = new Date();

      const mockCommunityRow = {
        id: communityId,
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        members_json: JSON.stringify([creatorId]),
        moderators_json: JSON.stringify([creatorId]),
        is_private: false,
        rules_json: JSON.stringify(['Be respectful', 'Stay on topic']),
        image_url: null,
        member_count: 1,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // INSERT community
        .mockResolvedValueOnce({ rows: [] }) // INSERT membership
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await communityService.createCommunity({
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        isPrivate: false,
        rules: ['Be respectful', 'Stay on topic'],
        creatorId
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
          JSON.stringify([creatorId]),
          JSON.stringify([creatorId]),
          false,
          JSON.stringify(['Be respectful', 'Stay on topic']),
          null,
          1,
          expect.any(Date),
          expect.any(Date)
        ])
      );

      expect(result).toEqual({
        id: communityId,
        name: 'Math Teachers Uganda',
        description: 'A community for mathematics teachers',
        type: 'subject',
        members: [creatorId],
        moderators: [creatorId],
        isPrivate: false,
        rules: ['Be respectful', 'Stay on topic'],
        imageUrl: null,
        memberCount: 1,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors and rollback transaction', async () => {
      const creatorId = uuidv4();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // INSERT community fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.createCommunity({
        name: 'Test Community',
        description: 'Test description',
        type: 'general',
        isPrivate: false,
        rules: [],
        creatorId
      })).rejects.toThrow('Failed to create community');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getCommunityById', () => {
    it('should return community when found', async () => {
      const communityId = uuidv4();
      const timestamp = new Date();

      const mockCommunityRow = {
        id: communityId,
        name: 'Test Community',
        description: 'Test description',
        type: 'general',
        members_json: JSON.stringify(['user1', 'user2']),
        moderators_json: JSON.stringify(['user1']),
        is_private: false,
        rules_json: JSON.stringify(['Rule 1']),
        image_url: 'https://example.com/image.jpg',
        member_count: 2,
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
        members: ['user1', 'user2'],
        moderators: ['user1'],
        isPrivate: false,
        rules: ['Rule 1'],
        imageUrl: 'https://example.com/image.jpg',
        memberCount: 2,
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
  });

  describe('joinCommunity', () => {
    it('should allow user to join community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();
      const existingMembers = ['user1', 'user2'];

      const mockCommunityRow = {
        id: communityId,
        members_json: JSON.stringify(existingMembers),
        is_active: true
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Check community exists
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [] }) // INSERT new membership
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community members
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.joinCommunity(communityId, userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO community_memberships'),
        expect.arrayContaining([
          expect.any(String), // membershipId
          communityId,
          userId,
          'member',
          expect.any(Date),
          true
        ])
      );
    });

    it('should throw error if user is already a member', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockCommunityRow = {
        id: communityId,
        members_json: JSON.stringify(['user1']),
        is_active: true
      };

      const mockMembershipRow = {
        id: uuidv4(),
        community_id: communityId,
        user_id: userId,
        is_active: true
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

    it('should throw error if community not found', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check community exists - not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.joinCommunity(communityId, userId))
        .rejects.toThrow('Community not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('leaveCommunity', () => {
    it('should allow user to leave community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();
      const existingMembers = ['user1', userId, 'user2'];
      const existingModerators = ['user1'];

      const mockMembershipRow = {
        id: uuidv4(),
        community_id: communityId,
        user_id: userId,
        is_active: true
      };

      const mockCommunityRow = {
        members_json: JSON.stringify(existingMembers),
        moderators_json: JSON.stringify(existingModerators)
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMembershipRow] }) // Check membership
        .mockResolvedValueOnce({ rows: [] }) // UPDATE membership to inactive
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Get community data
        .mockResolvedValueOnce({ rows: [] }) // UPDATE community members
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.leaveCommunity(communityId, userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE community_memberships SET is_active = false WHERE community_id = $1 AND user_id = $2',
        [communityId, userId]
      );
    });

    it('should throw error if user is not a member', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check membership - not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.leaveCommunity(communityId, userId))
        .rejects.toThrow('User is not a member of this community');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('promoteMember', () => {
    it('should promote member to moderator successfully', async () => {
      const communityId = uuidv4();
      const adminUserId = uuidv4();
      const targetUserId = uuidv4();

      const mockAdminRow = {
        role: 'admin'
      };

      const mockCommunityRow = {
        moderators_json: JSON.stringify([adminUserId])
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAdminRow] }) // Check admin permission
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE member role
        .mockResolvedValueOnce({ rows: [mockCommunityRow] }) // Get community data
        .mockResolvedValueOnce({ rows: [] }) // UPDATE moderators list
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await communityService.promoteMember(communityId, adminUserId, targetUserId, 'moderator');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE community_memberships'),
        ['moderator', communityId, targetUserId]
      );
    });

    it('should throw error if user is not admin', async () => {
      const communityId = uuidv4();
      const adminUserId = uuidv4();
      const targetUserId = uuidv4();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check admin permission - not admin
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(communityService.promoteMember(communityId, adminUserId, targetUserId, 'moderator'))
        .rejects.toThrow('User not authorized to promote members');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('searchCommunities', () => {
    it('should search communities with filters', async () => {
      const timestamp = new Date();
      const mockCommunities = [
        {
          id: uuidv4(),
          name: 'Math Community',
          description: 'For math teachers',
          type: 'subject',
          members_json: JSON.stringify(['user1', 'user2']),
          moderators_json: JSON.stringify(['user1']),
          is_private: false,
          rules_json: JSON.stringify([]),
          image_url: null,
          member_count: 2,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockCommunities });

      const result = await communityService.searchCommunities({
        type: 'subject',
        searchTerm: 'math',
        limit: 10,
        offset: 0
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = true AND type = $1 AND (name ILIKE $2 OR description ILIKE $2)'),
        ['subject', '%math%', 10, 0]
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Math Community');
      expect(result[0]?.type).toBe('subject');
    });
  });

  describe('getUserCommunities', () => {
    it('should return user communities', async () => {
      const userId = uuidv4();
      const timestamp = new Date();
      const mockCommunities = [
        {
          id: uuidv4(),
          name: 'My Community',
          description: 'Test community',
          type: 'general',
          members_json: JSON.stringify([userId]),
          moderators_json: JSON.stringify([userId]),
          is_private: false,
          rules_json: JSON.stringify([]),
          image_url: null,
          member_count: 1,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockCommunities });

      const result = await communityService.getUserCommunities(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN community_memberships cm ON c.id = cm.community_id'),
        [userId]
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('My Community');
    });
  });

  describe('deleteCommunity', () => {
    it('should soft delete community successfully', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      const mockAdminRow = {
        role: 'admin'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockAdminRow] }) // Check admin permission
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

    it('should throw error if user is not admin', async () => {
      const communityId = uuidv4();
      const userId = uuidv4();

      mockClient.query.mockResolvedValue({ rows: [] }); // Check admin permission - not admin

      await expect(communityService.deleteCommunity(communityId, userId))
        .rejects.toThrow('User not authorized to delete community');
    });
  });
});