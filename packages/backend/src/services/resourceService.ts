import { 
  EnhancedResource, 
  YouTubeVideo, 
  SecurityScanResult, 
  YouTubeVideoMetadata,
  UploadResourceRequest,
  UpdateResourceRequest,
  ResourceSearchFilters,
  PaginatedResponse,
  PaginationOptions
} from '../types';
import { securityService } from './securityService';
import { youtubeService } from './youtubeService';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../database/connection';

export class ResourceService {
  /**
   * Upload a new resource with security scanning and optional video processing
   */
  async uploadResource(
    authorId: string, 
    resourceData: UploadResourceRequest, 
    file: Express.Multer.File
  ): Promise<EnhancedResource> {
    const resourceId = uuidv4();
    let tempFilePath: string | null = null;
    let secureFilePath: string | null = null;

    try {
      logger.info(`Starting resource upload for user ${authorId}: ${file.originalname}`);

      // Step 1: Validate file type and size
      if (!securityService.validateFileType(file)) {
        throw new Error('Invalid file type');
      }

      if (!securityService.validateFileSize(file)) {
        throw new Error('File size exceeds limit');
      }

      // Step 2: Create secure storage path
      secureFilePath = securityService.getSecureStoragePath(file.originalname, authorId);
      
      // Move uploaded file to secure location
      if (file.path) {
        tempFilePath = file.path;
        await fs.promises.copyFile(tempFilePath, secureFilePath);
      } else if (file.buffer) {
        await fs.promises.writeFile(secureFilePath, file.buffer);
      } else {
        throw new Error('No file data provided');
      }

      // Step 3: Perform security scanning
      const scanResult = await securityService.scanFile(secureFilePath, file.originalname);
      
      if (!securityService.isFileSafe(scanResult)) {
        // Clean up file if it's not safe
        await securityService.cleanupTempFile(secureFilePath);
        throw new Error(`File failed security scan: ${scanResult.scanDetails}`);
      }

      // Step 4: Determine resource type and format
      const resourceType = this.determineResourceType(file.mimetype);
      const format = path.extname(file.originalname).toLowerCase().substring(1);

      // Step 5: Create initial resource record
      const resource: EnhancedResource = {
        id: resourceId,
        title: resourceData.title,
        description: resourceData.description,
        type: resourceType,
        format,
        size: file.size,
        url: this.generateResourceUrl(secureFilePath),
        subjects: resourceData.subjects,
        gradeLevels: resourceData.gradeLevels,
        curriculumAlignment: resourceData.curriculumAlignment || [],
        authorId,
        isGovernmentContent: false,
        verificationStatus: 'pending',
        downloadCount: 0,
        rating: 0,
        ratingCount: 0,
        tags: resourceData.tags || [],
        attachments: [],
        securityScanStatus: 'passed',
        securityScanResults: scanResult,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 6: Handle video files - upload to YouTube
      if (resourceType === 'video') {
        try {
          const videoMetadata: YouTubeVideoMetadata = {
            title: resourceData.title,
            description: resourceData.description,
            duration: 0, // Will be updated after upload
            thumbnailUrl: '',
            privacy: 'unlisted'
          };

          const youtubeVideoId = await youtubeService.uploadVideo(secureFilePath, videoMetadata);
          
          // Get video details from YouTube
          const thumbnailUrl = await youtubeService.getVideoThumbnail(youtubeVideoId);
          const duration = await youtubeService.getVideoDuration(youtubeVideoId);

          // Update resource with YouTube information
          resource.youtubeVideoId = youtubeVideoId;
          resource.thumbnailUrl = thumbnailUrl;
          
          // Create YouTube video record
          const youtubeVideo: YouTubeVideo = {
            id: uuidv4(),
            resourceId,
            youtubeVideoId,
            uploadStatus: 'completed',
            metadata: {
              ...videoMetadata,
              duration,
              thumbnailUrl
            },
            uploadedAt: new Date()
          };

          await this.saveYouTubeVideoRecord(youtubeVideo);
          
          logger.info(`Video uploaded to YouTube: ${youtubeVideoId}`);
        } catch (error) {
          logger.error('YouTube upload failed:', error);
          // Don't fail the entire upload, just mark video processing as failed
          resource.youtubeVideoId = undefined;
          resource.thumbnailUrl = undefined;
        }
      }

      // Step 7: Generate thumbnail for images
      if (resourceType === 'image') {
        resource.thumbnailUrl = await this.generateImageThumbnail(secureFilePath);
      }

      // Step 8: Save resource to database
      await this.saveResourceToDatabase(resource);

      // Step 9: Clean up temporary files
      if (tempFilePath) {
        await securityService.cleanupTempFile(tempFilePath);
      }

      logger.info(`Resource uploaded successfully: ${resourceId}`);
      return resource;

    } catch (error) {
      logger.error('Resource upload failed:', error);
      
      // Clean up files on error
      if (secureFilePath) {
        await securityService.cleanupTempFile(secureFilePath);
      }
      if (tempFilePath) {
        await securityService.cleanupTempFile(tempFilePath);
      }

      throw new Error(`Resource upload failed: ${error.message}`);
    }
  }

  /**
   * Update an existing resource
   */
  async updateResource(
    resourceId: string, 
    authorId: string, 
    updates: UpdateResourceRequest
  ): Promise<EnhancedResource> {
    try {
      // Verify resource exists and user has permission
      const existingResource = await this.getResource(resourceId, authorId);
      
      if (existingResource.authorId !== authorId) {
        throw new Error('Unauthorized: You can only update your own resources');
      }

      // Update resource fields
      const updatedResource: EnhancedResource = {
        ...existingResource,
        ...updates,
        updatedAt: new Date()
      };

      // Update YouTube video metadata if it's a video resource
      if (existingResource.youtubeVideoId && (updates.title || updates.description)) {
        try {
          await youtubeService.updateVideoMetadata(existingResource.youtubeVideoId, {
            title: updates.title,
            description: updates.description
          });
        } catch (error) {
          logger.warn('Failed to update YouTube video metadata:', error);
        }
      }

      // Save updated resource to database
      await this.updateResourceInDatabase(resourceId, updatedResource);

      logger.info(`Resource updated: ${resourceId}`);
      return updatedResource;

    } catch (error) {
      logger.error('Resource update failed:', error);
      throw new Error(`Resource update failed: ${error.message}`);
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: string, authorId: string): Promise<void> {
    try {
      // Verify resource exists and user has permission
      const resource = await this.getResource(resourceId, authorId);
      
      if (resource.authorId !== authorId) {
        throw new Error('Unauthorized: You can only delete your own resources');
      }

      // Delete from YouTube if it's a video
      if (resource.youtubeVideoId) {
        try {
          await youtubeService.deleteVideo(resource.youtubeVideoId);
          await this.deleteYouTubeVideoRecord(resource.youtubeVideoId);
        } catch (error) {
          logger.warn('Failed to delete YouTube video:', error);
        }
      }

      // Delete physical file
      try {
        const filePath = this.getFilePathFromUrl(resource.url);
        await securityService.cleanupTempFile(filePath);
      } catch (error) {
        logger.warn('Failed to delete physical file:', error);
      }

      // Delete from database
      await this.deleteResourceFromDatabase(resourceId);

      logger.info(`Resource deleted: ${resourceId}`);

    } catch (error) {
      logger.error('Resource deletion failed:', error);
      throw new Error(`Resource deletion failed: ${error.message}`);
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResource(resourceId: string, viewerId?: string): Promise<EnhancedResource> {
    try {
      const resource = await this.getResourceFromDatabase(resourceId);
      
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check access permissions
      if (!this.canUserAccessResource(resource, viewerId)) {
        throw new Error('Access denied');
      }

      return resource;

    } catch (error) {
      logger.error('Failed to get resource:', error);
      throw new Error(`Failed to get resource: ${error.message}`);
    }
  }

  /**
   * Search resources with filters and pagination
   */
  async searchResources(
    query: string, 
    filters: ResourceSearchFilters, 
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<EnhancedResource>> {
    try {
      const { data, total } = await this.searchResourcesInDatabase(query, filters, pagination);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      };

    } catch (error) {
      logger.error('Resource search failed:', error);
      throw new Error(`Resource search failed: ${error.message}`);
    }
  }

  /**
   * Download a resource (increments download count)
   */
  async downloadResource(resourceId: string, userId: string): Promise<string> {
    try {
      const resource = await this.getResource(resourceId, userId);

      // Increment download count
      await this.incrementDownloadCount(resourceId);

      // Return secure download URL or file path
      return resource.url;

    } catch (error) {
      logger.error('Resource download failed:', error);
      throw new Error(`Resource download failed: ${error.message}`);
    }
  }

  /**
   * Rate a resource
   */
  async rateResource(
    resourceId: string, 
    userId: string, 
    rating: number, 
    review?: string
  ): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user already rated this resource
      const existingRating = await this.getUserResourceRating(resourceId, userId);
      
      if (existingRating) {
        // Update existing rating
        await this.updateResourceRating(resourceId, userId, rating, review);
      } else {
        // Create new rating
        await this.createResourceRating(resourceId, userId, rating, review);
      }

      // Recalculate resource average rating
      await this.updateResourceAverageRating(resourceId);

      logger.info(`Resource rated: ${resourceId} by user ${userId}`);

    } catch (error) {
      logger.error('Resource rating failed:', error);
      throw new Error(`Resource rating failed: ${error.message}`);
    }
  }

  /**
   * Get YouTube video status for a resource
   */
  async getYouTubeVideoStatus(resourceId: string): Promise<YouTubeVideo | null> {
    try {
      return await this.getYouTubeVideoFromDatabase(resourceId);
    } catch (error) {
      logger.error('Failed to get YouTube video status:', error);
      return null;
    }
  }

  /**
   * Determine resource type from MIME type
   */
  private determineResourceType(mimeType: string): 'video' | 'image' | 'document' | 'text' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'text';
    return 'document';
  }

  /**
   * Generate resource URL from file path
   */
  private generateResourceUrl(filePath: string): string {
    // In production, this would generate a secure URL or CDN link
    const relativePath = path.relative(process.env.UPLOAD_DIR || 'uploads', filePath);
    return `/api/resources/download/${encodeURIComponent(relativePath)}`;
  }

  /**
   * Generate thumbnail for image resources
   */
  private async generateImageThumbnail(imagePath: string): Promise<string> {
    // In a real implementation, you'd use a library like sharp to generate thumbnails
    // For now, return the original image URL
    return this.generateResourceUrl(imagePath);
  }

  /**
   * Get file path from resource URL
   */
  private getFilePathFromUrl(url: string): string {
    const relativePath = decodeURIComponent(url.replace('/api/resources/download/', ''));
    return path.join(process.env.UPLOAD_DIR || 'uploads', relativePath);
  }

  /**
   * Check if user can access resource
   */
  private canUserAccessResource(resource: EnhancedResource, viewerId?: string): boolean {
    // Public resources are accessible to all
    if (resource.verificationStatus === 'verified') {
      return true;
    }

    // Authors can always access their own resources
    if (viewerId && resource.authorId === viewerId) {
      return true;
    }

    // Pending resources are only accessible to authors
    return false;
  }

  // Database operations (these would be implemented with your database layer)
  
  private async saveResourceToDatabase(resource: EnhancedResource): Promise<void> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO resources (
          id, title, description, type, format, size, url, thumbnail_url,
          subjects, grade_levels, curriculum_alignment, author_id,
          is_government_content, verification_status, download_count,
          rating, rating_count, tags, attachments, youtube_video_id,
          security_scan_status, security_scan_results, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
      `;

      await client.query(query, [
        resource.id, resource.title, resource.description, resource.type,
        resource.format, resource.size, resource.url, resource.thumbnailUrl,
        JSON.stringify(resource.subjects), JSON.stringify(resource.gradeLevels),
        JSON.stringify(resource.curriculumAlignment), resource.authorId,
        resource.isGovernmentContent, resource.verificationStatus,
        resource.downloadCount, resource.rating, resource.ratingCount,
        JSON.stringify(resource.tags), JSON.stringify(resource.attachments),
        resource.youtubeVideoId, resource.securityScanStatus,
        JSON.stringify(resource.securityScanResults), resource.isActive,
        resource.createdAt, resource.updatedAt
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateResourceInDatabase(resourceId: string, resource: EnhancedResource): Promise<void> {
    const client = await db.getClient();
    try {
      const query = `
        UPDATE resources SET
          title = $2, description = $3, subjects = $4, grade_levels = $5,
          curriculum_alignment = $6, tags = $7, updated_at = $8
        WHERE id = $1
      `;

      await client.query(query, [
        resourceId, resource.title, resource.description,
        JSON.stringify(resource.subjects), JSON.stringify(resource.gradeLevels),
        JSON.stringify(resource.curriculumAlignment), JSON.stringify(resource.tags),
        resource.updatedAt
      ]);
    } finally {
      client.release();
    }
  }

  private async getResourceFromDatabase(resourceId: string): Promise<EnhancedResource | null> {
    const client = await db.getClient();
    try {
      const query = 'SELECT * FROM resources WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [resourceId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToResource(row);
    } finally {
      client.release();
    }
  }

  private async deleteResourceFromDatabase(resourceId: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = 'UPDATE resources SET is_active = false WHERE id = $1';
      await client.query(query, [resourceId]);
    } finally {
      client.release();
    }
  }

  private async searchResourcesInDatabase(
    query: string,
    filters: ResourceSearchFilters,
    pagination: PaginationOptions
  ): Promise<{ data: EnhancedResource[]; total: number }> {
    const client = await db.getClient();
    try {
      let whereClause = 'WHERE is_active = true AND verification_status = \'verified\'';
      const params: any[] = [];
      let paramIndex = 1;

      // Add search query
      if (query) {
        whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      // Add filters
      if (filters.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.subjects && filters.subjects.length > 0) {
        whereClause += ` AND subjects::jsonb ?| $${paramIndex}`;
        params.push(filters.subjects);
        paramIndex++;
      }

      if (filters.hasVideo !== undefined) {
        if (filters.hasVideo) {
          whereClause += ` AND youtube_video_id IS NOT NULL`;
        } else {
          whereClause += ` AND youtube_video_id IS NULL`;
        }
      }

      // Count total results
      const countQuery = `SELECT COUNT(*) FROM resources ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (pagination.page - 1) * pagination.limit;
      const dataQuery = `
        SELECT * FROM resources ${whereClause}
        ORDER BY ${pagination.sortBy || 'created_at'} ${pagination.sortOrder || 'DESC'}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(pagination.limit, offset);

      const dataResult = await client.query(dataQuery, params);
      const data = dataResult.rows.map(row => this.mapRowToResource(row));

      return { data, total };
    } finally {
      client.release();
    }
  }

  private async saveYouTubeVideoRecord(video: YouTubeVideo): Promise<void> {
    const client = await db.getClient();
    try {
      const query = `
        INSERT INTO youtube_videos (
          id, resource_id, youtube_video_id, upload_status, metadata, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await client.query(query, [
        video.id, video.resourceId, video.youtubeVideoId,
        video.uploadStatus, JSON.stringify(video.metadata), video.uploadedAt
      ]);
    } finally {
      client.release();
    }
  }

  private async getYouTubeVideoFromDatabase(resourceId: string): Promise<YouTubeVideo | null> {
    const client = await db.getClient();
    try {
      const query = 'SELECT * FROM youtube_videos WHERE resource_id = $1';
      const result = await client.query(query, [resourceId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        resourceId: row.resource_id,
        youtubeVideoId: row.youtube_video_id,
        uploadStatus: row.upload_status,
        metadata: JSON.parse(row.metadata),
        uploadedAt: row.uploaded_at
      };
    } finally {
      client.release();
    }
  }

  private async deleteYouTubeVideoRecord(youtubeVideoId: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = 'DELETE FROM youtube_videos WHERE youtube_video_id = $1';
      await client.query(query, [youtubeVideoId]);
    } finally {
      client.release();
    }
  }

  private async incrementDownloadCount(resourceId: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = 'UPDATE resources SET download_count = download_count + 1 WHERE id = $1';
      await client.query(query, [resourceId]);
    } finally {
      client.release();
    }
  }

