import request from 'supertest';
import express from 'express';
import fileRoutes from '../files';
import { fileService } from '../../services/fileService';
import { authenticateToken } from '../../middleware/auth';

// Mock the file service
jest.mock('../../services/fileService');
jest.mock('../../middleware/auth');

const mockFileService = fileService as jest.Mocked<typeof fileService>;
const mockAuthMiddleware = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);

// Mock user for authenticated requests
const mockUser = {
  userId: 'user123',
  email: 'test@example.com',
  verificationStatus: 'verified' as const,
};

describe('File Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/files/upload', () => {
    it('should upload file successfully', async () => {
      const mockUploadedFile = {
        id: 'file123',
        originalName: 'test.jpg',
        fileName: 'file123.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://bucket.s3.amazonaws.com/uploads/user123/file123.jpg',
        metadata: { width: 800, height: 600 },
      };

      mockFileService.uploadFile.mockResolvedValue(mockUploadedFile);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test-image-data'), 'test.jpg')
        .field('compress', 'true')
        .field('generateThumbnail', 'true');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockUploadedFile,
      });

      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
        }),
        mockUser.userId,
        expect.objectContaining({
          compress: true,
          generateThumbnail: true,
        })
      );
    });

    it('should return error when no file is provided', async () => {
      const response = await request(app)
        .post('/api/files/upload');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_FILE');
      expect(response.body.error.message).toBe('No file provided');
    });

    it('should handle file upload errors', async () => {
      mockFileService.uploadFile.mockRejectedValue(new Error('File too large'));

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test-image-data'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
      expect(response.body.error.message).toBe('File too large');
    });

    it('should parse upload options correctly', async () => {
      const mockUploadedFile = {
        id: 'file123',
        originalName: 'test.jpg',
        fileName: 'file123.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://bucket.s3.amazonaws.com/uploads/user123/file123.jpg',
        metadata: {},
      };

      mockFileService.uploadFile.mockResolvedValue(mockUploadedFile);

      await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test-image-data'), 'test.jpg')
        .field('maxSize', '10485760') // 10MB
        .field('allowedTypes', 'image/jpeg,image/png')
        .field('compress', 'false')
        .field('generateThumbnail', 'false');

      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        mockUser.userId,
        expect.objectContaining({
          maxSize: 10485760,
          allowedTypes: ['image/jpeg', 'image/png'],
          compress: false,
          generateThumbnail: false,
        })
      );
    });
  });

  describe('POST /api/files/upload-multiple', () => {
    it('should upload multiple files successfully', async () => {
      const mockUploadedFiles = [
        {
          id: 'file123',
          originalName: 'test1.jpg',
          fileName: 'file123.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          url: 'https://bucket.s3.amazonaws.com/uploads/user123/file123.jpg',
          metadata: {},
        },
        {
          id: 'file124',
          originalName: 'test2.jpg',
          fileName: 'file124.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          url: 'https://bucket.s3.amazonaws.com/uploads/user123/file124.jpg',
          metadata: {},
        },
      ];

      mockFileService.uploadFile
        .mockResolvedValueOnce(mockUploadedFiles[0]!)
        .mockResolvedValueOnce(mockUploadedFiles[1]!);

      const response = await request(app)
        .post('/api/files/upload-multiple')
        .attach('files', Buffer.from('test-image-data-1'), 'test1.jpg')
        .attach('files', Buffer.from('test-image-data-2'), 'test2.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockUploadedFiles,
      });

      expect(mockFileService.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should return error when no files are provided', async () => {
      const response = await request(app)
        .post('/api/files/upload-multiple');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_FILES');
      expect(response.body.error.message).toBe('No files provided');
    });

    it('should handle partial upload failures', async () => {
      mockFileService.uploadFile
        .mockResolvedValueOnce({
          id: 'file123',
          originalName: 'test1.jpg',
          fileName: 'file123.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          url: 'https://bucket.s3.amazonaws.com/uploads/user123/file123.jpg',
          metadata: {},
        })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/files/upload-multiple')
        .attach('files', Buffer.from('test-image-data-1'), 'test1.jpg')
        .attach('files', Buffer.from('test-image-data-2'), 'test2.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
    });
  });

  describe('GET /api/files/:fileId/presigned-url', () => {
    it('should generate presigned URL successfully', async () => {
      const mockPresignedUrl = 'https://presigned-url.com';
      mockFileService.getPresignedUrl.mockResolvedValue(mockPresignedUrl);

      const response = await request(app)
        .get('/api/files/file123.jpg/presigned-url')
        .query({ expiresIn: '7200' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          url: mockPresignedUrl,
          expiresIn: 7200,
          expiresAt: expect.any(String),
        },
      });

      expect(mockFileService.getPresignedUrl).toHaveBeenCalledWith(
        'uploads/user123/file123.jpg',
        7200
      );
    });

    it('should use default expiration time', async () => {
      const mockPresignedUrl = 'https://presigned-url.com';
      mockFileService.getPresignedUrl.mockResolvedValue(mockPresignedUrl);

      const response = await request(app)
        .get('/api/files/file123.jpg/presigned-url');

      expect(response.status).toBe(200);
      expect(mockFileService.getPresignedUrl).toHaveBeenCalledWith(
        'uploads/user123/file123.jpg',
        3600 // Default 1 hour
      );
    });

    it('should handle presigned URL generation errors', async () => {
      mockFileService.getPresignedUrl.mockRejectedValue(new Error('S3 error'));

      const response = await request(app)
        .get('/api/files/file123.jpg/presigned-url');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('PRESIGNED_URL_FAILED');
    });
  });

  describe('DELETE /api/files/:fileId', () => {
    it('should delete file successfully', async () => {
      mockFileService.deleteFiles.mockResolvedValue();

      const response = await request(app)
        .delete('/api/files/file123.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully',
      });

      expect(mockFileService.deleteFiles).toHaveBeenCalledWith([
        'uploads/user123/file123.jpg',
        'thumbnails/user123/file123_thumb.jpg',
      ]);
    });

    it('should handle file deletion errors', async () => {
      mockFileService.deleteFiles.mockRejectedValue(new Error('S3 error'));

      const response = await request(app)
        .delete('/api/files/file123.jpg');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('DELETE_FAILED');
    });
  });

  describe('GET /api/files/config', () => {
    it('should return file upload configuration', async () => {
      const response = await request(app)
        .get('/api/files/config');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          maxFileSize: 50 * 1024 * 1024,
          maxFiles: 10,
          allowedTypes: expect.arrayContaining([
            'image/jpeg',
            'image/png',
            'application/pdf',
            'video/mp4',
          ]),
          supportedFeatures: {
            compression: true,
            thumbnailGeneration: true,
            presignedUrls: true,
          },
        },
      });
    });
  });
});