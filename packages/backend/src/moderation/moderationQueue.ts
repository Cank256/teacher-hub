import { v4 as uuidv4 } from 'uuid';
import { 
  ModerationQueue, 
  UserReport, 
  ContentModerationResult,
  ModerationFlag,
  ModerationStats 
} from './types';
import logger from '../utils/logger';

export class ModerationQueueService {
  private queue: ModerationQueue[] = [];
  private reports: UserReport[] = [];
  private moderationResults: ContentModerationResult[] = [];

  /**
   * Add content to moderation queue
   */
  addToQueue(
    contentId: string,
    contentType: 'resource' | 'message' | 'profile' | 'comment',
    flags: ModerationFlag[],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): string {
    const queueItem: ModerationQueue = {
      id: uuidv4(),
      contentId,
      contentType,
      priority,
      status: 'pending',
      flags,
      userReports: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queue.push(queueItem);
    
    logger.info('Content added to moderation queue', {
      queueId: queueItem.id,
      contentId,
      contentType,
      priority,
      flagCount: flags.length
    });

    return queueItem.id;
  }

  /**
   * Get pending items from queue
   */
  getPendingItems(
    assignedTo?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent',
    limit: number = 50
  ): ModerationQueue[] {
    let items = this.queue.filter(item => item.status === 'pending');

    if (assignedTo) {
      items = items.filter(item => item.assignedTo === assignedTo);
    }

    if (priority) {
      items = items.filter(item => item.priority === priority);
    }

    // Sort by priority and creation date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    items.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return items.slice(0, limit);
  }

  /**
   * Assign queue item to moderator
   */
  assignToModerator(queueId: string, moderatorId: string): boolean {
    const item = this.queue.find(q => q.id === queueId);
    
    if (!item || item.status !== 'pending') {
      return false;
    }

    item.assignedTo = moderatorId;
    item.status = 'in_review';
    item.updatedAt = new Date();

    logger.info('Queue item assigned to moderator', {
      queueId,
      moderatorId,
      contentId: item.contentId
    });

    return true;
  }

  /**
   * Complete moderation review
   */
  completeReview(
    queueId: string,
    moderatorId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): boolean {
    const item = this.queue.find(q => q.id === queueId);
    
    if (!item || item.assignedTo !== moderatorId) {
      return false;
    }

    item.status = 'completed';
    item.updatedAt = new Date();

    // Create moderation result
    const result: ContentModerationResult = {
      id: uuidv4(),
      contentId: item.contentId,
      contentType: item.contentType,
      status: decision,
      confidence: 1.0, // Manual review has full confidence
      flags: item.flags,
      reviewedBy: moderatorId,
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.moderationResults.push(result);

    logger.info('Moderation review completed', {
      queueId,
      moderatorId,
      contentId: item.contentId,
      decision,
      notes
    });

    return true;
  }

  /**
   * Submit user report
   */
  submitUserReport(
    reporterId: string,
    contentId: string,
    contentType: 'resource' | 'message' | 'profile' | 'comment',
    reason: 'inappropriate' | 'spam' | 'harassment' | 'copyright' | 'other',
    description: string
  ): string {
    const report: UserReport = {
      id: uuidv4(),
      reporterId,
      contentId,
      contentType,
      reason,
      description,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reports.push(report);

    // Check if this content is already in the queue
    let queueItem = this.queue.find(q => 
      q.contentId === contentId && 
      q.contentType === contentType &&
      q.status !== 'completed'
    );

    if (queueItem) {
      // Add report to existing queue item
      queueItem.userReports.push(report);
      
      // Increase priority if multiple reports
      if (queueItem.userReports.length >= 3 && queueItem.priority !== 'urgent') {
        queueItem.priority = 'high';
      }
      
      queueItem.updatedAt = new Date();
    } else {
      // Create new queue item for reported content
      const priority = this.calculateReportPriority(reason);
      
      queueItem = {
        id: uuidv4(),
        contentId,
        contentType,
        priority,
        status: 'pending',
        flags: [{
          type: this.mapReasonToFlagType(reason),
          severity: 'medium',
          confidence: 0.7,
          description: `User reported: ${reason}`,
          detectedBy: 'user_report'
        }],
        userReports: [report],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.queue.push(queueItem);
    }

    logger.info('User report submitted', {
      reportId: report.id,
      reporterId,
      contentId,
      reason,
      queueId: queueItem.id
    });

    return report.id;
  }

  /**
   * Get user reports
   */
  getUserReports(
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    limit: number = 50
  ): UserReport[] {
    let reports = [...this.reports];

    if (status) {
      reports = reports.filter(r => r.status === status);
    }

    return reports
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Review user report
   */
  reviewUserReport(
    reportId: string,
    moderatorId: string,
    decision: 'resolved' | 'dismissed',
    resolution?: string
  ): boolean {
    const report = this.reports.find(r => r.id === reportId);
    
    if (!report || report.status !== 'pending') {
      return false;
    }

    report.status = decision;
    report.reviewedBy = moderatorId;
    report.reviewedAt = new Date();
    report.resolution = resolution;
    report.updatedAt = new Date();

    logger.info('User report reviewed', {
      reportId,
      moderatorId,
      decision,
      resolution
    });

    return true;
  }

  /**
   * Get moderation statistics
   */
  getStats(timeRange?: { start: Date; end: Date }): ModerationStats {
    let results = [...this.moderationResults];
    let reports = [...this.reports];

    if (timeRange) {
      results = results.filter(r => 
        r.createdAt >= timeRange.start && r.createdAt <= timeRange.end
      );
      reports = reports.filter(r => 
        r.createdAt >= timeRange.start && r.createdAt <= timeRange.end
      );
    }

    const totalProcessed = results.length;
    const autoApproved = results.filter(r => r.status === 'approved' && !r.reviewedBy).length;
    const autoRejected = results.filter(r => r.status === 'rejected' && !r.reviewedBy).length;
    const flagged = results.filter(r => r.status === 'flagged').length;
    const pendingReview = this.queue.filter(q => q.status === 'pending').length;

    // Calculate average processing time
    const processedItems = results.filter(r => r.reviewedAt);
    const totalProcessingTime = processedItems.reduce((sum, r) => {
      if (r.reviewedAt) {
        return sum + (r.reviewedAt.getTime() - r.createdAt.getTime());
      }
      return sum;
    }, 0);
    const averageProcessingTime = processedItems.length > 0 
      ? totalProcessingTime / processedItems.length 
      : 0;

    // Count flags by category
    const flagsByCategory: Record<string, number> = {};
    results.forEach(r => {
      r.flags.forEach(flag => {
        flagsByCategory[flag.type] = (flagsByCategory[flag.type] || 0) + 1;
      });
    });

    // Calculate moderator stats
    const moderatorStats: Record<string, any> = {};
    results.filter(r => r.reviewedBy).forEach(r => {
      if (!r.reviewedBy) return;
      
      if (!moderatorStats[r.reviewedBy]) {
        moderatorStats[r.reviewedBy] = {
          reviewed: 0,
          approved: 0,
          rejected: 0,
          totalTime: 0
        };
      }

      const stats = moderatorStats[r.reviewedBy];
      stats.reviewed++;
      
      if (r.status === 'approved') stats.approved++;
      if (r.status === 'rejected') stats.rejected++;
      
      if (r.reviewedAt) {
        stats.totalTime += r.reviewedAt.getTime() - r.createdAt.getTime();
      }
    });

    // Calculate average time for each moderator
    Object.keys(moderatorStats).forEach(moderatorId => {
      const stats = moderatorStats[moderatorId];
      stats.averageTime = stats.reviewed > 0 ? stats.totalTime / stats.reviewed : 0;
      delete stats.totalTime;
    });

    return {
      totalProcessed,
      autoApproved,
      autoRejected,
      flagged,
      pendingReview,
      averageProcessingTime,
      flagsByCategory: flagsByCategory as Record<ModerationFlag['type'], number>,
      moderatorStats
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalItems: number;
    pendingItems: number;
    inReviewItems: number;
    completedItems: number;
    itemsByPriority: Record<string, number>;
  } {
    const totalItems = this.queue.length;
    const pendingItems = this.queue.filter(q => q.status === 'pending').length;
    const inReviewItems = this.queue.filter(q => q.status === 'in_review').length;
    const completedItems = this.queue.filter(q => q.status === 'completed').length;

    const itemsByPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    this.queue.forEach(item => {
      itemsByPriority[item.priority] = (itemsByPriority[item.priority] || 0) + 1;
    });

    return {
      totalItems,
      pendingItems,
      inReviewItems,
      completedItems,
      itemsByPriority
    };
  }

  /**
   * Clean up old completed items
   */
  cleanup(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialQueueLength = this.queue.length;
    const initialReportsLength = this.reports.length;
    const initialResultsLength = this.moderationResults.length;

    // Remove old completed queue items
    this.queue = this.queue.filter(item => 
      item.status !== 'completed' || item.updatedAt > cutoffDate
    );

    // Remove old resolved reports
    this.reports = this.reports.filter(report => 
      !['resolved', 'dismissed'].includes(report.status) || report.updatedAt > cutoffDate
    );

    // Remove old moderation results
    this.moderationResults = this.moderationResults.filter(result => 
      result.createdAt > cutoffDate
    );

    const removedItems = 
      (initialQueueLength - this.queue.length) +
      (initialReportsLength - this.reports.length) +
      (initialResultsLength - this.moderationResults.length);

    logger.info('Moderation queue cleanup completed', {
      removedItems,
      cutoffDate,
      remainingQueue: this.queue.length,
      remainingReports: this.reports.length,
      remainingResults: this.moderationResults.length
    });

    return removedItems;
  }

  // Private helper methods
  private calculateReportPriority(reason: UserReport['reason']): 'low' | 'medium' | 'high' | 'urgent' {
    switch (reason) {
      case 'harassment':
        return 'high';
      case 'inappropriate':
        return 'medium';
      case 'copyright':
        return 'medium';
      case 'spam':
        return 'low';
      case 'other':
        return 'low';
      default:
        return 'medium';
    }
  }

  private mapReasonToFlagType(reason: UserReport['reason']): ModerationFlag['type'] {
    switch (reason) {
      case 'inappropriate':
        return 'inappropriate_language';
      case 'spam':
        return 'spam';
      case 'harassment':
        return 'harassment';
      case 'copyright':
        return 'copyright';
      default:
        return 'misinformation';
    }
  }
}