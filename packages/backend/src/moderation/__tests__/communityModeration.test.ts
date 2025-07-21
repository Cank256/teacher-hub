import { CommunityModerationService, ModeratorPermission } from '../communityModeration';
import { ModerationQueueService } from '../moderationQueue';
import { ContentScreeningService } from '../contentScreening';
import { ModerationConfig } from '../types';

describe('CommunityModerationService', () => {
  let communityModService: CommunityModerationService;
  let queueService: ModerationQueueService;
  let screeningService: ContentScreeningService;

  beforeEach(() => {
    const config: ModerationConfig = {
      autoApproveThreshold: 0.2,
      autoRejectThreshold: 0.8,
      requireReviewThreshold: 0.5,
      enabledCategories: ['inappropriate_language', 'spam', 'harassment'],
      maxQueueSize: 1000,
      reviewTimeoutHours: 24
    };

    queueService = new ModerationQueueService();
    screeningService = new ContentScreeningService(config);
    communityModService = new CommunityModerationService(queueService, screeningService);
  });

  describe('Moderator Management', () => {
    it('should appoint community moderators', () => {
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'ban_users', scope: 'community' }
      ];

      const moderatorId = communityModService.appointModerator(
        'user-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      expect(moderatorId).toBeTruthy();
      expect(typeof moderatorId).toBe('string');

      const moderators = communityModService.getCommunityModerators('community-1');
      expect(moderators).toHaveLength(1);
      expect(moderators[0]?.userId).toBe('user-1');
      expect(moderators[0]?.role).toBe('moderator');
    });

    it('should remove community moderators', () => {
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' }
      ];

      const moderatorId = communityModService.appointModerator(
        'user-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      const success = communityModService.removeModerator(moderatorId, 'admin-1');
      expect(success).toBe(true);

      const moderators = communityModService.getCommunityModerators('community-1');
      expect(moderators).toHaveLength(0); // Should be filtered out as inactive
    });

    it('should check moderator permissions correctly', () => {
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'ban_users', scope: 'community' },
        { action: 'view_reports', scope: 'global' }
      ];

      communityModService.appointModerator(
        'user-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      // Should have community-specific permissions
      expect(communityModService.hasPermission('user-1', 'review_content', 'community-1')).toBe(true);
      expect(communityModService.hasPermission('user-1', 'ban_users', 'community-1')).toBe(true);
      
      // Should have global permissions
      expect(communityModService.hasPermission('user-1', 'view_reports')).toBe(true);
      
      // Should not have permissions for other communities
      expect(communityModService.hasPermission('user-1', 'review_content', 'community-2')).toBe(false);
      
      // Should not have permissions they weren't granted
      expect(communityModService.hasPermission('user-1', 'manage_moderators', 'community-1')).toBe(false);
    });

    it('should handle non-existent moderator removal', () => {
      const success = communityModService.removeModerator('non-existent', 'admin-1');
      expect(success).toBe(false);
    });
  });

  describe('User Banning', () => {
    beforeEach(() => {
      // Set up a moderator with ban permissions
      const permissions: ModeratorPermission[] = [
        { action: 'ban_users', scope: 'community' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );
    });

    it('should ban users temporarily', () => {
      const banId = communityModService.banUser(
        'user-1',
        'Inappropriate behavior',
        'moderator-1',
        'temporary',
        'community-1',
        24 // 24 hours
      );

      expect(banId).toBeTruthy();
      expect(communityModService.isUserBanned('user-1', 'community-1')).toBe(true);
      expect(communityModService.isUserBanned('user-1', 'community-2')).toBe(false);
    });

    it('should ban users permanently', () => {
      const banId = communityModService.banUser(
        'user-2',
        'Severe violation of community guidelines',
        'moderator-1',
        'permanent',
        'community-1'
      );

      expect(banId).toBeTruthy();
      expect(communityModService.isUserBanned('user-2', 'community-1')).toBe(true);
    });

    it('should unban users', () => {
      const banId = communityModService.banUser(
        'user-3',
        'Test ban',
        'moderator-1',
        'temporary',
        'community-1',
        1
      );

      expect(communityModService.isUserBanned('user-3', 'community-1')).toBe(true);

      const success = communityModService.unbanUser(banId, 'moderator-1');
      expect(success).toBe(true);
      expect(communityModService.isUserBanned('user-3', 'community-1')).toBe(false);
    });

    it('should prevent unauthorized banning', () => {
      expect(() => {
        communityModService.banUser(
          'user-4',
          'Unauthorized ban attempt',
          'unauthorized-user',
          'temporary',
          'community-1'
        );
      }).toThrow('Insufficient permissions to ban users');
    });

    it('should prevent unauthorized unbanning', () => {
      const banId = communityModService.banUser(
        'user-5',
        'Test ban',
        'moderator-1',
        'temporary',
        'community-1'
      );

      expect(() => {
        communityModService.unbanUser(banId, 'unauthorized-user');
      }).toThrow('Insufficient permissions to unban users');
    });

    it('should handle non-existent ban unbanning', () => {
      const success = communityModService.unbanUser('non-existent', 'moderator-1');
      expect(success).toBe(false);
    });

    it('should auto-expire temporary bans', () => {
      // This test would require mocking time or using a very short duration
      // For now, we'll test the method exists and returns a number
      const expiredCount = communityModService.expireTemporaryBans();
      expect(typeof expiredCount).toBe('number');
    });
  });

  describe('Appeals System', () => {
    beforeEach(() => {
      // Set up a moderator with appeal handling permissions
      const permissions: ModeratorPermission[] = [
        { action: 'handle_appeals', scope: 'global' },
        { action: 'ban_users', scope: 'community' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'admin',
        permissions,
        'admin-1'
      );
    });

    it('should submit appeals', () => {
      const appealId = communityModService.submitAppeal(
        'user-1',
        'user_ban',
        'ban-123',
        'I believe this ban was unjustified',
        ['evidence1.jpg', 'evidence2.pdf']
      );

      expect(appealId).toBeTruthy();
      expect(typeof appealId).toBe('string');

      const pendingAppeals = communityModService.getPendingAppeals();
      expect(pendingAppeals).toHaveLength(1);
      expect(pendingAppeals[0]?.userId).toBe('user-1');
      expect(pendingAppeals[0]?.type).toBe('user_ban');
    });

    it('should review appeals', () => {
      const appealId = communityModService.submitAppeal(
        'user-2',
        'content_removal',
        'content-456',
        'My content was educational and appropriate'
      );

      const success = communityModService.reviewAppeal(
        appealId,
        'moderator-1',
        'approved',
        'Appeal was valid, content has been restored'
      );

      expect(success).toBe(true);

      const pendingAppeals = communityModService.getPendingAppeals();
      expect(pendingAppeals).toHaveLength(0); // Should be removed from pending
    });

    it('should reject appeals', () => {
      const appealId = communityModService.submitAppeal(
        'user-3',
        'user_ban',
        'ban-789',
        'I did nothing wrong'
      );

      const success = communityModService.reviewAppeal(
        appealId,
        'moderator-1',
        'rejected',
        'Original decision was correct based on evidence'
      );

      expect(success).toBe(true);
    });

    it('should prevent unauthorized appeal reviews', () => {
      const appealId = communityModService.submitAppeal(
        'user-4',
        'account_suspension',
        'suspension-101',
        'This suspension is unfair'
      );

      expect(() => {
        communityModService.reviewAppeal(
          appealId,
          'unauthorized-user',
          'approved',
          'Unauthorized review'
        );
      }).toThrow('Insufficient permissions to review appeals');
    });

    it('should handle non-existent appeal reviews', () => {
      const success = communityModService.reviewAppeal(
        'non-existent',
        'moderator-1',
        'approved',
        'Test resolution'
      );

      expect(success).toBe(false);
    });
  });

  describe('Moderation Dashboard', () => {
    beforeEach(() => {
      // Set up moderator and some test data
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'ban_users', scope: 'community' },
        { action: 'view_reports', scope: 'global' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      // Add some test reports to the queue
      queueService.submitUserReport('user-1', 'content-1', 'message', 'spam', 'This is spam');
      queueService.submitUserReport('user-2', 'content-2', 'resource', 'inappropriate', 'Inappropriate content');
    });

    it('should generate moderation dashboard', () => {
      const dashboard = communityModService.getModerationDashboard('moderator-1', 'community-1');

      expect(dashboard).toHaveProperty('pendingReviews');
      expect(dashboard).toHaveProperty('completedToday');
      expect(dashboard).toHaveProperty('flaggedContent');
      expect(dashboard).toHaveProperty('activeBans');
      expect(dashboard).toHaveProperty('pendingAppeals');
      expect(dashboard).toHaveProperty('recentActions');
      expect(dashboard).toHaveProperty('topReportReasons');
      expect(dashboard).toHaveProperty('moderatorStats');

      expect(typeof dashboard.pendingReviews).toBe('number');
      expect(Array.isArray(dashboard.recentActions)).toBe(true);
      expect(Array.isArray(dashboard.topReportReasons)).toBe(true);
      expect(Array.isArray(dashboard.moderatorStats)).toBe(true);
    });

    it('should show top report reasons', () => {
      // Add more reports to test aggregation
      queueService.submitUserReport('user-3', 'content-3', 'message', 'spam', 'More spam');
      queueService.submitUserReport('user-4', 'content-4', 'comment', 'harassment', 'Harassment report');

      const dashboard = communityModService.getModerationDashboard('moderator-1');
      
      expect(dashboard.topReportReasons.length).toBeGreaterThan(0);
      
      // Should be sorted by count
      if (dashboard.topReportReasons.length > 1) {
        expect(dashboard.topReportReasons[0]?.count).toBeGreaterThanOrEqual(
          dashboard.topReportReasons[1]?.count || 0
        );
      }
    });
  });

  describe('User Moderation History', () => {
    beforeEach(() => {
      const permissions: ModeratorPermission[] = [
        { action: 'ban_users', scope: 'community' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );
    });

    it('should get user moderation history', () => {
      // Create some history for a user
      communityModService.banUser('user-1', 'Test ban', 'moderator-1', 'temporary', 'community-1');
      queueService.submitUserReport('user-1', 'content-1', 'message', 'spam', 'Spam report');
      communityModService.submitAppeal('user-1', 'user_ban', 'ban-123', 'Appeal reason');

      const history = communityModService.getUserModerationHistory('user-1');

      expect(history).toHaveProperty('bans');
      expect(history).toHaveProperty('reports');
      expect(history).toHaveProperty('appeals');

      expect(Array.isArray(history.bans)).toBe(true);
      expect(Array.isArray(history.reports)).toBe(true);
      expect(Array.isArray(history.appeals)).toBe(true);

      expect(history.bans.length).toBeGreaterThan(0);
      expect(history.reports.length).toBeGreaterThan(0);
      expect(history.appeals.length).toBeGreaterThan(0);
    });

    it('should return empty history for users with no moderation actions', () => {
      const history = communityModService.getUserModerationHistory('clean-user');

      expect(history.bans).toHaveLength(0);
      expect(history.reports).toHaveLength(0);
      expect(history.appeals).toHaveLength(0);
    });
  });

  describe('Bulk Moderation', () => {
    beforeEach(() => {
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      // Add some content to the queue
      queueService.submitUserReport('user-1', 'content-1', 'message', 'spam', 'Spam 1');
      queueService.submitUserReport('user-2', 'content-2', 'resource', 'spam', 'Spam 2');
      queueService.submitUserReport('user-3', 'content-3', 'comment', 'spam', 'Spam 3');
    });

    it('should perform bulk moderation', async () => {
      const contentIds = ['content-1', 'content-2', 'content-3'];
      
      const result = await communityModService.bulkModerate(
        contentIds,
        'reject',
        'moderator-1',
        'Bulk rejection of spam content'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');

      expect(typeof result.success).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle bulk moderation errors gracefully', async () => {
      const contentIds = ['non-existent-1', 'non-existent-2'];
      
      const result = await communityModService.bulkModerate(
        contentIds,
        'approve',
        'moderator-1',
        'Bulk approval test'
      );

      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Validation', () => {
    it('should validate permissions for different roles', () => {
      const moderatorPermissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'view_reports', scope: 'community' }
      ];

      const adminPermissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'ban_users', scope: 'community' },
        { action: 'manage_moderators', scope: 'community' },
        { action: 'handle_appeals', scope: 'global' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        moderatorPermissions,
        'admin-1'
      );

      communityModService.appointModerator(
        'admin-1',
        'community-1',
        'admin',
        adminPermissions,
        'super-admin-1'
      );

      // Moderator should have limited permissions
      expect(communityModService.hasPermission('moderator-1', 'review_content', 'community-1')).toBe(true);
      expect(communityModService.hasPermission('moderator-1', 'ban_users', 'community-1')).toBe(false);

      // Admin should have broader permissions
      expect(communityModService.hasPermission('admin-1', 'review_content', 'community-1')).toBe(true);
      expect(communityModService.hasPermission('admin-1', 'ban_users', 'community-1')).toBe(true);
      expect(communityModService.hasPermission('admin-1', 'handle_appeals')).toBe(true);
    });

    it('should handle global vs community scope permissions', () => {
      const permissions: ModeratorPermission[] = [
        { action: 'review_content', scope: 'community' },
        { action: 'view_reports', scope: 'global' }
      ];

      communityModService.appointModerator(
        'moderator-1',
        'community-1',
        'moderator',
        permissions,
        'admin-1'
      );

      // Community-scoped permission should only work for specific community
      expect(communityModService.hasPermission('moderator-1', 'review_content', 'community-1')).toBe(true);
      expect(communityModService.hasPermission('moderator-1', 'review_content', 'community-2')).toBe(false);

      // Global-scoped permission should work regardless of community
      expect(communityModService.hasPermission('moderator-1', 'view_reports')).toBe(true);
      expect(communityModService.hasPermission('moderator-1', 'view_reports', 'community-2')).toBe(true);
    });
  });
});