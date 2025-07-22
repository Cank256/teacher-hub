import { Request, Response } from 'express';
import logger from './logger';

export interface ProgressiveLoadingOptions {
  pageSize?: number;
  maxPageSize?: number;
  defaultFields?: string[];
  allowedFields?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  fields?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    loadTime: number;
    dataSize: number;
    compressed: boolean;
  };
}

export class ProgressiveLoader {
  private options: Required<ProgressiveLoadingOptions>;

  constructor(options: ProgressiveLoadingOptions = {}) {
    this.options = {
      pageSize: options.pageSize || 20,
      maxPageSize: options.maxPageSize || 100,
      defaultFields: options.defaultFields || [],
      allowedFields: options.allowedFields || []
    };
  }

  parsePaginationParams(req: Request): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const requestedLimit = parseInt(req.query.limit as string) || this.options.pageSize;
    const limit = Math.min(requestedLimit, this.options.maxPageSize);
    const offset = (page - 1) * limit;

    // Parse field selection
    let fields: string[] | undefined;
    if (req.query.fields) {
      const requestedFields = (req.query.fields as string).split(',').map(f => f.trim());
      if (this.options.allowedFields.length > 0) {
        fields = requestedFields.filter(field => this.options.allowedFields.includes(field));
      } else {
        fields = requestedFields;
      }
    } else if (this.options.defaultFields.length > 0) {
      fields = this.options.defaultFields;
    }

    return { page, limit, offset, fields };
  }

  createPaginatedResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams,
    loadTime?: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / params.limit);
    const hasNext = params.page < totalPages;
    const hasPrev = params.page > 1;

    // Calculate data size for monitoring
    const dataSize = Buffer.byteLength(JSON.stringify(data));

    return {
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      },
      meta: {
        loadTime: loadTime || 0,
        dataSize,
        compressed: false // Will be set by compression middleware
      }
    };
  }

  // Field selection utility
  selectFields<T extends Record<string, any>>(
    items: T[],
    fields?: string[]
  ): Partial<T>[] {
    if (!fields || fields.length === 0) {
      return items;
    }

    return items.map(item => {
      const selected: Partial<T> = {};
      fields.forEach(field => {
        if (field in item) {
          selected[field as keyof T] = item[field];
        }
      });
      return selected;
    });
  }

  // Adaptive loading based on connection speed
  adaptToConnection(req: Request, baseParams: PaginationParams): PaginationParams {
    const isSlowConnection = this.detectSlowConnection(req);
    
    if (isSlowConnection) {
      // Reduce page size for slow connections
      const adaptedLimit = Math.min(baseParams.limit, Math.floor(this.options.pageSize / 2));
      return {
        ...baseParams,
        limit: adaptedLimit,
        offset: (baseParams.page - 1) * adaptedLimit
      };
    }

    return baseParams;
  }

  private detectSlowConnection(req: Request): boolean {
    // Check for save-data header
    if (req.headers['save-data'] === 'on') {
      return true;
    }

    // Check for connection type hints
    const connectionType = req.headers['connection-type'] as string;
    if (connectionType && ['slow-2g', '2g'].includes(connectionType)) {
      return true;
    }

    // Check for explicit slow connection header
    if (req.headers['x-slow-connection'] === 'true') {
      return true;
    }

    return false;
  }
}

// Middleware for progressive loading
export function progressiveLoadingMiddleware(options?: ProgressiveLoadingOptions) {
  const loader = new ProgressiveLoader(options);

  return (req: Request, res: Response, next: Function) => {
    // Add progressive loading utilities to request
    (req as any).progressiveLoader = loader;
    (req as any).paginationParams = loader.parsePaginationParams(req);
    
    next();
  };
}

// Utility for chunked data streaming
export class ChunkedDataStreamer {
  static async streamLargeDataset<T>(
    res: Response,
    dataProvider: (offset: number, limit: number) => Promise<{ data: T[]; total: number }>,
    chunkSize: number = 50
  ): Promise<void> {
    try {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      });

      res.write('{"data":[');

      let offset = 0;
      let isFirst = true;
      let hasMore = true;

      while (hasMore) {
        const result = await dataProvider(offset, chunkSize);
        
        if (result.data.length === 0) {
          hasMore = false;
          break;
        }

        // Write chunk
        for (const item of result.data) {
          if (!isFirst) {
            res.write(',');
          }
          res.write(JSON.stringify(item));
          isFirst = false;
        }

        offset += chunkSize;
        hasMore = result.data.length === chunkSize;

        // Small delay to prevent overwhelming slow connections
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      res.write(']}');
      res.end();
    } catch (error) {
      logger.error('Chunked streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      }
    }
  }
}