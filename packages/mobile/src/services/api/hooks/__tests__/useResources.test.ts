import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useResources,
  useResource,
  useUploadResource,
  useDownloadResource,
  useRateResource,
  useResourceCategories,
} from '../useResources';
import { ResourcesService } from '../../resourcesService';
import type { Resource, CreateResourceRequest } from '@/types/resources';

// Mock the ResourcesService
jest.mock('../../resourcesService');
const mockedResourcesService = ResourcesService as jest.Mocked<typeof ResourcesService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useResources hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResource: Resource = {
    id: '1',
    title: 'Test Resource',
    description: 'Test description',
    type: 'document',
    fileUrl: 'https://example.com/file.pdf',
    size: 1024000,
    category: {
      id: 'cat1',
      name: 'Mathematics',
      subjects: [],
      gradeLevels: [],
      color: '#FF6B6B',
      icon: 'calculate',
    },
    uploadedBy: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      verificationStatus: 'verified',
    },
    rating: 4.5,
    downloadCount: 100,
    isDownloaded: false,
    tags: ['math', 'algebra'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('useResources', () => {
    it('should fetch resources successfully', async () => {
      const mockResponse = {
        data: [mockResource],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedResourcesService.getResources.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useResources(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockedResourcesService.getResources).toHaveBeenCalledWith({}, 1, 20);
    });

    it('should handle filters', async () => {
      const filters = { category: 'cat1', type: 'document' as const };
      const mockResponse = {
        data: [mockResource],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedResourcesService.getResources.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useResources(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedResourcesService.getResources).toHaveBeenCalledWith(filters, 1, 20);
    });
  });

  describe('useResource', () => {
    it('should fetch a specific resource', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);

      const { result } = renderHook(() => useResource('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResource);
      expect(mockedResourcesService.getResource).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useResource(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedResourcesService.getResource).not.toHaveBeenCalled();
    });
  });

  describe('useResourceCategories', () => {
    it('should fetch resource categories', async () => {
      const mockCategories = [mockResource.category];
      mockedResourcesService.getCategories.mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useResourceCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockedResourcesService.getCategories).toHaveBeenCalled();
    });
  });

  describe('useUploadResource', () => {
    it('should upload a resource successfully', async () => {
      mockedResourcesService.uploadResource.mockResolvedValue(mockResource);

      const { result } = renderHook(() => useUploadResource(), {
        wrapper: createWrapper(),
      });

      const request: CreateResourceRequest = {
        title: 'Test Resource',
        description: 'Test description',
        type: 'document',
        categoryId: 'cat1',
        tags: ['test'],
      };

      await waitFor(() => {
        result.current.mutate({ request });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedResourcesService.uploadResource).toHaveBeenCalledWith(request, undefined);
    });

    it('should handle upload with progress callback', async () => {
      mockedResourcesService.uploadResource.mockResolvedValue(mockResource);

      const { result } = renderHook(() => useUploadResource(), {
        wrapper: createWrapper(),
      });

      const request: CreateResourceRequest = {
        title: 'Test Resource',
        description: 'Test description',
        type: 'document',
        categoryId: 'cat1',
        tags: ['test'],
      };

      const onProgress = jest.fn();

      await waitFor(() => {
        result.current.mutate({ request, onProgress });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedResourcesService.uploadResource).toHaveBeenCalledWith(request, onProgress);
    });
  });

  describe('useDownloadResource', () => {
    it('should download a resource successfully', async () => {
      const mockBlob = new Blob(['file content']);
      mockedResourcesService.downloadResource.mockResolvedValue(mockBlob);
      mockedResourcesService.markAsDownloaded.mockResolvedValue();

      const { result } = renderHook(() => useDownloadResource(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({ id: '1' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedResourcesService.downloadResource).toHaveBeenCalledWith('1', undefined);
      expect(mockedResourcesService.markAsDownloaded).toHaveBeenCalledWith('1');
    });
  });

  describe('useRateResource', () => {
    it('should rate a resource successfully', async () => {
      const mockRating = {
        resourceId: '1',
        userId: 'user1',
        rating: 5,
        createdAt: new Date(),
      };

      mockedResourcesService.rateResource.mockResolvedValue(mockRating);

      const { result } = renderHook(() => useRateResource(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({ id: '1', rating: 5, comment: 'Great!' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedResourcesService.rateResource).toHaveBeenCalledWith('1', 5, 'Great!');
    });
  });
});