import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger';
import path from 'path';

export interface CDNUploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface CDNFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
  lastModified: Date;
}

export class CDNService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnDomain: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'teacher-hub-assets';
    this.cdnDomain = process.env.CDN_DOMAIN || `https://${this.bucketName}.s3.amazonaws.com`;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    options: CDNUploadOptions = {}
  ): Promise<string> {
    try {
      const {
        contentType = 'application/octet-stream',
        cacheControl = 'public, max-age=31536000', // 1 year
        metadata = {}
      } = options;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl,
        Metadata: metadata
      });

      await this.s3Client.send(command);
      
      const url = this.getPublicUrl(key);
      logger.info(`File uploaded to CDN: ${key}`);
      
      return url;
    } catch (error) {
      logger.error('CDN upload failed:', error);
      throw error;
    }
  }

  async uploadImageWithVariants(
    baseKey: string,
    originalBuffer: Buffer,
    variants: { [size: string]: Buffer },
    contentType: string = 'image/jpeg'
  ): Promise<{ [size: string]: string }> {
    const urls: { [size: string]: string } = {};

    try {
      // Upload original
      const originalKey = `${baseKey}/original${path.extname(baseKey)}`;
      urls.original = await this.uploadFile(originalKey, originalBuffer, {
        contentType,
        cacheControl: 'public, max-age=31536000'
      });

      // Upload variants
      for (const [size, buffer] of Object.entries(variants)) {
        const variantKey = `${baseKey}/${size}${path.extname(baseKey)}`;
        urls[size] = await this.uploadFile(variantKey, buffer, {
          contentType,
          cacheControl: 'public, max-age=31536000'
        });
      }

      logger.info(`Uploaded image with ${Object.keys(variants).length} variants: ${baseKey}`);
      return urls;
    } catch (error) {
      logger.error('Failed to upload image variants:', error);
      throw error;
    }
  }

  async getFileInfo(key: string): Promise<CDNFile | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        url: this.getPublicUrl(key),
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date()
      };
    } catch (error) {
      logger.error('Failed to get file info:', error);
      return null;
    }
  }

  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.cdnDomain}/${key}`;
  }

  // Generate responsive image URLs for different screen sizes
  getResponsiveImageUrls(baseKey: string, extension: string = '.jpg'): {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      thumbnail: this.getPublicUrl(`${baseKey}/thumbnail${extension}`),
      small: this.getPublicUrl(`${baseKey}/small${extension}`),
      medium: this.getPublicUrl(`${baseKey}/medium${extension}`),
      large: this.getPublicUrl(`${baseKey}/large${extension}`),
      original: this.getPublicUrl(`${baseKey}/original${extension}`)
    };
  }

  // Generate srcset for responsive images
  generateSrcSet(baseKey: string, extension: string = '.jpg'): string {
    const urls = this.getResponsiveImageUrls(baseKey, extension);
    
    return [
      `${urls.small} 300w`,
      `${urls.medium} 600w`,
      `${urls.large} 1200w`,
      `${urls.original} 1920w`
    ].join(', ');
  }
}

export const cdnService = new CDNService();