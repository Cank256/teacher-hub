import { FileUploadOptions } from '../fileService';
import sharp from 'sharp';

// Mock AWS S3 Client
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('sharp');

const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();

// Mock S3Client constructor
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ input: params })),
}));

// Mock presigned URL
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// Mock Sharp
const mockSharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

// Set environment variables before importing the service
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// Import after mocks are set up
import { fileService } from '../fileService';

describe('FileService', () => {
  const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: {} as any,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockSharpInstance.metadata.mockResolvedValue({ width: 1000, height: 800, format: 'jpeg' });
    mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
    mockSharpInstance.jpeg.mockReturnValue(mockSharpInstance);
    mockSharpInstance.png.mockReturnValue(mockSharpInstance);
    mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('compressed-image'));
    
    mockS3Send.mockResolvedValue({});
  });

  describe('validateFile', () => {

    it('should validate a valid file', () => {
      const file = createMockFile();
      const result = fileService.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that exceeds size limit', () => {
      const file = createMockFile({ size: 60 * 1024 * 1024 }); // 60MB
      const options: FileUploadOptions = { maxSize: 50 * 1024 * 1024 }; // 50MB limit
      
      const result = fileService.validateFile(file, options);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum');
    });

    it('should reject file with disallowed type', () => {
      const file = createMockFile({ mimetype: 'application/exe' });
      const options: FileUploadOptions = { allowedTypes: ['image/jpeg', 'image/png'] };
      
      const result = fileService.validateFile(file, options);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type application/exe is not allowed');
    });

    it('should validate image file format using Sharp', () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
      
      // Mock Sharp to not throw (valid image)
      (sharp as unknown as jest.Mock).mockImplementation(() => ({}));
      
      const result = fileService.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(sharp).toHaveBeenCalledWith(file.buffer);
    });

    it('should reject invalid image file', () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
      
      // Mock Sharp to throw (invalid image)
      (sharp as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid image');
      });
      
      const result = fileService.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid image file format');
    });
  });

  describe('uploadFile', () => {

    it('should upload file successfully', async () => {
      const file = createMockFile();
      const userId = 'user123';
      
      // Mock Sharp for validation
      (sharp as unknown as jest.Mock).mockImplementation(() => ({}));
      
      const result = await fileService.uploadFile(file, userId);
      
      expect(result).toMatchObject({
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: expect.any(Number),
        url: expect.stringContaining('https://test-bucket.s3.us-east-1.amazonaws.com/uploads/user123/'),
      });
      
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: expect.stringMatching(/^uploads\/user123\/.*\.jpg$/),
            Body: file.buffer,
            ContentType: 'image/jpeg',
          }),
        })
      );
    });

    it('should compress image when compression is enabled', async () => {
      const file = createMockFile();
      const userId = 'user123';
      const options: FileUploadOptions = { compress: true };
      
      // Mock Sharp for validation and compression
      (sharp as unknown as jest.Mock).mockImplementation(() => mockSharpInstance);
      
      const compressedBuffer = Buffer.from('compressed-data');
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);
      
      const result = await fileService.uploadFile(file, userId, options);
      
      expect(result.size).toBe(compressedBuffer.length);
    });

    it('should generate thumbnail when requested', async () => {
      const file = createMockFile();
      const userId = 'user123';
      const options: FileUploadOptions = { generateThumbnail: true };
      
      // Mock Sharp for validation
      (sharp as unknown as jest.Mock).mockImplementation(() => ({}));
      
      const thumbnailBuffer = Buffer.from('thumbnail-data');
      
      // Mock Sharp chain for thumbnail generation
      const thumbnailSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(thumbnailBuffer),
      };
      
      (sharp as unknown as jest.Mock)
        .mockImplementationOnce(() => ({})) // For validation
        .mockImplementationOnce(() => thumbnailSharp); // For thumbnail generation
      
      const result = await fileService.uploadFile(file, userId, options);
      
      expect(result.thumbnailUrl).toContain('thumbnails/user123/');
      expect(mockS3Send).toHaveBeenCalledTimes(2); // Main file + thumbnail
    });

    it('should throw error for invalid file', async () => {
      const file = createMockFile({ size: 60 * 1024 * 1024 }); // Too large
      const userId = 'user123';
      const options: FileUploadOptions = { maxSize: 50 * 1024 * 1024 };
      
      await expect(fileService.uploadFile(file, userId, options))
        .rejects.toThrow('File size exceeds maximum');
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const mockUrl = 'https://presigned-url.com';
      
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const result = await fileService.getPresignedUrl('uploads/user123/file.jpg', 3600);
      
      expect(result).toBe(mockUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3', async () => {
      const filePath = 'uploads/user123/file.jpg';
      
      await fileService.deleteFile(filePath);
      
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: filePath,
          }),
        })
      );
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files from S3', async () => {
      const filePaths = ['uploads/user123/file1.jpg', 'uploads/user123/file2.jpg'];
      
      await fileService.deleteFiles(filePaths);
      
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Image compression', () => {
    it('should resize large images', async () => {
      const file = createMockFile();
      const userId = 'user123';
      const options: FileUploadOptions = { compress: true };
      
      // Mock large image
      mockSharpInstance.metadata.mockResolvedValue({ width: 3000, height: 2000, format: 'jpeg' });
      
      // Mock Sharp for validation and compression
      (sharp as unknown as jest.Mock).mockImplementation(() => mockSharpInstance);
      
      await fileService.uploadFile(file, userId, options);
      
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, null, { withoutEnlargement: true });
    });

    it('should apply different compression for different formats', async () => {
      const testCases = [
        { mimetype: 'image/jpeg', expectedCall: { quality: 85, progressive: true } },
        { mimetype: 'image/png', expectedCall: { compressionLevel: 8 } },
        { mimetype: 'image/webp', expectedCall: { quality: 85 } },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const file = createMockFile({ mimetype: testCase.mimetype });
        const userId = 'user123';
        const options: FileUploadOptions = { 
          compress: true,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] // Include webp for this test
        };
        
        // Mock Sharp for validation and compression
        (sharp as unknown as jest.Mock).mockImplementation(() => mockSharpInstance);
        
        await fileService.uploadFile(file, userId, options);
        
        if (testCase.mimetype === 'image/jpeg') {
          expect(mockSharpInstance.jpeg).toHaveBeenCalledWith(testCase.expectedCall);
        } else if (testCase.mimetype === 'image/png') {
          expect(mockSharpInstance.png).toHaveBeenCalledWith(testCase.expectedCall);
        } else if (testCase.mimetype === 'image/webp') {
          expect(mockSharpInstance.webp).toHaveBeenCalledWith(testCase.expectedCall);
        }
      }
    });
  });
});