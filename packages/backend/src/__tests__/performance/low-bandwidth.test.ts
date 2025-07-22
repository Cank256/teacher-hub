import request from 'supertest';
import { compressionMiddleware } from '../../middleware/compression';
import { ProgressiveLoader } from '../../utils/progressiveLoading';
import express from 'express';

describe('Low Bandwidth Optimization Tests', () => {
  describe('Compression Middleware', () => {
    let testApp: express.Application;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.use(compressionMiddleware({ threshold: 100 }));
    });

    it('should compress large JSON responses', async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'This is a long description that should be compressed'.repeat(10)
        }))
      };

      testApp.get('/test-compression', (req, res) => {
        res.json(largeData);
      });

      const response = await request(testApp)
        .get('/test-compression')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body).toEqual(largeData);
    });

    it('should not compress small responses', async () => {
      const smallData = { message: 'small' };

      testApp.get('/test-small', (req, res) => {
        res.json(smallData);
      });

      const response = await request(testApp)
        .get('/test-small')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.body).toEqual(smallData);
    });

    it('should not compress images', async () => {
      testApp.get('/test-image', (req, res) => {
        res.set('Content-Type', 'image/jpeg');
        res.send(Buffer.alloc(5000, 'test'));
      });

      const response = await request(testApp)
        .get('/test-image')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should handle clients that do not support compression', async () => {
      const data = { message: 'test'.repeat(1000) };

      testApp.get('/test-no-compression', (req, res) => {
        res.json(data);
      });

      const response = await request(testApp)
        .get('/test-no-compression')
        .set('Accept-Encoding', 'identity') // Explicitly request no compression
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.body).toEqual(data);
    });
  });

  describe('Progressive Loading', () => {
    let loader: ProgressiveLoader;

    beforeEach(() => {
      loader = new ProgressiveLoader({
        pageSize: 10,
        maxPageSize: 50,
        allowedFields: ['id', 'name', 'description']
      });
    });

    it('should parse pagination parameters correctly', () => {
      const mockReq = {
        query: {
          page: '2',
          limit: '20',
          fields: 'id,name'
        }
      } as any;

      const params = loader.parsePaginationParams(mockReq);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(20);
      expect(params.fields).toEqual(['id', 'name']);
    });

    it('should enforce maximum page size', () => {
      const mockReq = {
        query: {
          limit: '200' // Exceeds maxPageSize of 50
        }
      } as any;

      const params = loader.parsePaginationParams(mockReq);

      expect(params.limit).toBe(50);
    });

    it('should filter fields based on allowed fields', () => {
      const mockReq = {
        query: {
          fields: 'id,name,secret,description'
        }
      } as any;

      const params = loader.parsePaginationParams(mockReq);

      expect(params.fields).toEqual(['id', 'name', 'description']);
      expect(params.fields).not.toContain('secret');
    });

    it('should create paginated response correctly', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const params = { page: 1, limit: 10, offset: 0 };
      const total = 25;

      const response = loader.createPaginatedResponse(data, total, params);

      expect(response.data).toEqual(data);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.total).toBe(25);
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should select only specified fields', () => {
      const items = [
        { id: 1, name: 'Item 1', secret: 'hidden', description: 'Desc 1' },
        { id: 2, name: 'Item 2', secret: 'hidden', description: 'Desc 2' }
      ];

      const selected = loader.selectFields(items, ['id', 'name']);

      expect(selected).toEqual([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]);
    });

    it('should adapt to slow connections', () => {
      const mockReq = {
        headers: {
          'save-data': 'on'
        },
        query: {
          limit: '20'
        }
      } as any;

      const baseParams = loader.parsePaginationParams(mockReq);
      const adaptedParams = loader.adaptToConnection(mockReq, baseParams);

      expect(adaptedParams.limit).toBeLessThan(baseParams.limit);
    });
  });



  describe('Performance Metrics', () => {
    it('should measure compression performance', async () => {
      const largeData = 'x'.repeat(10000);
      const testApp = express();
      testApp.use(compressionMiddleware({ threshold: 100 }));

      testApp.get('/large-data', (req, res) => {
        res.send(largeData);
      });

      const start = Date.now();
      const response = await request(testApp)
        .get('/large-data')
        .set('Accept-Encoding', 'gzip');
      const compressionTime = Date.now() - start;

      expect(compressionTime).toBeLessThan(1000); // Should compress within 1 second
      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should handle concurrent compression requests', async () => {
      const testApp = express();
      testApp.use(compressionMiddleware({ threshold: 100 }));

      const largeData = { data: 'x'.repeat(5000) };
      testApp.get('/concurrent-test', (req, res) => {
        res.json(largeData);
      });

      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(testApp)
          .get('/concurrent-test')
          .set('Accept-Encoding', 'gzip')
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - start;

      // All responses should be compressed
      responses.forEach(response => {
        expect(response.headers['content-encoding']).toBe('gzip');
        expect(response.body).toEqual(largeData);
      });

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Network Condition Adaptation', () => {
    it('should detect slow connection indicators', () => {
      const loader = new ProgressiveLoader();
      
      const slowConnectionReq = {
        headers: {
          'save-data': 'on',
          'connection-type': '2g'
        },
        query: { limit: '20' }
      } as any;

      const params = loader.parsePaginationParams(slowConnectionReq);
      const adapted = loader.adaptToConnection(slowConnectionReq, params);

      expect(adapted.limit).toBeLessThan(params.limit);
    });

    it('should maintain normal behavior for fast connections', () => {
      const loader = new ProgressiveLoader();
      
      const fastConnectionReq = {
        headers: {
          'connection-type': '4g'
        },
        query: { limit: '20' }
      } as any;

      const params = loader.parsePaginationParams(fastConnectionReq);
      const adapted = loader.adaptToConnection(fastConnectionReq, params);

      expect(adapted.limit).toBe(params.limit);
    });
  });
});