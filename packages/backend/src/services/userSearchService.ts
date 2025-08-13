import { Pool } from 'pg';
import { 
  UserSearchResult, 
  UserSearchFilters, 
  PaginationOptions, 
  PaginatedResponse 
} from '../types';
import { getConnection } from '../database/connection';
import logger from '../utils/logger';

export class UserSearchService {
  private pool: Pool;

  constructor() {
    this.pool = getConnection();
  }

  // Search for users with filters and pagination
  async searchUsers(
    query: string, 
    searcherId: string, 
    filters: UserSearchFilters = {},
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<UserSearchResult>> {
    const client = await this.pool.connect();
    
    try {
      // Log the search for analytics
      await this.logUserSearch(client, searcherId, query, filters);

      let whereClause = `
        WHERE u.is_active = true 
        AND u.id != $2
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private')
      `;
      
      const queryParams: any[] = [searcherId];
      let paramIndex = 3;

      // Add search query conditions
      if (query.trim()) {
        whereClause += ` AND (
          u.full_name ILIKE $${paramIndex} 
          OR u.email ILIKE $${paramIndex}
          OR u.bio ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${query.trim()}%`);
        paramIndex++;
      }

      // Add filter conditions
      if (filters.subjects && filters.subjects.length > 0) {
        whereClause += ` AND u.subjects_json::jsonb ?| $${paramIndex}`;
        queryParams.push(filters.subjects);
        paramIndex++;
      }

      if (filters.gradeLevels && filters.gradeLevels.length > 0) {
        whereClause += ` AND u.grade_levels_json::jsonb ?| $${paramIndex}`;
        queryParams.push(filters.gradeLevels);
        paramIndex++;
      }

      if (filters.regions && filters.regions.length > 0) {
        whereClause += ` AND (u.school_location_json->>'region')::text = ANY($${paramIndex})`;
        queryParams.push(filters.regions);
        paramIndex++;
      }

      if (filters.verificationStatus) {
        whereClause += ` AND u.verification_status = $${paramIndex}`;
        queryParams.push(filters.verificationStatus);
        paramIndex++;
      }

      const offset = (pagination.page - 1) * pagination.limit;

      const searchQuery = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.profile_image_url,
          u.subjects_json,
          u.grade_levels_json,
          u.school_location_json,
          u.verification_status,
          u.bio,
          u.years_experience,
          u.created_at,
          -- Calculate relevance score
          CASE 
            WHEN u.full_name ILIKE $1 THEN 100
            WHEN u.email ILIKE $1 THEN 90
            WHEN u.bio ILIKE $1 THEN 80
            ELSE 50
          END as relevance_score
        FROM users u
        ${whereClause}
        ORDER BY relevance_score DESC, u.verification_status DESC, u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `;

      // Add query parameter for relevance calculation
      const searchQueryParams = [query.trim() ? `%${query.trim()}%` : '%', ...queryParams, pagination.limit, offset];
      const countQueryParams = [query.trim() ? `%${query.trim()}%` : '%', ...queryParams];

      const [result, countResult] = await Promise.all([
        client.query(searchQuery, searchQueryParams),
        client.query(countQuery, countQueryParams)
      ]);

      const users = result.rows.map(row => this.mapRowToUserSearchResult(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error('Failed to search users');
    } finally {
      client.release();
    }
  }

  // Get user suggestions based on common subjects, location, etc.
  async getUserSuggestions(
    userId: string, 
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<UserSearchResult>> {
    const client = await this.pool.connect();
    
    try {
      // Get current user's profile for suggestions
      const userQuery = 'SELECT subjects_json, grade_levels_json, school_location_json FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userProfile = userResult.rows[0];
      const userSubjects = JSON.parse(userProfile.subjects_json || '[]');
      const userGradeLevels = JSON.parse(userProfile.grade_levels_json || '[]');
      const userLocation = JSON.parse(userProfile.school_location_json || '{}');

      const offset = (pagination.page - 1) * pagination.limit;

      const suggestionsQuery = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.profile_image_url,
          u.subjects_json,
          u.grade_levels_json,
          u.school_location_json,
          u.verification_status,
          u.bio,
          u.years_experience,
          u.created_at,
          -- Calculate suggestion score based on common attributes
          (
            CASE WHEN u.subjects_json::jsonb ?| $2 THEN 50 ELSE 0 END +
            CASE WHEN u.grade_levels_json::jsonb ?| $3 THEN 30 ELSE 0 END +
            CASE WHEN u.school_location_json->>'region' = $4 THEN 40 ELSE 0 END +
            CASE WHEN u.school_location_json->>'district' = $5 THEN 20 ELSE 0 END +
            CASE WHEN u.verification_status = 'verified' THEN 10 ELSE 0 END
          ) as suggestion_score
        FROM users u
        WHERE u.is_active = true 
        AND u.id != $1
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private')
        AND (
          u.subjects_json::jsonb ?| $2 OR
          u.grade_levels_json::jsonb ?| $3 OR
          u.school_location_json->>'region' = $4 OR
          u.school_location_json->>'district' = $5
        )
        ORDER BY suggestion_score DESC, u.verification_status DESC, u.created_at DESC
        LIMIT $6 OFFSET $7
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.is_active = true 
        AND u.id != $1
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private')
        AND (
          u.subjects_json::jsonb ?| $2 OR
          u.grade_levels_json::jsonb ?| $3 OR
          u.school_location_json->>'region' = $4 OR
          u.school_location_json->>'district' = $5
        )
      `;

      const queryParams = [
        userId,
        userSubjects,
        userGradeLevels,
        userLocation.region || '',
        userLocation.district || '',
        pagination.limit,
        offset
      ];

      const countParams = queryParams.slice(0, 5); // Remove limit and offset

      const [result, countResult] = await Promise.all([
        client.query(suggestionsQuery, queryParams),
        client.query(countQuery, countParams)
      ]);

      const users = result.rows.map(row => this.mapRowToUserSearchResult(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user suggestions:', error);
      throw new Error('Failed to get user suggestions');
    } finally {
      client.release();
    }
  }

  // Get recently active users
  async getRecentlyActiveUsers(
    userId: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<UserSearchResult>> {
    const client = await this.pool.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      const query = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.profile_image_url,
          u.subjects_json,
          u.grade_levels_json,
          u.school_location_json,
          u.verification_status,
          u.bio,
          u.years_experience,
          u.created_at,
          u.last_login_at
        FROM users u
        WHERE u.is_active = true 
        AND u.id != $1
        AND u.last_login_at IS NOT NULL
        AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private')
        ORDER BY u.last_login_at DESC, u.verification_status DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.is_active = true 
        AND u.id != $1
        AND u.last_login_at IS NOT NULL
        AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private')
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [userId, pagination.limit, offset]),
        client.query(countQuery, [userId])
      ]);

      const users = result.rows.map(row => this.mapRowToUserSearchResult(row));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error getting recently active users:', error);
      throw new Error('Failed to get recently active users');
    } finally {
      client.release();
    }
  }

  // Get user by ID for search results
  async getUserById(userId: string, searcherId: string): Promise<UserSearchResult | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.profile_image_url,
          u.subjects_json,
          u.grade_levels_json,
          u.school_location_json,
          u.verification_status,
          u.bio,
          u.years_experience,
          u.created_at
        FROM users u
        WHERE u.id = $1 
        AND u.is_active = true
        AND (u.preferences_json->>'privacy'->>'profileVisibility' IS NULL 
             OR u.preferences_json->>'privacy'->>'profileVisibility' != 'private'
             OR u.id = $2)
      `;

      const result = await client.query(query, [userId, searcherId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserSearchResult(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw new Error('Failed to get user');
    } finally {
      client.release();
    }
  }

  // Check if user discovery is allowed based on privacy settings
  async isUserDiscoverable(userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          u.preferences_json->>'privacy'->>'profileVisibility' as visibility
        FROM users u
        WHERE u.id = $1 AND u.is_active = true
      `;

      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const visibility = result.rows[0].visibility;
      return visibility !== 'private';
    } catch (error) {
      logger.error('Error checking user discoverability:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // Log user search for analytics
  private async logUserSearch(
    client: any, 
    searcherId: string, 
    query: string, 
    filters: UserSearchFilters
  ): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO user_searches (
          searcher_id, search_query, search_filters, search_type, results_count
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      // We'll update results_count after the search is complete
      await client.query(logQuery, [
        searcherId,
        query,
        JSON.stringify(filters),
        'users',
        0 // Will be updated later if needed
      ]);
    } catch (error) {
      logger.warn('Failed to log user search:', error);
      // Don't throw error as this is not critical
    }
  }

  // Helper method to map database row to UserSearchResult
  private mapRowToUserSearchResult(row: any): UserSearchResult {
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      profileImageUrl: row.profile_image_url,
      subjects: JSON.parse(row.subjects_json || '[]'),
      verificationStatus: row.verification_status,
      bio: row.bio,
      yearsExperience: row.years_experience,
      gradeLevels: JSON.parse(row.grade_levels_json || '[]'),
      schoolLocation: JSON.parse(row.school_location_json || '{}'),
      createdAt: row.created_at
    };
  }
}