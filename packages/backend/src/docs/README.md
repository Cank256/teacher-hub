# Teacher Hub Platform API Documentation

## Overview

Welcome to the Teacher Hub Platform API documentation. This comprehensive guide covers all aspects of the enhanced platform features including post management, community creation, messaging systems, resource sharing with video integration, and administrative management.

## Quick Start

### Authentication

All API endpoints (except public ones) require authentication using JWT tokens:

```bash
# Login to get access token
POST /api/auth/login
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "your_password"
}

# Use token in subsequent requests
GET /api/posts/feed/user
Authorization: Bearer <your_jwt_token>
```

### Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.teacherhub.com`

### Interactive Documentation

Visit the interactive Swagger documentation at:
- **Development**: `http://localhost:3001/api/docs`
- **Production**: `https://api.teacherhub.com/api/docs`

## API Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (User, Admin)
- Secure password handling
- OAuth integration (Google)

### 📝 Post Management System
- Create, read, update, delete posts
- Rich media attachments
- Community-specific posting
- Like and comment functionality
- Advanced search and filtering
- Trending posts algorithm

**Key Endpoints:**
- `POST /api/posts` - Create new post
- `GET /api/posts/feed/user` - Get personalized feed
- `POST /api/posts/{id}/like` - Like/unlike posts
- `POST /api/posts/{id}/comments` - Add comments

### 👥 Community Management
- Create and manage educational communities
- Member management with roles (Owner, Moderator, Member)
- Approval workflows for private communities
- Community discovery and search
- Analytics for community owners

**Key Endpoints:**
- `POST /api/communities` - Create community
- `POST /api/communities/{id}/join` - Join community
- `GET /api/communities/{id}/members` - Get members
- `POST /api/communities/{id}/members/{memberId}/promote` - Promote member

### 💬 Enhanced Messaging System
- Real-time messaging with WebSocket support
- User search and discovery
- Conversation management
- Message threading and replies
- Read receipts and delivery status
- Offline message queuing

**Key Endpoints:**
- `GET /api/messages/conversations` - Get conversations
- `POST /api/messages/send` - Send message
- `GET /api/messages/users/search` - Search users
- `PUT /api/messages/conversations/{id}/read` - Mark as read

### 📚 Resource Sharing with Video Integration
- Secure file upload with virus scanning
- YouTube integration for video hosting
- Multiple file format support
- Resource categorization and tagging
- Download tracking and analytics
- Rating and review system

**Key Endpoints:**
- `POST /api/resources/upload` - Upload resource
- `GET /api/resources/search` - Search resources
- `GET /api/resources/{id}/download` - Download resource
- `GET /api/resources/{id}/youtube-status` - Check video status

### 🛡️ Administrative Management
- Content moderation tools
- User management and oversight
- Platform analytics and reporting
- Moderation queue management
- System health monitoring

**Key Endpoints:**
- `GET /api/admin/posts` - Get all posts for moderation
- `POST /api/admin/posts/{id}/moderate` - Moderate post
- `GET /api/admin/analytics/overview` - Platform analytics
- `GET /api/admin/moderation-queue` - Moderation queue

## Developer Guides

### 📖 Comprehensive Guides
- [YouTube Integration Guide](./guides/youtube-integration.md) - Complete setup and usage
- [Troubleshooting Guide](./guides/troubleshooting.md) - Common issues and solutions

### 🔧 Code Examples

#### Creating a Post with Media
```javascript
const formData = new FormData();
formData.append('title', 'My Teaching Strategy');
formData.append('content', 'Here\'s an innovative approach...');
formData.append('tags', JSON.stringify(['mathematics', 'elementary']));
formData.append('visibility', 'public');
formData.append('mediaFile', fileInput.files[0]);

const response = await fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### Searching Resources
```javascript
const searchResources = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters,
    page: 1,
    limit: 20
  });
  
  const response = await fetch(`/api/resources/search?${params}`);
  return await response.json();
};

// Usage
const results = await searchResources('fractions', {
  subjects: 'mathematics',
  gradeLevels: 'elementary',
  type: 'video'
});
```

#### Real-time Messaging
```javascript
const socket = io('ws://localhost:3001');

// Send message
const sendMessage = (recipientId, content) => {
  socket.emit('send_message', {
    recipientId,
    content,
    type: 'text'
  });
};

// Listen for messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
  updateUI(message);
});
```

## API Response Format

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title and content are required",
    "timestamp": "2024-01-15T10:30:00Z",
    "details": ["Title is required", "Content is required"]
  }
}
```

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **General endpoints**: 100 requests per minute per user
- **Upload endpoints**: 10 requests per minute per user
- **Search endpoints**: 50 requests per minute per user
- **Admin endpoints**: 200 requests per minute per admin

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Valid authentication token required |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | File type not supported |
| `SECURITY_SCAN_FAILED` | File failed security scanning |
| `YOUTUBE_UPLOAD_FAILED` | YouTube video upload failed |
| `QUOTA_EXCEEDED` | API quota limit exceeded |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Security

### Data Protection
- All sensitive data encrypted at rest
- HTTPS required for all API communications
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### File Security
- Virus scanning for all uploads
- File type validation
- Size limitations
- Secure storage with access controls
- Content safety scanning

### Privacy
- User data anonymization options
- GDPR compliance features
- Data retention policies
- Audit logging for sensitive operations

## Testing

### Test Environment
- **Base URL**: `http://localhost:3001`
- **Test Database**: Isolated test database
- **Mock Services**: YouTube API mocking available

### Sample Test Data
```bash
# Create test user
POST /api/auth/register
{
  "fullName": "Test Teacher",
  "email": "test@example.com",
  "password": "TestPassword123!",
  "subjects": ["mathematics"],
  "gradeLevels": ["elementary"]
}
```

## Support

### Getting Help
- **Documentation**: This comprehensive guide
- **Interactive API**: `/api/docs` endpoint
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: support@teacherhub.com

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## Changelog

### Version 1.0.0 (Current)
- ✅ Complete post management system
- ✅ Community creation and management
- ✅ Enhanced messaging with real-time features
- ✅ Resource sharing with YouTube integration
- ✅ Administrative management tools
- ✅ Comprehensive API documentation
- ✅ Security scanning and validation
- ✅ Performance optimization

### Upcoming Features
- 🔄 Advanced analytics dashboard
- 🔄 Mobile push notifications
- 🔄 Advanced search with AI
- 🔄 Content recommendation engine
- 🔄 Multi-language support

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0