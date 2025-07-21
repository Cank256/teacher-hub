import { SearchService, SearchQuery } from './searchService';
import logger from '../utils/logger';

export interface UserProfile {
  id: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
  };
  yearsExperience: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  recentActivity?: {
    viewedResources: string[];
    downloadedResources: string[];
    searchQueries: string[];
    interactions: UserInteraction[];
  };
}

export interface UserInteraction {
  resourceId: string;
  action: 'view' | 'download' | 'rate' | 'share';
  timestamp: Date;
  metadata?: any;
}

export interface PersonalizedRecommendation {
  resourceId: string;
  title: string;
  description?: string;
  type: string;
  subjects: string[];
  gradeLevels?: string[];
  author?: {
    id: string;
    fullName: string;
  };
  rating?: number;
  downloadCount?: number;
  relevanceScore: number;
  recommendationReason: string;
  createdAt?: string;
}

export interface TrendingContent {
  resourceId: string;
  title: string;
  description?: string;
  type: string;
  subjects: string[];
  gradeLevels?: string[];
  downloadCount: number;
  rating: number;
  trendingScore: number;
  growthRate: number;
  createdAt: string;
}

export class RecommendationService {
  private searchService: SearchService;
  private userInteractions: Map<string, UserInteraction[]> = new Map();

  constructor() {
    this.searchService = new SearchService();
  }

