import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnhancedCommunity, 
  EnhancedCommunityMembership, 
  CreateCommunityRequest,
  UpdateCommunityRequest,
  CommunitySearchFilters,
  PaginationOptions,
  PaginatedResponse,
  CommunityRule,
  CommunityPermission,
  MemberAction
} from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export class CommunityService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  async createCommunity(ownerId: string, data: CreateCommunityRequest): Promise<EnhancedCommunity> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const communityId = uuidv4();
      const timestamp = new Date();

      // Create the community with enhanced schema
      const communityQuery = `
        INSERT INTO communities (
          id, name, description, type, owner_id, moderators_json,
          is_private, requires_approval, rules_json, image_url, 
          member_count, post_count, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const defaultRules: CommunityRule[] = data.rules || [
        { id: uuidv4(), title: 'Be respectful', description: 'Treat all members with respect and courtesy', order: 1 },
        { id: uuidv4(), title: 'Stay on topic', description: 'Keep discussions relevant to the community purpose', order: 2 }
      ];

      const communityValues = [
        communityId,
        data.name,
        data.description,
        data.type,
        ownerId, // Owner ID
        JSON.stringify([]), // Initially no moderators
        data.isPrivate,
        data.requiresApproval || false,
        JSON.stringify(defaultRules),
        data.imageUrl || null,
        1, // Initial member count (owner)
        0, // Initial post count
        true, // is_active
        timestamp,
        timestamp
      ];

      const communityResult = await client.query(communityQuery, communityValues);
      const communityRow = communityResult.rows[0];

      // Create membership record for owner with full permissions
      const ownerPermissions: CommunityPermission[] = [
        { action: 'post', granted: true },
        { action: 'comment', granted: true },
        { action: 'moderate', granted: true },
        { action: 'invite', granted: true },
        { action: 'manage_members', granted: true }
      ];

      const membershipQuery = `
        INSERT INTO community_memberships (
          id, community_id, user_id, role, status, joined_at, permissions_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const membershipValues = [
        uuidv4(),
        communityId,
        ownerId,
        'owner',
        'active',
        timestamp,
        JSON.stringify(ownerPermissions)
      ];

      await client.query(membershipQuery, membershipValues);

      await client.query('COMMIT');

      const community: EnhancedCommunity = {
        id: communityRow.id,
        name: communityRow.name,
        description: communityRow.description,
        type: communityRow.type,
        ownerId: communityRow.owner_id,
        moderators: JSON.parse(communityRow.moderators_json),
        isPrivate: communityRow.is_private,
        requiresApproval: communityRow.requires_approval,
        rules: JSON.parse(communityRow.rules_json),
        imageUrl: communityRow.image_url,
        memberCount: communityRow.member_count,
        postCount: communityRow.post_count,
        isActive: communityRow.is_active,
        createdAt: communityRow.created_at,
        updatedAt: communityRow.updated_at
      };

      logger.info(`Community created: ${communityId} by user ${ownerId}`);
      return community;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating community:', error);
      throw new Error('Failed to create community');
    } finally {
      client.release();
    }
  }

  async getCommunityById(communityId: string, viewerId?: string): Promise<EnhancedCommunity | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM communities WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [communityId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Check if viewer has access to private community
      if (row.is_private && viewerId) {
        const membershipQuery = `
          SELECT status FROM community_memberships 
          WHERE community_id = $1 AND user_id = $2 AND status IN ('active', 'pending')
        `;
        const membershipResult = await client.query(membershipQuery, [communityId, viewerId]);
        
        if (membershipResult.rows.length === 0) {
          return null; // User doesn't have access to private community
        }
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        ownerId: row.owner_id,
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        requiresApproval: row.requires_approval,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        postCount: row.post_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error fetching community:', error);
      throw new Error('Failed to fetch community');
    } finally {
      client.release();
    }
  }

  async updateCommunity(communityId: string, userId: string, data: UpdateCommunityRequest): Promise<EnhancedCommunity> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is owner or moderator
      const authQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const authResult = await client.query(authQuery, [communityId, userId]);
      
      if (authResult.rows.length === 0) {
        throw new Error('User not authorized to update community');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(data.description);
      }
      if (data.isPrivate !== undefined) {
        updateFields.push(`is_private = $${paramIndex++}`);
        updateValues.push(data.isPrivate);
      }
      if (data.requiresApproval !== undefined) {
        updateFields.push(`requires_approval = $${paramIndex++}`);
        updateValues.push(data.requiresApproval);
      }
      if (data.rules !== undefined) {
        updateFields.push(`rules_json = $${paramIndex++}`);
        updateValues.push(JSON.stringify(data.rules));
      }
      if (data.imageUrl !== undefined) {
        updateFields.push(`image_url = $${paramIndex++}`);
        updateValues.push(data.imageUrl);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date());

      updateValues.push(communityId);

      const query = `
        UPDATE communities 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND is_active = true
        RETURNING *
      `;

      const result = await client.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('Community not found');
      }

      const row = result.rows[0];
      const community: EnhancedCommunity = {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        ownerId: row.owner_id,
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        requiresApproval: row.requires_approval,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        postCount: row.post_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info(`Community ${communityId} updated by user ${userId}`);
      return community;
    } catch (error) {
      logger.error('Error updating community:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteCommunity(communityId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is owner
      const ownerQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active' AND role = 'owner'
      `;
      const ownerResult = await client.query(ownerQuery, [communityId, userId]);
      
      if (ownerResult.rows.length === 0) {
        throw new Error('User not authorized to delete community');
      }

      // Soft delete the community
      await client.query(
        'UPDATE communities SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [communityId]
      );

      logger.info(`Community ${communityId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting community:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async joinCommunity(communityId: string, userId: string): Promise<EnhancedCommunityMembership> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if community exists and is active
      const communityQuery = 'SELECT * FROM communities WHERE id = $1 AND is_active = true';
      const communityResult = await client.query(communityQuery, [communityId]);
      
      if (communityResult.rows.length === 0) {
        throw new Error('Community not found');
      }

      const community = communityResult.rows[0];

      // Check if user is already a member
      const membershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, userId]);
      
      if (membershipResult.rows.length > 0) {
        const existingMembership = membershipResult.rows[0];
        if (existingMembership.status === 'active') {
          throw new Error('User is already a member of this community');
        } else if (existingMembership.status === 'pending') {
          throw new Error('Membership request is already pending');
        } else if (existingMembership.status === 'banned') {
          throw new Error('User is banned from this community');
        }
      }

      // Determine initial status based on community settings
      const initialStatus = community.requires_approval ? 'pending' : 'active';
      
      // Default member permissions
      const memberPermissions: CommunityPermission[] = [
        { action: 'post', granted: true },
        { action: 'comment', granted: true },
        { action: 'moderate', granted: false },
        { action: 'invite', granted: false },
        { action: 'manage_members', granted: false }
      ];

      const membershipId = uuidv4();
      const timestamp = new Date();

      if (membershipResult.rows.length > 0) {
        // Update existing membership
        await client.query(
          `UPDATE community_memberships 
           SET status = $1, joined_at = $2, permissions_json = $3 
           WHERE community_id = $4 AND user_id = $5`,
          [initialStatus, timestamp, JSON.stringify(memberPermissions), communityId, userId]
        );
      } else {
        // Create new membership
        const newMembershipQuery = `
          INSERT INTO community_memberships (
            id, community_id, user_id, role, status, joined_at, permissions_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(newMembershipQuery, [
          membershipId,
          communityId,
          userId,
          'member',
          initialStatus,
          timestamp,
          JSON.stringify(memberPermissions)
        ]);
      }

      // Update community member count if approved immediately
      if (initialStatus === 'active') {
        await client.query(
          'UPDATE communities SET member_count = member_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [communityId]
        );
      }

      await client.query('COMMIT');

      const membership: EnhancedCommunityMembership = {
        id: membershipId,
        communityId,
        userId,
        role: 'member',
        status: initialStatus,
        joinedAt: timestamp,
        permissions: memberPermissions
      };

      logger.info(`User ${userId} ${initialStatus === 'active' ? 'joined' : 'requested to join'} community ${communityId}`);
      return membership;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error joining community:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user is a member
      const membershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, userId]);
      
      if (membershipResult.rows.length === 0) {
        throw new Error('User is not a member of this community');
      }

      const membership = membershipResult.rows[0];

      // Prevent owner from leaving (they must transfer ownership first)
      if (membership.role === 'owner') {
        throw new Error('Community owner cannot leave. Transfer ownership first.');
      }

      // Remove membership
      await client.query(
        'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [communityId, userId]
      );

      // Update community member count and remove from moderators if applicable
      if (membership.role === 'moderator') {
        const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
        const communityResult = await client.query(communityQuery, [communityId]);
        const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
        const updatedModerators = currentModerators.filter((modId: string) => modId !== userId);

        await client.query(
          'UPDATE communities SET moderators_json = $1, member_count = member_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(updatedModerators), communityId]
        );
      } else {
        await client.query(
          'UPDATE communities SET member_count = member_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [communityId]
        );
      }

      await client.query('COMMIT');
      logger.info(`User ${userId} left community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error leaving community:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async approveMembership(communityId: string, membershipId: string, moderatorId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if moderator has permission
      const moderatorQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const moderatorResult = await client.query(moderatorQuery, [communityId, moderatorId]);
      
      if (moderatorResult.rows.length === 0) {
        throw new Error('User not authorized to approve memberships');
      }

      // Update membership status
      const updateResult = await client.query(
        `UPDATE community_memberships 
         SET status = 'active' 
         WHERE id = $1 AND community_id = $2 AND status = 'pending'
         RETURNING user_id`,
        [membershipId, communityId]
      );
      
      if (updateResult.rowCount === 0) {
        throw new Error('Membership request not found or already processed');
      }

      // Update community member count
      await client.query(
        'UPDATE communities SET member_count = member_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [communityId]
      );

      await client.query('COMMIT');
      logger.info(`Membership ${membershipId} approved by ${moderatorId} in community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error approving membership:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async manageMember(communityId: string, memberId: string, moderatorId: string, action: MemberAction): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if moderator has permission
      const moderatorQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const moderatorResult = await client.query(moderatorQuery, [communityId, moderatorId]);
      
      if (moderatorResult.rows.length === 0) {
        throw new Error('User not authorized to manage members');
      }

      const moderatorRole = moderatorResult.rows[0].role;

      // Get target member info
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member not found in community');
      }

      const member = memberResult.rows[0];

      // Prevent actions on owner or higher-level roles
      if (member.role === 'owner' || (member.role === 'moderator' && moderatorRole !== 'owner')) {
        throw new Error('Insufficient permissions to perform this action');
      }

      switch (action) {
        case 'promote':
          if (moderatorRole !== 'owner') {
            throw new Error('Only owners can promote members to moderator');
          }
          await this.promoteMember(communityId, memberId, 'moderator', client);
          break;
        
        case 'demote':
          if (moderatorRole !== 'owner') {
            throw new Error('Only owners can demote moderators');
          }
          await this.demoteMember(communityId, memberId, client);
          break;
        
        case 'remove':
          await this.removeMember(communityId, memberId, client);
          break;
        
        case 'ban':
          await this.banMember(communityId, memberId, client);
          break;
        
        default:
          throw new Error('Invalid member action');
      }

      await client.query('COMMIT');
      logger.info(`Member ${memberId} ${action}ed by ${moderatorId} in community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error managing member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async promoteMember(communityId: string, memberId: string, newRole: 'moderator', client: any): Promise<void> {
    // Update member role
    await client.query(
      `UPDATE community_memberships 
       SET role = $1 
       WHERE community_id = $2 AND user_id = $3`,
      [newRole, communityId, memberId]
    );

    // Add to moderators list
    const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
    const communityResult = await client.query(communityQuery, [communityId]);
    const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
    
    if (!currentModerators.includes(memberId)) {
      currentModerators.push(memberId);
      await client.query(
        'UPDATE communities SET moderators_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(currentModerators), communityId]
      );
    }
  }

  private async demoteMember(communityId: string, memberId: string, client: any): Promise<void> {
    // Update member role
    await client.query(
      `UPDATE community_memberships 
       SET role = 'member' 
       WHERE community_id = $1 AND user_id = $2`,
      [communityId, memberId]
    );

    // Remove from moderators list
    const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
    const communityResult = await client.query(communityQuery, [communityId]);
    const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
    const updatedModerators = currentModerators.filter((modId: string) => modId !== memberId);

    await client.query(
      'UPDATE communities SET moderators_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(updatedModerators), communityId]
    );
  }

  private async removeMember(communityId: string, memberId: string, client: any): Promise<void> {
    // Delete membership
    await client.query(
      'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, memberId]
    );

    // Update community member count
    await client.query(
      'UPDATE communities SET member_count = member_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [communityId]
    );
  }

  private async banMember(communityId: string, memberId: string, client: any): Promise<void> {
    // Update membership status to banned
    await client.query(
      `UPDATE community_memberships 
       SET status = 'banned', role = 'member' 
       WHERE community_id = $1 AND user_id = $2`,
      [communityId, memberId]
    );

    // Update community member count
    await client.query(
      'UPDATE communities SET member_count = member_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [communityId]
    );
  }

  async searchCommunities(query: string, filters: CommunitySearchFilters, pagination: PaginationOptions): Promise<PaginatedResponse<EnhancedCommunity>> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramIndex = 1;

      // Add search query
      if (query && query.trim()) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${query.trim()}%`);
        paramIndex++;
      }

      // Add filters
      if (filters.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(filters.type);
      }

      if (filters.isPrivate !== undefined) {
        conditions.push(`is_private = $${paramIndex++}`);
        values.push(filters.isPrivate);
      }

      // Calculate pagination
      const limit = pagination.limit || 20;
      const offset = ((pagination.page || 1) - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM communities 
        WHERE ${conditions.join(' AND ')}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT * FROM communities 
        WHERE ${conditions.join(' AND ')}
        ORDER BY member_count DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);
      const result = await client.query(dataQuery, values);
      
      const communities = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        ownerId: row.owner_id,
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        requiresApproval: row.requires_approval,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        postCount: row.post_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        data: communities,
        pagination: {
          page: pagination.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching communities:', error);
      throw new Error('Failed to search communities');
    } finally {
      client.release();
    }
  }

  async getUserCommunities(userId: string): Promise<EnhancedCommunity[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT c.* FROM communities c
        JOIN community_memberships cm ON c.id = cm.community_id
        WHERE cm.user_id = $1 AND cm.status = 'active' AND c.is_active = true
        ORDER BY cm.joined_at DESC
      `;

      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        ownerId: row.owner_id,
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        requiresApproval: row.requires_approval,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        postCount: row.post_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error fetching user communities:', error);
      throw new Error('Failed to fetch user communities');
    } finally {
      client.release();
    }
  }

  async getCommunityMembers(communityId: string, userId: string, pagination: PaginationOptions): Promise<PaginatedResponse<any>> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is a member of the community
      const membershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, userId]);
      
      if (membershipResult.rows.length === 0) {
        throw new Error('User is not a member of this community');
      }

      const limit = pagination.limit || 20;
      const offset = ((pagination.page || 1) - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM community_memberships cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.community_id = $1 AND cm.status = 'active' AND u.is_active = true
      `;
      const countResult = await client.query(countQuery, [communityId]);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated members
      const query = `
        SELECT 
          u.id, u.full_name, u.profile_image_url, u.subjects_json, u.grade_levels_json,
          cm.role, cm.joined_at, cm.permissions_json
        FROM users u
        JOIN community_memberships cm ON u.id = cm.user_id
        WHERE cm.community_id = $1 AND cm.status = 'active' AND u.is_active = true
        ORDER BY 
          CASE cm.role 
            WHEN 'owner' THEN 1 
            WHEN 'moderator' THEN 2 
            ELSE 3 
          END,
          cm.joined_at ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [communityId, limit, offset]);
      
      const members = result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        profileImageUrl: row.profile_image_url,
        subjects: JSON.parse(row.subjects_json || '[]'),
        gradeLevels: JSON.parse(row.grade_levels_json || '[]'),
        role: row.role,
        joinedAt: row.joined_at,
        permissions: JSON.parse(row.permissions_json || '[]')
      }));

      return {
        data: members,
        pagination: {
          page: pagination.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching community members:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingMemberships(communityId: string, moderatorId: string, pagination: PaginationOptions): Promise<PaginatedResponse<any>> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is owner or moderator
      const authQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const authResult = await client.query(authQuery, [communityId, moderatorId]);
      
      if (authResult.rows.length === 0) {
        throw new Error('User not authorized to view pending memberships');
      }

      const limit = pagination.limit || 20;
      const offset = ((pagination.page || 1) - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM community_memberships cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.community_id = $1 AND cm.status = 'pending' AND u.is_active = true
      `;
      const countResult = await client.query(countQuery, [communityId]);
      const total = parseInt(countResult.rows[0].total);

      // Get pending memberships
      const query = `
        SELECT 
          cm.id as membership_id, u.id, u.full_name, u.profile_image_url, 
          u.subjects_json, u.grade_levels_json, cm.joined_at
        FROM users u
        JOIN community_memberships cm ON u.id = cm.user_id
        WHERE cm.community_id = $1 AND cm.status = 'pending' AND u.is_active = true
        ORDER BY cm.joined_at ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [communityId, limit, offset]);
      
      const pendingMembers = result.rows.map(row => ({
        membershipId: row.membership_id,
        id: row.id,
        fullName: row.full_name,
        profileImageUrl: row.profile_image_url,
        subjects: JSON.parse(row.subjects_json || '[]'),
        gradeLevels: JSON.parse(row.grade_levels_json || '[]'),
        requestedAt: row.joined_at
      }));

      return {
        data: pendingMembers,
        pagination: {
          page: pagination.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching pending memberships:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}