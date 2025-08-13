import { SecurityService } from '../securityService';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('../../utils/logger');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SecurityService', () => {
  let securityService: SecurityService;
  let mockFile: Express.Multer.File;

  beforeEach(() => {
    securityService = new SecurityService();
    mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      buffer: Buffer.from('test')
    };

    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    it('should accept valid image files', () => {
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(true);
    });

    it('should accept valid video files', () => {
      mockFile.mimetype = 'video/mp4';
      mockFile.originalname = 'test.mp4';
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(true);
    });

    it('should accept valid document files', () => {
      mockFile.mimetype = 'application/pdf';
      mockFile.originalname = 'test.pdf';
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      mockFile.mimetype = 'application/x-executable';
      mockFile.originalname = 'malware.exe';
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid MIME type'),
        expect.any(String)
      );
    });

    it('should reject dangerous file extensions', () => {
      mockFile.originalname = 'virus.exe';
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dangerous file extension'),
        expect.any(String)
      );
    });

    it('should reject video files that are too large', () => {
      mockFile.mimetype = 'video/mp4';
      mockFile.originalname = 'large_video.mp4';
      mockFile.size = 150 * 1024 * 1024; // 150MB
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      // Mock an error in validation
      const originalMimetype = mockFile.mimetype;
      Object.defineProperty(mockFile, 'mimetype', {
        get: () => {
          throw new Error('Test error');
        }
      });
      
      const result = securityService.validateFileType(mockFile);
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error validating file type:',
        expect.any(Error)
      );
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      mockFile.size = 5 * 1024 * 1024; // 5MB
      
      const result = securityService.validateFileSize(mockFile);
      expect(result).toBe(true);
    });

    it('should reject files exceeding default size limit', () => {
      mockFile.size = 15 * 1024 * 1024; // 15MB
      
      const result = securityService.validateFileSize(mockFile);
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('File size'),
        expect.any(String)
      );
    });

    it('should accept files within custom size limit', () => {
      mockFile.size = 15 * 1024 * 1024; // 15MB
      const customLimit = 20 * 1024 * 1024; // 20MB
      
      const result = securityService.validateFileSize(mockFile, customLimit);
      expect(result).toBe(true);
    });

    it('should reject files exceeding custom size limit', () => {
      mockFile.size = 25 * 1024 * 1024; // 25MB
      const customLimit = 20 * 1024 * 1024; // 20MB
      
      const result = securityService.validateFileSize(mockFile, customLimit);
      expect(result).toBe(false);
    });
  });

  describe('scanFile', () => {
    const testFilePath = '/tmp/test.jpg';
    const testFileName = 'test.jpg';

    beforeEach(() => {
      // Mock fs.promises methods
      mockFs.promises = {
        readFile: jest.fn(),
        open: jest.fn(),
        unlink: jest.fn()
      } as any;

      // Mock file descriptor
      const mockFd = {
        read: jest.fn().mockResolvedValue({ bytesRead: 100 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      (mockFs.promises.open as jest.Mock).mockResolvedValue(mockFd);
    });

    it('should return clean scan result for safe files', async () => {
      // Mock clean file content
      (mockFs.promises.readFile as jest.Mock).mockResolvedValue('clean file content');

      const result = await securityService.scanFile(testFilePath, testFileName);

      expect(result.virusFound).toBe(false);
      expect(result.malwareFound).toBe(false);
      expect(result.suspiciousContent).toBe(false);
      expect(result.scanDetails).toContain('Clean');
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should detect suspicious keywords in filename', async () => {
      const suspiciousFileName = 'virus_file.txt';
      (mockFs.promises.readFile as jest.Mock).mockResolvedValue('clean content');

      const result = await securityService.scanFile(testFilePath, suspiciousFileName);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('Suspicious keywords in filename');
    });

    it('should detect inappropriate content in text files', async () => {
      const textFileName = 'document.txt';
      (mockFs.promises.readFile as jest.Mock).mockResolvedValue('this file contains virus information');

      const result = await securityService.scanFile(testFilePath, textFileName);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('Inappropriate content detected');
    });

    it('should handle scan errors gracefully', async () => {
      (mockFs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      const result = await securityService.scanFile(testFilePath, testFileName);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('Scan error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during security scan:',
        expect.any(Error)
      );
    });
  });

  describe('isFileSafe', () => {
    it('should return true for clean scan results', () => {
      const cleanResult = {
        virusFound: false,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'All clean',
        scannedAt: new Date()
      };

      const result = securityService.isFileSafe(cleanResult);
      expect(result).toBe(true);
    });

    it('should return false if virus is found', () => {
      const infectedResult = {
        virusFound: true,
        malwareFound: false,
        suspiciousContent: false,
        scanDetails: 'Virus detected',
        scannedAt: new Date()
      };

      const result = securityService.isFileSafe(infectedResult);
      expect(result).toBe(false);
    });

    it('should return false if malware is found', () => {
      const malwareResult = {
        virusFound: false,
        malwareFound: true,
        suspiciousContent: false,
        scanDetails: 'Malware detected',
        scannedAt: new Date()
      };

      const result = securityService.isFileSafe(malwareResult);
      expect(result).toBe(false);
    });

    it('should return false if suspicious content is found', () => {
      const suspiciousResult = {
        virusFound: false,
        malwareFound: false,
        suspiciousContent: true,
        scanDetails: 'Suspicious content detected',
        scannedAt: new Date()
      };

      const result = securityService.isFileSafe(suspiciousResult);
      expect(result).toBe(false);
    });
  });

  describe('getSecureStoragePath', () => {
    const userId = 'user123';
    const filename = 'test.jpg';

    beforeEach(() => {
      mockFs.existsSync = jest.fn().mockReturnValue(false);
      mockFs.mkdirSync = jest.fn();
    });

    it('should create secure storage path with user directory', () => {
      const result = securityService.getSecureStoragePath(filename, userId);

      expect(result).toContain(userId);
      expect(result).toContain('test');
      expect(result).toContain('.jpg');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        { recursive: true, mode: 0o755 }
      );
    });

    it('should not create directory if it already exists', () => {
      mockFs.existsSync = jest.fn().mockReturnValue(true);

      const result = securityService.getSecureStoragePath(filename, userId);

      expect(result).toContain(userId);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should generate unique filenames with timestamp', () => {
      const result1 = securityService.getSecureStoragePath(filename, userId);
      
      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(1);
      
      const result2 = securityService.getSecureStoragePath(filename, userId);

      expect(result1).not.toBe(result2);
    });
  });

  describe('validateFileAccess', () => {
    const userId = 'user123';

    it('should allow access to files within user directory', () => {
      const userFilePath = path.join('uploads', 'resources', userId, 'test.jpg');
      
      const result = securityService.validateFileAccess(userFilePath, userId);
      expect(result).toBe(true);
    });

    it('should deny access to files outside user directory', () => {
      const outsideFilePath = path.join('uploads', 'resources', 'other_user', 'test.jpg');
      
      const result = securityService.validateFileAccess(outsideFilePath, userId);
      expect(result).toBe(false);
    });

    it('should handle path resolution errors gracefully', () => {
      // Mock path.resolve to throw an error
      const originalResolve = path.resolve;
      jest.spyOn(path, 'resolve').mockImplementation(() => {
        throw new Error('Path resolution error');
      });

      const result = securityService.validateFileAccess('invalid/path', userId);
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error validating file access:',
        expect.any(Error)
      );

      // Restore original function
      jest.spyOn(path, 'resolve').mockImplementation(originalResolve);
    });
  });

  describe('cleanupTempFile', () => {
    const tempFilePath = '/tmp/temp_file.jpg';

    beforeEach(() => {
      mockFs.existsSync = jest.fn();
      mockFs.promises = {
        unlink: jest.fn()
      } as any;
    });

    it('should delete existing temporary files', async () => {
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      (mockFs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await securityService.cleanupTempFile(tempFilePath);

      expect(mockFs.promises.unlink).toHaveBeenCalledWith(tempFilePath);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up temporary file')
      );
    });

    it('should not attempt to delete non-existent files', async () => {
      mockFs.existsSync = jest.fn().mockReturnValue(false);

      await securityService.cleanupTempFile(tempFilePath);

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      (mockFs.promises.unlink as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      await securityService.cleanupTempFile(tempFilePath);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error cleaning up temporary file:',
        expect.any(Error)
      );
    });
  });
});