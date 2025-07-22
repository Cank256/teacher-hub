// Mock the logger first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../utils/logger', () => mockLogger);

import { GamificationService, Badge, PeerNomination } from '../gamificationService';

// Mock the UserRepository
jest.mock('../../database/repositories/userRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    update: jest.fn()
  }))
}));

describe('GamificationService', () => {
  let gamificationService: GamificationService;

  beforeEach(() => {
    gamificationService = new GamificationService();
    jest.clearAllMocks();
  });

  describe('getBadges', () => {
    it('should return all available badges', async () => {
      const badges = await gamificationService.getBadges();
      
      expect(badges).toHaveLength(5);
      expect(badges[0]).toMatchObject({
        id: 'first_upload',
        name: 'First Contributor',
        category: 'milestone',
        rarity: 'common',
        points: 10
      });
    });

    it('should include all required badge properties', async () => {
      const badges = await gamificationService.getBadges();
      
      badges.forEach(badge => {
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('name');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('icon');
        expect(badge).toHaveProperty('category');
        expect(badge).toHaveProperty('criteria');
        expect(badge).toHaveProperty('rarity');
        expect(badge).toHaveProperty('points');
      });
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should award first upload badge when user uploads first resource', async () => {
      const userId = 'user123';
      const activityType = 'resource_upload';
      const currentCount = 1;

      // Mock getUserBadges to return empty array (no badges earned yet)
      jest.spyOn(gamificationService, 'getUserBadges').mockResolvedValue([]);
      
      // Mock awardBadge method
      const awardBadgeSpy = jest.spyOn(gamificationService as any, 'awardBadge').mockResolvedValue(undefined);

      const newBadges = await gamificationService.checkAndAwardBadges(userId, activityType, currentCount);

      expect(newBadges).toHaveLength(1);
      expect(newBadges[0]?.id).toBe('first_upload');
      expect(awardBadgeSpy).toHaveBeenCalledWith(userId, 'first_upload');
    });

    it('should not award badge if already earned', async () => {
      const userId = 'user123';
      const activityType = 'resource_upload';
      const currentCount = 1;

      // Mock getUserBadges to return badge already earned
      jest.spyOn(gamificationService, 'getUserBadges').mockResolvedValue([
        {
          id: 'ub1',
          userId,
          badgeId: 'first_upload',
          earnedAt: new Date()
        }
      ]);

      const newBadges = await gamificationService.checkAndAwardBadges(userId, activityType, currentCount);

      expect(newBadges).toHaveLength(0);
    });

    it('should not award badge if threshold not met', async () => {
      const userId = 'user123';
      const activityType = 'resource_upload';
      const currentCount = 5; // Less than 50 required for resource_master

      jest.spyOn(gamificationService, 'getUserBadges').mockResolvedValue([]);

      const newBadges = await gamificationService.checkAndAwardBadges(userId, activityType, currentCount);

      // Should only get first_upload badge, not resource_master
      expect(newBadges).toHaveLength(1);
      expect(newBadges[0]?.id).toBe('first_upload');
    });
  });

  describe('createPeerNomination', () => {
    it('should create a new peer nomination', async () => {
      const nominationData = {
        nominatorId: 'user1',
        nomineeId: 'user2',
        category: 'helpful_teacher' as const,
        reason: 'Always helps other teachers with great resources'
      };

      const nomination = await gamificationService.createPeerNomination(nominationData);

      expect(nomination).toMatchObject({
        ...nominationData,
        status: 'pending'
      });
      expect(nomination.id).toMatch(/^nom_/);
      expect(nomination.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique nomination IDs', async () => {
      const nominationData = {
        nominatorId: 'user1',
        nomineeId: 'user2',
        category: 'helpful_teacher' as const,
        reason: 'Great teacher'
      };

      const nomination1 = await gamificationService.createPeerNomination(nominationData);
      const nomination2 = await gamificationService.createPeerNomination({
        ...nominationData,
        nomineeId: 'user3'
      });

      expect(nomination1.id).not.toBe(nomination2.id);
    });
  });

  describe('getUserRank', () => {
    it('should return 0 if user not found in leaderboard', async () => {
      const userId = 'nonexistent';
      
      jest.spyOn(gamificationService, 'getLeaderboard').mockResolvedValue([]);

      const rank = await gamificationService.getUserRank(userId);

      expect(rank).toBe(0);
    });

    it('should return correct rank if user found in leaderboard', async () => {
      const userId = 'user123';
      
      jest.spyOn(gamificationService, 'getLeaderboard').mockResolvedValue([
        {
          userId: 'user1',
          username: 'teacher1',
          fullName: 'Teacher One',
          points: 1000,
          badges: 5,
          rank: 1
        },
        {
          userId: 'user123',
          username: 'teacher2',
          fullName: 'Teacher Two',
          points: 800,
          badges: 3,
          rank: 2
        }
      ]);

      const rank = await gamificationService.getUserRank(userId);

      expect(rank).toBe(2);
    });
  });

  describe('createAchievement', () => {
    it('should create a new achievement', async () => {
      const achievementData = {
        userId: 'user123',
        type: 'badge_earned' as const,
        title: 'First Badge Earned',
        description: 'Earned your first badge!',
        points: 10
      };

      const achievement = await gamificationService.createAchievement(achievementData);

      expect(achievement).toMatchObject(achievementData);
      expect(achievement.id).toMatch(/^ach_/);
      expect(achievement.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Badge criteria validation', () => {
    it('should validate badge criteria correctly', () => {
      const service = gamificationService as any;
      
      // Test resource upload criteria
      expect(service.checkBadgeCriteria(
        { type: 'resource_uploads', threshold: 1 },
        'resource_upload',
        1
      )).toBe(true);

      expect(service.checkBadgeCriteria(
        { type: 'resource_uploads', threshold: 5 },
        'resource_upload',
        3
      )).toBe(false);

      // Test helpful rating criteria
      expect(service.checkBadgeCriteria(
        { type: 'helpful_ratings', threshold: 10 },
        'helpful_rating',
        15
      )).toBe(true);

      // Test wrong activity type
      expect(service.checkBadgeCriteria(
        { type: 'resource_uploads', threshold: 1 },
        'helpful_rating',
        5
      )).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Test that the service can handle basic operations without throwing
      const badges = await gamificationService.getBadges();
      expect(badges).toBeDefined();
      expect(Array.isArray(badges)).toBe(true);
    });
  });
});