import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnhancedCommunityMembership, 
  CommunityPermission,
  PaginationOptions,
  PaginatedResponse,
  MemberAction
} from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export class CommunityMembershipService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  async createMembershipRequest(communityId: string, userId: string): Promise<EnhancedCommunityMembership> {
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

      // Check if user is already a member or has pending request
      const existingMembershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2
      `;
      const existingResult = await client.query(existingMembershipQuery, [communityId, userId]);
      
      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'active') {
          throw new Error('User is already a member of this community');
        } else if (existing.status === 'pending') {
          throw new Error('Membership request is already pending');
        } else if (existing.status === 'banned') {
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

      // Create or update membership
      if (existingResult.rows.length > 0) {
        await client.query(
          `UPDATE community_memberships 
           SET status = $1, role = 'member', joined_at = $2, permissions_json = $3 
           WHERE community_id = $4 AND user_id = $5`,
          [initialStatus, timestamp, JSON.stringify(memberPermissions), communityId, userId]
        );
      } else {
        const insertQuery = `
          INSERT INTO community_memberships (
            id, community_id, user_id, role, status, joined_at, permissions_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(insertQuery, [
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
      logger.error('Error creating membership request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async approveMembershipRequest(communityId: string, membershipId: string, approverId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if approver has permission (owner or moderator)
      const approverQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const approverResult = await client.query(approverQuery, [communityId, approverId]);
      
      if (approverResult.rows.length === 0) {
        throw new Error('User not authorized to approve membership requests');
      }

      // Update membership status to active
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
      logger.info(`Membership ${membershipId} approved by ${approverId} in community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error approving membership request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectMembershipRequest(communityId: string, membershipId: string, rejectorId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if rejector has permission (owner or moderator)
      const rejectorQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const rejectorResult = await client.query(rejectorQuery, [communityId, rejectorId]);
      
      if (rejectorResult.rows.length === 0) {
        throw new Error('User not authorized to reject membership requests');
      }

      // Delete the pending membership request
      const deleteResult = await client.query(
        'DELETE FROM community_memberships WHERE id = $1 AND community_id = $2 AND status = $3',
        [membershipId, communityId, 'pending']
      );
      
      if (deleteResult.rowCount === 0) {
        throw new Error('Membership request not found or already processed');
      }

      logger.info(`Membership ${membershipId} rejected by ${rejectorId} in community ${communityId}`);
    } catch (error) {
      logger.error('Error rejecting membership request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async promoteMember(communityId: string, memberId: string, promoterId: string, newRole: 'moderator'): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if promoter is owner
      const promoterQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active' AND role = 'owner'
      `;
      const promoterResult = await client.query(promoterQuery, [communityId, promoterId]);
      
      if (promoterResult.rows.length === 0) {
        throw new Error('Only community owners can promote members to moderator');
      }

      // Check if member exists and is not already a moderator or owner
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member not found in community');
      }

      const member = memberResult.rows[0];
      if (member.role !== 'member') {
        throw new Error('User is already a moderator or owner');
      }

      // Update member role to moderator
      await client.query(
        `UPDATE community_memberships 
         SET role = $1 
         WHERE community_id = $2 AND user_id = $3`,
        [newRole, communityId, memberId]
      );

      // Add to moderators list in community
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

      // Update member permissions to include moderation rights
      const moderatorPermissions: CommunityPermission[] = [
        { action: 'post', granted: true },
        { action: 'comment', granted: true },
        { action: 'moderate', granted: true },
        { action: 'invite', granted: true },
        { action: 'manage_members', granted: false } // Only owners can manage members
      ];

      await client.query(
        `UPDATE community_memberships 
         SET permissions_json = $1 
         WHERE community_id = $2 AND user_id = $3`,
        [JSON.stringify(moderatorPermissions), communityId, memberId]
      );

      await client.query('COMMIT');
      logger.info(`Member ${memberId} promoted to ${newRole} by ${promoterId} in community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error promoting member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async demoteMember(communityId: string, memberId: string, demoterId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if demoter is owner
      const demoterQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active' AND role = 'owner'
      `;
      const demoterResult = await client.query(demoterQuery, [communityId, demoterId]);
      
      if (demoterResult.rows.length === 0) {
        throw new Error('Only community owners can demote moderators');
      }

      // Check if member is a moderator
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active' AND role = 'moderator'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member is not a moderator or not found');
      }

      // Update member role to regular member
      await client.query(
        `UPDATE community_memberships 
         SET role = 'member' 
         WHERE community_id = $1 AND user_id = $2`,
        [communityId, memberId]
      );

      // Remove from moderators list in community
      const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
      const communityResult = await client.query(communityQuery, [communityId]);
      const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
      const updatedModerators = currentModerators.filter((modId: string) => modId !== memberId);

      await client.query(
        'UPDATE communities SET moderators_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(updatedModerators), communityId]
      );

      // Update member permissions to remove moderation rights
      const memberPermissions: CommunityPermission[] = [
        { action: 'post', granted: true },
        { action: 'comment', granted: true },
        { action: 'moderate', granted: false },
        { action: 'invite', granted: false },
        { action: 'manage_members', granted: false }
      ];

      await client.query(
        `UPDATE community_memberships 
         SET permissions_json = $1 
         WHERE community_id = $2 AND user_id = $3`,
        [JSON.stringify(memberPermissions), communityId, memberId]
      );

      await client.query('COMMIT');
      logger.info(`Member ${memberId} demoted by ${demoterId} in community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error demoting member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeMember(communityId: string, memberId: string, removerId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if remover has permission (owner or moderator)
      const removerQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const removerResult = await client.query(removerQuery, [communityId, removerId]);
      
      if (removerResult.rows.length === 0) {
        throw new Error('User not authorized to remove members');
      }

      const removerRole = removerResult.rows[0].role;

      // Get member info
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member not found in community');
      }

      const member = memberResult.rows[0];

      // Prevent removing owner or higher-level roles
      if (member.role === 'owner' || (member.role === 'moderator' && removerRole !== 'owner')) {
        throw new Error('Insufficient permissions to remove this member');
      }

      // Remove membership
      await client.query(
        'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [communityId, memberId]
      );

      // Update community member count and remove from moderators if applicable
      if (member.role === 'moderator') {
        const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
        const communityResult = await client.query(communityQuery, [communityId]);
        const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
        const updatedModerators = currentModerators.filter((modId: string) => modId !== memberId);

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
      logger.info(`Member ${memberId} removed by ${removerId} from community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error removing member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async banMember(communityId: string, memberId: string, bannerId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if banner has permission (owner or moderator)
      const bannerQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const bannerResult = await client.query(bannerQuery, [communityId, bannerId]);
      
      if (bannerResult.rows.length === 0) {
        throw new Error('User not authorized to ban members');
      }

      const bannerRole = bannerResult.rows[0].role;

      // Get member info
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member not found in community');
      }

      const member = memberResult.rows[0];

      // Prevent banning owner or higher-level roles
      if (member.role === 'owner' || (member.role === 'moderator' && bannerRole !== 'owner')) {
        throw new Error('Insufficient permissions to ban this member');
      }

      // Update membership status to banned
      await client.query(
        `UPDATE community_memberships 
         SET status = 'banned', role = 'member' 
         WHERE community_id = $1 AND user_id = $2`,
        [communityId, memberId]
      );

      // Update community member count and remove from moderators if applicable
      if (member.role === 'moderator') {
        const communityQuery = 'SELECT moderators_json FROM communities WHERE id = $1';
        const communityResult = await client.query(communityQuery, [communityId]);
        const currentModerators = JSON.parse(communityResult.rows[0].moderators_json);
        const updatedModerators = currentModerators.filter((modId: string) => modId !== memberId);

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
      logger.info(`Member ${memberId} banned by ${bannerId} from community ${communityId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error banning member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async unbanMember(communityId: string, memberId: string, unbannerId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if unbanner has permission (owner or moderator)
      const unbannerQuery = `
        SELECT role FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('owner', 'moderator')
      `;
      const unbannerResult = await client.query(unbannerQuery, [communityId, unbannerId]);
      
      if (unbannerResult.rows.length === 0) {
        throw new Error('User not authorized to unban members');
      }

      // Check if member is banned
      const memberQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'banned'
      `;
      const memberResult = await client.query(memberQuery, [communityId, memberId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('Member is not banned or not found');
      }

      // Remove the banned membership record (they can rejoin if they want)
      await client.query(
        'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [communityId, memberId]
      );

      logger.info(`Member ${memberId} unbanned by ${unbannerId} from community ${communityId}`);
    } catch (error) {
      logger.error('Error unbanning member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async inviteMember(communityId: string, inviteeId: string, inviterId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if inviter has permission
      const inviterQuery = `
        SELECT role, permissions_json FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const inviterResult = await client.query(inviterQuery, [communityId, inviterId]);
      
      if (inviterResult.rows.length === 0) {
        throw new Error('User is not a member of this community');
      }

      const inviter = inviterResult.rows[0];
      const permissions: CommunityPermission[] = JSON.parse(inviter.permissions_json);
      const canInvite = permissions.find(p => p.action === 'invite')?.granted || inviter.role === 'owner';

      if (!canInvite) {
        throw new Error('User not authorized to invite members');
      }

      // Check if invitee is already a member or has pending request
      const existingMembershipQuery = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2
      `;
      const existingResult = await client.query(existingMembershipQuery, [communityId, inviteeId]);
      
      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'active') {
          throw new Error('User is already a member of this community');
        } else if (existing.status === 'pending') {
          throw new Error('User already has a pending membership request');
        } else if (existing.status === 'banned') {
          throw new Error('User is banned from this community');
        }
      }

      // Create invitation (pending membership)
      const memberPermissions: CommunityPermission[] = [
        { action: 'post', granted: true },
        { action: 'comment', granted: true },
        { action: 'moderate', granted: false },
        { action: 'invite', granted: false },
        { action: 'manage_members', granted: false }
      ];

      const membershipId = uuidv4();
      const timestamp = new Date();

      if (existingResult.rows.length > 0) {
        await client.query(
          `UPDATE community_memberships 
           SET status = 'pending', role = 'member', joined_at = $1, permissions_json = $2 
           WHERE community_id = $3 AND user_id = $4`,
          [timestamp, JSON.stringify(memberPermissions), communityId, inviteeId]
        );
      } else {
        const insertQuery = `
          INSERT INTO community_memberships (
            id, community_id, user_id, role, status, joined_at, permissions_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(insertQuery, [
          membershipId,
          communityId,
          inviteeId,
          'member',
          'pending',
          timestamp,
          JSON.stringify(memberPermissions)
        ]);
      }

      await client.query('COMMIT');
      logger.info(`User ${inviteeId} invited to community ${communityId} by ${inviterId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error inviting member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getMembershipStatus(communityId: string, userId: string): Promise<EnhancedCommunityMembership | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM community_memberships 
        WHERE community_id = $1 AND user_id = $2
      `;
      const result = await client.query(query, [communityId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        communityId: row.community_id,
        userId: row.user_id,
        role: row.role,
        status: row.status,
        joinedAt: row.joined_at,
        permissions: JSON.parse(row.permissions_json || '[]')
      };
    } catch (error) {
      logger.error('Error getting membership status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async trackMemberActivity(communityId: string, userId: string, activityType: 'post' | 'comment' | 'like' | 'share'): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Update last activity timestamp for the member
      await client.query(
        `UPDATE community_memberships 
         SET last_activity_at = CURRENT_TIMESTAMP 
         WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
        [communityId, userId]
      );

      // Log activity for analytics (could be expanded to track specific activities)
      logger.info(`Member ${userId} performed ${activityType} in community ${communityId}`);
    } catch (error) {
      logger.error('Error tracking member activity:', error);
      // Don't throw error as this is not critical functionality
    } finally {
      client.release();
    }
  }

  async getMemberActivitySummary(communityId: string, moderatorId: string, pagination: PaginationOptions): Promise<PaginatedResponse<any>> {
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
        throw new Error('User not authorized to view member activity');
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

      // Get member activity summary
      const query = `
        SELECT 
          u.id, u.full_name, u.profile_image_url,
          cm.role, cm.joined_at, cm.last_activity_at,
          COALESCE(post_counts.post_count, 0) as post_count,
          COALESCE(comment_counts.comment_count, 0) as comment_count
        FROM users u
        JOIN community_memberships cm ON u.id = cm.user_id
        LEFT JOIN (
          SELECT author_id, COUNT(*) as post_count 
          FROM posts 
          WHERE community_id = $1 
          GROUP BY author_id
        ) post_counts ON u.id = post_counts.author_id
        LEFT JOIN (
          SELECT pc.author_id, COUNT(*) as comment_count 
          FROM post_comments pc
          JOIN posts p ON pc.post_id = p.id
          WHERE p.community_id = $1 
          GROUP BY pc.author_id
        ) comment_counts ON u.id = comment_counts.author_id
        WHERE cm.community_id = $1 AND cm.status = 'active' AND u.is_active = true
        ORDER BY cm.last_activity_at DESC NULLS LAST, cm.joined_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [communityId, limit, offset]);
      
      const memberActivity = result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        profileImageUrl: row.profile_image_url,
        role: row.role,
        joinedAt: row.joined_at,
        lastActivityAt: row.last_activity_at,
        postCount: parseInt(row.post_count),
        commentCount: parseInt(row.comment_count)
      }));

      return {
        data: memberActivity,
        pagination: {
          page: pagination.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting member activity summary:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}