# YouTube Integration Developer Guide

## Overview

The Teacher Hub platform integrates with YouTube API v3 to provide secure video hosting and sharing capabilities. This guide covers the setup, configuration, and usage of the YouTube integration features.

## Prerequisites

- Google Cloud Platform account
- YouTube Data API v3 enabled
- OAuth 2.0 credentials configured
- Valid YouTube channel for uploads

## Setup and Configuration

### 1. Google Cloud Platform Setup

1. **Create a new project** in Google Cloud Console
2. **Enable YouTube Data API v3**:
   - Navigate to APIs & Services > Library
   - Search for "YouTube Data API v3"
   - Click "Enable"

3. **Create OAuth 2.0 credentials**:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3001/api/resources/youtube/callback` (development)
     - `https://your-domain.com/api/resources/youtube/callback` (production)

### 2. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# YouTube API Configuration
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/resources/youtube/callback

# YouTube API Quotas
YOUTUBE_DAILY_QUOTA_LIMIT=10000
YOUTUBE_UPLOAD_QUOTA_COST=1600

# Video Processing
MAX_VIDEO_SIZE_MB=100
SUPPORTED_VIDEO_FORMATS=mp4,avi,mov,wmv,webm
```

### 3. Initial Authorization

Before the system can upload videos, an admin must authorize the application:

1. **Get authorization URL**:
   ```bash
   GET /api/resources/youtube/auth-url
   Authorization: Bearer <admin_token>
   ```

2. **Complete OAuth flow**:
   - Admin visits the returned URL
   - Grants permissions to the application
   - System receives authorization code

3. **Exchange code for tokens**:
   ```bash
   POST /api/resources/youtube/callback
   Authorization: Bearer <admin_token>
   Content-Type: application/json
   
   {
     "code": "authorization_code_from_callback"
   }
   ```

## API Usage

### Video Upload Process

The video upload process is automatic when users upload video files:

1. **User uploads video file**:
   ```bash
   POST /api/resources/upload
   Authorization: Bearer <user_token>
   Content-Type: multipart/form-data
   
   file: video_file.mp4
   title: "Teaching Fractions with Visual Models"
   description: "Educational video demonstrating fraction concepts"
   subjects: ["mathematics"]
   gradeLevels: ["elementary"]
   ```

2. **System processes upload**:
   - File security scanning
   - Video validation
   - YouTube upload (unlisted)
   - Database record creation

3. **Monitor upload status**:
   ```bash
   GET /api/resources/{resourceId}/youtube-status
   Authorization: Bearer <user_token>
   ```

### Video Status Monitoring

YouTube video uploads go through several stages:

```javascript
// Upload status values
const uploadStatuses = {
  'uploading': 'Video is being uploaded to YouTube',
  'processing': 'YouTube is processing the video',
  'completed': 'Video is ready for viewing',
  'failed': 'Upload or processing failed'
};
```

Example status response:
```json
{
  "message": "YouTube video status retrieved",
  "video": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "uploadStatus": "completed",
    "metadata": {
      "title": "Teaching Fractions with Visual Models",
      "description": "Educational video...",
      "duration": 900,
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
      "privacy": "unlisted"
    },
    "uploadedAt": "2024-01-15T10:30:00Z",
    "currentStatus": {
      "uploadStatus": "processed",
      "processingProgress": {
        "partsTotal": 1,
        "partsProcessed": 1,
        "timeLeftMs": 0
      }
    }
  }
}
```

## Security Considerations

### Video Privacy Settings

All uploaded videos are set to **unlisted** for security:
- Videos are not searchable on YouTube
- Only users with the direct link can view
- Videos are embedded within the Teacher Hub application
- No public YouTube exposure

### Access Control

- Only authenticated users can upload videos
- Video access is controlled by resource permissions
- Admin oversight for all video content
- Automatic content scanning before upload

### Quota Management

YouTube API has daily quotas that must be managed:

```javascript
// Quota costs for common operations
const quotaCosts = {
  'video.insert': 1600,      // Upload video
  'video.list': 1,           // Get video details
  'video.update': 50,        // Update video metadata
  'video.delete': 50         // Delete video
};
```

Monitor quota usage:
```bash
GET /api/resources/analytics/overview
Authorization: Bearer <admin_token>
```

## Error Handling

### Common Error Scenarios

1. **Quota Exceeded**:
   ```json
   {
     "error": {
       "code": "YOUTUBE_QUOTA_EXCEEDED",
       "message": "Daily YouTube API quota exceeded",
       "timestamp": "2024-01-15T10:30:00Z"
     }
   }
   ```

2. **Upload Failed**:
   ```json
   {
     "error": {
       "code": "YOUTUBE_UPLOAD_FAILED",
       "message": "Video upload to YouTube failed: Invalid video format",
       "timestamp": "2024-01-15T10:30:00Z"
     }
   }
   ```

3. **Authentication Error**:
   ```json
   {
     "error": {
       "code": "YOUTUBE_AUTH_ERROR",
       "message": "YouTube API authentication failed. Admin re-authorization required.",
       "timestamp": "2024-01-15T10:30:00Z"
     }
   }
   ```

### Error Recovery

1. **Token Refresh**: System automatically refreshes expired tokens
2. **Retry Logic**: Failed uploads are retried with exponential backoff
3. **Fallback Storage**: Videos are stored locally if YouTube upload fails
4. **Admin Notifications**: Critical errors trigger admin notifications

## Best Practices

### Video Optimization

1. **File Size**: Keep videos under 100MB for faster uploads
2. **Format**: Use MP4 with H.264 encoding for best compatibility
3. **Resolution**: 720p or 1080p for educational content
4. **Duration**: Limit to 30 minutes for better user experience

### Metadata Management

```javascript
// Recommended metadata structure
const videoMetadata = {
  title: "Clear, descriptive title (max 100 characters)",
  description: `
    Detailed description including:
    - Learning objectives
    - Grade level
    - Subject area
    - Duration
    - Prerequisites
  `,
  tags: ["education", "mathematics", "elementary"],
  categoryId: "27", // Education category
  defaultLanguage: "en"
};
```

### Performance Optimization

1. **Async Processing**: Video uploads are processed asynchronously
2. **Progress Tracking**: Provide upload progress feedback to users
3. **Thumbnail Generation**: Automatic thumbnail creation for previews
4. **CDN Integration**: Use CDN for thumbnail and preview delivery

## Testing

### Development Testing

1. **Mock YouTube API** for unit tests:
   ```javascript
   // Mock YouTube service for testing
   const mockYouTubeService = {
     uploadVideo: jest.fn().mockResolvedValue('mock_video_id'),
     getVideoStatus: jest.fn().mockResolvedValue({ uploadStatus: 'completed' }),
     deleteVideo: jest.fn().mockResolvedValue(true)
   };
   ```

2. **Integration Testing**:
   - Use test YouTube channel
   - Verify upload/delete cycles
   - Test quota management
   - Validate error handling

### Production Monitoring

1. **Health Checks**:
   ```bash
   GET /api/resources/youtube/health
   ```

2. **Quota Monitoring**:
   - Daily quota usage alerts
   - Automatic quota reset tracking
   - Usage pattern analysis

3. **Error Tracking**:
   - Failed upload monitoring
   - Authentication error alerts
   - Performance metrics

## Troubleshooting

See the [Troubleshooting Guide](./troubleshooting.md) for common issues and solutions.

## API Reference

For complete API documentation, see the [Swagger Documentation](../swagger.json) or visit `/api/docs` when the server is running.