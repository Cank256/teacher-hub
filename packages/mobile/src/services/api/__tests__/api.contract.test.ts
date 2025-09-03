import { 
  ContractTester, 
  createContractTest,
  UserSchema,
  PostSchema,
  CommunitySchema,
  MessageSchema,
  ResourceSchema,
  generateMockUser,
  generateMockPost,
  generateMockPaginatedResponse
} from '../../../test/contractUtils';
import { ApiClient } from '../apiClient';

describe('API Contract Tests', () => {
  describe('Authentication Endpoints', () => {
    it('should validate login response contract', createContractTest(
      'login response',
      async (tester: ContractTester) => {
        const mockUser = generateMockUser();
        const mockResponse = {
          user: mockUser,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'refresh_token_here',
          expiresIn: 3600,
        };

        tester.mockLogin('teacher@example.com', 'password123', mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/auth/login', {
          email: 'teacher@example.com',
          password: 'password123',
        });

        // Validate user schema
        tester.validateResponse(UserSchema, response.data.user);
        
        // Validate response structure
        expect(response.data).toHaveProperty('token');
        expect(response.data).toHaveProperty('refreshToken');
        expect(response.data).toHaveProperty('expiresIn');
        expect(typeof response.data.token).toBe('string');
        expect(typeof response.data.refreshToken).toBe('string');
        expect(typeof response.data.expiresIn).toBe('number');
      }
    ));

    it('should validate Google OAuth response contract', createContractTest(
      'google oauth response',
      async (tester: ContractTester) => {
        const mockUser = generateMockUser();
        const mockResponse = {
          user: mockUser,
          token: 'google_jwt_token_here',
          refreshToken: 'google_refresh_token_here',
          expiresIn: 3600,
        };

        tester.mockGoogleAuth('google_id_token', mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/auth/google', {
          idToken: 'google_id_token',
        });

        tester.validateResponse(UserSchema, response.data.user);
        expect(response.data).toHaveProperty('token');
        expect(response.data).toHaveProperty('refreshToken');
      }
    ));

    it('should validate token refresh response contract', createContractTest(
      'token refresh response',
      async (tester: ContractTester) => {
        const mockResponse = {
          token: 'new_jwt_token_here',
          refreshToken: 'new_refresh_token_here',
          expiresIn: 3600,
        };

        tester.mockRefreshToken('old_refresh_token', mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/auth/refresh', {
          refreshToken: 'old_refresh_token',
        });

        expect(response.data).toHaveProperty('token');
        expect(response.data).toHaveProperty('refreshToken');
        expect(response.data).toHaveProperty('expiresIn');
        expect(typeof response.data.token).toBe('string');
        expect(typeof response.data.refreshToken).toBe('string');
        expect(typeof response.data.expiresIn).toBe('number');
      }
    ));

    it('should validate authentication error response contract', createContractTest(
      'auth error response',
      async (tester: ContractTester) => {
        const mockError = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
          timestamp: new Date().toISOString(),
          path: '/auth/login',
        };

        tester.mockError('POST', '/auth/login', 401, mockError);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        
        try {
          await apiClient.post('/auth/login', {
            email: 'invalid@example.com',
            password: 'wrongpassword',
          });
        } catch (error: any) {
          tester.validateErrorResponse(error.response.data);
        }
      }
    ));
  });

  describe('Posts Endpoints', () => {
    it('should validate get posts response contract', createContractTest(
      'get posts response',
      async (tester: ContractTester) => {
        const mockPosts = Array.from({ length: 10 }, () => generateMockPost());
        const mockResponse = generateMockPaginatedResponse(mockPosts);

        tester.mockGetPosts({ page: 1, limit: 10 }, mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/posts', {
          params: { page: 1, limit: 10 },
        });

        tester.validatePaginatedResponse(PostSchema, response.data);
      }
    ));

    it('should validate create post response contract', createContractTest(
      'create post response',
      async (tester: ContractTester) => {
        const mockPost = generateMockPost();
        const postData = {
          title: 'New Post',
          content: 'This is a new post content',
          categoryId: 'lesson-plan',
        };

        tester.mockCreatePost(postData, mockPost);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/posts', postData);

        tester.validateResponse(PostSchema, response.data);
      }
    ));

    it('should validate update post response contract', createContractTest(
      'update post response',
      async (tester: ContractTester) => {
        const mockPost = generateMockPost({ title: 'Updated Post Title' });
        const updateData = { title: 'Updated Post Title' };

        tester.mockUpdatePost('post-123', updateData, mockPost);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.put('/posts/post-123', updateData);

        tester.validateResponse(PostSchema, response.data);
      }
    ));

    it('should validate delete post response contract', createContractTest(
      'delete post response',
      async (tester: ContractTester) => {
        tester.mockDeletePost('post-123');

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.delete('/posts/post-123');

        expect(response.status).toBe(204);
      }
    ));
  });

  describe('Communities Endpoints', () => {
    it('should validate get communities response contract', createContractTest(
      'get communities response',
      async (tester: ContractTester) => {
        const mockCommunities = Array.from({ length: 5 }, () => ({
          id: 'community-123',
          name: 'Mathematics Teachers',
          description: 'A community for mathematics teachers',
          category: { id: 'subject', name: 'Subject-based' },
          memberCount: 150,
          isPublic: true,
          isJoined: false,
          moderators: [generateMockUser()],
          createdAt: new Date().toISOString(),
        }));

        const mockResponse = generateMockPaginatedResponse(mockCommunities);

        tester.mockGetCommunities({ category: 'subject' }, mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/communities', {
          params: { category: 'subject' },
        });

        tester.validatePaginatedResponse(CommunitySchema, response.data);
      }
    ));

    it('should validate join community response contract', createContractTest(
      'join community response',
      async (tester: ContractTester) => {
        tester.mockJoinCommunity('community-123');

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/communities/community-123/join');

        expect(response.data).toHaveProperty('success', true);
      }
    ));

    it('should validate leave community response contract', createContractTest(
      'leave community response',
      async (tester: ContractTester) => {
        tester.mockLeaveCommunity('community-123');

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/communities/community-123/leave');

        expect(response.data).toHaveProperty('success', true);
      }
    ));
  });

  describe('Messages Endpoints', () => {
    it('should validate get conversations response contract', createContractTest(
      'get conversations response',
      async (tester: ContractTester) => {
        const mockConversations = [
          {
            id: 'conversation-123',
            participants: [generateMockUser(), generateMockUser()],
            lastMessage: {
              id: 'message-456',
              conversationId: 'conversation-123',
              senderId: 'user-123',
              content: 'Hello, how are you?',
              type: 'text',
              timestamp: new Date().toISOString(),
              isRead: false,
              deliveryStatus: 'delivered',
            },
            unreadCount: 1,
            updatedAt: new Date().toISOString(),
          },
        ];

        tester.mockGetConversations(mockConversations);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/messages/conversations');

        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data[0]).toHaveProperty('id');
        expect(response.data[0]).toHaveProperty('participants');
        expect(response.data[0]).toHaveProperty('lastMessage');
      }
    ));

    it('should validate get messages response contract', createContractTest(
      'get messages response',
      async (tester: ContractTester) => {
        const mockMessages = Array.from({ length: 20 }, (_, i) => ({
          id: `message-${i}`,
          conversationId: 'conversation-123',
          senderId: 'user-123',
          content: `Message ${i}`,
          type: 'text',
          timestamp: new Date().toISOString(),
          isRead: i < 10,
          deliveryStatus: 'delivered',
        }));

        const mockResponse = generateMockPaginatedResponse(mockMessages);

        tester.mockGetMessages('conversation-123', mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/messages/conversations/conversation-123/messages');

        tester.validatePaginatedResponse(MessageSchema, response.data);
      }
    ));

    it('should validate send message response contract', createContractTest(
      'send message response',
      async (tester: ContractTester) => {
        const mockMessage = {
          id: 'message-new',
          conversationId: 'conversation-123',
          senderId: 'user-123',
          content: 'New message content',
          type: 'text',
          timestamp: new Date().toISOString(),
          isRead: false,
          deliveryStatus: 'sent',
        };

        const messageData = {
          content: 'New message content',
          type: 'text',
        };

        tester.mockSendMessage('conversation-123', messageData, mockMessage);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/messages/conversations/conversation-123/messages', messageData);

        tester.validateResponse(MessageSchema, response.data);
      }
    ));
  });

  describe('Resources Endpoints', () => {
    it('should validate get resources response contract', createContractTest(
      'get resources response',
      async (tester: ContractTester) => {
        const mockResources = Array.from({ length: 15 }, () => ({
          id: 'resource-123',
          title: 'Math Worksheet',
          description: 'A comprehensive math worksheet for grade 5',
          type: 'document',
          fileUrl: 'https://example.com/worksheet.pdf',
          thumbnailUrl: 'https://example.com/thumbnail.jpg',
          size: 1024000,
          category: {
            id: 'worksheet',
            name: 'Worksheets',
            subjects: ['math'],
            gradeLevels: ['grade-5'],
          },
          uploadedBy: generateMockUser(),
          rating: 4.5,
          downloadCount: 25,
          isDownloaded: false,
          createdAt: new Date().toISOString(),
        }));

        const mockResponse = generateMockPaginatedResponse(mockResources);

        tester.mockGetResources({ category: 'worksheet' }, mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/resources', {
          params: { category: 'worksheet' },
        });

        tester.validatePaginatedResponse(ResourceSchema, response.data);
      }
    ));

    it('should validate upload resource response contract', createContractTest(
      'upload resource response',
      async (tester: ContractTester) => {
        const mockResource = {
          id: 'resource-new',
          title: 'New Resource',
          description: 'A new educational resource',
          type: 'document',
          fileUrl: 'https://example.com/new-resource.pdf',
          size: 2048000,
          category: {
            id: 'lesson-plan',
            name: 'Lesson Plans',
            subjects: ['english'],
            gradeLevels: ['grade-6'],
          },
          uploadedBy: generateMockUser(),
          rating: 0,
          downloadCount: 0,
          isDownloaded: false,
          createdAt: new Date().toISOString(),
        };

        const resourceData = {
          title: 'New Resource',
          description: 'A new educational resource',
          categoryId: 'lesson-plan',
          file: 'mock-file-data',
        };

        tester.mockUploadResource(resourceData, mockResource);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/resources', resourceData);

        tester.validateResponse(ResourceSchema, response.data);
      }
    ));

    it('should validate download resource response contract', createContractTest(
      'download resource response',
      async (tester: ContractTester) => {
        const mockDownloadResponse = {
          downloadUrl: 'https://cdn.teacherhub.ug/resources/resource-123.pdf',
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        };

        tester.mockDownloadResource('resource-123', mockDownloadResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/resources/resource-123/download');

        expect(response.data).toHaveProperty('downloadUrl');
        expect(response.data).toHaveProperty('expiresAt');
        expect(typeof response.data.downloadUrl).toBe('string');
        expect(typeof response.data.expiresAt).toBe('string');
      }
    ));
  });

  describe('Government Content Endpoints', () => {
    it('should validate get government content response contract', createContractTest(
      'get government content response',
      async (tester: ContractTester) => {
        const mockContent = Array.from({ length: 8 }, () => ({
          id: 'gov-content-123',
          title: 'New Curriculum Guidelines',
          description: 'Updated curriculum guidelines for 2024',
          type: 'document',
          source: 'NCDC',
          priority: 'high',
          fileUrl: 'https://gov.ug/curriculum-2024.pdf',
          publishedAt: new Date().toISOString(),
          effectiveDate: new Date().toISOString(),
          subjects: ['all'],
          gradeLevels: ['all'],
          isVerified: true,
        }));

        const mockResponse = generateMockPaginatedResponse(mockContent);

        tester.mockGetGovernmentContent({ source: 'NCDC' }, mockResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/government/content', {
          params: { source: 'NCDC' },
        });

        expect(response.data).toHaveProperty('data');
        expect(response.data).toHaveProperty('pagination');
        expect(Array.isArray(response.data.data)).toBe(true);
        
        response.data.data.forEach((item: any) => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('title');
          expect(item).toHaveProperty('source');
          expect(item).toHaveProperty('isVerified', true);
        });
      }
    ));
  });

  describe('Profile Endpoints', () => {
    it('should validate get profile response contract', createContractTest(
      'get profile response',
      async (tester: ContractTester) => {
        const mockProfile = generateMockUser();

        tester.mockGetProfile(mockProfile);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.get('/profile');

        tester.validateResponse(UserSchema, response.data);
      }
    ));

    it('should validate update profile response contract', createContractTest(
      'update profile response',
      async (tester: ContractTester) => {
        const mockProfile = generateMockUser({
          firstName: 'Updated',
          lastName: 'Name',
        });

        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
        };

        tester.mockUpdateProfile(updateData, mockProfile);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.put('/profile', updateData);

        tester.validateResponse(UserSchema, response.data);
      }
    ));

    it('should validate upload credentials response contract', createContractTest(
      'upload credentials response',
      async (tester: ContractTester) => {
        const mockCredentialResponse = {
          id: 'credential-123',
          status: 'pending',
          uploadedAt: new Date().toISOString(),
          documents: [
            {
              id: 'doc-123',
              type: 'teaching_certificate',
              filename: 'certificate.pdf',
              status: 'uploaded',
            },
          ],
        };

        const credentialData = {
          documents: [
            {
              type: 'teaching_certificate',
              file: 'mock-file-data',
            },
          ],
        };

        tester.mockUploadCredentials(credentialData, mockCredentialResponse);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        const response = await apiClient.post('/profile/credentials', credentialData);

        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('uploadedAt');
        expect(response.data).toHaveProperty('documents');
        expect(Array.isArray(response.data.documents)).toBe(true);
      }
    ));
  });

  describe('Error Response Contracts', () => {
    it('should validate validation error response contract', createContractTest(
      'validation error response',
      async (tester: ContractTester) => {
        const mockError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              email: 'Email is required',
              password: 'Password must be at least 8 characters',
            },
          },
          timestamp: new Date().toISOString(),
          path: '/auth/register',
        };

        tester.mockError('POST', '/auth/register', 400, mockError);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        
        try {
          await apiClient.post('/auth/register', {});
        } catch (error: any) {
          tester.validateErrorResponse(error.response.data);
        }
      }
    ));

    it('should validate not found error response contract', createContractTest(
      'not found error response',
      async (tester: ContractTester) => {
        const mockError = {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
          timestamp: new Date().toISOString(),
          path: '/posts/non-existent-id',
        };

        tester.mockError('GET', '/posts/non-existent-id', 404, mockError);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        
        try {
          await apiClient.get('/posts/non-existent-id');
        } catch (error: any) {
          tester.validateErrorResponse(error.response.data);
        }
      }
    ));

    it('should validate server error response contract', createContractTest(
      'server error response',
      async (tester: ContractTester) => {
        const mockError = {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
          timestamp: new Date().toISOString(),
          path: '/posts',
        };

        tester.mockError('GET', '/posts', 500, mockError);

        const apiClient = new ApiClient({ baseURL: 'https://api.teacherhub.ug' });
        
        try {
          await apiClient.get('/posts');
        } catch (error: any) {
          tester.validateErrorResponse(error.response.data);
        }
      }
    ));
  });
});