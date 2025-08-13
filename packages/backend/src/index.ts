import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import fileRoutes from './routes/files';
import contentRoutes from './routes/content';
import governmentRoutes from './routes/government';
import messageRoutes from './routes/messages';
import communityRoutes from './routes/communities';
import postRoutes from './routes/posts';
import resourceRoutes from './routes/resources';
import monitoringRoutes from './routes/monitoring';
import adminRoutes from './routes/admin';
import roleManagementRoutes from './routes/roleManagement';
import { EnhancedSocketServer } from './messaging/socketServer';
import { redisClient } from './cache/redisClient';
import logger from './utils/logger';
import { 
  requestTrackingMiddleware, 
  performanceTrackingMiddleware, 
  errorTrackingMiddleware 
} from './middleware/monitoring';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add compression middleware
import { adaptiveCompressionMiddleware } from './middleware/compression';
app.use(adaptiveCompressionMiddleware());

// Add monitoring middleware
app.use(requestTrackingMiddleware);
app.use(performanceTrackingMiddleware);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Teacher Hub API is running' });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Profile routes
app.use('/api/profile', profileRoutes);

// File routes
app.use('/api/files', fileRoutes);

// Content routes
app.use('/api/content', contentRoutes);

// Government content routes
app.use('/api/government', governmentRoutes);

// Message routes
app.use('/api/messages', messageRoutes);

// Community routes
app.use('/api/communities', communityRoutes);

// Post routes
app.use('/api/posts', postRoutes);

// Resource routes
app.use('/api/resources', resourceRoutes);

// Monitoring routes
app.use('/api/monitoring', monitoringRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Role management routes
app.use('/api/roles', roleManagementRoutes);

// Error handling middleware
app.use(errorTrackingMiddleware);
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    }
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
const socketServer = new EnhancedSocketServer(httpServer);

// Initialize Redis connection
async function initializeServices() {
  try {
    await redisClient.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Continue without Redis - caching will be disabled
  }
}

// Start server
httpServer.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  
  // Initialize services
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisClient.disconnect();
  process.exit(0);
});

export default app;