  async getPersonalizedRecommendations(
    userProfile: UserProfile, 
    limit: number = 10
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const recommendations: PersonalizedRecommendation[] = [];

      // Get content-based recommendations (similar to user's subjects/grades)
      const contentBasedRecs = await this.getContentBasedRecommendations(userProfile, Math.ceil(limit * 0.6));
      recommendations.push(...contentBasedRecs);

      // Get collaborative filtering recommendations (similar users' content)
      const collaborativeRecs = await this.getCollaborativeRecommendations(userProfile, Math.ceil(limit * 0.4));
      recommendations.push(...collaborativeRecs);

      // Remove duplicates and sort by relevance score
      const uniqueRecs = this.removeDuplicateRecommendations(recommendations);
      const sortedRecs = uniqueRecs.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return sortedRecs.slice(0, limit);
    } catch (error) {
      logger.error('Error generating personalized recommendations:', error);
      throw error;
    }
  }

  async getTrendingContent(
    userSubjects?: string[], 
    limit: number = 10
  ): Promise<TrendingContent[]> {
    try {
      // Build search query for trending content
      const searchQuery: SearchQuery = {
        query: '',
        filters: {
          subjects: userSubjects,
          verificationStatus: ['verified'],
          dateRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
          }
        },
        sort: [
          { field: 'downloadCount', order: 'desc' },
          { field: 'rating', order: 'desc' },
          { field: '_score', order: 'desc' }
        ],
        pagination: {
          page: 1,
          size: limit * 2 // Get more to calculate trending scores
        }
      };

      const searchResults = await this.searchService.searchResources(searchQuery);
      
      const trendingContent: TrendingContent[] = searchResults.hits.map((resource: any) => {
        const growthRate = this.calculateGrowthRate(resource);
        const trendingScore = resource._score || 0;

        return {
          resourceId: resource.id,
          title: resource.title,
          description: resource.description,
          type: resource.type,
          subjects: resource.subjects || [],
          gradeLevels: resource.gradeLevels,
          downloadCount: resource.downloadCount || 0,
          rating: resource.rating || 0,
          trendingScore,
          growthRate,
          createdAt: resource.createdAt
        };
      });

      // Sort by trending score and growth rate
      return trendingContent
        .sort((a, b) => (b.trendingScore + b.growthRate) - (a.trendingScore + a.growthRate))
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting trending content:', error);
      throw error;
    }
  }

  async updateUserInteraction(
    userId: string, 
    resourceId: string, 
    action: 'view' | 'download' | 'rate' | 'share',
    metadata?: any
  ): Promise<void> {
    try {
      const interaction: UserInteraction = {
        resourceId,
        action,
        timestamp: new Date(),
        metadata
      };

      if (!this.userInteractions.has(userId)) {
        this.userInteractions.set(userId, []);
      }

      const userInteractionList = this.userInteractions.get(userId)!;
      userInteractionList.push(interaction);

      // Keep only recent interactions (last 1000)
      if (userInteractionList.length > 1000) {
        userInteractionList.splice(0, userInteractionList.length - 1000);
      }

      logger.info(`Recorded ${action} interaction for user ${userId} on resource ${resourceId}`);
    } catch (error) {
      logger.error('Error updating user interaction:', error);
      throw error;
    }
  }

  async getRecommendationExplanation(userId: string, resourceId: string): Promise<string> {
    try {
      // This is a simplified explanation - in a real system, you'd track the actual recommendation logic
      const explanations = [
        'recommended based on your subject interests',
        'recommended based on similar teachers\' preferences',
        'recommended based on high ratings in your field',
        'recommended based on trending content in your subjects',
        'recommended based on your recent activity'
      ];

      const randomExplanation = explanations[Math.floor(Math.random() * explanations.length)];
      return `This resource was ${randomExplanation}.`;
    } catch (error) {
      logger.error('Error getting recommendation explanation:', error);
      return 'This resource was recommended based on your profile and activity.';
    }
  }

  private async getContentBasedRecommendations(
    userProfile: UserProfile, 
    limit: number
  ): Promise<PersonalizedRecommendation[]> {
    const searchQuery: SearchQuery = {
      query: userProfile.subjects.join(' '),
      filters: {
        subjects: userProfile.subjects,
        gradeLevels: userProfile.gradeLevels,
        verificationStatus: ['verified']
      },
      sort: [
        { field: 'rating', order: 'desc' },
        { field: 'downloadCount', order: 'desc' }
      ],
      pagination: {
        page: 1,
        size: limit
      }
    };

    const searchResults = await this.searchService.searchResources(searchQuery);
    
    return searchResults.hits.map((resource: any) => ({
      resourceId: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      subjects: resource.subjects || [],
      gradeLevels: resource.gradeLevels,
      author: resource.author,
      rating: resource.rating,
      downloadCount: resource.downloadCount,
      relevanceScore: this.calculateContentBasedScore(resource, userProfile),
      recommendationReason: 'Matches your subject interests and grade levels',
      createdAt: resource.createdAt
    }));
  }

  private async getCollaborativeRecommendations(
    userProfile: UserProfile, 
    limit: number
  ): Promise<PersonalizedRecommendation[]> {
    // Find similar users
    const similarUsersQuery: SearchQuery = {
      query: '',
      filters: {
        subjects: userProfile.subjects,
        gradeLevels: userProfile.gradeLevels,
        verificationStatus: ['verified']
      },
      pagination: {
        page: 1,
        size: 20
      }
    };

    const similarUsers = await this.searchService.searchUsers(similarUsersQuery);
    
    // Get resources that similar users have interacted with
    // This is simplified - in a real system, you'd track actual user interactions
    const collaborativeQuery: SearchQuery = {
      query: '',
      filters: {
        subjects: userProfile.subjects,
        verificationStatus: ['verified']
      },
      sort: [
        { field: 'rating', order: 'desc' },
        { field: 'downloadCount', order: 'desc' }
      ],
      pagination: {
        page: 1,
        size: limit
      }
    };

    const searchResults = await this.searchService.searchResources(collaborativeQuery);
    
    return searchResults.hits.map((resource: any) => ({
      resourceId: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      subjects: resource.subjects || [],
      gradeLevels: resource.gradeLevels,
      author: resource.author,
      rating: resource.rating,
      downloadCount: resource.downloadCount,
      relevanceScore: this.calculateCollaborativeScore(resource, userProfile),
      recommendationReason: 'Popular among teachers with similar profiles',
      createdAt: resource.createdAt
    }));
  }

  private calculateContentBasedScore(resource: any, userProfile: UserProfile): number {
    let score = 0;

    // Subject match score (40%)
    const subjectMatches = resource.subjects?.filter((subject: string) => 
      userProfile.subjects.includes(subject)
    ).length || 0;
    const subjectScore = subjectMatches / Math.max(userProfile.subjects.length, 1);
    score += subjectScore * 0.4;

    // Grade level match score (30%)
    const gradeLevelMatches = resource.gradeLevels?.filter((grade: string) => 
      userProfile.gradeLevels.includes(grade)
    ).length || 0;
    const gradeLevelScore = gradeLevelMatches / Math.max(userProfile.gradeLevels.length, 1);
    score += gradeLevelScore * 0.3;

    // Quality score (20%)
    const qualityScore = (resource.rating || 0) / 5;
    score += qualityScore * 0.2;

    // Popularity score (10%)
    const popularityScore = Math.min((resource.downloadCount || 0) / 1000, 1);
    score += popularityScore * 0.1;

    return Math.min(score, 1);
  }

  private calculateCollaborativeScore(resource: any, userProfile: UserProfile): number {
    // Simplified collaborative scoring
    let score = 0;

    // Base score from resource quality
    const qualityScore = (resource.rating || 0) / 5;
    score += qualityScore * 0.5;

    // Popularity among similar users (simplified)
    const popularityScore = Math.min((resource.downloadCount || 0) / 500, 1);
    score += popularityScore * 0.3;

    // Recency bonus
    const daysSinceCreation = (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceCreation / 365));
    score += recencyScore * 0.2;

    return Math.min(score, 1);
  }

  private calculateGrowthRate(resource: any): number {
    // Simplified growth rate calculation
    const daysSinceCreation = Math.max(1, (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const downloadsPerDay = (resource.downloadCount || 0) / daysSinceCreation;
    
    // Normalize to 0-1 scale
    return Math.min(downloadsPerDay / 10, 1);
  }

  private removeDuplicateRecommendations(recommendations: PersonalizedRecommendation[]): PersonalizedRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      if (seen.has(rec.resourceId)) {
        return false;
      }
      seen.add(rec.resourceId);
      return true;
    });
  }
}
