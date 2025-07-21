import crypto from 'crypto';
import { GovernmentContent, GovernmentContentEntity } from '../types';
import { db } from '../database/connection';
import logger from '../utils/logger';

export interface GovernmentContentIngestionRequest {
  source: 'MOE' | 'UNEB' | 'NCDC';
  contentType: 'curriculum' | 'policy' | 'resource' | 'announcement';
  title: string;
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  targetAudience: string[];
  priority: 'high' | 'medium' | 'low';
  effectiveDate: Date;
  expiryDate?: Date;
  digitalSignature: string;
}

export interface ContentNotification {
  id: string;
  contentId: string;
  userId: string;
  type: 'new_content' | 'content_update' | 'urgent_announcement';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  createdAt: Date;
}

export interface DigitalSignatureVerificationResult {
  isValid: boolean;
  verificationHash: string;
  timestamp: Date;
  errors?: string[];
}

class GovernmentContentService {
  private readonly GOVERNMENT_PUBLIC_KEYS = {
    MOE: process.env.MOE_PUBLIC_KEY || 'mock-moe-public-key',
    UNEB: process.env.UNEB_PUBLIC_KEY || 'mock-uneb-public-key',
    NCDC: process.env.NCDC_PUBLIC_KEY || 'mock-ncdc-public-key'
  };

  /**
   * Verify digital signature for government content
   */
  async verifyDigitalSignature(
    content: string,
    signature: string,
    source: 'MOE' | 'UNEB' | 'NCDC'
  ): Promise<DigitalSignatureVerificationResult> {
    try {
      const publicKey = this.GOVERNMENT_PUBLIC_KEYS[source];
      
      // In a real implementation, this would use actual cryptographic verification
      // For now, we'll simulate the verification process
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');
      const signatureHash = crypto.createHash('sha256').update(signature).digest('hex');
      
      // Mock verification logic - in production, use proper RSA/ECDSA verification
      const isValid = signature.length > 0 && publicKey.length > 0;
      
      const verificationHash = crypto
        .createHash('sha256')
        .update(`${contentHash}:${signatureHash}:${source}`)
        .digest('hex');

      logger.info('Digital signature verification completed', {
        source,
        isValid,
        verificationHash: verificationHash.substring(0, 16) + '...'
      });

      return {
        isValid,
        verificationHash,
        timestamp: new Date(),
        errors: isValid ? undefined : ['Invalid digital signature']
      };
    } catch (error) {
      logger.error('Error verifying digital signature:', error);
      return {
        isValid: false,
        verificationHash: '',
        timestamp: new Date(),
        errors: ['Signature verification failed']
      };
    }
  }