  private async getUserResourceRating(resourceId: string, userId: string): Promise<any> {
    const client = await db.getClient();
    try {
      const query = 'SELECT * FROM resource_ratings WHERE resource_id = $1 AND user_id = $2';
      const result = await client.query(query, [resourceId, userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  private async createResourceRating(resourceId: string, userId: string, rating: number, review?: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = `
        INSERT INTO resource_ratings (id, resource_id, user_id, rating, review, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await client.query(query, [
        uuidv4(), resourceId, userId, rating, review, new Date(), new Date()
      ]);
    } finally {
      client.release();
    }
  }

  private async updateResourceRating(resourceId: string, userId: string, rating: number, review?: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = `
        UPDATE resource_ratings SET rating = $3, review = $4, updated_at = $5
        WHERE resource_id = $1 AND user_id = $2
      `;
      await client.query(query, [resourceId, userId, rating, review, new Date()]);
    } finally {
      client.release();
    }
  }

  private async updateResourceAverageRating(resourceId: string): Promise<void> {
    const client = await db.getClient();
    try {
      const query = `
        UPDATE resources SET
          rating = (SELECT AVG(rating) FROM resource_ratings WHERE resource_id = $1),
          rating_count = (SELECT COUNT(*) FROM resource_ratings WHERE resource_id = $1)
        WHERE id = $1
      `;
      await client.query(query, [resourceId]);
    } finally {
      client.release();
    }
  }

  private mapRowToResource(row: any): EnhancedResource {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      format: row.format,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      subjects: JSON.parse(row.subjects || '[]'),
      gradeLevels: JSON.parse(row.grade_levels || '[]'),
      curriculumAlignment: JSON.parse(row.curriculum_alignment || '[]'),
      authorId: row.author_id,
      isGovernmentContent: row.is_government_content,
      verificationStatus: row.verification_status,
      downloadCount: row.download_count,
      rating: parseFloat(row.rating) || 0,
      ratingCount: row.rating_count,
      tags: JSON.parse(row.tags || '[]'),
      attachments: JSON.parse(row.attachments || '[]'),
      youtubeVideoId: row.youtube_video_id,
      securityScanStatus: row.security_scan_status,
      securityScanResults: row.security_scan_results ? JSON.parse(row.security_scan_results) : undefined,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const resourceService = new ResourceService();