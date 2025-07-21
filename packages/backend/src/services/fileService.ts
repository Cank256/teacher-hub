import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../utils/logger';

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  compress?: boolean;
  generateThumbnail?: boolean;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

class FileService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.S3_BUCKET_NAME || 'teacher-hub-files';
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Validates uploaded file against specified options
   */
  validateFile(file: Express.Multer.File, options: FileUploadOptions = {}): FileValidationResult {
    const {
      maxSize = 50 * 1024 * 1024, // 50MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'text/plain']
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Additional validation for images
    if (file.mimetype.startsWith('image/')) {
      try {
        // This will throw if the file is not a valid image
        sharp(file.buffer);
      } catch (error) {
        return {
          isValid: false,
          error: 'Invalid image file format'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Compresses image files using Sharp
   */
  private async compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; metadata: any }> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let compressed = image;

    // Resize if image is too large
    if (metadata.width && metadata.width > 1920) {
      compressed = compressed.resize(1920, null, { withoutEnlargement: true });
    }

    // Apply compression based on format
    if (mimeType === 'image/jpeg') {
      compressed = compressed.jpeg({ quality: 85, progressive: true });
    } else if (mimeType === 'image/png') {
      compressed = compressed.png({ compressionLevel: 8 });
    } else if (mimeType === 'image/webp') {
      compressed = compressed.webp({ quality: 85 });
    }

    const compressedBuffer = await compressed.toBuffer();
    
    return {
      buffer: compressedBuffer,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      }
    };
  }

  /**
   * Generates thumbnail for images and videos
   */
  private async generateThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
    if (!mimeType.startsWith('image/')) {
      return null; // For now, only support image thumbnails
    }

    try {
      const thumbnail = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return thumbnail;
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Uploads file to S3 with optional compression and thumbnail generation
   */
  async uploadFile(
    file: Express.Multer.File, 
    userId: string,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    // Validate file
    const validation = this.validateFile(file, options);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = `uploads/${userId}/${fileName}`;

    let processedBuffer = file.buffer;
    let metadata: any = {};

    // Compress image if requested and file is an image
    if (options.compress && file.mimetype.startsWith('image/')) {
      const compressed = await this.compressImage(file.buffer, file.mimetype);
      processedBuffer = compressed.buffer;
      metadata = compressed.metadata;
    }

    // Upload main file to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      Body: processedBuffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(uploadCommand);

    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filePath}`;
    
    let thumbnailUrl: string | undefined;

    // Generate and upload thumbnail if requested
    if (options.generateThumbnail && file.mimetype.startsWith('image/')) {
      const thumbnailBuffer = await this.generateThumbnail(processedBuffer, file.mimetype);
      
      if (thumbnailBuffer) {
        const thumbnailPath = `thumbnails/${userId}/${fileId}_thumb.jpg`;
        
        const thumbnailUploadCommand = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: thumbnailPath,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
        });

        await this.s3Client.send(thumbnailUploadCommand);
        thumbnailUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${thumbnailPath}`;
      }
    }

    const uploadedFile: UploadedFile = {
      id: fileId,
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: processedBuffer.length,
      url: fileUrl,
      thumbnailUrl,
      metadata,
    };

    logger.info(`File uploaded successfully: ${fileId}`, {
      userId,
      fileName: file.originalname,
      size: processedBuffer.length,
    });

    return uploadedFile;
  }

  /**
   * Generates a presigned URL for secure file access
   */
  async getPresignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Deletes file from S3
   */
  async deleteFile(filePath: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    await this.s3Client.send(deleteCommand);
    
    logger.info(`File deleted successfully: ${filePath}`);
  }

  /**
   * Deletes multiple files from S3
   */
  async deleteFiles(filePaths: string[]): Promise<void> {
    const deletePromises = filePaths.map(filePath => this.deleteFile(filePath));
    await Promise.all(deletePromises);
  }
}

export const fileService = new FileService();