  /**
   * Ingest government content with verification
   */
  async ingestGovernmentContent(
    contentData: GovernmentContentIngestionRequest
  ): Promise<GovernmentContent> {
    
    try {
      // Verify digital signature
      const verificationResult = await this.verifyDigitalSignature(
        contentData.content,
        contentData.digitalSignature,
        contentData.source
      );

      if (!verificationResult.isValid) {
        throw new Error(`Digital signature verification failed: ${verificationResult.errors?.join(', ')}`);
      }

      // Create government content record
      const contentId = crypto.randomUUID();
      const attachmentsJson = JSON.stringify(contentData.attachments || []);
      const targetAudienceJson = JSON.stringify(contentData.targetAudience);

      const query = `
        INSERT INTO government_content (
          id, source, content_type, title, content, attachments_json,
          target_audience_json, priority, effective_date, expiry_date,
          digital_signature, verification_hash, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        contentId,
        contentData.source,
        contentData.contentType,
        contentData.title,
        contentData.content,
        attachmentsJson,
        targetAudienceJson,
        contentData.priority,
        contentData.effectiveDate,
        contentData.expiryDate || null,
        contentData.digitalSignature,
        verificationResult.verificationHash,
        true,
        new Date(),
        new Date()
      ];

      const result = await db.query(query, values);
      const row = result.rows[0];

      // Convert database row to domain model
      const governmentContent: GovernmentContent = {
        id: row.id,
        source: row.source,
        contentType: row.content_type,
        title: row.title,
        content: row.content,
        attachments: JSON.parse(row.attachments_json),
        targetAudience: JSON.parse(row.target_audience_json),
        priority: row.priority,
        effectiveDate: row.effective_date,
        expiryDate: row.expiry_date,
        digitalSignature: row.digital_signature,
        verificationHash: row.verification_hash,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      logger.info('Government content ingested successfully', {
        contentId,
        source: contentData.source,
        contentType: contentData.contentType,
        priority: contentData.priority
      });

      // Trigger notifications for relevant users
      await this.triggerContentNotifications(governmentContent);

      return governmentContent;
    } catch (error) {
      logger.error('Error ingesting government content:', error);
      throw error;
    }
  }

  /**
   * Get government content with filtering and prioritization
   */
  async getGovernmentContent(options: {
    source?: 'MOE' | 'UNEB' | 'NCDC';
    contentType?: 'curriculum' | 'policy' | 'resource' | 'announcement';
    priority?: 'high' | 'medium' | 'low';
    targetAudience?: string[];
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ content: GovernmentContent[]; total: number }> {
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (options.source) {
        conditions.push(`source = $${paramIndex++}`);
        values.push(options.source);
      }

      if (options.contentType) {
        conditions.push(`content_type = $${paramIndex++}`);
        values.push(options.contentType);
      }

      if (options.priority) {
        conditions.push(`priority = $${paramIndex++}`);
        values.push(options.priority);
      }

      if (options.targetAudience && options.targetAudience.length > 0) {
        conditions.push(`target_audience_json ?| $${paramIndex++}`);
        values.push(options.targetAudience);
      }

      if (options.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(options.isActive);
      }

      // Add effective date condition (content should be effective)
      conditions.push(`effective_date <= $${paramIndex++}`);
      values.push(new Date());

      // Add expiry date condition (content should not be expired)
      conditions.push(`(expiry_date IS NULL OR expiry_date > $${paramIndex++})`);
      values.push(new Date());

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM government_content ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get content with pagination and prioritization
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const contentQuery = `
        SELECT * FROM government_content 
        ${whereClause}
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          effective_date DESC,
          created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const contentResult = await db.query(contentQuery, values);
      const dbRows = contentResult.rows;

      // Convert database rows to domain models
      const content: GovernmentContent[] = dbRows.map((row: any) => ({
        id: row.id,
        source: row.source,
        contentType: row.content_type,
        title: row.title,
        content: row.content,
        attachments: JSON.parse(row.attachments_json),
        targetAudience: JSON.parse(row.target_audience_json),
        priority: row.priority,
        effectiveDate: row.effective_date,
        expiryDate: row.expiry_date,
        digitalSignature: row.digital_signature,
        verificationHash: row.verification_hash,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return { content, total };
    } catch (error) {
      logger.error('Error fetching government content:', error);
      throw error;
    }
  }

  /**
   * Get government content by ID
   */
  async getGovernmentContentById(id: string): Promise<GovernmentContent | null> {
    
    try {
      const query = 'SELECT * FROM government_content WHERE id = $1 AND is_active = true';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        source: row.source,
        contentType: row.content_type,
        title: row.title,
        content: row.content,
        attachments: JSON.parse(row.attachments_json),
        targetAudience: JSON.parse(row.target_audience_json),
        priority: row.priority,
        effectiveDate: row.effective_date,
        expiryDate: row.expiry_date,
        digitalSignature: row.digital_signature,
        verificationHash: row.verification_hash,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error fetching government content by ID:', error);
      throw error;
    }
  }

  /**
   * Trigger notifications for relevant users based on content
   */
  private async triggerContentNotifications(content: GovernmentContent): Promise<void> {
    try {
      // Find users who should be notified based on target audience
      let userQuery = `
        SELECT id, full_name, subjects_json, grade_levels_json, preferences_json
        FROM users 
        WHERE is_active = true AND verification_status = 'verified'
      `;

      const userResult = await db.query(userQuery);
      const users = userResult.rows;

      const notificationsToCreate: Array<{
        userId: string;
        type: 'new_content' | 'content_update' | 'urgent_announcement';
        title: string;
        message: string;
      }> = [];

      for (const user of users) {
        const userSubjects = JSON.parse(user.subjects_json || '[]');
        const userGradeLevels = JSON.parse(user.grade_levels_json || '[]');
        const userPreferences = JSON.parse(user.preferences_json || '{}');

        // Check if user should receive this notification
        const shouldNotify = this.shouldNotifyUser(
          content,
          userSubjects,
          userGradeLevels,
          userPreferences
        );

        if (shouldNotify) {
          const notificationType = content.priority === 'high' ? 'urgent_announcement' : 'new_content';
          const title = `New ${content.source} ${content.contentType}`;
          const message = `${content.title} - ${content.content.substring(0, 100)}...`;

          notificationsToCreate.push({
            userId: user.id,
            type: notificationType,
            title,
            message
          });
        }
      }

      // In a real implementation, this would create actual notification records
      // For now, we'll just log the notifications that would be created
      logger.info('Content notifications triggered', {
        contentId: content.id,
        source: content.source,
        notificationCount: notificationsToCreate.length,
        priority: content.priority
      });

    } catch (error) {
      logger.error('Error triggering content notifications:', error);
      // Don't throw here as notification failure shouldn't block content ingestion
    }
  }

  /**
   * Determine if a user should be notified about content
   */
  private shouldNotifyUser(
    content: GovernmentContent,
    userSubjects: string[],
    userGradeLevels: string[],
    userPreferences: any
  ): boolean {
    // Always notify for high priority content
    if (content.priority === 'high') {
      return true;
    }

    // Check if user has notifications enabled
    if (userPreferences.notifications?.push === false) {
      return false;
    }

    // Check target audience match
    const hasAudienceMatch = content.targetAudience.some(audience => {
      // Check subject match
      if (userSubjects.some(subject => 
        audience.toLowerCase().includes(subject.toLowerCase())
      )) {
        return true;
      }

      // Check grade level match
      if (userGradeLevels.some(grade => 
        audience.toLowerCase().includes(grade.toLowerCase())
      )) {
        return true;
      }

      // Check general audience keywords
      const generalKeywords = ['all', 'teachers', 'educators', 'general'];
      return generalKeywords.some(keyword => 
        audience.toLowerCase().includes(keyword)
      );
    });

    return hasAudienceMatch;
  }

  /**
   * Update government content status (activate/deactivate)
   */
  async updateContentStatus(id: string, isActive: boolean): Promise<boolean> {
    
    try {
      const query = `
        UPDATE government_content 
        SET is_active = $1, updated_at = $2 
        WHERE id = $3
      `;
      
      const result = await db.query(query, [isActive, new Date(), id]);
      
      logger.info('Government content status updated', {
        contentId: id,
        isActive,
        rowsAffected: result.rowCount
      });

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating government content status:', error);
      throw error;
    }
  }
}

export const governmentContentService = new GovernmentContentService();