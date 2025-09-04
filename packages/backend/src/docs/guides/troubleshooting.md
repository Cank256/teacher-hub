# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Problem: JWT Token Expired
**Error**: `401 Unauthorized - Token expired`

**Solution**:
1. Check token expiration time
2. Implement token refresh logic in client
3. Verify server time synchronization

```javascript
// Client-side token refresh example
const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  } catch (error) {
    // Redirect to login
    window.location.href = '/login';
  }
};
```

#### Problem: Invalid Bearer Token Format
**Error**: `401 Unauthorized - Invalid token format`

**Solution**:
1. Ensure token is prefixed with "Bearer "
2. Check for extra spaces or characters
3. Verify token is not corrupted

```bash
# Correct format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Incorrect formats
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Missing "Bearer "
Authorization: Bearer  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Extra space
```

### File Upload Issues

#### Problem: File Too Large
**Error**: `413 Payload Too Large` or `FILE_TOO_LARGE`

**Solution**:
1. Check file size limits in configuration
2. Implement client-side file size validation
3. Consider file compression for videos

```javascript
// Client-side file size validation
const validateFileSize = (file, maxSizeMB = 100) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
  }
  return true;
};
```

#### Problem: Unsupported File Type
**Error**: `400 Bad Request - File type not allowed`

**Solution**:
1. Check supported file types in API documentation
2. Validate MIME types on client side
3. Ensure file extensions match content

