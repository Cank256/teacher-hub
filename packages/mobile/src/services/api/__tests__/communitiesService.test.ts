import { CommunitiesService } from '../communitiesService';
import { apiClient } from '../apiClient';
import type {
  Community,
  CommunityFilters,
  CommunityPostFilters,
  JoinCommunityRequest,
  CreateCommunityPostRequest,
} from '@/types';

// Mock the API client
jest.mock('../apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('CommunitiesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCommunities', () => {
    it('should fetch communities with default filters', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              name: 'Math Teachers',
              description: 'Community for math teachers',
              memberCount: 150,
              isJoined: false,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunities();

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities?');
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch communities with filters', async () => {
      const filters: CommunityFilters = {
        search: 'math',
        category: 'subject',
        subjects: ['1', '2'],
        gradeLevels: ['1'],
        location: 'kampala',
        activityLevel: 'high',
        isPublic: true,
        sortBy: 'memberCount',
        sortOrder: 'desc',
        page: 2,
        limit: 10,
      };

      const mockResponse = {
        data: {
          data: [],
          pagination: {
            page: 2,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await CommunitiesService.getCommunities(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/communities?search=math&category=subject&subjects=1%2C2&gradeLevels=1&location=kampala&activityLevel=high&isPublic=true&sortBy=memberCount&sortOrder=desc&page=2&limit=10'
      );
    });
  });

  describe('getCommunity', () => {
    it('should fetch a specific community', async () => {
      const mockCommunity: Partial<Community> = {
        id: '1',
        name: 'Math Teachers',
        description: 'Community for math teachers',
        memberCount: 150,
        isJoined: true,
      };

      const mockResponse = {
        data: {
          data: mockCommunity,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunity('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/1');
      expect(result).toEqual(mockCommunity);
    });
  });

  describe('joinCommunity', () => {
    it('should join a community', async () => {
      const request: JoinCommunityRequest = {
        communityId: '1',
        message: 'I would like to join',
      };

      mockApiClient.post.mockResolvedValue({});

      await CommunitiesService.joinCommunity(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/communities/1/join', {
        message: 'I would like to join',
      });
    });

    it('should join a community without message', async () => {
      const request: JoinCommunityRequest = {
        communityId: '1',
      };

      mockApiClient.post.mockResolvedValue({});

      await CommunitiesService.joinCommunity(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/communities/1/join', {
        message: undefined,
      });
    });
  });

  describe('leaveCommunity', () => {
    it('should leave a community', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await CommunitiesService.leaveCommunity('1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/communities/1/leave');
    });
  });

  describe('getCommunityMembers', () => {
    it('should fetch community members with default pagination', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              user: {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
              },
              status: 'member',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunityMembers('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/1/members?page=1&limit=20');
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch community members with custom pagination', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            page: 2,
            limit: 50,
            total: 0,
            totalPages: 0,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await CommunitiesService.getCommunityMembers('1', 2, 50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/1/members?page=2&limit=50');
    });
  });

  describe('getCommunityPosts', () => {
    it('should fetch community posts with filters', async () => {
      const filters: CommunityPostFilters = {
        communityId: '1',
        search: 'test',
        category: 'discussion',
        sortBy: 'likes',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              title: 'Test Post',
              content: 'Test content',
              likes: 5,
              comments: 2,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunityPosts(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/communities/1/posts?search=test&category=discussion&sortBy=likes&sortOrder=desc&page=1&limit=10'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createCommunityPost', () => {
    it('should create a community post without media', async () => {
      const request: CreateCommunityPostRequest = {
        communityId: '1',
        title: 'Test Post',
        content: 'Test content',
        category: 'discussion',
      };

      const mockPost = {
        id: '1',
        title: 'Test Post',
        content: 'Test content',
        category: 'discussion',
      };

      const mockResponse = {
        data: {
          data: mockPost,
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.createCommunityPost(request);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/communities/1/posts',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockPost);
    });
  });

  describe('likeCommunityPost', () => {
    it('should like a community post', async () => {
      mockApiClient.post.mockResolvedValue({});

      await CommunitiesService.likeCommunityPost('1', '2');

      expect(mockApiClient.post).toHaveBeenCalledWith('/communities/1/posts/2/like');
    });
  });

  describe('unlikeCommunityPost', () => {
    it('should unlike a community post', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await CommunitiesService.unlikeCommunityPost('1', '2');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/communities/1/posts/2/like');
    });
  });

  describe('getCommunityActivities', () => {
    it('should fetch community activities', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              type: 'member_joined',
              description: 'John Doe joined the community',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunityActivities('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/1/activities?page=1&limit=20');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCommunityNotifications', () => {
    it('should fetch community notifications', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              type: 'new_post',
              message: 'New post in Math Teachers',
              isRead: false,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunityNotifications();

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/notifications?page=1&limit=20');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockApiClient.patch.mockResolvedValue({});

      await CommunitiesService.markNotificationAsRead('1');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/communities/notifications/1/read');
    });
  });

  describe('searchCommunities', () => {
    it('should search communities', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await CommunitiesService.searchCommunities('math', { sortBy: 'memberCount' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities?search=math&sortBy=memberCount');
    });
  });

  describe('getMyCommunitites', () => {
    it('should fetch user\'s communities', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              name: 'My Community',
              isJoined: true,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getMyCommunitites();

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/my?page=1&limit=20');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCommunityCategories', () => {
    it('should fetch community categories', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Subject Communities',
          description: 'Communities organized by subject',
        },
      ];

      const mockResponse = {
        data: {
          data: mockCategories,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await CommunitiesService.getCommunityCategories();

      expect(mockApiClient.get).toHaveBeenCalledWith('/communities/categories');
      expect(result).toEqual(mockCategories);
    });
  });
});