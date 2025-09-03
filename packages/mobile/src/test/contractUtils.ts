import nock from 'nock';
import { z } from 'zod';

// API Contract Schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  profilePicture: z.string().nullable(),
  subjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  })),
  gradeLevels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
  })),
  schoolLocation: z.object({
    id: z.string(),
    name: z.string(),
    region: z.string(),
  }),
  yearsOfExperience: z.number(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
});

export const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: UserSchema,
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    icon: z.string(),
  }),
  mediaAttachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'video', 'document']),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    filename: z.string(),
    size: z.number(),
  })),
  likes: z.number(),
  comments: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isLiked: z.boolean(),
});

export const CommunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.object({
    id: z.string(),
    name: z.string(),
  }),
  memberCount: z.number(),
  isPublic: z.boolean(),
  isJoined: z.boolean(),
  moderators: z.array(UserSchema),
  createdAt: z.string().datetime(),
});

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'file']),
  timestamp: z.string().datetime(),
  isRead: z.boolean(),
  deliveryStatus: z.enum(['sending', 'sent', 'delivered', 'failed']),
});

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['document', 'video', 'image', 'audio']),
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  youtubeId: z.string().optional(),
  size: z.number(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    subjects: z.array(z.string()),
    gradeLevels: z.array(z.string()),
  }),
  uploadedBy: UserSchema,
  rating: z.number().min(0).max(5),
  downloadCount: z.number(),
  isDownloaded: z.boolean(),
  createdAt: z.string().datetime(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  });

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string().datetime(),
  path: z.string(),
});

// Contract Testing Utilities
export class ContractTester {
  private baseUrl: string;
  private scope: nock.Scope;

  constructor(baseUrl: string = 'https://api.teacherhub.ug') {
    this.baseUrl = baseUrl;
    this.scope = nock(baseUrl);
  }

  // Authentication endpoints
  mockLogin(email: string, password: string, response: any) {
    return this.scope
      .post('/auth/login')
      .reply(200, response);
  }

  mockGoogleAuth(token: string, response: any) {
    return this.scope
      .post('/auth/google')
      .reply(200, response);
  }

  mockRefreshToken(refreshToken: string, response: any) {
    return this.scope
      .post('/auth/refresh')
      .reply(200, response);
  }

  // Posts endpoints
  mockGetPosts(query: any, response: any) {
    return this.scope
      .get('/posts')
      .query(query)
      .reply(200, response);
  }

  mockCreatePost(postData: any, response: any) {
    return this.scope
      .post('/posts')
      .reply(201, response);
  }

  mockUpdatePost(id: string, updateData: any, response: any) {
    return this.scope
      .put(`/posts/${id}`)
      .reply(200, response);
  }

  mockDeletePost(id: string) {
    return this.scope
      .delete(`/posts/${id}`)
      .reply(204);
  }

  // Communities endpoints
  mockGetCommunities(query: any, response: any) {
    return this.scope
      .get('/communities')
      .query(query)
      .reply(200, response);
  }

  mockJoinCommunity(id: string) {
    return this.scope
      .post(`/communities/${id}/join`)
      .reply(200, { success: true });
  }

  mockLeaveCommunity(id: string) {
    return this.scope
      .post(`/communities/${id}/leave`)
      .reply(200, { success: true });
  }

  // Messages endpoints
  mockGetConversations(response: any) {
    return this.scope
      .get('/messages/conversations')
      .reply(200, response);
  }

  mockGetMessages(conversationId: string, response: any) {
    return this.scope
      .get(`/messages/conversations/${conversationId}/messages`)
      .reply(200, response);
  }

  mockSendMessage(conversationId: string, messageData: any, response: any) {
    return this.scope
      .post(`/messages/conversations/${conversationId}/messages`)
      .reply(201, response);
  }

  // Resources endpoints
  mockGetResources(query: any, response: any) {
    return this.scope
      .get('/resources')
      .query(query)
      .reply(200, response);
  }

  mockUploadResource(resourceData: any, response: any) {
    return this.scope
      .post('/resources')
      .reply(201, response);
  }

  mockDownloadResource(id: string, response: any) {
    return this.scope
      .get(`/resources/${id}/download`)
      .reply(200, response);
  }

  // Government content endpoints
  mockGetGovernmentContent(query: any, response: any) {
    return this.scope
      .get('/government/content')
      .query(query)
      .reply(200, response);
  }

  // Profile endpoints
  mockGetProfile(response: any) {
    return this.scope
      .get('/profile')
      .reply(200, response);
  }

  mockUpdateProfile(profileData: any, response: any) {
    return this.scope
      .put('/profile')
      .reply(200, response);
  }

  mockUploadCredentials(credentialData: any, response: any) {
    return this.scope
      .post('/profile/credentials')
      .reply(201, response);
  }

  // Error responses
  mockError(method: string, path: string, statusCode: number, error: any) {
    return this.scope
      .intercept(path, method.toUpperCase())
      .reply(statusCode, error);
  }

  // Cleanup
  cleanup() {
    nock.cleanAll();
  }

  // Validation helpers
  validateResponse<T>(schema: z.ZodSchema<T>, response: any): T {
    try {
      return schema.parse(response);
    } catch (error) {
      throw new Error(`Contract validation failed: ${error}`);
    }
  }

  validatePaginatedResponse<T>(itemSchema: z.ZodSchema<T>, response: any): any {
    const schema = PaginatedResponseSchema(itemSchema);
    return this.validateResponse(schema, response);
  }

  validateErrorResponse(response: any): any {
    return this.validateResponse(ErrorResponseSchema, response);
  }
}

// Contract test helpers
export const createContractTest = (
  name: string,
  testFn: (tester: ContractTester) => Promise<void>
) => {
  return async () => {
    const tester = new ContractTester();
    
    try {
      await testFn(tester);
    } finally {
      tester.cleanup();
    }
  };
};

// Mock data generators for contracts
export const generateMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'teacher@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profilePicture: null,
  subjects: [{ id: 'math', name: 'Mathematics', code: 'MATH' }],
  gradeLevels: [{ id: 'grade-5', name: 'Grade 5', order: 5 }],
  schoolLocation: { id: 'kampala', name: 'Kampala', region: 'Central' },
  yearsOfExperience: 5,
  verificationStatus: 'verified' as const,
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  ...overrides,
});

export const generateMockPost = (overrides = {}) => ({
  id: 'post-123',
  title: 'Sample Post',
  content: 'This is a sample post content',
  author: generateMockUser(),
  category: { id: 'lesson', name: 'Lesson Plans', color: '#4CAF50', icon: 'book' },
  mediaAttachments: [],
  likes: 10,
  comments: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isLiked: false,
  ...overrides,
});

export const generateMockPaginatedResponse = <T>(items: T[], page = 1, limit = 10) => ({
  data: items,
  pagination: {
    page,
    limit,
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
    hasNext: page * limit < items.length,
    hasPrev: page > 1,
  },
});