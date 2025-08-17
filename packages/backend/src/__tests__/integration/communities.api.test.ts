import request from 'supertest';
import { app } from '../../index';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';

// Mock database connection
jest.mock('../../database/connection');

describe('Communities API Integration Tests', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    userId = 'user-123';
    authToken = 'mock-jwt-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/communities', () => {
    it('should create community successfully', async () => {
      const communityData = {
        name: 'Math Teachers',
        description: 'Community for mathematics educators',
        type: 'subject',
        isPrivate: false,
        requiresApproval: true,
        rules: [
          { title: 'Be respectful', description: 'Treat all members with respect', order: 1 }
        ]
      };

      const mockCommunity = {
        id: 'community-123',
        ownerId: userId,
        ...communityData,
        moderators: [userId],
        memberCount: 1,
        postCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockMembership = {
        id: 'membership-123',
        communityId: 'community-123',
        userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date().toISOString()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check name uniqueness
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Insert community
        .mockResolvedValueOnce({ rows: [mockMembership] }); // Insert owner membership

      const response = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(communityData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCommunity
      });
    });

    it('should return 400 for duplicate community name', async () => {
      const communityData = {
        name: 'Existing Community',
        description: 'Test description',
        type: 'subject',
        isPrivate: false,
        requiresApproval: false,
        rules: []
      };

      const existingCommunity = { id: 'existing-123', name: 'Existing Community' };
      mockDb.query.mockResolvedValueOnce({ rows: [existingCommunity] });

      const response = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(communityData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/communities/search', () => {
    it('should search communities successfully', async () => {
      const mockCommunities = [
        {
          id: 'community-1',
          name: 'Math Teachers',
          description: 'Community for math educators',
          type: 'subject',
          memberCount: 25,
          isPrivate: false,
          owner: {
            id: 'user-456',
            fullName: 'John Doe'
          }
        },
        {
          id: 'community-2',
          name: 'Advanced Mathematics',
          description: 'For advanced math topics',
          type: 'subject',
          memberCount: 15,
          isPrivate: false,
          owner: {
            id: 'user-789',
            fullName: 'Jane Smith'
          }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockCommunities }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const response = await request(app)
        .get('/api/communities/search?q=math&type=subject&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          communities: mockCommunities,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        }
      });
    });

    it('should handle empty search results', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No results
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Zero count

      const response = await request(app)
        .get('/api/communities/search?q=nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.communities).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('POST /api/communities/:id/join', () => {
    it('should join public community immediately', async () => {
      const communityId = 'community-123';

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
        joinedAt: new Date().toISOString()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Get community
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [mockMembership] }) // Insert membership
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      const response = await request(app)
        .post(`/api/communities/${communityId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMembership
      });
    });

    it('should create pending membership for approval-required community', async () => {
      const communityId = 'community-123';

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
        joinedAt: new Date().toISOString()
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Get community
        .mockResolvedValueOnce({ rows: [] }) // Check existing membership
        .mockResolvedValueOnce({ rows: [mockMembership] }); // Insert membership

      const response = await request(app)
        .post(`/api/communities/${communityId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('pending');
    });

    it('should return 400 if already a member', async () => {
      const communityId = 'community-123';

      const mockCommunity = {
        id: communityId,
        isPrivate: false,
        requiresApproval: false
      };

      const existingMembership = {
        id: 'membership-existing',
        communityId,
        userId,
        status: 'active'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCommunity] }) // Get community
        .mockResolvedValueOnce({ rows: [existingMembership] }); // Check existing membership

      const response = await request(app)
        .post(`/api/communities/${communityId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already a member');
    });

    it('should return 403 for private community without invitation', async () => {
      const communityId = 'community-123';

      const mockCommunity = {
        id: communityId,
        name: 'Private Community',
        isPrivate: true,
        requiresApproval: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCommunity] });

      const response = await request(app)
        .post(`/api/communities/${communityId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('private community');
    });
  });

  describe('POST /api/communities/:id/members/:membershipId/approve', () => {
    it('should approve membership successfully', async () => {
      const communityId = 'community-123';
      const membershipId = 'membership-456';

      const mockMembership = {
        id: membershipId,
        communityId,
        userId: 'user-456',
        status: 'pending'
      };

      const mockModeratorMembership = {
        id: 'membership-123',
        communityId,
        userId,
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

      const response = await request(app)
        .post(`/api/communities/${communityId}/members/${membershipId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Membership approved successfully'
      });
    });

    it('should return 403 for non-moderator approval attempt', async () => {
      const communityId = 'community-123';
      const membershipId = 'membership-456';

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

      const response = await request(app)
        .post(`/api/communities/${communityId}/members/${membershipId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/communities/:id/members', () => {
    it('should return community members', async () => {
      const communityId = 'community-123';

      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-123',
          role: 'owner',
          status: 'active',
          joinedAt: new Date().toISOString(),
          user: {
            id: 'user-123',
            fullName: 'John Doe',
            email: 'john@example.com',
            profileImageUrl: '/profiles/john.jpg'
          }
        },
        {
          id: 'membership-2',
          userId: 'user-456',
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
          user: {
            id: 'user-456',
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            profileImageUrl: '/profiles/jane.jpg'
          }
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockMembers }) // Get members
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const response = await request(app)
        .get(`/api/communities/${communityId}/members?page=1&limit=20`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          members: mockMembers,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        }
      });
    });
  });

  describe('POST /api/communities/:id/members/:memberId/manage', () => {
    it('should promote member to moderator', async () => {
      const communityId = 'community-123';
      const memberId = 'user-456';
      const action = { type: 'promote', role: 'moderator' };

      const mockOwnerMembership = {
        id: 'membership-123',
        communityId,
        userId,
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

      const response = await request(app)
        .post(`/api/communities/${communityId}/members/${memberId}/manage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(action)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Member promoted successfully'
      });
    });

    it('should remove member from community', async () => {
      const communityId = 'community-123';
      const memberId = 'user-456';
      const action = { type: 'remove' };

      const mockModeratorMembership = {
        id: 'membership-123',
        communityId,
        userId,
        role: 'moderator'
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockModeratorMembership] }) // Check permissions
        .mockResolvedValueOnce({ rows: [] }) // Delete membership
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      const response = await request(app)
        .post(`/api/communities/${communityId}/members/${memberId}/manage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(action)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Member removed successfully'
      });
    });
  });

  describe('DELETE /api/communities/:id/leave', () => {
    it('should leave community successfully', async () => {
      const communityId = 'community-123';

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Delete membership
        .mockResolvedValueOnce({ rows: [] }); // Update member count

      const response = await request(app)
        .delete(`/api/communities/${communityId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Left community successfully'
      });
    });
  });

  describe('GET /api/communities/:id', () => {
    it('should return community details', async () => {
      const communityId = 'community-123';

      const mockCommunity = {
        id: communityId,
        name: 'Math Teachers',
        description: 'Community for mathematics educators',
        type: 'subject',
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: true,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date().toISOString(),
        owner: {
          id: 'user-456',
          fullName: 'John Doe',
          profileImageUrl: '/profiles/john.jpg'
        },
        userMembership: {
          id: 'membership-123',
          role: 'member',
          status: 'active'
        }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCommunity] });

      const response = await request(app)
        .get(`/api/communities/${communityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCommunity
      });
    });

    it('should return 404 for non-existent community', async () => {
      const communityId = 'non-existent';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/communities/${communityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});