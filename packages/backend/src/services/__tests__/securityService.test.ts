import { SecurityService } from '../securityService';
import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file system operations
jest.mock('fs/promises');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = new SecurityService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    it('should accept valid document types', () => {
      const validFiles = [
        { mimetype: 'application/pdf', originalname: 'document.pdf' },
        { mimetype: 'application/msword', originalname: 'document.doc' },
        { mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', originalname: 'document.docx' },
        { mimetype: 'application/vnd.ms-powerpoint', originalname: 'presentation.ppt' },
        { mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', originalname: 'presentation.pptx' },
        { mimetype: 'text/plain', originalname: 'text.txt' }
      ];

      validFiles.forEach(file => {
        expect(securityService.validateFileType(file as Express.Multer.File)).toBe(true);
      });
    });

    it('should accept valid image types', () => {
      const validImages = [
        { mimetype: 'image/jpeg', originalname: 'image.jpg' },
        { mimetype: 'image/png', originalname: 'image.png' },
        { mimetype: 'image/gif', originalname: 'image.gif' },
        { mimetype: 'image/webp', originalname: 'image.webp' }
      ];

      validImages.forEach(file => {
        expect(securityService.validateFileType(file as Express.Multer.File)).toBe(true);
      });
    });

    it('should accept valid video types', () => {
      const validVideos = [
        { mimetype: 'video/mp4', originalname: 'video.mp4' },
        { mimetype: 'video/avi', originalname: 'video.avi' },
        { mimetype: 'video/quicktime', originalname: 'video.mov' },
        { mimetype: 'video/x-msvideo', originalname: 'video.avi' }
      ];

      validVideos.forEach(file => {
        expect(securityService.validateFileType(file as Express.Multer.File)).toBe(true);
      });
    });

    it('should reject invalid file types', () => {
      const invalidFiles = [
        { mimetype: 'application/x-executable', originalname: 'malware.exe' },
        { mimetype: 'application/javascript', originalname: 'script.js' },
        { mimetype: 'text/html', originalname: 'page.html' },
        { mimetype: 'application/x-sh', originalname: 'script.sh' },
        { mimetype: 'application/octet-stream', originalname: 'unknown.bin' }
      ];

      invalidFiles.forEach(file => {
        expect(securityService.validateFileType(file as Express.Multer.File)).toBe(false);
      });
    });

    it('should validate file extensions match MIME types', () => {
      const mismatchedFiles = [
        { mimetype: 'image/jpeg', originalname: 'fake.pdf' },
        { mimetype: 'application/pdf', originalname: 'fake.jpg' },
        { mimetype: 'video/mp4', originalname: 'fake.txt' }
      ];

      mismatchedFiles.forEach(file => {
        expect(securityService.validateFileType(file as Express.Multer.File)).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const validSizes = [
        { size: 1024 }, // 1KB
        { size: 1024 * 1024 }, // 1MB
        { size: 5 * 1024 * 1024 }, // 5MB
        { size: 10 * 1024 * 1024 } // 10MB (exactly at limit)
      ];

      validSizes.forEach(file => {
        expect(securityService.validateFileSize(file as Express.Multer.File, 10 * 1024 * 1024)).toBe(true);
      });
    });

    it('should reject files exceeding size limit', () => {
      const oversizedFiles = [
        { size: 11 * 1024 * 1024 }, // 11MB
        { size: 50 * 1024 * 1024 }, // 50MB
        { size: 100 * 1024 * 1024 } // 100MB
      ];

      oversizedFiles.forEach(file => {
        expect(securityService.validateFileSize(file as Express.Multer.File, 10 * 1024 * 1024)).toBe(false);
      });
    });

    it('should use default size limit when not specified', () => {
      const file = { size: 15 * 1024 * 1024 }; // 15MB

      expect(securityService.validateFileSize(file as Express.Multer.File)).toBe(false);
    });
  });

  describe('scanFile', () => {
    it('should return clean scan result for safe file', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('PDF content'),
        size: 1024
      } as Express.Multer.File;

      // Mock successful ClamAV scan
      const { spawn } = require('child_process');
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Exit code 0 = clean
          }
        }),
        stdin: {
          write: jest.fn(),
          end: jest.fn()
        }
      };

      spawn.mockReturnValue(mockProcess);

      const result = await securityService.scanFile(mockFile);

      expect(result.virusFound).toBe(false);
      expect(result.malwareFound).toBe(false);
      expect(result.suspiciousContent).toBe(false);
      expect(result.scanDetails).toContain('Clean');
    });

    it('should detect virus in infected file', async () => {
      const mockFile = {
        originalname: 'infected.exe',
        buffer: Buffer.from('malicious content'),
        size: 1024
      } as Express.Multer.File;

      // Mock ClamAV detecting virus
      const { spawn } = require('child_process');
      const mockProcess = {
        stdout: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('infected.exe: Trojan.Generic FOUND'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Exit code 1 = virus found
          }
        }),
        stdin: {
          write: jest.fn(),
          end: jest.fn()
        }
      };

      spawn.mockReturnValue(mockProcess);

      const result = await securityService.scanFile(mockFile);

      expect(result.virusFound).toBe(true);
      expect(result.scanDetails).toContain('Trojan.Generic');
    });

    it('should handle scan timeout', async () => {
      const mockFile = {
        originalname: 'large.zip',
        buffer: Buffer.alloc(10 * 1024 * 1024), // 10MB
        size: 10 * 1024 * 1024
      } as Express.Multer.File;

      // Mock timeout scenario
      const { spawn } = require('child_process');
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(), // Never calls close callback
        stdin: {
          write: jest.fn(),
          end: jest.fn()
        },
        kill: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      // Mock setTimeout to immediately trigger timeout
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        callback();
        return 123 as any;
      });

      const result = await securityService.scanFile(mockFile);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('timeout');

      global.setTimeout = originalSetTimeout;
    });

    it('should detect suspicious file patterns', async () => {
      const suspiciousFiles = [
        {
          originalname: 'invoice.pdf.exe',
          buffer: Buffer.from('fake content'),
          size: 1024
        },
        {
          originalname: 'document.scr',
          buffer: Buffer.from('screensaver content'),
          size: 1024
        },
        {
          originalname: 'update.bat',
          buffer: Buffer.from('batch script'),
          size: 1024
        }
      ];

      for (const file of suspiciousFiles) {
        const result = await securityService.scanFile(file as Express.Multer.File);
        expect(result.suspiciousContent).toBe(true);
      }
    });

    it('should validate file headers match extensions', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('MZ\x90\x00'), // PE executable header, not PDF
        size: 1024
      } as Express.Multer.File;

      const result = await securityService.scanFile(mockFile);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('header mismatch');
    });

    it('should handle ClamAV not available', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('PDF content'),
        size: 1024
      } as Express.Multer.File;

      // Mock ClamAV not found
      const { spawn } = require('child_process');
      spawn.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = await securityService.scanFile(mockFile);

      expect(result.suspiciousContent).toBe(true);
      expect(result.scanDetails).toContain('Scanner unavailable');
    });
  });

  describe('quarantineFile', () => {
    it('should move infected file to quarantine', async () => {
      const filePath = '/uploads/infected.exe';
      const reason = 'Virus detected: Trojan.Generic';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await securityService.quarantineFile(filePath, reason);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('quarantine'),
        { recursive: true }
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        filePath,
        expect.stringContaining('quarantine')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.info'),
        expect.stringContaining(reason)
      );
    });
  });

  describe('generateFileHash', () => {
    it('should generate consistent hash for same content', () => {
      const content1 = Buffer.from('test content');
      const content2 = Buffer.from('test content');
      const content3 = Buffer.from('different content');

      const hash1 = securityService.generateFileHash(content1);
      const hash2 = securityService.generateFileHash(content2);
      const hash3 = securityService.generateFileHash(content3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });
  });

  describe('checkFileSignature', () => {
    it('should validate PDF file signature', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ');
      expect(securityService.checkFileSignature(pdfBuffer, 'pdf')).toBe(true);

      const fakePdfBuffer = Buffer.from('Not a PDF file');
      expect(securityService.checkFileSignature(fakePdfBuffer, 'pdf')).toBe(false);
    });

    it('should validate JPEG file signature', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      expect(securityService.checkFileSignature(jpegBuffer, 'jpg')).toBe(true);

      const fakeJpegBuffer = Buffer.from('Not a JPEG file');
      expect(securityService.checkFileSignature(fakeJpegBuffer, 'jpg')).toBe(false);
    });

    it('should validate PNG file signature', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(securityService.checkFileSignature(pngBuffer, 'png')).toBe(true);

      const fakePngBuffer = Buffer.from('Not a PNG file');
      expect(securityService.checkFileSignature(fakePngBuffer, 'png')).toBe(false);
    });

    it('should return true for unknown file types', () => {
      const unknownBuffer = Buffer.from('unknown content');
      expect(securityService.checkFileSignature(unknownBuffer, 'unknown')).toBe(true);
    });
  });
});