import { ResourcesService } from '../resourcesService';
import { apiClient } from '../apiClient';
import type { Resource, CreateResourceRequest, ResourceFilters } from '@/types/resources';

// Mock the API client
jest.mock('../apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ResourcesService', () => {
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

  describe('getResources', () => {
    it('should fetch resources with default parameters', async () => {
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

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await ResourcesService.getResources();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch resources with filters', async () => {
      const filters: ResourceFilters = {
        category: 'cat1',
        type: 'document',
        search: 'test',
      };

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

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await ResourcesService.getResources(filters, 1, 20);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources', {
        params: { page: 1, limit: 20, ...filters },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getResource', () => {
    it('should fetch a specific resource', async () => {
      mockedApiClient.get.mockResolvedValue({ data: mockResource });

      const result = await ResourcesService.getResource('1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources/1');
      expect(result).toEqual(mockResource);
    });
  });

  describe('uploadResource', () => {
    it('should upload a resource with file', async () => {
      const request: CreateResourceRequest = {
        title: 'Test Resource',
        description: 'Test description',
        type: 'document',
        categoryId: 'cat1',
        tags: ['test'],
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }) as any,
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResource });

      const result = await ResourcesService.uploadResource(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/resources',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockResource);
    });

    it('should upload a YouTube video resource', async () => {
      const request: CreateResourceRequest = {
        title: 'Test Video',
        description: 'Test video description',
        type: 'youtube_video',
        categoryId: 'cat1',
        tags: ['video'],
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };

      const mockVideoResource = { ...mockResource, type: 'youtube_video' as const };
      mockedApiClient.post.mockResolvedValue({ data: mockVideoResource });

      const result = await ResourcesService.uploadResource(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/resources',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockVideoResource);
    });
  });

  describe('downloadResource', () => {
    it('should download a resource', async () => {
      const mockBlob = new Blob(['file content']);
      mockedApiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await ResourcesService.downloadResource('1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources/1/download', {
        responseType: 'blob',
        onDownloadProgress: expect.any(Function),
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('rateResource', () => {
    it('should rate a resource', async () => {
      const mockRating = {
        resourceId: '1',
        userId: 'user1',
        rating: 5,
        createdAt: new Date(),
      };

      mockedApiClient.post.mockResolvedValue({ data: mockRating });

      const result = await ResourcesService.rateResource('1', 5, 'Great resource!');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/resources/1/rate', {
        rating: 5,
        comment: 'Great resource!',
      });
      expect(result).toEqual(mockRating);
    });
  });

  describe('searchResources', () => {
    it('should search resources', async () => {
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

      mockedApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await ResourcesService.searchResources('test query');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources/search', {
        params: { q: 'test query', page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateFile', () => {
    it('should validate file size for documents', () => {
      const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = ResourcesService.validateFile(validFile as any, 'document');

      expect(result.valid).toBe(true);
    });

    it('should reject oversized files', () => {
      const oversizedFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(oversizedFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB

      const result = ResourcesService.validateFile(oversizedFile as any, 'document');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB limit');
    });

    it('should validate video file size limit', () => {
      const validVideoFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(validVideoFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB

      const result = ResourcesService.validateFile(validVideoFile as any, 'video');

      expect(result.valid).toBe(true);
    });

    it('should reject oversized video files', () => {
      const oversizedVideoFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(oversizedVideoFile, 'size', { value: 150 * 1024 * 1024 }); // 150MB

      const result = ResourcesService.validateFile(oversizedVideoFile as any, 'video');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('100MB limit');
    });
  });

  describe('getCategories', () => {
    it('should fetch resource categories', async () => {
      const mockCategories = [mockResource.category];
      mockedApiClient.get.mockResolvedValue({ data: mockCategories });

      const result = await ResourcesService.getCategories();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources/categories');
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getPopularResources', () => {
    it('should fetch popular resources', async () => {
      const mockPopularResources = [mockResource];
      mockedApiClient.get.mockResolvedValue({ data: mockPopularResources });

      const result = await ResourcesService.getPopularResources('week', 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/resources/popular', {
        params: { timeframe: 'week', limit: 10 },
      });
      expect(result).toEqual(mockPopularResources);
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await ResourcesService.deleteResource('1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/resources/1');
    });
  });
});