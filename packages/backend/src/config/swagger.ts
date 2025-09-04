import swaggerJSDoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Teacher Hub Platform API',
    version: '1.0.0',
    description: `
      Comprehensive API documentation for the Teacher Hub Platform with enhanced features including:
      - Post Management System
      - Community Creation and Management
      - Enhanced Messaging System
      - Resource Sharing with Video Integration
      - Administrative Management System
      
      This API provides secure, scalable endpoints for educational content sharing and community building.
    `,
    contact: {
      name: 'Teacher Hub Support',
      email: 'support@teacherhub.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.teacherhub.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from authentication endpoints'
      }
    },
    schemas: {
      // Error Response Schema
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code for programmatic handling'
              },
              message: {
                type: 'string',
                description: 'Human-readable error message'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'ISO timestamp of when the error occurred'
              },
              details: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Additional error details (validation errors, etc.)'
              }
            },
            required: ['code', 'message', 'timestamp']
          }
        }
      },
      
      // Pagination Schema
      PaginationResponse: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Number of items per page'
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of items'
          },
          totalPages: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of pages'
          },
          hasNext: {
            type: 'boolean',
            description: 'Whether there are more pages'
          },
          hasPrev: {
            type: 'boolean',
            description: 'Whether there are previous pages'
          }
        }
      },

      // User Schema
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier'
          },
          fullName: {
            type: 'string',
            description: 'User\'s full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User\'s email address'
          },
          profileImageUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'URL to user\'s profile image'
          },
          subjects: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Subjects the user teaches'
          },
          verificationStatus: {
            type: 'string',
            enum: ['pending', 'verified', 'rejected'],
            description: 'User verification status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          }
        }
      },

      // Post Schema
      Post: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique post identifier'
          },
          authorId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the post author'
          },
          author: {
            $ref: '#/components/schemas/User'
          },
          communityId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of the community this post belongs to'
          },
          title: {
            type: 'string',
            maxLength: 200,
            description: 'Post title'
          },
          content: {
            type: 'string',
            description: 'Post content (supports markdown)'
          },
          mediaAttachments: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/MediaAttachment'
            },
            description: 'Media files attached to the post'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Tags associated with the post'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'community', 'followers'],
            description: 'Post visibility level'
          },
          likeCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of likes on the post'
          },
          commentCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of comments on the post'
          },
          isPinned: {
            type: 'boolean',
            description: 'Whether the post is pinned'
          },
          isLikedByViewer: {
            type: 'boolean',
            description: 'Whether the current user has liked this post'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Post creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Post last update timestamp'
          }
        }
      },

      // Media Attachment Schema
      MediaAttachment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique attachment identifier'
          },
          type: {
            type: 'string',
            enum: ['image', 'video', 'document'],
            description: 'Type of media attachment'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to access the media file'
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'URL to thumbnail image'
          },
          filename: {
            type: 'string',
            description: 'Original filename'
          },
          size: {
            type: 'integer',
            minimum: 0,
            description: 'File size in bytes'
          }
        }
      },

      // Post Comment Schema
      PostComment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique comment identifier'
          },
          postId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the post this comment belongs to'
          },
          authorId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the comment author'
          },
          author: {
            $ref: '#/components/schemas/User'
          },
          parentCommentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of parent comment for nested replies'
          },
          content: {
            type: 'string',
            description: 'Comment content'
          },
          likeCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of likes on the comment'
          },
          replies: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/PostComment'
            },
            description: 'Nested replies to this comment'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Comment creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Comment last update timestamp'
          }
        }
      },

      // Community Schema
      Community: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique community identifier'
          },
          name: {
            type: 'string',
            maxLength: 100,
            description: 'Community name'
          },
          description: {
            type: 'string',
            maxLength: 1000,
            description: 'Community description'
          },
          type: {
            type: 'string',
            enum: ['subject', 'region', 'grade', 'general'],
            description: 'Type of community'
          },
          ownerId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the community owner'
          },
          owner: {
            $ref: '#/components/schemas/User'
          },
          moderators: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of moderator user IDs'
          },
          isPrivate: {
            type: 'boolean',
            description: 'Whether the community is private'
          },
          requiresApproval: {
            type: 'boolean',
            description: 'Whether membership requires approval'
          },
          rules: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CommunityRule'
            },
            description: 'Community rules and guidelines'
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Community image URL'
          },
          memberCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of community members'
          },
          postCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of posts in the community'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the community is active'
          },
          userMembership: {
            $ref: '#/components/schemas/CommunityMembership',
            nullable: true,
            description: 'Current user\'s membership status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Community creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Community last update timestamp'
          }
        }
      },

      // Community Rule Schema
      CommunityRule: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique rule identifier'
          },
          title: {
            type: 'string',
            maxLength: 100,
            description: 'Rule title'
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Rule description'
          },
          order: {
            type: 'integer',
            minimum: 1,
            description: 'Rule display order'
          }
        }
      },

      // Community Membership Schema
      CommunityMembership: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique membership identifier'
          },
          communityId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the community'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the user'
          },
          user: {
            $ref: '#/components/schemas/User'
          },
          role: {
            type: 'string',
            enum: ['member', 'moderator', 'owner'],
            description: 'User\'s role in the community'
          },
          status: {
            type: 'string',
            enum: ['active', 'pending', 'banned'],
            description: 'Membership status'
          },
          joinedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Membership creation timestamp'
          },
          permissions: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CommunityPermission'
            },
            description: 'User permissions in the community'
          }
        }
      },

      // Community Permission Schema
      CommunityPermission: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['post', 'comment', 'moderate', 'invite', 'manage_members'],
            description: 'Permission action'
          },
          granted: {
            type: 'boolean',
            description: 'Whether the permission is granted'
          }
        }
      },

      // Message Schema
      Message: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique message identifier'
          },
          senderId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the message sender'
          },
          sender: {
            $ref: '#/components/schemas/User'
          },
          recipientId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of the message recipient (for direct messages)'
          },
          groupId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of the group (for group messages)'
          },
          content: {
            type: 'string',
            description: 'Message content'
          },
          type: {
            type: 'string',
            enum: ['text', 'file', 'image'],
            description: 'Type of message'
          },
          attachments: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Attachment'
            },
            description: 'File attachments'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Message timestamp'
          },
          readBy: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/MessageRead'
            },
            description: 'Read status by recipients'
          },
          syncStatus: {
            type: 'string',
            enum: ['synced', 'pending', 'failed'],
            description: 'Message synchronization status'
          },
          isEdited: {
            type: 'boolean',
            description: 'Whether the message has been edited'
          },
          editedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Message edit timestamp'
          },
          replyToId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of the message this is replying to'
          }
        }
      },

      // Message Read Schema
      MessageRead: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the user who read the message'
          },
          readAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the message was read'
          }
        }
      },

      // Conversation Schema
      Conversation: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique conversation identifier'
          },
          participants: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of participant user IDs'
          },
          participantDetails: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User'
            },
            description: 'Detailed information about participants'
          },
          type: {
            type: 'string',
            enum: ['direct', 'group'],
            description: 'Type of conversation'
          },
          lastMessage: {
            $ref: '#/components/schemas/Message',
            nullable: true,
            description: 'Last message in the conversation'
          },
          lastActivity: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of last activity'
          },
          unreadCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of unread messages for current user'
          }
        }
      },

      // Resource Schema
      Resource: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique resource identifier'
          },
          title: {
            type: 'string',
            maxLength: 200,
            description: 'Resource title'
          },
          description: {
            type: 'string',
            maxLength: 2000,
            description: 'Resource description'
          },
          type: {
            type: 'string',
            enum: ['video', 'image', 'document', 'text'],
            description: 'Type of resource'
          },
          format: {
            type: 'string',
            description: 'File format (e.g., pdf, mp4, jpg)'
          },
          size: {
            type: 'integer',
            minimum: 0,
            description: 'File size in bytes'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to access the resource'
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'URL to resource thumbnail'
          },
          subjects: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Subjects this resource relates to'
          },
          gradeLevels: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Grade levels this resource is suitable for'
          },
          curriculumAlignment: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Curriculum standards this resource aligns with'
          },
          authorId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the resource author'
          },
          author: {
            $ref: '#/components/schemas/User'
          },
          isGovernmentContent: {
            type: 'boolean',
            description: 'Whether this is official government content'
          },
          verificationStatus: {
            type: 'string',
            enum: ['verified', 'pending', 'flagged'],
            description: 'Resource verification status'
          },
          downloadCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of times this resource has been downloaded'
          },
          rating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Average rating of the resource'
          },
          ratingCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of ratings'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Tags associated with the resource'
          },
          attachments: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Attachment'
            },
            description: 'Additional file attachments'
          },
          youtubeVideoId: {
            type: 'string',
            nullable: true,
            description: 'YouTube video ID if this is a video resource'
          },
          securityScanStatus: {
            type: 'string',
            enum: ['pending', 'passed', 'failed'],
            description: 'Security scan status'
          },
          securityScanResults: {
            $ref: '#/components/schemas/SecurityScanResult',
            nullable: true,
            description: 'Results of security scanning'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the resource is active and available'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Resource creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Resource last update timestamp'
          }
        }
      },

      // Security Scan Result Schema
      SecurityScanResult: {
        type: 'object',
        properties: {
          virusFound: {
            type: 'boolean',
            description: 'Whether a virus was found'
          },
          malwareFound: {
            type: 'boolean',
            description: 'Whether malware was found'
          },
          suspiciousContent: {
            type: 'boolean',
            description: 'Whether suspicious content was detected'
          },
          scanDetails: {
            type: 'string',
            description: 'Detailed scan results'
          },
          scannedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the scan was performed'
          }
        }
      },

      // YouTube Video Schema
      YouTubeVideo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique YouTube video record identifier'
          },
          resourceId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the associated resource'
          },
          youtubeVideoId: {
            type: 'string',
            description: 'YouTube video ID'
          },
          uploadStatus: {
            type: 'string',
            enum: ['uploading', 'processing', 'completed', 'failed'],
            description: 'Upload status on YouTube'
          },
          metadata: {
            $ref: '#/components/schemas/YouTubeVideoMetadata'
          },
          uploadedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp'
          }
        }
      },

      // YouTube Video Metadata Schema
      YouTubeVideoMetadata: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Video title on YouTube'
          },
          description: {
            type: 'string',
            description: 'Video description on YouTube'
          },
          duration: {
            type: 'integer',
            minimum: 0,
            description: 'Video duration in seconds'
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            description: 'YouTube thumbnail URL'
          },
          privacy: {
            type: 'string',
            enum: ['unlisted'],
            description: 'Video privacy setting (always unlisted for security)'
          }
        }
      },

      // Attachment Schema
      Attachment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique attachment identifier'
          },
          filename: {
            type: 'string',
            description: 'Original filename'
          },
          mimeType: {
            type: 'string',
            description: 'MIME type of the file'
          },
          size: {
            type: 'integer',
            minimum: 0,
            description: 'File size in bytes'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to access the file'
          },
          uploadedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp'
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/docs/api/*.yaml',
    './src/docs/api/*.yml'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;