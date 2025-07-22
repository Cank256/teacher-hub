import { Request, Response, NextFunction } from 'express';
import { gzip, deflate } from 'zlib';
import { promisify } from 'util';
import logger from '../utils/logger';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);

export interface CompressionOptions {
  threshold?: number; // Minimum response size to compress (bytes)
  level?: number; // Compression level (1-9)
  filter?: (req: Request, res: Response) => boolean;
}

export function compressionMiddleware(options: CompressionOptions = {}) {
  const {
    threshold = 1024, // 1KB minimum
    level = 6, // Default compression level
    filter = defaultFilter
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip compression if filter returns false
    if (!filter(req, res)) {
      return next();
    }

    // Check if client accepts compression
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    const supportsDeflate = acceptEncoding.includes('deflate');

    if (!supportsGzip && !supportsDeflate) {
      return next();
    }

    // Store original methods
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    // Override send method
    res.send = function(data: any) {
      // Check if we should compress based on current content type
      const contentType = this.get('Content-Type') || '';
      const shouldCompress = shouldCompressContent(contentType);
      
      if (!shouldCompress) {
        return originalSend(data);
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      if (buffer.length < threshold) {
        return originalSend(data);
      }

      // Simple synchronous compression for testing
      try {
        const compressed = supportsGzip 
          ? require('zlib').gzipSync(buffer, { level })
          : require('zlib').deflateSync(buffer, { level });

        if (compressed.length < buffer.length) {
          this.set('Content-Encoding', supportsGzip ? 'gzip' : 'deflate');
          this.set('Content-Length', compressed.length.toString());
          this.set('Vary', 'Accept-Encoding');
          return originalSend(compressed);
        }
      } catch (error) {
        logger.error('Compression error:', error);
      }

      return originalSend(data);
    };

    // Override json method
    res.json = function(data: any) {
      this.set('Content-Type', 'application/json');
      const jsonString = JSON.stringify(data);
      return this.send(jsonString);
    };

    next();
  };
}



function shouldCompressContent(contentType: string): boolean {
  // Don't compress images, videos, or already compressed files
  const skipTypes = [
    'image/',
    'video/',
    'audio/',
    'application/zip',
    'application/gzip',
    'application/x-rar',
    'application/pdf'
  ];

  if (skipTypes.some(type => contentType.startsWith(type))) {
    return false;
  }

  // Compress text-based content
  const compressTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml'
  ];

  // If no content type is set yet, assume it's compressible (for JSON responses)
  return contentType === '' || compressTypes.some(type => contentType.startsWith(type));
}

function defaultFilter(req: Request, res: Response): boolean {
  // Don't compress if already compressed
  if (res.get('Content-Encoding')) {
    return false;
  }

  // Always allow the middleware to run, actual compression decision is made in send()
  return true;
}

// Adaptive compression based on connection speed
export function adaptiveCompressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Detect connection speed from headers (if available)
    const connectionType = req.headers['save-data'] || req.headers['connection-type'];
    const isSlowConnection = connectionType === 'slow' || req.headers['save-data'] === 'on';

    // Adjust compression level based on connection
    const compressionLevel = isSlowConnection ? 9 : 6; // Higher compression for slow connections
    const threshold = isSlowConnection ? 512 : 1024; // Lower threshold for slow connections

    return compressionMiddleware({
      level: compressionLevel,
      threshold
    })(req, res, next);
  };
}