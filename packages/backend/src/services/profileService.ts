import { userRepository } from '../database/repositories/userRepository';
import { TeacherProfile, UserConnection } from '../types';
import { createLogger } from '../utils/logger';
import { db } from '../database/connection';

const logger = createLogger('profile-service');

export interface ProfileSearchParams {
  query?: string;
  subject?: string;
  gradeLevel?: string;
  district?: string;
  region?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  minExperience?: number;
  maxExperience?: number;
  page: number;
  limit: number;
}

export interface ProfileSearchResult {
  profiles: Omit<TeacherProfile, 'passwordHash'>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConnectionResult {
  followers?: Omit<TeacherProfile, 'passwordHash'>[];
  following?: Omit<TeacherProfile, 'passwordHash'>[];
  followerCount: number;
  followingCount: number;
}

class ProfileService {
  /**
   * Get user profile by ID (excluding sensitive information)
   */
  async getProfile(id: string): Promise<Omit<TeacherProfile, 'passwordHash'> | null> {
    try {
      const profile = await userRepository.findById(id);
      
      if (!profile || !profile.isActive) {
        return null;
      }

      // Remove sensitive information
      const { passwordHash, ...publicProfile } = profile;
      return publicProfile;
    } catch (error) {
      logger.error(`Failed to get profile: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    id: string, 
    updateData: Partial<TeacherProfile>
  ): Promise<Omit<TeacherProfile, 'passwordHash'> | null> {
    try {
      // Remove sensitive fields that shouldn't be updated through this method
      const { passwordHash, id: profileId, createdAt, ...allowedUpdates } = updateData;

      const updatedProfile = await userRepository.update(id, allowedUpdates);
      
      if (!updatedProfile) {
        return null;
      }

      // Remove sensitive information
      const { passwordHash: _, ...publicProfile } = updatedProfile;
      return publicProfile;
    } catch (error) {
      logger.error(`Failed to update profile: ${id}`, error);
      throw error;
    }
  }

  /**
   * Search and filter teacher profiles
   */
  async searchProfiles(params: ProfileSearchParams): Promise<ProfileSearchResult> {
    try {
      const {
        query,
        subject,
        gradeLevel,
        district,
        region,
        verificationStatus,
        minExperience,
        maxExperience,
        page,
        limit
      } = params;

      const offset = (page - 1) * limit;
      
      // Build dynamic query
      let whereConditions: string[] = ['is_active = true'];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Text search in name and bio
      if (query) {
        whereConditions.push(`(full_name ILIKE $${paramIndex} OR bio ILIKE $${paramIndex})`);
        queryParams.push(`%${query}%`);
        paramIndex++;
      }

      // Subject filter
      if (subject) {
        whereConditions.push(`subjects_json @> $${paramIndex}`);
        queryParams.push(JSON.stringify([subject]));
        paramIndex++;
      }

      // Grade level filter
      if (gradeLevel) {
        whereConditions.push(`grade_levels_json @> $${paramIndex}`);
        queryParams.push(JSON.stringify([gradeLevel]));
        paramIndex++;
      }

      // District filter
      if (district) {
        whereConditions.push(`school_location_json->>'district' = $${paramIndex}`);
        queryParams.push(district);
        paramIndex++;
      }

      // Region filter
      if (region) {
        whereConditions.push(`school_location_json->>'region' = $${paramIndex}`);
        queryParams.push(region);
        paramIndex++;
      }

      // Verification status filter
      if (verificationStatus) {
        whereConditions.push(`verification_status = $${paramIndex}`);
        queryParams.push(verificationStatus);
        paramIndex++;
      }

      // Experience range filter
      if (minExperience !== undefined) {
        whereConditions.push(`years_experience >= $${paramIndex}`);
        queryParams.push(minExperience);
        paramIndex++;
      }

      if (maxExperience !== undefined) {
        whereConditions.push(`years_experience <= $${paramIndex}`);
        queryParams.push(maxExperience);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get profiles with pagination
      const profilesQuery = `
        SELECT * FROM users 
        WHERE ${whereClause}
        ORDER BY 
          CASE WHEN verification_status = 'verified' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const profilesResult = await db.query(profilesQuery, queryParams);

      const profiles = profilesResult.rows.map((row: any) => {
        const profile = userRepository['mapFromDb'](row);
        const { passwordHash, ...publicProfile } = profile;
        return publicProfile;
      });

      return {
        profiles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to search profiles', error);
      throw error;
    }
  }

  /**
   * Update profile verification status
   */
  async updateVerificationStatus(
    id: string,
    status: 'pending' | 'verified' | 'rejected',
    notes?: string
  ): Promise<Omit<TeacherProfile, 'passwordHash'> | null> {
    try {
      const updatedProfile = await userRepository.updateVerificationStatus(id, status);
      
      if (!updatedProfile) {
        return null;
      }

      // Log verification status change
      logger.info('Profile verification status updated', {
        profileId: id,
        status,
        notes
      });

      // Remove sensitive information
      const { passwordHash, ...publicProfile } = updatedProfile;
      return publicProfile;
    } catch (error) {
      logger.error(`Failed to update verification status: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get user connections (followers/following)
   */
  async getConnections(
    userId: string,
    type: 'followers' | 'following' | 'both'
  ): Promise<ConnectionResult> {
    try {
      const result: ConnectionResult = {
        followerCount: 0,
        followingCount: 0
      };

      if (type === 'followers' || type === 'both') {
        // Get followers
        const followersQuery = `
          SELECT u.* FROM users u
          INNER JOIN user_connections uc ON u.id = uc.follower_id
          WHERE uc.following_id = $1 AND uc.status = 'accepted' AND u.is_active = true
          ORDER BY uc.created_at DESC
        `;
        
        const followersResult = await db.query(followersQuery, [userId]);
        result.followers = followersResult.rows.map((row: any) => {
          const profile = userRepository['mapFromDb'](row);
          const { passwordHash, ...publicProfile } = profile;
          return publicProfile;
        });
        result.followerCount = result.followers?.length || 0;
      }

      if (type === 'following' || type === 'both') {
        // Get following
        const followingQuery = `
          SELECT u.* FROM users u
          INNER JOIN user_connections uc ON u.id = uc.following_id
          WHERE uc.follower_id = $1 AND uc.status = 'accepted' AND u.is_active = true
          ORDER BY uc.created_at DESC
        `;
        
        const followingResult = await db.query(followingQuery, [userId]);
        result.following = followingResult.rows.map((row: any) => {
          const profile = userRepository['mapFromDb'](row);
          const { passwordHash, ...publicProfile } = profile;
          return publicProfile;
        });
        result.followingCount = result.following?.length || 0;
      }

      // If we only need counts, get them efficiently
      if (type === 'both' && (!result.followers || !result.following)) {
        const countsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM user_connections WHERE following_id = $1 AND status = 'accepted') as follower_count,
            (SELECT COUNT(*) FROM user_connections WHERE follower_id = $1 AND status = 'accepted') as following_count
        `;
        
        const countsResult = await db.query(countsQuery, [userId]);
        if (countsResult.rows.length > 0) {
          result.followerCount = parseInt(countsResult.rows[0].follower_count);
          result.followingCount = parseInt(countsResult.rows[0].following_count);
        }
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get connections for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update follow status between users
   */
  async updateFollowStatus(
    followerId: string,
    followingId: string,
    action: 'follow' | 'unfollow'
  ): Promise<{ success: boolean; status?: string }> {
    try {
      if (action === 'follow') {
        // Check if connection already exists
        const existingConnection = await db.query(
          'SELECT * FROM user_connections WHERE follower_id = $1 AND following_id = $2',
          [followerId, followingId]
        );

        if (existingConnection.rows.length > 0) {
          // Update existing connection
          await db.query(
            'UPDATE user_connections SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE follower_id = $2 AND following_id = $3',
            ['accepted', followerId, followingId]
          );
        } else {
          // Create new connection
          await db.query(
            `INSERT INTO user_connections (id, follower_id, following_id, status, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [followerId, followingId, 'accepted']
          );
        }

        return { success: true, status: 'following' };
      } else {
        // Unfollow - delete or update connection
        await db.query(
          'DELETE FROM user_connections WHERE follower_id = $1 AND following_id = $2',
          [followerId, followingId]
        );

        return { success: true, status: 'not_following' };
      }
    } catch (error) {
      logger.error(`Failed to update follow status: ${followerId} -> ${followingId}`, error);
      throw error;
    }
  }

  /**
   * Get profile statistics
   */
  async getProfileStatistics(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    bySubject: Record<string, number>;
    byDistrict: Record<string, number>;
    recentRegistrations: number;
  }> {
    try {
      const stats = await userRepository.getStatistics();
      
      // Get recent registrations (last 30 days)
      const recentQuery = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' 
        AND is_active = true
      `;
      const recentResult = await db.query(recentQuery);
      const recentRegistrations = parseInt(recentResult.rows[0].count);

      return {
        ...stats,
        recentRegistrations
      };
    } catch (error) {
      logger.error('Failed to get profile statistics', error);
      throw error;
    }
  }

  /**
   * Get recommended profiles for a user
   */
  async getRecommendedProfiles(
    userId: string,
    limit: number = 10
  ): Promise<Omit<TeacherProfile, 'passwordHash'>[]> {
    try {
      // Get user's profile to understand their interests
      const userProfile = await userRepository.findById(userId);
      if (!userProfile) {
        return [];
      }

      // Find users with similar subjects or in same district
      const recommendationQuery = `
        SELECT DISTINCT u.*, 
          CASE 
            WHEN u.school_location_json->>'district' = $2 THEN 3
            WHEN u.subjects_json && $3 THEN 2
            ELSE 1
          END as relevance_score
        FROM users u
        WHERE u.id != $1 
          AND u.is_active = true 
          AND u.verification_status = 'verified'
          AND u.id NOT IN (
            SELECT following_id FROM user_connections 
            WHERE follower_id = $1 AND status = 'accepted'
          )
        ORDER BY relevance_score DESC, u.created_at DESC
        LIMIT $4
      `;

      const result = await db.query(recommendationQuery, [
        userId,
        userProfile.schoolLocation.district,
        JSON.stringify(userProfile.subjects),
        limit
      ]);

      return result.rows.map((row: any) => {
        const profile = userRepository['mapFromDb'](row);
        const { passwordHash, ...publicProfile } = profile;
        return publicProfile;
      });
    } catch (error) {
      logger.error(`Failed to get recommended profiles for user: ${userId}`, error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();