```javascript
// Supported file types
const supportedTypes = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
  documents: ['application/pdf', 'application/msword', 'text/plain']
};

const validateFileType = (file) => {
  const allSupported = [...supportedTypes.images, ...supportedTypes.videos, ...supportedTypes.documents];
  if (!allSupported.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported`);
  }
  return true;
};
```

#### Problem: Security Scan Failed
**Error**: `400 Bad Request - Security scan failed`

**Solution**:
1. Ensure file is not corrupted
2. Check for malware or suspicious content
3. Try uploading a different file
4. Contact admin if legitimate file is rejected

### YouTube Integration Issues

#### Problem: YouTube API Quota Exceeded
**Error**: `YOUTUBE_QUOTA_EXCEEDED`

**Solution**:
1. Monitor daily quota usage
2. Implement quota-aware upload scheduling
3. Consider upgrading YouTube API quota limits
4. Optimize API calls to reduce quota consumption

```javascript
// Quota monitoring example
const checkQuotaUsage = async () => {
  const response = await fetch('/api/resources/analytics/overview');
  const { analytics } = await response.json();
  const { youtubeQuotaUsage } = analytics.system;
  
  if (youtubeQuotaUsage.percentage > 90) {
    console.warn('YouTube quota usage is high:', youtubeQuotaUsage);
    // Implement quota-aware logic
  }
};
```

#### Problem: YouTube Upload Failed
**Error**: `YOUTUBE_UPLOAD_FAILED`

**Solution**:
1. Check video format and encoding
2. Verify file is not corrupted
3. Ensure YouTube API credentials are valid
4. Check network connectivity
5. Retry upload after delay

```javascript
// Upload retry logic
const uploadWithRetry = async (videoData, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadVideo(videoData);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

#### Problem: YouTube Authentication Error
**Error**: `YOUTUBE_AUTH_ERROR`

**Solution**:
1. Re-authorize the application with YouTube
2. Check OAuth credentials configuration
3. Verify redirect URIs are correct
4. Ensure admin has proper YouTube channel access

### Database Issues

#### Problem: Connection Pool Exhausted
**Error**: `Database connection pool exhausted`

**Solution**:
1. Check for connection leaks in code
2. Increase connection pool size
3. Implement connection timeout settings
4. Monitor long-running queries

```javascript
// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  }
};
```

#### Problem: Migration Failed
**Error**: `Migration failed: Table already exists`

**Solution**:
1. Check migration status: `npm run migrate:status`
2. Rollback problematic migration: `npm run migrate:down`
3. Fix migration script and re-run
4. Ensure migrations are idempotent

```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Run migrations
npm run migrate:up
```

### API Response Issues

#### Problem: Slow API Responses
**Symptoms**: Response times > 5 seconds

**Solution**:
1. Check database query performance
2. Implement caching for frequently accessed data
3. Optimize database indexes
4. Use pagination for large datasets

```javascript
// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};
```

#### Problem: Memory Leaks
**Symptoms**: Increasing memory usage over time

**Solution**:
1. Monitor memory usage with tools like `clinic.js`
2. Check for unclosed database connections
3. Implement proper cleanup in event listeners
4. Use memory profiling tools

```javascript
// Memory monitoring
const monitorMemory = () => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB'
  });
};

setInterval(monitorMemory, 60000); // Monitor every minute
```

### Search and Filtering Issues

#### Problem: Search Returns No Results
**Symptoms**: Valid search queries return empty results

**Solution**:
1. Check search index status
2. Verify search query formatting
3. Test with simpler search terms
4. Check database data integrity

```javascript
// Debug search queries
const debugSearch = async (query, filters) => {
  console.log('Search query:', query);
  console.log('Applied filters:', filters);
  
  // Test without filters first
  const basicResults = await searchWithoutFilters(query);
  console.log('Basic search results:', basicResults.length);
  
  // Then apply filters one by one
  for (const [key, value] of Object.entries(filters)) {
    const filteredResults = await searchWithFilter(query, { [key]: value });
    console.log(`With ${key} filter:`, filteredResults.length);
  }
};
```

#### Problem: Elasticsearch Connection Failed
**Error**: `Elasticsearch cluster is down`

**Solution**:
1. Check Elasticsearch service status
2. Verify connection configuration
3. Implement fallback to database search
4. Monitor Elasticsearch health

```javascript
// Elasticsearch health check
const checkElasticsearchHealth = async () => {
  try {
    const health = await elasticsearchClient.cluster.health();
    if (health.status === 'red') {
      console.error('Elasticsearch cluster is unhealthy');
      // Implement fallback logic
    }
    return health;
  } catch (error) {
    console.error('Elasticsearch connection failed:', error);
    // Use database search as fallback
    return null;
  }
};
```

### Real-time Messaging Issues

#### Problem: WebSocket Connection Drops
**Symptoms**: Messages not delivered in real-time

**Solution**:
1. Implement WebSocket reconnection logic
2. Check network stability
3. Verify WebSocket server configuration
4. Use heartbeat/ping-pong for connection health

```javascript
// WebSocket reconnection logic
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
}
```

#### Problem: Message Delivery Failures
**Symptoms**: Messages sent but not received

**Solution**:
1. Check message queue status
2. Verify recipient user IDs
3. Implement message acknowledgment system
4. Use fallback to REST API for critical messages

```javascript
// Message delivery with acknowledgment
const sendMessageWithAck = (message, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const messageId = generateId();
    const timeoutId = setTimeout(() => {
      reject(new Error('Message delivery timeout'));
    }, timeout);
    
    // Listen for acknowledgment
    const ackHandler = (ack) => {
      if (ack.messageId === messageId) {
        clearTimeout(timeoutId);
        resolve(ack);
      }
    };
    
    ws.addEventListener('message-ack', ackHandler);
    ws.send(JSON.stringify({ ...message, id: messageId }));
  });
};
```

## Performance Optimization

### Database Optimization

1. **Add Indexes** for frequently queried columns:
   ```sql
   -- Posts table indexes
   CREATE INDEX idx_posts_author_id ON posts(author_id);
   CREATE INDEX idx_posts_community_id ON posts(community_id);
   CREATE INDEX idx_posts_created_at ON posts(created_at);
   CREATE INDEX idx_posts_visibility ON posts(visibility);
   
   -- Resources table indexes
   CREATE INDEX idx_resources_subjects ON resources USING GIN(subjects);
   CREATE INDEX idx_resources_grade_levels ON resources USING GIN(grade_levels);
   CREATE INDEX idx_resources_verification_status ON resources(verification_status);
   ```

2. **Query Optimization**:
   ```javascript
   // Use LIMIT and OFFSET for pagination
   const getPaginatedPosts = async (page, limit) => {
     const offset = (page - 1) * limit;
     return await db.query(`
       SELECT * FROM posts 
       WHERE visibility = 'public' 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2
     `, [limit, offset]);
   };
   ```

### Caching Strategies

1. **Redis Caching** for frequently accessed data:
   ```javascript
   const getCachedData = async (key, fetchFunction, ttl = 3600) => {
     const cached = await redis.get(key);
     if (cached) {
       return JSON.parse(cached);
     }
     
     const data = await fetchFunction();
     await redis.setex(key, ttl, JSON.stringify(data));
     return data;
   };
   ```

2. **Application-level Caching**:
   ```javascript
   const cache = new Map();
   const getCachedResult = (key, computeFunction, ttl = 300000) => {
     const cached = cache.get(key);
     if (cached && Date.now() - cached.timestamp < ttl) {
       return cached.data;
     }
     
     const data = computeFunction();
     cache.set(key, { data, timestamp: Date.now() });
     return data;
   };
   ```

## Monitoring and Logging

### Health Checks

Implement comprehensive health checks:

```javascript
const healthCheck = async () => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    elasticsearch: await checkElasticsearch(),
    youtube: await checkYouTubeAPI(),
    storage: await checkStorage()
  };
  
  const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  };
};
```

### Error Tracking

Use structured logging for better debugging:

```javascript
const logger = require('winston');

const logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    level: 'error'
  });
};

// Usage
try {
  await uploadResource(resourceData);
} catch (error) {
  logError(error, {
    operation: 'resource_upload',
    userId: req.user.userId,
    resourceId: resourceData.id
  });
  throw error;
}
```

## Getting Help

If you continue to experience issues:

1. **Check the logs** for detailed error messages
2. **Review the API documentation** for correct usage
3. **Test with minimal examples** to isolate the problem
4. **Contact support** with:
   - Error messages and stack traces
   - Steps to reproduce the issue
   - Environment details (Node.js version, OS, etc.)
   - Relevant configuration settings (without sensitive data)

## Useful Commands

```bash
# Check application health
curl http://localhost:3001/api/health

# View recent logs
tail -f logs/combined.log

# Check database connection
npm run migrate:status

# Monitor memory usage
node --inspect server.js

# Run tests
npm test

# Check API documentation
open http://localhost:3001/api/docs
```