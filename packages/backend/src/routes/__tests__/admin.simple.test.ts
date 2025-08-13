import express from 'express';
import adminRouter from '../admin';

describe('Admin Routes - Simple Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock database
    app.locals.db = {
      query: jest.fn(),
      connect: jest.fn()
    };

    app.use('/admin', adminRouter);
  });

  it('should have admin router defined', () => {
    expect(adminRouter).toBeDefined();
    expect(typeof adminRouter).toBe('function');
  });

  it('should be an Express router', () => {
    expect(adminRouter.stack).toBeDefined();
    expect(Array.isArray(adminRouter.stack)).toBe(true);
  });

  it('should have routes defined', () => {
    const routes = adminRouter.stack.map((layer: any) => ({
      method: Object.keys(layer.route?.methods || {})[0],
      path: layer.route?.path
    })).filter(route => route.path);

    expect(routes.length).toBeGreaterThan(0);
    
    // Check for some key routes
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/posts');
    expect(paths).toContain('/communities');
    expect(paths).toContain('/moderation-queue');
  });
});