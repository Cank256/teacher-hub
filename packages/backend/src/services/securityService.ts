import { SecurityScanResult } from '../types';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

export class SecurityService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = new Set([
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp3'
  ]);

  private readonly dangerousExtensions = new Set([
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin'
  ]);

  private readonly suspiciousKeywords = [
    'virus', 'malware', 'trojan', 'worm', 'backdoor', 'rootkit',
    'keylogger', 'spyware', 'adware', 'ransomware', 'phishing'
  ];

  /**
   * Validates file type based on MIME type and file extension
   */
  validateFileType(file: Express.Multer.File): boolean {
    try {
      // Check MIME type
      if (!this.allowedMimeTypes.has(file.mimetype)) {
        logger.warn(`Invalid MIME type: ${file.mimetype} for file: ${file.originalname}`);
        return false;
      }

      // Check file extension
      const extension = path.extname(file.originalname).toLowerCase();
      if (this.dangerousExtensions.has(extension)) {
        logger.warn(`Dangerous file extension: ${extension} for file: ${file.originalname}`);
        return false;
      }

      // Additional validation for specific file types
      if (file.mimetype.startsWith('image/')) {
        return this.validateImageFile(file);
      }

      if (file.mimetype.startsWith('video/')) {
        return this.validateVideoFile(file);
      }

      return true;
    } catch (error) {
      logger.error('Error validating file type:', error);
      return false;
    }
  }

  /**
   * Validates file size against maximum allowed size
   */
  validateFileSize(file: Express.Multer.File, maxSize?: number): boolean {
    const sizeLimit = maxSize || this.maxFileSize;
    
    if (file.size > sizeLimit) {
      logger.warn(`File size ${file.size} exceeds limit ${sizeLimit} for file: ${file.originalname}`);
      return false;
    }

    return true;
  }

  /**
   * Performs comprehensive security scanning on uploaded file
   */
  async scanFile(filePath: string, originalName: string): Promise<SecurityScanResult> {
    const scanResult: SecurityScanResult = {
      virusFound: false,
      malwareFound: false,
      suspiciousContent: false,
      scanDetails: '',
      scannedAt: new Date()
    };

    try {
      // Perform virus scan using ClamAV
      const virusScanResult = await this.performVirusScan(filePath);
      scanResult.virusFound = virusScanResult.infected;
      scanResult.scanDetails += virusScanResult.details;

      // Perform content safety scan
      const contentScanResult = await this.performContentSafetyScan(filePath, originalName);
      scanResult.suspiciousContent = contentScanResult.suspicious;
      scanResult.scanDetails += contentScanResult.details;

      // Check for malware signatures
      const malwareScanResult = await this.performMalwareScan(filePath);
      scanResult.malwareFound = malwareScanResult.malwareDetected;
      scanResult.scanDetails += malwareScanResult.details;

      logger.info(`Security scan completed for file: ${originalName}`, {
        virusFound: scanResult.virusFound,
        malwareFound: scanResult.malwareFound,
        suspiciousContent: scanResult.suspiciousContent
      });

      return scanResult;
    } catch (error) {
      logger.error('Error during security scan:', error);
      scanResult.scanDetails = `Scan error: ${error.message}`;
      scanResult.suspiciousContent = true; // Fail safe
      return scanResult;
    }
  }

  /**
   * Validates image files for additional security checks
   */
  private validateImageFile(file: Express.Multer.File): boolean {
    // Check for reasonable image dimensions (basic validation)
    // In a real implementation, you might use a library like sharp to validate image headers
    return true;
  }

  /**
   * Validates video files for additional security checks
   */
  private validateVideoFile(file: Express.Multer.File): boolean {
    // Check for reasonable video file size and format
    // Videos should not exceed 100MB for upload to YouTube
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    
    if (file.size > maxVideoSize) {
      logger.warn(`Video file size ${file.size} exceeds video limit ${maxVideoSize}`);
      return false;
    }

    return true;
  }

  /**
   * Performs virus scanning using ClamAV
   */
  private async performVirusScan(filePath: string): Promise<{ infected: boolean; details: string }> {
    return new Promise((resolve) => {
      // Check if ClamAV is available
      const clamav = spawn('clamscan', ['--no-summary', '--infected', filePath]);
      
      let output = '';
      let errorOutput = '';

      clamav.stdout.on('data', (data) => {
        output += data.toString();
      });

      clamav.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      clamav.on('close', (code) => {
        if (code === 0) {
          // No virus found
          resolve({
            infected: false,
            details: 'Virus scan: Clean. '
          });
        } else if (code === 1) {
          // Virus found
          resolve({
            infected: true,
            details: `Virus scan: INFECTED - ${output}. `
          });
        } else {
          // ClamAV not available or error occurred
          logger.warn('ClamAV not available or error occurred:', errorOutput);
          resolve({
            infected: false,
            details: 'Virus scan: ClamAV not available, skipped. '
          });
        }
      });

      clamav.on('error', (error) => {
        logger.warn('ClamAV execution error:', error);
        resolve({
          infected: false,
          details: 'Virus scan: ClamAV execution error, skipped. '
        });
      });
    });
  }

  /**
   * Performs content safety scanning for inappropriate material
   */
  private async performContentSafetyScan(filePath: string, originalName: string): Promise<{ suspicious: boolean; details: string }> {
    try {
      // Check filename for suspicious keywords
      const filenameLower = originalName.toLowerCase();
      const hasSuspiciousKeyword = this.suspiciousKeywords.some(keyword => 
        filenameLower.includes(keyword)
      );

      if (hasSuspiciousKeyword) {
        return {
          suspicious: true,
          details: 'Content scan: Suspicious keywords in filename. '
        };
      }

      // For text files, scan content
      if (originalName.endsWith('.txt') || originalName.endsWith('.csv')) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const contentLower = content.toLowerCase();
        
        const hasInappropriateContent = this.suspiciousKeywords.some(keyword => 
          contentLower.includes(keyword)
        );

        if (hasInappropriateContent) {
          return {
            suspicious: true,
            details: 'Content scan: Inappropriate content detected in text file. '
          };
        }
      }

      return {
        suspicious: false,
        details: 'Content scan: Clean. '
      };
    } catch (error) {
      logger.error('Error during content safety scan:', error);
      return {
        suspicious: true,
        details: 'Content scan: Error occurred during scan. '
      };
    }
  }

  /**
   * Performs basic malware signature detection
   */
  private async performMalwareScan(filePath: string): Promise<{ malwareDetected: boolean; details: string }> {
    try {
      // Read first 1KB of file to check for common malware signatures
      const buffer = Buffer.alloc(1024);
      const fd = await fs.promises.open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, 1024, 0);
      await fd.close();

      const fileHeader = buffer.slice(0, bytesRead).toString('hex');

      // Check for common executable signatures
      const malwareSignatures = [
        '4d5a', // PE executable (MZ header)
        '504b0304', // ZIP file (could contain malware)
        '526172211a0700', // RAR archive
        '377abcaf271c' // 7-Zip archive
      ];

      // Only flag as malware if it's an executable with suspicious extension
      const hasMalwareSignature = malwareSignatures.some(signature => 
        fileHeader.toLowerCase().startsWith(signature.toLowerCase())
      );

      if (hasMalwareSignature) {
        const extension = path.extname(filePath).toLowerCase();
        if (this.dangerousExtensions.has(extension)) {
          return {
            malwareDetected: true,
            details: 'Malware scan: Executable signature detected in suspicious file. '
          };
        }
      }

      return {
        malwareDetected: false,
        details: 'Malware scan: Clean. '
      };
    } catch (error) {
      logger.error('Error during malware scan:', error);
      return {
        malwareDetected: true,
        details: 'Malware scan: Error occurred during scan. '
      };
    }
  }

  /**
   * Checks if a file passed all security validations
   */
  isFileSafe(scanResult: SecurityScanResult): boolean {
    return !scanResult.virusFound && 
           !scanResult.malwareFound && 
           !scanResult.suspiciousContent;
  }

  /**
   * Gets secure file storage path with proper access controls
   */
  getSecureStoragePath(filename: string, userId: string): string {
    // Create user-specific directory structure
    const userDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'resources', userId);
    
    // Ensure directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true, mode: 0o755 });
    }

    // Generate secure filename with timestamp
    const timestamp = Date.now();
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    const secureFilename = `${baseName}_${timestamp}${extension}`;

    return path.join(userDir, secureFilename);
  }

  /**
   * Validates file access permissions
   */
  validateFileAccess(filePath: string, userId: string): boolean {
    try {
      // Check if file is within user's directory
      const userDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'resources', userId);
      const resolvedFilePath = path.resolve(filePath);
      const resolvedUserDir = path.resolve(userDir);

      return resolvedFilePath.startsWith(resolvedUserDir);
    } catch (error) {
      logger.error('Error validating file access:', error);
      return false;
    }
  }

  /**
   * Cleans up temporary files after processing
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file:', error);
    }
  }
}

export const securityService = new SecurityService();