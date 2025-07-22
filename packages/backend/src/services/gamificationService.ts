import { UserRepository } from '../database/repositories/userRepository';
import logger from '../utils/logger';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'contribution' | 'engagement' | 'achievement' | 'milestone';
  criteria: BadgeCriteria;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface BadgeCriteria {
  type: 'resource_uploads' | 'helpful_ratings' | 'community_participation' | 'peer_nominations' | 'login_streak' | 'profile_completion';
  threshold: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress?: number;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'badge_earned' | 'milestone_reached' | 'peer_nominated' | 'top_contributor';
  title: string;
  description: string;
  points: number;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName: string;
  points: number;
  badges: number;
  rank: number;
  avatar?: string;
}

export interface PeerNomination {
  id: string;
  nominatorId: string;
  nomineeId: string;
  category: 'helpful_teacher' | 'innovative_educator' | 'community_leader' | 'resource_creator';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export class GamificationService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // Badge system
  async getBadges(): Promise<Badge[]> {
    return [
      {
        id: 'first_upload',
        name: 'First Contributor',
        description: 'Upload your first educational resource',
        icon: '🎯',
        category: 'milestone',
        criteria: { type: 'resource_uploads', threshold: 1 },
        rarity: 'common',
        points: 10
      },
      {
        id: 'helpful_teacher',
        name: 'Helpful Teacher',
        description: 'Receive 10 helpful ratings from peers',
        icon: '⭐',
        category: 'engagement',
        criteria: { type: 'helpful_ratings', threshold: 10 },
        rarity: 'uncommon',
        points: 25
      },
      {
        id: 'resource_master',
        name: 'Resource Master',
        description: 'Upload 50 high-quality resources',
        icon: '📚',
        category: 'contribution',
        criteria: { type: 'resource_uploads', threshold: 50 },
        rarity: 'rare',
        points: 100
      },
      {
        id: 'community_champion',
        name: 'Community Champion',
        description: 'Active in community discussions for 30 days',
        icon: '🏆',
        category: 'engagement',
        criteria: { type: 'community_participation', threshold: 30, timeframe: 'daily' },
        rarity: 'epic',
        points: 150
      },
      {
        id: 'peer_favorite',
        name: 'Peer Favorite',
        description: 'Receive 5 peer nominations',
        icon: '💎',
        category: 'achievement',
        criteria: { type: 'peer_nominations', threshold: 5 },
        rarity: 'legendary',
        points: 200
      }
    ];
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      // This would typically query the database
      // For now, returning mock data structure
      return [];
    } catch (error) {
      logger.error('Error fetching user badges:', error);
      throw new Error('Failed to fetch user badges');
    }
  }

  async checkAndAwardBadges(userId: string, activityType: string, currentCount: number): Promise<Badge[]> {
    try {
      const badges = await this.getBadges();
      const userBadges = await this.getUserBadges(userId);
      const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
      const newBadges: Badge[] = [];

      for (const badge of badges) {
        if (earnedBadgeIds.includes(badge.id)) continue;

        const meetsThreshold = this.checkBadgeCriteria(badge.criteria, activityType, currentCount);
        if (meetsThreshold) {
          await this.awardBadge(userId, badge.id);
          newBadges.push(badge);
        }
      }

      return newBadges;
    } catch (error) {
      logger.error('Error checking and awarding badges:', error);
      throw new Error('Failed to check badges');
    }
  }

  private checkBadgeCriteria(criteria: BadgeCriteria, activityType: string, currentCount: number): boolean {
    const activityTypeMap: Record<string, string> = {
      'resource_upload': 'resource_uploads',
      'helpful_rating': 'helpful_ratings',
      'community_post': 'community_participation',
      'peer_nomination': 'peer_nominations'
    };

    return activityTypeMap[activityType] === criteria.type && currentCount >= criteria.threshold;
  }

  private async awardBadge(userId: string, badgeId: string): Promise<void> {
    // Implementation would insert into user_badges table
    logger.info(`Badge ${badgeId} awarded to user ${userId}`);
  }

  // Leaderboard system
  async getLeaderboard(timeframe: 'weekly' | 'monthly' | 'all_time' = 'all_time', limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      // This would typically query the database with proper aggregation
      // For now, returning mock structure
      return [];
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  async getUserRank(userId: string, timeframe: 'weekly' | 'monthly' | 'all_time' = 'all_time'): Promise<number> {
    try {
      const leaderboard = await this.getLeaderboard(timeframe, 1000);
      const userEntry = leaderboard.find(entry => entry.userId === userId);
      return userEntry?.rank || 0;
    } catch (error) {
      logger.error('Error fetching user rank:', error);
      throw new Error('Failed to fetch user rank');
    }
  }

  // Peer nomination system
  async createPeerNomination(nomination: Omit<PeerNomination, 'id' | 'status' | 'createdAt'>): Promise<PeerNomination> {
    try {
      const newNomination: PeerNomination = {
        ...nomination,
        id: `nom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        createdAt: new Date()
      };

      // Implementation would insert into peer_nominations table
      logger.info(`Peer nomination created: ${newNomination.id}`);
      
      return newNomination;
    } catch (error) {
      logger.error('Error creating peer nomination:', error);
      throw new Error('Failed to create peer nomination');
    }
  }

  async getPeerNominations(userId: string, type: 'sent' | 'received' = 'received'): Promise<PeerNomination[]> {
    try {
      // This would typically query the database
      return [];
    } catch (error) {
      logger.error('Error fetching peer nominations:', error);
      throw new Error('Failed to fetch peer nominations');
    }
  }

  async reviewPeerNomination(nominationId: string, reviewerId: string, approved: boolean): Promise<void> {
    try {
      // Implementation would update the nomination status
      if (approved) {
        // Award points and potentially badges to the nominee
        logger.info(`Peer nomination ${nominationId} approved by ${reviewerId}`);
      } else {
        logger.info(`Peer nomination ${nominationId} rejected by ${reviewerId}`);
      }
    } catch (error) {
      logger.error('Error reviewing peer nomination:', error);
      throw new Error('Failed to review peer nomination');
    }
  }

  // Points and achievements
  async addUserPoints(userId: string, points: number, reason: string): Promise<void> {
    try {
      // Implementation would update user points in database
      logger.info(`Added ${points} points to user ${userId} for: ${reason}`);
    } catch (error) {
      logger.error('Error adding user points:', error);
      throw new Error('Failed to add user points');
    }
  }

  async getUserAchievements(userId: string, limit: number = 20): Promise<Achievement[]> {
    try {
      // This would typically query the database
      return [];
    } catch (error) {
      logger.error('Error fetching user achievements:', error);
      throw new Error('Failed to fetch user achievements');
    }
  }

  async createAchievement(achievement: Omit<Achievement, 'id' | 'createdAt'>): Promise<Achievement> {
    try {
      const newAchievement: Achievement = {
        ...achievement,
        id: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };

      // Implementation would insert into achievements table
      logger.info(`Achievement created: ${newAchievement.id}`);
      
      return newAchievement;
    } catch (error) {
      logger.error('Error creating achievement:', error);
      throw new Error('Failed to create achievement');
    }
  }
}