import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCommunities,
  useInfiniteCommunities,
  useCommunity,
  useCommunityMembers,
  useInfiniteCommunityPosts,
  useJoinCommunity,
  useLeaveCommunity,
  useCreateCommunityPost,
  useLikeCommunityPost,
  useUnlikeCommunityPost,
  communityKeys,
} from '../useCommunities';
import { CommunitiesService } from '../../communitiesService';
import type { Community, CommunityFilters } from '@/types';

// Mock the CommunitiesService
jest.mock('../../communitiesService');
const mockCommunitiesService = CommunitiesService as jest.Mocked<typeof CommunitiesService>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCommunities hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('communityKeys', () => {
    it('should generate correct query keys', () => {
      const filters: CommunityFilters = { search: 'math', sortBy: 'memberCount' };
      
      expect(communityKeys.all).toEqual(['communities']);
      expect(communityKeys.lists()).toEqual(['communities', 'list']);
      expect(communityKeys.list(filters)).toEqual(['communities', 'list', filters]);
      expect(communityKeys.detail('1')).toEqual(['communities', 'detail', '1']);
      expect(communityKeys.members('1')).toEqual(['communities', 'detail', '1', 'members']);
      expect(communityKeys.posts('1')).toEqual(['communities', 'detail', '1', 'posts']);
    });
  });

  describe('useCommunities', () => {
    it('should fetch communities successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Math Teachers',
            description: 'Community for math teachers',
            memberCount: 150,
            isJoined: false,
          } as Community,
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCommunities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCommunitiesService.getCommunities).toHaveBeenCalledWith({});
    });

    it('should fetch communities with filters', async () => {
      const filters: CommunityFilters = {
        search: 'math',
        sortBy: 'memberCount',
        sortOrder: 'desc',
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCommunities(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCommunitiesService.getCommunities).toHaveBeenCalledWith(filters);
    });
  });

  describe('useInfiniteCommunities', () => {
    it('should fetch communities with infinite scrolling', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Math Teachers',
            memberCount: 150,
          } as Community,
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInfiniteCommunities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0]).toEqual(mockResponse);
      expect(mockCommunitiesService.getCommunities).toHaveBeenCalledWith({ page: 1 });
    });
  });

  describe('useCommunity', () => {
    it('should fetch a specific community', async () => {
      const mockCommunity: Community = {
        id: '1',
        name: 'Math Teachers',
        description: 'Community for math teachers',
        memberCount: 150,
        isJoined: true,
      } as Community;

      mockCommunitiesService.getCommunity.mockResolvedValue(mockCommunity);

      const { result } = renderHook(() => useCommunity('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCommunity);
      expect(mockCommunitiesService.getCommunity).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCommunity(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockCommunitiesService.getCommunity).not.toHaveBeenCalled();
    });
  });

  describe('useCommunityMembers', () => {
    it('should fetch community members', async () => {
      const mockResponse = {
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
      };

      mockCommunitiesService.getCommunityMembers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCommunityMembers('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockCommunitiesService.getCommunityMembers).toHaveBeenCalledWith('1', 1, 20);
    });
  });

  describe('useJoinCommunity', () => {
    it('should join a community successfully', async () => {
      mockCommunitiesService.joinCommunity.mockResolvedValue();

      const { result } = renderHook(() => useJoinCommunity(), {
        wrapper: createWrapper(),
      });

      const joinRequest = {
        communityId: '1',
        message: 'I would like to join',
      };

      await result.current.mutateAsync(joinRequest);

      expect(mockCommunitiesService.joinCommunity).toHaveBeenCalledWith(joinRequest);
    });
  });

  describe('useLeaveCommunity', () => {
    it('should leave a community successfully', async () => {
      mockCommunitiesService.leaveCommunity.mockResolvedValue();

      const { result } = renderHook(() => useLeaveCommunity(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('1');

      expect(mockCommunitiesService.leaveCommunity).toHaveBeenCalledWith('1');
    });
  });

  describe('useCreateCommunityPost', () => {
    it('should create a community post successfully', async () => {
      const mockPost = {
        id: '1',
        title: 'Test Post',
        content: 'Test content',
      };

      mockCommunitiesService.createCommunityPost.mockResolvedValue(mockPost as any);

      const { result } = renderHook(() => useCreateCommunityPost(), {
        wrapper: createWrapper(),
      });

      const createRequest = {
        communityId: '1',
        title: 'Test Post',
        content: 'Test content',
      };

      const createdPost = await result.current.mutateAsync(createRequest);

      expect(createdPost).toEqual(mockPost);
      expect(mockCommunitiesService.createCommunityPost).toHaveBeenCalledWith(createRequest);
    });
  });

  describe('useLikeCommunityPost', () => {
    it('should like a community post successfully', async () => {
      mockCommunitiesService.likeCommunityPost.mockResolvedValue();

      const { result } = renderHook(() => useLikeCommunityPost(), {
        wrapper: createWrapper(),
      });

      const likeRequest = {
        communityId: '1',
        postId: '2',
      };

      await result.current.mutateAsync(likeRequest);

      expect(mockCommunitiesService.likeCommunityPost).toHaveBeenCalledWith('1', '2');
    });
  });

  describe('useUnlikeCommunityPost', () => {
    it('should unlike a community post successfully', async () => {
      mockCommunitiesService.unlikeCommunityPost.mockResolvedValue();

      const { result } = renderHook(() => useUnlikeCommunityPost(), {
        wrapper: createWrapper(),
      });

      const unlikeRequest = {
        communityId: '1',
        postId: '2',
      };

      await result.current.mutateAsync(unlikeRequest);

      expect(mockCommunitiesService.unlikeCommunityPost).toHaveBeenCalledWith('1', '2');
    });
  });
});