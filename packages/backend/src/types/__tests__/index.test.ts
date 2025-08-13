import {
  TeacherProfile,
  Resource,
  Message,
  Community,
  GovernmentContent,
  Location,
  Credential,
  UserPreferences,
  Post,
  PostComment,
  PostLike,
  EnhancedCommunity,
  EnhancedCommunityMembership,
  EnhancedMessage,
  Conversation,
  EnhancedResource,
  YouTubeVideo,
  AdminAction,
  ModerationQueue,
  PlatformAnalytics
} from '../index';

describe('Type Definitions', () => {
  describe('Location Interface', () => {
    it('should have required district and region fields', () => {
      const location: Location = {
        district: 'Kampala',
        region: 'Central'
      };

      expect(location.district).toBe('Kampala');
      expect(location.region).toBe('Central');
    });

    it('should allow optional coordinates', () => {
      const location: Location = {
        district: 'Kampala',
        region: 'Central',
        coordinates: {
          latitude: 0.3476,
          longitude: 32.5825
        }
      };

      expect(location.coordinates?.latitude).toBe(0.3476);
      expect(location.coordinates?.longitude).toBe(32.5825);
    });
  });

  describe('Credential Interface', () => {
    it('should have all required fields', () => {
      const credential: Credential = {
        id: 'cred-123',
        type: 'teaching_license',
        institution: 'Makerere University',
        issueDate: new Date('2020-01-01'),
        documentUrl: 'https://example.com/doc.pdf',
        verificationStatus: 'verified'
      };

      expect(credential.type).toBe('teaching_license');
      expect(credential.verificationStatus).toBe('verified');
    });

    it('should allow optional expiry date', () => {
      const credential: Credential = {
        id: 'cred-123',
        type: 'certification',
        institution: 'UNEB',
        issueDate: new Date('2020-01-01'),
        expiryDate: new Date('2025-01-01'),
        documentUrl: 'https://example.com/doc.pdf',
        verificationStatus: 'pending'
      };

      expect(credential.expiryDate).toBeInstanceOf(Date);
    });
  });

  describe('TeacherProfile Interface', () => {
    it('should have all required fields', () => {
      const profile: TeacherProfile = {
        id: 'user-123',
        email: 'teacher@example.com',
        passwordHash: 'hashed-password',
        fullName: 'John Doe',
        subjects: ['Mathematics', 'Physics'],
        gradeLevels: ['S1', 'S2', 'S3'],
        schoolLocation: {
          district: 'Kampala',
          region: 'Central'
        },
        yearsExperience: 5,
        verificationStatus: 'verified',
        credentials: [],
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            showLocation: true,
            showExperience: true
          },
          contentFilters: {
            subjects: ['Mathematics'],
            gradeLevels: ['S1'],
            contentTypes: ['video', 'document']
          }
        },
        authProvider: 'local',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(profile.subjects).toContain('Mathematics');
      expect(profile.verificationStatus).toBe('verified');
      expect(profile.preferences.language).toBe('en');
    });
  });

  describe('Resource Interface', () => {
    it('should have all required fields', () => {
      const resource: Resource = {
        id: 'resource-123',
        title: 'Algebra Basics',
        description: 'Introduction to algebra',
        type: 'video',
        format: 'mp4',
        size: 1024000,
        url: 'https://example.com/video.mp4',
        subjects: ['Mathematics'],
        gradeLevels: ['S1'],
        curriculumAlignment: ['NCDC-MATH-S1-01'],
        authorId: 'user-123',
        isGovernmentContent: false,
        verificationStatus: 'verified',
        downloadCount: 100,
        rating: 4.5,
        ratingCount: 20,
        tags: ['algebra', 'basics'],
        attachments: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(resource.type).toBe('video');
      expect(resource.rating).toBe(4.5);
      expect(resource.tags).toContain('algebra');
    });
  });

  describe('Message Interface', () => {
    it('should have all required fields', () => {
      const message: Message = {
        id: 'msg-123',
        senderId: 'user-123',
        content: 'Hello, how are you?',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      expect(message.type).toBe('text');
      expect(message.syncStatus).toBe('synced');
      expect(message.isEdited).toBe(false);
    });

    it('should allow optional recipient or group ID', () => {
      const directMessage: Message = {
        id: 'msg-123',
        senderId: 'user-123',
        recipientId: 'user-456',
        content: 'Direct message',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      const groupMessage: Message = {
        id: 'msg-124',
        senderId: 'user-123',
        groupId: 'group-789',
        content: 'Group message',
        type: 'text',
        attachments: [],
        timestamp: new Date(),
        readBy: [],
        syncStatus: 'synced',
        isEdited: false
      };

      expect(directMessage.recipientId).toBe('user-456');
      expect(groupMessage.groupId).toBe('group-789');
    });
  });

  describe('Community Interface', () => {
    it('should have all required fields', () => {
      const community: Community = {
        id: 'community-123',
        name: 'Mathematics Teachers',
        description: 'Community for math teachers',
        type: 'subject',
        members: ['user-123', 'user-456'],
        moderators: ['user-123'],
        isPrivate: false,
        rules: ['Be respectful', 'Stay on topic'],
        memberCount: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(community.type).toBe('subject');
      expect(community.members).toHaveLength(2);
      expect(community.rules).toContain('Be respectful');
    });
  });

  describe('GovernmentContent Interface', () => {
    it('should have all required fields', () => {
      const content: GovernmentContent = {
        id: 'gov-123',
        source: 'MOE',
        contentType: 'curriculum',
        title: 'New Mathematics Curriculum',
        content: 'Updated curriculum for mathematics',
        attachments: [],
        targetAudience: ['mathematics-teachers'],
        priority: 'high',
        effectiveDate: new Date('2024-01-01'),
        digitalSignature: 'signature-hash',
        verificationHash: 'verification-hash',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(content.source).toBe('MOE');
      expect(content.contentType).toBe('curriculum');
      expect(content.priority).toBe('high');
    });

    it('should allow optional expiry date', () => {
      const content: GovernmentContent = {
        id: 'gov-124',
        source: 'UNEB',
        contentType: 'announcement',
        title: 'Exam Schedule',
        content: 'Updated exam schedule',
        attachments: [],
        targetAudience: ['all-teachers'],
        priority: 'medium',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        digitalSignature: 'signature-hash',
        verificationHash: 'verification-hash',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(content.expiryDate).toBeInstanceOf(Date);
    });
  });

  describe('Post Interface', () => {
    it('should have all required fields', () => {
      const post: Post = {
        id: 'post-123',
        authorId: 'user-123',
        title: 'My First Post',
        content: 'This is the content of my post',
        mediaAttachments: [],
        tags: ['education', 'mathematics'],
        visibility: 'public',
        likeCount: 5,
        commentCount: 2,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(post.title).toBe('My First Post');
      expect(post.visibility).toBe('public');
      expect(post.tags).toContain('education');
    });

    it('should allow optional community ID', () => {
      const post: Post = {
        id: 'post-123',
        authorId: 'user-123',
        communityId: 'community-456',
        title: 'Community Post',
        content: 'This is a community post',
        mediaAttachments: [],
        tags: [],
        visibility: 'community',
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(post.communityId).toBe('community-456');
      expect(post.visibility).toBe('community');
    });
  });

  describe('PostComment Interface', () => {
    it('should have all required fields', () => {
      const comment: PostComment = {
        id: 'comment-123',
        postId: 'post-123',
        authorId: 'user-456',
        content: 'Great post!',
        likeCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(comment.postId).toBe('post-123');
      expect(comment.content).toBe('Great post!');
    });

    it('should allow optional parent comment ID for nested replies', () => {
      const reply: PostComment = {
        id: 'comment-124',
        postId: 'post-123',
        authorId: 'user-789',
        parentCommentId: 'comment-123',
        content: 'I agree!',
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(reply.parentCommentId).toBe('comment-123');
    });
  });

  describe('PostLike Interface', () => {
    it('should have all required fields', () => {
      const like: PostLike = {
        id: 'like-123',
        postId: 'post-123',
        userId: 'user-456',
        createdAt: new Date()
      };

      expect(like.postId).toBe('post-123');
      expect(like.userId).toBe('user-456');
    });
  });

  describe('EnhancedCommunity Interface', () => {
    it('should have all required fields including owner and enhanced features', () => {
      const community: EnhancedCommunity = {
        id: 'community-123',
        name: 'Advanced Mathematics',
        description: 'Community for advanced math topics',
        type: 'subject',
        ownerId: 'user-123',
        moderators: ['user-456'],
        isPrivate: false,
        requiresApproval: true,
        rules: [
          { id: 'rule-1', title: 'Be Respectful', description: 'Treat all members with respect', order: 1 },
          { id: 'rule-2', title: 'Stay On Topic', description: 'Keep discussions relevant to mathematics', order: 2 }
        ],
        memberCount: 50,
        postCount: 25,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(community.ownerId).toBe('user-123');
      expect(community.requiresApproval).toBe(true);
      expect(community.rules).toHaveLength(2);
      expect(community.postCount).toBe(25);
    });
  });

  describe('EnhancedCommunityMembership Interface', () => {
    it('should have all required fields including status and permissions', () => {
      const membership: EnhancedCommunityMembership = {
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-456',
        role: 'moderator',
        status: 'active',
        joinedAt: new Date(),
        permissions: [
          { action: 'post', granted: true },
          { action: 'moderate', granted: true },
          { action: 'manage_members', granted: false }
        ]
      };

      expect(membership.role).toBe('moderator');
      expect(membership.status).toBe('active');
      expect(membership.permissions).toHaveLength(3);
    });
  });

  describe('Conversation Interface', () => {
    it('should have all required fields', () => {
      const conversation: Conversation = {
        id: 'conv-123',
        participants: ['user-123', 'user-456'],
        type: 'direct',
        lastActivity: new Date(),
        unreadCount: { 'user-123': 0, 'user-456': 2 }
      };

      expect(conversation.type).toBe('direct');
      expect(conversation.participants).toHaveLength(2);
      expect(conversation.unreadCount['user-456']).toBe(2);
    });
  });

  describe('EnhancedResource Interface', () => {
    it('should have all required fields including video and security features', () => {
      const resource: EnhancedResource = {
        id: 'resource-123',
        title: 'Calculus Tutorial Video',
        description: 'Introduction to calculus concepts',
        type: 'video',
        format: 'mp4',
        size: 50000000,
        url: 'https://example.com/video.mp4',
        subjects: ['Mathematics'],
        gradeLevels: ['S4', 'S5', 'S6'],
        curriculumAlignment: ['NCDC-MATH-S4-01'],
        authorId: 'user-123',
        isGovernmentContent: false,
        verificationStatus: 'verified',
        downloadCount: 150,
        rating: 4.8,
        ratingCount: 25,
        tags: ['calculus', 'tutorial', 'video'],
        attachments: [],
        youtubeVideoId: 'abc123xyz',
        securityScanStatus: 'passed',
        securityScanResults: {
          virusFound: false,
          malwareFound: false,
          suspiciousContent: false,
          scanDetails: 'Clean scan completed',
          scannedAt: new Date()
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(resource.youtubeVideoId).toBe('abc123xyz');
      expect(resource.securityScanStatus).toBe('passed');
      expect(resource.securityScanResults?.virusFound).toBe(false);
    });
  });

  describe('YouTubeVideo Interface', () => {
    it('should have all required fields', () => {
      const video: YouTubeVideo = {
        id: 'yt-123',
        resourceId: 'resource-123',
        youtubeVideoId: 'abc123xyz',
        uploadStatus: 'completed',
        metadata: {
          title: 'Calculus Tutorial',
          description: 'Learn calculus basics',
          duration: 1800,
          thumbnailUrl: 'https://img.youtube.com/vi/abc123xyz/maxresdefault.jpg',
          privacy: 'unlisted'
        },
        uploadedAt: new Date()
      };

      expect(video.uploadStatus).toBe('completed');
      expect(video.metadata.privacy).toBe('unlisted');
      expect(video.metadata.duration).toBe(1800);
    });
  });

  describe('AdminAction Interface', () => {
    it('should have all required fields', () => {
      const action: AdminAction = {
        id: 'action-123',
        adminId: 'admin-123',
        action: 'approve_post',
        targetType: 'post',
        targetId: 'post-123',
        reason: 'Content meets community guidelines',
        timestamp: new Date()
      };

      expect(action.action).toBe('approve_post');
      expect(action.targetType).toBe('post');
      expect(action.reason).toBe('Content meets community guidelines');
    });

    it('should allow optional details field', () => {
      const action: AdminAction = {
        id: 'action-124',
        adminId: 'admin-123',
        action: 'delete_post',
        targetType: 'post',
        targetId: 'post-456',
        reason: 'Violates community guidelines',
        details: { violationType: 'spam', severity: 'high' },
        timestamp: new Date()
      };

      expect(action.details).toEqual({ violationType: 'spam', severity: 'high' });
    });
  });

  describe('ModerationQueue Interface', () => {
    it('should have all required fields', () => {
      const queueItem: ModerationQueue = {
        id: 'queue-123',
        itemType: 'post',
        itemId: 'post-123',
        reportReason: 'Inappropriate content',
        reportedBy: 'user-456',
        status: 'pending',
        createdAt: new Date()
      };

      expect(queueItem.itemType).toBe('post');
      expect(queueItem.status).toBe('pending');
      expect(queueItem.reportReason).toBe('Inappropriate content');
    });

    it('should allow optional assignment and resolution fields', () => {
      const queueItem: ModerationQueue = {
        id: 'queue-124',
        itemType: 'comment',
        itemId: 'comment-123',
        reportReason: 'Spam',
        reportedBy: 'user-789',
        status: 'resolved',
        assignedTo: 'admin-123',
        createdAt: new Date(),
        resolvedAt: new Date()
      };

      expect(queueItem.assignedTo).toBe('admin-123');
      expect(queueItem.resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('PlatformAnalytics Interface', () => {
    it('should have all required fields', () => {
      const analytics: PlatformAnalytics = {
        totalUsers: 1000,
        activeUsers: 750,
        totalPosts: 500,
        totalCommunities: 25,
        totalResources: 200,
        totalMessages: 1500,
        dailyActiveUsers: 150,
        weeklyActiveUsers: 400,
        monthlyActiveUsers: 650
      };

      expect(analytics.totalUsers).toBe(1000);
      expect(analytics.activeUsers).toBe(750);
      expect(analytics.dailyActiveUsers).toBe(150);
    });
  });
});