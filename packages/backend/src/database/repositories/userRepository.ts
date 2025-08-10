import { BaseRepository } from './base';
import { TeacherProfile, UserEntity } from '../../types';
import { db } from '../connection';
import { createLogger } from '../../utils/logger';

const logger = createLogger('user-repository');

export class UserRepository extends BaseRepository<TeacherProfile> {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<TeacherProfile | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to find user by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<TeacherProfile | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE google_id = $1 AND is_active = true',
        [googleId]
      );
      
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to find user by Google ID: ${googleId}`, error);
      throw error;
    }
  }

  /**
   * Find users by subject
   */
  async findBySubject(subject: string, limit: number = 10): Promise<TeacherProfile[]> {
    try {
      const result = await db.query(
        `SELECT * FROM users 
         WHERE subjects_json @> $1 
         AND is_active = true 
         AND verification_status = 'verified'
         ORDER BY created_at DESC 
         LIMIT $2`,
        [JSON.stringify([subject]), limit]
      );
      
      return result.rows.map((row: any) => this.mapFromDb(row));
    } catch (error) {
      logger.error(`Failed to find users by subject: ${subject}`, error);
      throw error;
    }
  }

  /**
   * Find users by location (district)
   */
  async findByDistrict(district: string, limit: number = 10): Promise<TeacherProfile[]> {
    try {
      const result = await db.query(
        `SELECT * FROM users 
         WHERE school_location_json->>'district' = $1 
         AND is_active = true 
         AND verification_status = 'verified'
         ORDER BY created_at DESC 
         LIMIT $2`,
        [district, limit]
      );
      
      return result.rows.map((row: any) => this.mapFromDb(row));
    } catch (error) {
      logger.error(`Failed to find users by district: ${district}`, error);
      throw error;
    }
  }

  /**
   * Search users by name
   */
  async searchByName(searchTerm: string, limit: number = 10): Promise<TeacherProfile[]> {
    try {
      const result = await db.query(
        `SELECT * FROM users 
         WHERE full_name ILIKE $1 
         AND is_active = true 
         AND verification_status = 'verified'
         ORDER BY full_name 
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );
      
      return result.rows.map((row: any) => this.mapFromDb(row));
    } catch (error) {
      logger.error(`Failed to search users by name: ${searchTerm}`, error);
      throw error;
    }
  }

  /**
   * Update user verification status
   */
  async updateVerificationStatus(
    id: string, 
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<TeacherProfile | null> {
    try {
      const result = await db.query(
        'UPDATE users SET verification_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to update verification status for user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error(`Failed to update last login for user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update user credentials and verification status
   */
  async updateCredentials(
    id: string, 
    credentials: any[], 
    verificationStatus: 'pending' | 'verified' | 'rejected'
  ): Promise<TeacherProfile | null> {
    try {
      const result = await db.query(
        `UPDATE users 
         SET credentials_json = $1, verification_status = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [JSON.stringify(credentials), verificationStatus, id]
      );
      
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to update credentials for user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, id]
      );
    } catch (error) {
      logger.error(`Failed to update password for user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update user Google ID
   */
  async updateGoogleId(id: string, googleId: string | null): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [googleId, id]
      );
    } catch (error) {
      logger.error(`Failed to update Google ID for user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    bySubject: Record<string, number>;
    byDistrict: Record<string, number>;
  }> {
    try {
      const [totalResult, statusResult, subjectResult, districtResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
        db.query(`
          SELECT verification_status, COUNT(*) as count 
          FROM users 
          WHERE is_active = true 
          GROUP BY verification_status
        `),
        db.query(`
          SELECT subject, COUNT(*) as count
          FROM users, jsonb_array_elements_text(subjects_json) as subject
          WHERE is_active = true
          GROUP BY subject
          ORDER BY count DESC
        `),
        db.query(`
          SELECT school_location_json->>'district' as district, COUNT(*) as count
          FROM users
          WHERE is_active = true AND school_location_json->>'district' IS NOT NULL
          GROUP BY district
          ORDER BY count DESC
        `)
      ]);

      const statusCounts = statusResult.rows.reduce((acc: any, row: any) => {
        acc[row.verification_status] = parseInt(row.count);
        return acc;
      }, {});

      const bySubject = subjectResult.rows.reduce((acc: any, row: any) => {
        acc[row.subject] = parseInt(row.count);
        return acc;
      }, {});

      const byDistrict = districtResult.rows.reduce((acc: any, row: any) => {
        acc[row.district] = parseInt(row.count);
        return acc;
      }, {});

      return {
        total: parseInt(totalResult.rows[0].count),
        verified: statusCounts.verified || 0,
        pending: statusCounts.pending || 0,
        rejected: statusCounts.rejected || 0,
        bySubject,
        byDistrict
      };
    } catch (error) {
      logger.error('Failed to get user statistics', error);
      throw error;
    }
  }

  protected mapFromDb(row: any): TeacherProfile {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      subjects: Array.isArray(row.subjects_json) ? row.subjects_json : JSON.parse(row.subjects_json || '[]'),
      gradeLevels: Array.isArray(row.grade_levels_json) ? row.grade_levels_json : JSON.parse(row.grade_levels_json || '[]'),
      schoolLocation: typeof row.school_location_json === 'object' ? row.school_location_json : JSON.parse(row.school_location_json || '{}'),
      yearsExperience: row.years_experience,
      verificationStatus: row.verification_status,
      credentials: Array.isArray(row.credentials_json) ? row.credentials_json : JSON.parse(row.credentials_json || '[]'),
      preferences: typeof row.preferences_json === 'object' ? row.preferences_json : JSON.parse(row.preferences_json || '{}'),
      profileImageUrl: row.profile_image_url,
      bio: row.bio,
      phone: row.phone,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      googleId: row.google_id,
      authProvider: row.auth_provider || 'local',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  protected mapToDb(data: Partial<TeacherProfile>): Record<string, any> {
    const dbData: Record<string, any> = {};

    if (data.email !== undefined) dbData.email = data.email;
    if (data.passwordHash !== undefined) dbData.password_hash = data.passwordHash;
    if (data.fullName !== undefined) dbData.full_name = data.fullName;
    if (data.subjects !== undefined) dbData.subjects_json = JSON.stringify(data.subjects);
    if (data.gradeLevels !== undefined) dbData.grade_levels_json = JSON.stringify(data.gradeLevels);
    if (data.schoolLocation !== undefined) dbData.school_location_json = JSON.stringify(data.schoolLocation);
    if (data.yearsExperience !== undefined) dbData.years_experience = data.yearsExperience;
    if (data.verificationStatus !== undefined) dbData.verification_status = data.verificationStatus;
    if (data.credentials !== undefined) dbData.credentials_json = JSON.stringify(data.credentials);
    if (data.preferences !== undefined) dbData.preferences_json = JSON.stringify(data.preferences);
    if (data.profileImageUrl !== undefined) dbData.profile_image_url = data.profileImageUrl;
    if (data.bio !== undefined) dbData.bio = data.bio;
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.lastLoginAt !== undefined) dbData.last_login_at = data.lastLoginAt;
    if (data.googleId !== undefined) dbData.google_id = data.googleId;
    if (data.authProvider !== undefined) dbData.auth_provider = data.authProvider;

    return dbData;
  }
}

export const userRepository = new UserRepository();