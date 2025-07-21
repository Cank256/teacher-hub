import { ModerationQueueService } from '../moderationQueue';
import { ModerationFlag } from '../types';

describe('ModerationQueueService', () => {
  let queueService: ModerationQueueService;

  beforeEach(() => {
    queueService = new ModerationQueueService();
  });

  describe('Queue Management', () => {
    it('should add content to moderation queue', () => {
      const flags: ModerationFlag[] = [{
        type: 'inappropriate_language',
        severity: 'medium',
        confidence: 0.7,
        description: 'Detected inappropriate language',
        detectedBy: 'automated'
      }];

      const queueId = queueService.addToQueue(
        'content-1',
        'message',
        flags,
        'high'
      );

      expect(queueId).toBeTruthy();
      expect(typeof queueId).toBe('string');

      const pendingItems = queueService.getPendingItems();
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0]?.contentId).toBe('content-1');
      expect(pendingItems[0]?.priority).toBe('high');
    });

    it('should get pending items with filters', () => {
      // Add multiple items with different priorities
      const flags: ModerationFlag[] = [{
        type: 'spam',
        severity: 'low',
        confidence: 0.5,
        description: 'Potential spam detected',
        detectedBy: 'automated'
      }];

      queueService.addToQueue('content-1', 'message', flags, 'low');
      queueService.addToQueue('content-2', 'resource', flags, 'high');
      queueService.addToQueue('content-3', 'message', flags, 'medium');

      // Test priority filtering
      const highPriorityItems = queueService.getPendingItems(undefined, 'high');
      expect(highPriorityItems).toHaveLength(1);
      expect(highPriorityItems[0]?.contentId).toBe('content-2');

      // Test limit
      const limitedItems = queueService.getPendingItems(undefined, undefined, 2);
      expect(limitedItems.length).toBeLessThanOrEqual(2);
    });

    it('should sort items by priority and creation date', () => {
      const flags: ModerationFlag[] = [{
        type: 'harassment',
        severity: 'high',
        confidence: 0.8,
        description: 'Harassment detected',
        detectedBy: 'automated'
      }];

      // Add items in different order
      queueService.addToQueue('content-low', 'message', flags, 'low');
      queueService.addToQueue('content-urgent', 'message', flags, 'urgent');
      queueService.addToQueue('content-medium', 'message', flags, 'medium');
      queueService.addToQueue('content-high', 'message', flags, 'high');

      const pendingItems = queueService.getPendingItems();
      
      // Should be sorted by priority: urgent > high > medium > low
      expect(pendingItems[0]?.contentId).toBe('content-urgent');
      expect(pendingItems[1]?.contentId).toBe('content-high');
      expect(pendingItems[2]?.contentId).toBe('content-medium');
      expect(pendingItems[3]?.contentId).toBe('content-low');
    });

    it('should assign items to moderators', () => {
      const flags: ModerationFlag[] = [{
        type: 'adult_content',
        severity: 'high',
        confidence: 0.9,
        description: 'Adult content detected',
        detectedBy: 'automated'
      }];

      const queueId = queueService.addToQueue('content-1', 'resource', flags);
      
      const success = queueService.assignToModerator(queueId, 'moderator-1');
      expect(success).toBe(true);

      const pendingItems = queueService.getPendingItems();
      expect(pendingItems).toHaveLength(0); // Should be moved to in_review

      const assignedItems = queueService.getPendingItems('moderator-1');
      expect(assignedItems).toHaveLength(0); // getPendingItems only returns 'pending' status
    });

    it('should complete moderation reviews', () => {
      const flags: ModerationFlag[] = [{
        type: 'violence',
        severity: 'high',
        confidence: 0.8,
        description: 'Violence detected',
        detectedBy: 'automated'
      }];

      const queueId = queueService.addToQueue('content-1', 'message', flags);
      queueService.assignToModerator(queueId, 'moderator-1');
      
      const success = queueService.completeReview(
        queueId,
        'moderator-1',
        'rejected',
        'Content violates community guidelines'
      );
      
      expect(success).toBe(true);
    });

    it('should prevent unauthorized review completion', () => {
      const flags: ModerationFlag[] = [{
        type: 'hate_speech',
        severity: 'critical',
        confidence: 0.95,
        description: 'Hate speech detected',
        detectedBy: 'automated'
      }];

      const queueId = queueService.addToQueue('content-1', 'comment', flags);
      queueService.assignToModerator(queueId, 'moderator-1');
      
      // Try to complete review with different moderator
      const success = queueService.completeReview(
        queueId,
        'moderator-2',
        'approved'
      );
      
      expect(success).toBe(false);
    });
  });

  describe('User Reports', () => {
    it('should submit user reports', () => {
      const reportId = queueService.submitUserReport(
        'user-1',
        'content-1',
        'message',
        'harassment',
        'This message contains harassment and bullying'
      );

      expect(reportId).toBeTruthy();
      expect(typeof reportId).toBe('string');

      const reports = queueService.getUserReports();
      expect(reports).toHaveLength(1);
      expect(reports[0]?.reporterId).toBe('user-1');
      expect(reports[0]?.reason).toBe('harassment');
    });

    it('should create queue item for reported content', () => {
      queueService.submitUserReport(
        'user-1',
        'content-1',
        'resource',
        'inappropriate',
        'This content is inappropriate for educational use'
      );

      const pendingItems = queueService.getPendingItems();
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0]?.contentId).toBe('content-1');
      expect(pendingItems[0]?.userReports).toHaveLength(1);
    });

    it('should add reports to existing queue items', () => {
      // First report
      queueService.submitUserReport(
        'user-1',
        'content-1',
        'message',
        'spam',
        'This is spam'
      );

      // Second report for same content
      queueService.submitUserReport(
        'user-2',
        'content-1',
        'message',
        'harassment',
        'This is harassment'
      );

      const pendingItems = queueService.getPendingItems();
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0]?.userReports).toHaveLength(2);
    });

    it('should increase priority with multiple reports', () => {
      // Submit multiple reports for same content
      for (let i = 1; i <= 4; i++) {
        queueService.submitUserReport(
          `user-${i}`,
          'content-1',
          'message',
          'inappropriate',
          `Report ${i}`
        );
      }

      const pendingItems = queueService.getPendingItems();
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0]?.priority).toBe('high'); // Should be elevated
      expect(pendingItems[0]?.userReports).toHaveLength(4);
    });

    it('should filter reports by status', () => {
      queueService.submitUserReport('user-1', 'content-1', 'message', 'spam', 'Spam report');
      queueService.submitUserReport('user-2', 'content-2', 'resource', 'copyright', 'Copyright report');

      const allReports = queueService.getUserReports();
      expect(allReports).toHaveLength(2);

      const pendingReports = queueService.getUserReports('pending');
      expect(pendingReports).toHaveLength(2);

      const resolvedReports = queueService.getUserReports('resolved');
      expect(resolvedReports).toHaveLength(0);
    });

    it('should review user reports', () => {
      const reportId = queueService.submitUserReport(
        'user-1',
        'content-1',
        'message',
        'harassment',
        'Harassment report'
      );

      const success = queueService.reviewUserReport(
        reportId,
        'moderator-1',
        'resolved',
        'Report was valid and action was taken'
      );

      expect(success).toBe(true);

      const reports = queueService.getUserReports();
      const reviewedReport = reports.find(r => r.id === reportId);
      expect(reviewedReport?.status).toBe('resolved');
      expect(reviewedReport?.reviewedBy).toBe('moderator-1');
      expect(reviewedReport?.resolution).toBe('Report was valid and action was taken');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should generate moderation statistics', () => {
      // Add some test data
      const flags: ModerationFlag[] = [{
        type: 'spam',
        severity: 'low',
        confidence: 0.6,
        description: 'Spam detected',
        detectedBy: 'automated'
      }];

      const queueId1 = queueService.addToQueue('content-1', 'message', flags);
      const queueId2 = queueService.addToQueue('content-2', 'resource', flags);

      queueService.assignToModerator(queueId1, 'moderator-1');
      queueService.completeReview(queueId1, 'moderator-1', 'approved');

      const stats = queueService.getStats();

      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('autoApproved');
      expect(stats).toHaveProperty('autoRejected');
      expect(stats).toHaveProperty('flagged');
      expect(stats).toHaveProperty('pendingReview');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('flagsByCategory');
      expect(stats).toHaveProperty('moderatorStats');

      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.pendingReview).toBeGreaterThan(0);
    });

    it('should generate statistics with time range', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = queueService.getStats({
        start: yesterday,
        end: tomorrow
      });

      expect(stats).toHaveProperty('totalProcessed');
      expect(typeof stats.totalProcessed).toBe('number');
    });

    it('should get queue status', () => {
      const flags: ModerationFlag[] = [{
        type: 'misinformation',
        severity: 'medium',
        confidence: 0.7,
        description: 'Potential misinformation',
        detectedBy: 'automated'
      }];

      queueService.addToQueue('content-1', 'message', flags, 'low');
      queueService.addToQueue('content-2', 'resource', flags, 'high');
      queueService.addToQueue('content-3', 'comment', flags, 'medium');

      const status = queueService.getQueueStatus();

      expect(status.totalItems).toBe(3);
      expect(status.pendingItems).toBe(3);
      expect(status.inReviewItems).toBe(0);
      expect(status.completedItems).toBe(0);
      expect(status.itemsByPriority.low).toBe(1);
      expect(status.itemsByPriority.high).toBe(1);
      expect(status.itemsByPriority.medium).toBe(1);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up old items', () => {
      const flags: ModerationFlag[] = [{
        type: 'copyright',
        severity: 'medium',
        confidence: 0.8,
        description: 'Copyright violation detected',
        detectedBy: 'automated'
      }];

      // Add and complete some items
      const queueId = queueService.addToQueue('content-1', 'resource', flags);
      queueService.assignToModerator(queueId, 'moderator-1');
      queueService.completeReview(queueId, 'moderator-1', 'rejected');

      // Submit and resolve a report
      const reportId = queueService.submitUserReport(
        'user-1',
        'content-2',
        'message',
        'spam',
        'Spam report'
      );
      queueService.reviewUserReport(reportId, 'moderator-1', 'resolved');

      const removedCount = queueService.cleanup(0); // Clean up everything
      expect(removedCount).toBeGreaterThan(0);
    });

    it('should preserve recent items during cleanup', () => {
      const flags: ModerationFlag[] = [{
        type: 'harassment',
        severity: 'high',
        confidence: 0.9,
        description: 'Harassment detected',
        detectedBy: 'automated'
      }];

      // Add recent item
      queueService.addToQueue('recent-content', 'message', flags);

      const removedCount = queueService.cleanup(30); // Clean up items older than 30 days
      expect(removedCount).toBe(0); // Should not remove recent items

      const status = queueService.getQueueStatus();
      expect(status.totalItems).toBe(1); // Recent item should remain
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queue operations', () => {
      const assignSuccess = queueService.assignToModerator('non-existent', 'moderator-1');
      expect(assignSuccess).toBe(false);

      const reviewSuccess = queueService.completeReview('non-existent', 'moderator-1', 'approved');
      expect(reviewSuccess).toBe(false);
    });

    it('should handle invalid report operations', () => {
      const reviewSuccess = queueService.reviewUserReport('non-existent', 'moderator-1', 'resolved');
      expect(reviewSuccess).toBe(false);
    });

    it('should handle edge cases in statistics', () => {
      // Test with empty data
      const stats = queueService.getStats();
      
      expect(stats.totalProcessed).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(Object.keys(stats.moderatorStats)).toHaveLength(0);
    });
  });

  describe('Priority and Severity Mapping', () => {
    it('should map report reasons to appropriate priorities', () => {
      queueService.submitUserReport('user-1', 'content-1', 'message', 'harassment', 'Harassment');
      queueService.submitUserReport('user-2', 'content-2', 'message', 'spam', 'Spam');
      queueService.submitUserReport('user-3', 'content-3', 'message', 'copyright', 'Copyright');

      const items = queueService.getPendingItems();
      
      const harassmentItem = items.find(i => i.contentId === 'content-1');
      const spamItem = items.find(i => i.contentId === 'content-2');
      const copyrightItem = items.find(i => i.contentId === 'content-3');

      expect(harassmentItem?.priority).toBe('high');
      expect(spamItem?.priority).toBe('low');
      expect(copyrightItem?.priority).toBe('medium');
    });

    it('should map report reasons to flag types correctly', () => {
      queueService.submitUserReport('user-1', 'content-1', 'message', 'inappropriate', 'Inappropriate');
      queueService.submitUserReport('user-2', 'content-2', 'message', 'harassment', 'Harassment');
      queueService.submitUserReport('user-3', 'content-3', 'message', 'spam', 'Spam');

      const items = queueService.getPendingItems();
      
      const inappropriateItem = items.find(i => i.contentId === 'content-1');
      const harassmentItem = items.find(i => i.contentId === 'content-2');
      const spamItem = items.find(i => i.contentId === 'content-3');

      expect(inappropriateItem?.flags[0]?.type).toBe('inappropriate_language');
      expect(harassmentItem?.flags[0]?.type).toBe('harassment');
      expect(spamItem?.flags[0]?.type).toBe('spam');
    });
  });
});