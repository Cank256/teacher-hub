import { SearchService, SearchQuery } from '../searchService';
import { elasticsearchClient } from '../elasticsearch';

// Mock the elasticsearch client
jest.mock('../elasticsearch');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn()
    };

    (elasticsearchClient.getClient as jest.Mock).mockReturnValue(mockClient);
    searchService = new SearchService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchResources', () => {
    it('should search resources with basic query', async () => {
      const searchQuery: SearchQuery = {
        query: 'mathematics',
        pagination: { page: 1, size: 10 }
      };

      const mockResponse = {
        hits: {
          hits: [
            {
              _source: { id: '1', title: 'Math Resource', type: 'document' },
              _score: 1.5
            }
          ],
          total: { value: 1 },
          max_score: 1.5
        },
        aggregations: {}
      };

      mockClient.search.mockResolvedValue(mockResponse);

      const result = await searchService.searchResources(searchQuery);

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'teacher_hub_resources',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'mathematics',
                  fields: [
                    'title^3',
                    'description^2',
                    'tags^2',
                    'searchText',
                    'author.fullName'
                  ],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: []
          }
        },
        sort: [
          { isGovernmentContent: { order: 'desc' } },
          { _score: { order: 'desc' } },
          { popularity: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ],
        from: 0,
        size: 10,
        highlight: {
          fields: {
            title: {},
            description: {},
            tags: {}
          }
        },
        aggs: {
          subjects: {
            terms: { field: 'subjects', size: 20 }
          },
          gradeLevels: {
            terms: { field: 'gradeLevels', size: 20 }
          },
          resourceTypes: {
            terms: { field: 'type', size: 10 }
          },
          verificationStatus: {
            terms: { field: 'verificationStatus', size: 5 }
          }
        }
      });

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]).toEqual({
        id: '1',
        title: 'Math Resource',
        type: 'document',
        _score: 1.5
      });
      expect(result.total).toBe(1);
    });

    it('should search resources with filters', async () => {
      const searchQuery: SearchQuery = {
        query: 'science',
        filters: {
          subjects: ['physics', 'chemistry'],
          gradeLevels: ['grade-10', 'grade-11'],
          resourceType: ['video'],
          isGovernmentContent: true,
          rating: { min: 4.0 }
        }
      };

      const mockResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
          max_score: null
        },
        aggregations: {}
      };

      mockClient.search.mockResolvedValue(mockResponse);

      await searchService.searchResources(searchQuery);

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'teacher_hub_resources',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'science',
                  fields: expect.any(Array),
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: [
              { terms: { subjects: ['physics', 'chemistry'] } },
              { terms: { gradeLevels: ['grade-10', 'grade-11'] } },
              { terms: { type: ['video'] } },
              { term: { isGovernmentContent: true } },
              { range: { rating: { gte: 4.0 } } }
            ]
          }
        },
        sort: expect.any(Array),
        from: 0,
        size: 20,
        highlight: expect.any(Object),
        aggs: expect.any(Object)
      });
    });

    it('should handle empty query with match_all', async () => {
      const searchQuery: SearchQuery = {
        query: ''
      };

      const mockResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
          max_score: null
        },
        aggregations: {}
      };

      mockClient.search.mockResolvedValue(mockResponse);

      await searchService.searchResources(searchQuery);

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'teacher_hub_resources',
        query: {
          bool: {
            must: [{ match_all: {} }],
            filter: []
          }
        },
        sort: expect.any(Array),
        from: 0,
        size: 20,
        highlight: expect.any(Object),
        aggs: expect.any(Object)
      });
    });

    it('should handle search errors', async () => {
      const searchQuery: SearchQuery = {
        query: 'test'
      };

      const error = new Error('Search failed');
      mockClient.search.mockRejectedValue(error);

      await expect(searchService.searchResources(searchQuery)).rejects.toThrow('Search failed');
    });
  });

  describe('searchUsers', () => {
    it('should search users with basic query', async () => {
      const searchQuery: SearchQuery = {
        query: 'john teacher',
        filters: {
          subjects: ['mathematics'],
          verificationStatus: ['verified']
        }
      };

      const mockResponse = {
        hits: {
          hits: [
            {
              _source: { id: '1', fullName: 'John Teacher', subjects: ['mathematics'] },
              _score: 2.0
            }
          ],
          total: { value: 1 },
          max_score: 2.0
        },
        aggregations: {}
      };

      mockClient.search.mockResolvedValue(mockResponse);

      const result = await searchService.searchUsers(searchQuery);

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'teacher_hub_users',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'john teacher',
                  fields: [
                    'fullName^3',
                    'bio^2',
                    'specializations^2',
                    'subjects',
                    'schoolLocation.district'
                  ],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: [
              { terms: { subjects: ['mathematics'] } },
              { terms: { verificationStatus: ['verified'] } }
            ]
          }
        },
        sort: expect.any(Array),
        from: 0,
        size: 20,
        highlight: expect.any(Object),
        aggs: expect.any(Object)
      });

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].fullName).toBe('John Teacher');
    });
  });

  describe('indexResource', () => {
    it('should index resource with enhanced fields', async () => {
      const resource = {
        id: '1',
        title: 'Test Resource',
        description: 'A test resource',
        tags: ['math', 'algebra'],
        downloadCount: 100,
        rating: 4.5,
        createdAt: '2023-01-01T00:00:00Z'
      };

      mockClient.index.mockResolvedValue({});

      await searchService.indexResource(resource);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'teacher_hub_resources',
        id: '1',
        document: expect.objectContaining({
          ...resource,
          searchText: 'Test Resource A test resource math algebra',
          popularity: expect.any(Number)
        })
      });
    });
  });

  describe('indexUser', () => {
    it('should index user with enhanced fields', async () => {
      const user = {
        id: '1',
        fullName: 'John Doe',
        connectionCount: 50,
        resourceCount: 10,
        lastActive: '2023-12-01T00:00:00Z'
      };

      mockClient.index.mockResolvedValue({});

      await searchService.indexUser(user);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'teacher_hub_users',
        id: '1',
        document: expect.objectContaining({
          ...user,
          activityScore: expect.any(Number)
        })
      });
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from index', async () => {
      mockClient.delete.mockResolvedValue({});

      await searchService.deleteDocument('test_index', 'doc_id');

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'test_index',
        id: 'doc_id'
      });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      mockClient.delete.mockRejectedValue(error);

      await expect(searchService.deleteDocument('test_index', 'doc_id')).rejects.toThrow('Delete failed');
    });
  });

  describe('popularity calculation', () => {
    it('should calculate resource popularity correctly', async () => {
      const resource = {
        id: '1',
        title: 'Popular Resource',
        description: 'Very popular',
        downloadCount: 500,
        rating: 4.8,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };

      mockClient.index.mockResolvedValue({});

      await searchService.indexResource(resource);

      const indexCall = mockClient.index.mock.calls[0][0];
      expect(indexCall.document.popularity).toBeGreaterThan(0);
      expect(indexCall.document.popularity).toBeLessThanOrEqual(1);
    });
  });

  describe('activity score calculation', () => {
    it('should calculate user activity score correctly', async () => {
      const user = {
        id: '1',
        fullName: 'Active User',
        connectionCount: 75,
        resourceCount: 25,
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
      };

      mockClient.index.mockResolvedValue({});

      await searchService.indexUser(user);

      const indexCall = mockClient.index.mock.calls[0][0];
      expect(indexCall.document.activityScore).toBeGreaterThan(0);
      expect(indexCall.document.activityScore).toBeLessThanOrEqual(1);
    });
  });
});