import { Client } from '@elastic/elasticsearch';
import { elasticsearchClient } from './elasticsearch';
import { INDICES } from './mappings';
import logger from '../utils/logger';

export interface SearchQuery {
  query: string;
  filters?: {
    subjects?: string[];
    gradeLevels?: string[];
    resourceType?: string[];
    verificationStatus?: string[];
    isGovernmentContent?: boolean;
    dateRange?: {
      from?: string;
      to?: string;
    };
    rating?: {
      min?: number;
      max?: number;
    };
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  }[];
  pagination?: {
    page: number;
    size: number;
  };
}

export interface SearchResult<T> {
  hits: T[];
  total: number;
  maxScore: number;
  aggregations?: any;
}

export class SearchService {
  private client: Client;

  constructor() {
    this.client = elasticsearchClient.getClient();
  }

  async searchResources(searchQuery: SearchQuery): Promise<SearchResult<any>> {
    try {
      const query = this.buildResourceQuery(searchQuery);
      const response = await this.client.search({
        index: INDICES.RESOURCES,
        ...query
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score
        })),
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
        maxScore: response.hits.max_score || 0,
        aggregations: response.aggregations
      };
    } catch (error) {
      logger.error('Error searching resources:', error);
      throw error;
    }
  }

  async searchUsers(searchQuery: SearchQuery): Promise<SearchResult<any>> {
    try {
      const query = this.buildUserQuery(searchQuery);
      const response = await this.client.search({
        index: INDICES.USERS,
        ...query
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score
        })),
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
        maxScore: response.hits.max_score || 0,
        aggregations: response.aggregations
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  async searchCommunities(searchQuery: SearchQuery): Promise<SearchResult<any>> {
    try {
      const query = this.buildCommunityQuery(searchQuery);
      const response = await this.client.search({
        index: INDICES.COMMUNITIES,
        ...query
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score
        })),
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
        maxScore: response.hits.max_score || 0,
        aggregations: response.aggregations
      };
    } catch (error) {
      logger.error('Error searching communities:', error);
      throw error;
    }
  }

  private buildResourceQuery(searchQuery: SearchQuery): any {
    const { query, filters, sort, pagination } = searchQuery;
    
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Text search
    if (query && query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
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
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Apply filters
    if (filters) {
      if (filters.subjects && filters.subjects.length > 0) {
        filterClauses.push({
          terms: { subjects: filters.subjects }
        });
      }

      if (filters.gradeLevels && filters.gradeLevels.length > 0) {
        filterClauses.push({
          terms: { gradeLevels: filters.gradeLevels }
        });
      }

      if (filters.resourceType && filters.resourceType.length > 0) {
        filterClauses.push({
          terms: { type: filters.resourceType }
        });
      }

      if (filters.verificationStatus && filters.verificationStatus.length > 0) {
        filterClauses.push({
          terms: { verificationStatus: filters.verificationStatus }
        });
      }

      if (filters.isGovernmentContent !== undefined) {
        filterClauses.push({
          term: { isGovernmentContent: filters.isGovernmentContent }
        });
      }

      if (filters.dateRange) {
        const dateFilter: any = {};
        if (filters.dateRange.from) dateFilter.gte = filters.dateRange.from;
        if (filters.dateRange.to) dateFilter.lte = filters.dateRange.to;
        
        if (Object.keys(dateFilter).length > 0) {
          filterClauses.push({
            range: { createdAt: dateFilter }
          });
        }
      }

      if (filters.rating) {
        const ratingFilter: any = {};
        if (filters.rating.min !== undefined) ratingFilter.gte = filters.rating.min;
        if (filters.rating.max !== undefined) ratingFilter.lte = filters.rating.max;
        
        if (Object.keys(ratingFilter).length > 0) {
          filterClauses.push({
            range: { rating: ratingFilter }
          });
        }
      }
    }

    // Build sort
    const sortClause: any[] = [];
    if (sort && sort.length > 0) {
      sort.forEach(s => {
        sortClause.push({ [s.field]: { order: s.order } });
      });
    } else {
      // Default sort: government content first, then by relevance and popularity
      sortClause.push(
        { isGovernmentContent: { order: 'desc' } },
        { _score: { order: 'desc' } },
        { popularity: { order: 'desc' } },
        { createdAt: { order: 'desc' } }
      );
    }

    // Build pagination
    const from = pagination ? (pagination.page - 1) * pagination.size : 0;
    const size = pagination ? pagination.size : 20;

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      from,
      size,
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
    };
  }

  private buildUserQuery(searchQuery: SearchQuery): any {
    const { query, filters, sort, pagination } = searchQuery;
    
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Text search
    if (query && query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
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
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Apply filters
    if (filters) {
      if (filters.subjects && filters.subjects.length > 0) {
        filterClauses.push({
          terms: { subjects: filters.subjects }
        });
      }

      if (filters.gradeLevels && filters.gradeLevels.length > 0) {
        filterClauses.push({
          terms: { gradeLevels: filters.gradeLevels }
        });
      }

      if (filters.verificationStatus && filters.verificationStatus.length > 0) {
        filterClauses.push({
          terms: { verificationStatus: filters.verificationStatus }
        });
      }
    }

    // Build sort
    const sortClause: any[] = [];
    if (sort && sort.length > 0) {
      sort.forEach(s => {
        sortClause.push({ [s.field]: { order: s.order } });
      });
    } else {
      // Default sort: verified users first, then by activity and relevance
      sortClause.push(
        { verificationStatus: { order: 'desc' } },
        { _score: { order: 'desc' } },
        { activityScore: { order: 'desc' } },
        { lastActive: { order: 'desc' } }
      );
    }

    // Build pagination
    const from = pagination ? (pagination.page - 1) * pagination.size : 0;
    const size = pagination ? pagination.size : 20;

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      from,
      size,
      highlight: {
        fields: {
          fullName: {},
          bio: {},
          specializations: {}
        }
      },
      aggs: {
        subjects: {
          terms: { field: 'subjects', size: 20 }
        },
        gradeLevels: {
          terms: { field: 'gradeLevels', size: 20 }
        },
        districts: {
          terms: { field: 'schoolLocation.district', size: 50 }
        },
        verificationStatus: {
          terms: { field: 'verificationStatus', size: 5 }
        }
      }
    };
  }

  private buildCommunityQuery(searchQuery: SearchQuery): any {
    const { query, filters, sort, pagination } = searchQuery;
    
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Text search
    if (query && query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'name^3',
            'description^2',
            'tags'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Build sort
    const sortClause: any[] = [];
    if (sort && sort.length > 0) {
      sort.forEach(s => {
        sortClause.push({ [s.field]: { order: s.order } });
      });
    } else {
      // Default sort: by activity level and member count
      sortClause.push(
        { _score: { order: 'desc' } },
        { activityLevel: { order: 'desc' } },
        { memberCount: { order: 'desc' } },
        { createdAt: { order: 'desc' } }
      );
    }

    // Build pagination
    const from = pagination ? (pagination.page - 1) * pagination.size : 0;
    const size = pagination ? pagination.size : 20;

    return {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      from,
      size,
      highlight: {
        fields: {
          name: {},
          description: {},
          tags: {}
        }
      },
      aggs: {
        types: {
          terms: { field: 'type', size: 10 }
        },
        memberCounts: {
          histogram: {
            field: 'memberCount',
            interval: 10
          }
        }
      }
    };
  }

  async indexResource(resource: any): Promise<void> {
    try {
      // Enhance resource with search-optimized fields
      const searchableResource = {
        ...resource,
        searchText: `${resource.title} ${resource.description} ${resource.tags?.join(' ') || ''}`,
        popularity: this.calculateResourcePopularity(resource)
      };

      await this.client.index({
        index: INDICES.RESOURCES,
        id: resource.id,
        document: searchableResource
      });

      logger.info(`Indexed resource: ${resource.id}`);
    } catch (error) {
      logger.error(`Error indexing resource ${resource.id}:`, error);
      throw error;
    }
  }

  async indexUser(user: any): Promise<void> {
    try {
      // Enhance user with search-optimized fields
      const searchableUser = {
        ...user,
        activityScore: this.calculateUserActivityScore(user)
      };

      await this.client.index({
        index: INDICES.USERS,
        id: user.id,
        document: searchableUser
      });

      logger.info(`Indexed user: ${user.id}`);
    } catch (error) {
      logger.error(`Error indexing user ${user.id}:`, error);
      throw error;
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index,
        id
      });
      logger.info(`Deleted document ${id} from index ${index}`);
    } catch (error) {
      logger.error(`Error deleting document ${id} from index ${index}:`, error);
      throw error;
    }
  }

  private calculateResourcePopularity(resource: any): number {
    // Simple popularity calculation based on downloads, rating, and age
    const downloadWeight = 0.4;
    const ratingWeight = 0.4;
    const ageWeight = 0.2;

    const normalizedDownloads = Math.min(resource.downloadCount / 1000, 1);
    const normalizedRating = (resource.rating || 0) / 5;
    const daysSinceCreation = Math.max(1, (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const normalizedAge = Math.max(0, 1 - (daysSinceCreation / 365)); // Newer content gets higher score

    return (normalizedDownloads * downloadWeight) + 
           (normalizedRating * ratingWeight) + 
           (normalizedAge * ageWeight);
  }

  private calculateUserActivityScore(user: any): number {
    // Simple activity calculation based on connections, resources, and last activity
    const connectionWeight = 0.3;
    const resourceWeight = 0.4;
    const activityWeight = 0.3;

    const normalizedConnections = Math.min((user.connectionCount || 0) / 100, 1);
    const normalizedResources = Math.min((user.resourceCount || 0) / 50, 1);
    
    const daysSinceActive = user.lastActive ? 
      (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60 * 60 * 24) : 365;
    const normalizedActivity = Math.max(0, 1 - (daysSinceActive / 30)); // Active within 30 days gets higher score

    return (normalizedConnections * connectionWeight) + 
           (normalizedResources * resourceWeight) + 
           (normalizedActivity * activityWeight);
  }
}