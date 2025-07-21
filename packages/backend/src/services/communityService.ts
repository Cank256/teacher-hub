import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Community, CommunityMembership } from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export interface CreateCommunityData {
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  isPrivate: boolean;
  rules: string[];
  imageUrl?: string;
  creatorId: string;
}

export interface UpdateCommunityData {
  name?: string;
  description?: string;
  rules?: string[];
  imageUrl?: string;
}

export interface CommunitySearchFilters {
  type?: 'subject' | 'region' | 'grade' | 'general';
  isPrivate?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export class CommunityService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  async createCommunity(data: CreateCommunityData): Promise<Community> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const communityId = uuidv4();
      const timestamp = new Date();

      // Create the community
      const communityQuery = `
        INSERT INTO communities (
          id, name, description, type, members_json, moderators_json,
          is_private, rules_json, image_url, member_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const communityValues = [
        communityId,
        data.name,
        data.description,
        data.type,
        JSON.stringify([data.creatorId]), // Creator is first member
        JSON.stringify([data.creatorId]), // Creator is first moderator
        data.isPrivate,
        JSON.stringify(data.rules),
        data.imageUrl || null,
        1, // Initial member count
        timestamp,
        timestamp
      ];

      const communityResult = await client.query(communityQuery, communityValues);
      const communityRow = communityResult.rows[0];

      // Create membership record for creator
      const membershipQuery = `
        INSERT INTO community_memberships (
          id, community_id, user_id, role, joined_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      const membershipValues = [
        uuidv4(),
        communityId,
        data.creatorId,
        'admin',
        timestamp,
        true
      ];

      await client.query(membershipQuery, membershipValues);

      await client.query('COMMIT');

      const community: Community = {
        id: communityRow.id,
        name: communityRow.name,
        description: communityRow.description,
        type: communityRow.type,
        members: JSON.parse(communityRow.members_json),
        moderators: JSON.parse(communityRow.moderators_json),
        isPrivate: communityRow.is_private,
        rules: JSON.parse(communityRow.rules_json),
        imageUrl: communityRow.image_url,
        memberCount: communityRow.member_count,
        isActive: communityRow.is_active,
        createdAt: communityRow.created_at,
        updatedAt: communityRow.updated_at
      };

      logger.info(`Community created: ${communityId} by user ${data.creatorId}`);
      return community;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating community:', error);
      throw new Error('Failed to create community');
    } finally {
      client.release();
    }
  }

  async getCommunityById(communityId: string): Promise<Community | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM communities WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [communityId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        members: JSON.parse(row.members_json),
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
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

  async updateCommunity(communityId: string, userId: string, data: UpdateCommunityData): Promise<Community> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is moderator or admin
      const authQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND is_active = true
        AND role IN ('moderator', 'admin')
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
      const community: Community = {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        members: JSON.parse(row.members_json),
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
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

  async joinCommunity(communityId: string, userId: string): Promise<void> {
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
        if (membershipResult.rows[0].is_active) {
          throw new Error('User is already a member of this community');
        } else {
          // Reactivate membership
          await client.query(
            'UPDATE community_memberships SET is_active = true, joined_at = CURRENT_TIMESTAMP WHERE community_id = $1 AND user_id = $2',
            [communityId, userId]
          );
        }
      } else {
        // Create new membership
        const newMembershipQuery = `
          INSERT INTO community_memberships (
            id, community_id, user_id, role, joined_at, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(newMembershipQuery, [
          uuidv4(),
          communityId,
          userId,
          'member',
          new Date(),
          true
        ]);
      }

      // Update community members list and count
      const currentMembers = JSON.parse(community.members_json);
      if (!currentMembers.includes(userId)) {
        currentMembers.push(userId);
        
        await client.query(
          'UPDATE communities SET members_json = $1, member_count = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [JSON.stringify(currentMembers), currentMembers.length, communityId]
        );
      }

      await client.query('COMMIT');
      logger.info(`User ${userId} joined community ${communityId}`);
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
        WHERE community_id = $1 AND user_id = $2 AND is_active = true
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, userId]);
      
      if (membershipResult.rows.length === 0) {
        throw new Error('User is not a member of this community');
      }

      // Deactivate membership
      await client.query(
        'UPDATE community_memberships SET is_active = false WHERE community_id = $1 AND user_id = $2',
        [communityId, userId]
      );

      // Update community members list and count
      const communityQuery = 'SELECT members_json, moderators_json FROM communities WHERE id = $1';
      const communityResult = await client.query(communityQuery, [communityId]);
      const community = communityResult.rows[0];

      const currentMembers = JSON.parse(community.members_json);
      const currentModerators = JSON.parse(community.moderators_json);

      const updatedMembers = currentMembers.filter((memberId: string) => memberId !== userId);
      const updatedModerators = currentModerators.filter((modId: string) => modId !== userId);

      await client.query(
        'UPDATE communities SET members_json = $1, moderators_json = $2, member_count = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [JSON.stringify(updatedMembers), JSON.stringify(updatedModerators), updatedMembers.length, communityId]
      );

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

  async promoteMember(communityId: string, adminUserId: string, targetUserId: string, newRole: 'moderator' | 'admin'): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if admin user has permission
      const adminQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND is_active = true AND role = 'admin'
      `;
      const adminResult = await client.query(adminQuery, [communityId, adminUserId]);
      
      if (adminResult.rows.length === 0) {
        throw new Error('User not authorized to promote members');
      }

      // Update target user's role
      const updateQuery = `
        UPDATE community_memberships 
        SET role = $1 
        WHERE community_id = $2 AND user_id = $3 AND is_active = true
      `;
      const updateResult = await client.query(updateQuery, [newRole, communityId, targetUserId]);
      
      if (updateResult.rowCount === 0) {
        throw new Error('Target user not found in community');
      }

      // Update moderators list if promoting to moderator
      if (newRole === 'moderator') {
        const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
        const communityResult = await client.query(communityQuery, [communityId]);
        const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);

        if (!currentModerators.includes(targetUserId)) {
          currentModerators.push(targetUserId);
          await client.query(
            'UPDATE communities SET moderators_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(currentModerators), communityId]
          );
        }
      }

      await client.query('COMMIT');
      logger.info(`User ${targetUserId} promoted to ${newRole} in community ${communityId} by ${adminUserId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error promoting member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async searchCommunities(filters: CommunitySearchFilters): Promise<Community[]> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(filters.type);
      }

      if (filters.isPrivate !== undefined) {
        conditions.push(`is_private = $${paramIndex++}`);
        values.push(filters.isPrivate);
      }

      if (filters.searchTerm) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const query = `
        SELECT * FROM communities 
        WHERE ${conditions.join(' AND ')}
        ORDER BY member_count DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);

      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        members: JSON.parse(row.members_json),
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error searching communities:', error);
      throw new Error('Failed to search communities');
    } finally {
      client.release();
    }
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT c.* FROM communities c
        JOIN community_memberships cm ON c.id = cm.community_id
        WHERE cm.user_id = $1 AND cm.is_active = true AND c.is_active = true
        ORDER BY cm.joined_at DESC
      `;

      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        members: JSON.parse(row.members_json),
        moderators: JSON.parse(row.moderators_json),
        isPrivate: row.is_private,
        rules: JSON.parse(row.rules_json),
        imageUrl: row.image_url,
        memberCount: row.member_count,
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

  async getCommunityMembers(communityId: string, userId: string): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is a member of the community
      const membershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND is_active = true
      `;
      const membershipResult = await client.query(membershipQuery, [communityId, userId]);
      
      if (membershipResult.rows.length === 0) {
        throw new Error('User is not a member of this community');
      }

      const query = `
        SELECT 
          u.id, u.full_name, u.profile_image_url, u.subjects_json, u.grade_levels_json,
          cm.role, cm.joined_at
        FROM users u
        JOIN community_memberships cm ON u.id = cm.user_id
        WHERE cm.community_id = $1 AND cm.is_active = true AND u.is_active = true
        ORDER BY 
          CASE cm.role 
            WHEN 'admin' THEN 1 
            WHEN 'moderator' THEN 2 
            ELSE 3 
          END,
          cm.joined_at ASC
      `;

      const result = await client.query(query, [communityId]);
      
      return result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        profileImageUrl: row.profile_image_url,
        subjects: JSON.parse(row.subjects_json || '[]'),
        gradeLevels: JSON.parse(row.grade_levels_json || '[]'),
        role: row.role,
        joinedAt: row.joined_at
      }));
    } catch (error) {
      logger.error('Error fetching community members:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteCommunity(communityId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if user is admin
      const adminQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND is_active = true AND role = 'admin'
      `;
      const adminResult = await client.query(adminQuery, [communityId, userId]);
      
      if (adminResult.rows.length === 0) {
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
}