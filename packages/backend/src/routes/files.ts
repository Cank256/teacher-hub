import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { fileService, FileUploadOptions } from '../services/fileService';
import logger from '../utils/logger';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * Upload a single file
 * POST /api/files/upload
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file provided',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    const userId = req.user!.userId;
    const options: FileUploadOptions = {
      maxSize: parseInt(req.body.maxSize) || 50 * 1024 * 1024,
      allowedTypes: req.body.allowedTypes ? req.body.allowedTypes.split(',') : undefined,
      compress: req.body.compress === 'true',
      generateThumbnail: req.body.generateThumbnail === 'true',
    };

    const uploadedFile = await fileService.uploadFile(req.file, userId, options);

    return res.status(201).json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    logger.error('File upload error:', error);
    
    return res.status(400).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'File upload failed',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * Upload multiple files
 * POST /api/files/upload-multiple
 */
router.post('/upload-multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_FILES',
          message: 'No files provided',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    const userId = req.user!.userId;
    const options: FileUploadOptions = {
      maxSize: parseInt(req.body.maxSize) || 50 * 1024 * 1024,
      allowedTypes: req.body.allowedTypes ? req.body.allowedTypes.split(',') : undefined,
      compress: req.body.compress === 'true',
      generateThumbnail: req.body.generateThumbnail === 'true',
    };

    const uploadPromises = files.map(file => fileService.uploadFile(file, userId, options));
    const uploadedFiles = await Promise.all(uploadPromises);

    return res.status(201).json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    logger.error('Multiple file upload error:', error);
    
    return res.status(400).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'File upload failed',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * Get presigned URL for secure file access
 * GET /api/files/:fileId/presigned-url
 */
router.get('/:fileId/presigned-url', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.userId;
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600; // 1 hour default

    // In a real implementation, you'd verify the user has access to this file
    // For now, we'll construct the file path based on the fileId and userId
    const filePath = `uploads/${userId}/${fileId}`;
    
    const presignedUrl = await fileService.getPresignedUrl(filePath, expiresIn);

    return res.json({
      success: true,
      data: {
        url: presignedUrl,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
  } catch (error) {
    logger.error('Presigned URL generation error:', error);
    
    return res.status(500).json({
      error: {
        code: 'PRESIGNED_URL_FAILED',
        message: 'Failed to generate presigned URL',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * Delete a file
 * DELETE /api/files/:fileId
 */
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.userId;

    if (!fileId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE_ID',
          message: 'File ID is required',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // In a real implementation, you'd verify the user owns this file
    const filePath = `uploads/${userId}/${fileId}`;
    const thumbnailPath = `thumbnails/${userId}/${fileId.split('.')[0]}_thumb.jpg`;

    // Delete both main file and thumbnail if it exists
    await fileService.deleteFiles([filePath, thumbnailPath]);

    return res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('File deletion error:', error);
    
    return res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete file',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

/**
 * Get file upload limits and allowed types
 * GET /api/files/config
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/webm',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      supportedFeatures: {
        compression: true,
        thumbnailGeneration: true,
        presignedUrls: true,
      },
    },
  });
});

export default router;