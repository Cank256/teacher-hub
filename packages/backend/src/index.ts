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
import { SocketServer } from './messaging/socketServer';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Error handling middleware
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
const socketServer = new SocketServer(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});

export default app;