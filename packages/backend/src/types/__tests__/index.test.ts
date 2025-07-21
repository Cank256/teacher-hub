import {
  TeacherProfile,
  Resource,
  Message,
  Community,
  GovernmentContent,
  Location,
  Credential,
  UserPreferences
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
});