import { RecommendationService } from '../recommendationService';
import type { UserProfile } from '../recommendationService';
import { SearchService } from '../searchService';

// Mock the search service
jest.mock('../searchService');

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;
  let mockSearchService: jest.Mocked<SearchService>;

  const mockUserProfile: UserProfile = {
    id: 'user123',
    subjects: ['mathematics', 'physics'],
    gradeLevels: ['grade-10', 'grade-11'],
    schoolLocation: {
      district: 'Kampala',
      region: 'Central'
    },
    yearsExperience: 5,
    verificationStatus: 'verified',
    recentActivity: {
      viewedResources: ['resource1', 'resource2'],
      downloadedResources: ['resource1'],
      searchQueries: ['algebra', 'geometry'],
      interactions: [
        {
          resourceId: 'resource1',
          action: 'view',
          timestamp: new Date()
        }
      ]
    }
  };

  beforeEach(() => {
    mockSearchService = {
      searchResources: jest.fn(),
      searchUsers: jest.fn(),
      searchCommunities: jest.fn(),
      indexResource: jest.fn(),
      indexUser: jest.fn(),
      deleteDocument: jest.fn()
    } as any;

    (SearchService as jest.MockedClass<typeof SearchService>).mockImplementation(() => mockSearchService);
    recommendationService = new RecommendationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const mockResourceResponse = {
        hits: [
          {
            id: 'resource3',
            title: 'Advanced Mathematics',
            description: 'Advanced math concepts',
            type: 'document',
            subjects: ['mathematics'],
            gradeLevels: ['grade-11'],
            author: { id: 'author1', fullName: 'John Teacher' },
            rating: 4.5,
            downloadCount: 100,
            _score: 2.5,
            createdAt: new Date().toISOString()
          }
        ],
        total: 1,
        maxScore: 2.5
      };

      const mockUserResponse = {
        hits: [
          {
            id: 'user456',
            subjects: ['mathematics', 'chemistry'],
            gradeLevels: ['grade-10']
          }
        ],
        total: 1,
        maxScore: 1.8
      };

      // Mock search calls
      mockSearchService.searchResources.mockResolvedValue(mockResourceResponse);
      mockSearchService.searchUsers.mockResolvedValue(mockUserResponse);

      const recommendations = await recommendationService.getPersonalizedRecommendations(mockUserProfile, 10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toMatchObject({
        resourceId: 'resource3',
        title: 'Advanced Mathematics',
        recommendationReason: expect.any(String)
      });
      expect(recommendations[0]?.relevanceScore).toBeGreaterThan(0);
    });

    it('should handle empty results gracefully', async () => {
      const emptyResponse = {
        hits: [],
        total: 0,
        maxScore: 0
      };

      mockSearchService.searchResources.mockResolvedValue(emptyResponse);
      mockSearchService.searchUsers.mockResolvedValue(emptyResponse);

      const recommendations = await recommendationService.getPersonalizedRecommendations(mockUserProfile, 10);

      expect(recommendations).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Search failed');
      mockSearchService.searchResources.mockRejectedValue(error);

      await expect(recommendationService.getPersonalizedRecommendations(mockUserProfile, 10))
        .rejects.toThrow('Search failed');
    });
  });

  describe('getTrendingContent', () => {
    it('should return trending content', async () => {
      const mockResponse = {
        hits: [
          {
            id: 'trending1',
            title: 'Trending Math Resource',
            type: 'video',
            subjects: ['mathematics'],
            downloadCount: 200,
            rating: 4.8,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            _score: 2.1
          }
        ],
        total: 1,
        maxScore: 2.1
      };

      mockSearchService.searchResources.mockResolvedValue(mockResponse);

      const trending = await recommendationService.getTrendingContent(['mathematics', 'physics'], 10);

      expect(trending).toHaveLength(1);
      expect(trending[0]).toMatchObject({
        resourceId: 'trending1',
        title: 'Trending Math Resource',
        type: 'video',
        subjects: ['mathematics']
      });
      expect(trending[0]?.trendingScore).toBe(2.1);
      expect(trending[0]?.growthRate).toBeGreaterThan(0);
    });

    it('should work without user subjects filter', async () => {
      const mockResponse = {
        hits: [
          {
            id: 'trending1',
            title: 'General Trending Resource',
            type: 'document',
            subjects: ['science'],
            downloadCount: 100,
            rating: 4.0,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            _score: 1.5
          }
        ],
        total: 1,
        maxScore: 1.5
      };

      mockSearchService.searchResources.mockResolvedValue(mockResponse);

      const trending = await recommendationService.getTrendingContent(undefined, 5);

      expect(trending).toHaveLength(1);
      expect(trending[0]?.resourceId).toBe('trending1');
    });
  });

  describe('updateUserInteraction', () => {
    it('should record user interaction', async () => {
      await expect(recommendationService.updateUserInteraction('user123', 'resource456', 'view', { duration: 120 }))
        .resolves.not.toThrow();
    });
  });

  describe('getRecommendationExplanation', () => {
    it('should return explanation for recommendation', async () => {
      const explanation = await recommendationService.getRecommendationExplanation('user123', 'resource456');

      expect(explanation).toContain('recommended based on');
      expect(typeof explanation).toBe('string');
    });
  });
});