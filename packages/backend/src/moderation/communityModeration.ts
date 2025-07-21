import { v4 as uuidv4 } from 'uuid';
import { ModerationQueueService } from './moderationQueue';
import { ContentScreeningService } from './contentScreening';
import { 
  UserReport, 
  ModerationFlag, 
  ContentModerationResult,
  ModerationConfig 
} from './types';
import logger from '../utils/logger';

export interface CommunityModerator {
  id: string;
  userId: string;
  communityId: string;
  role: 'moderator' | 'admin' | 'super_admin';
  permissions: ModeratorPermission[];
  isActive: boolean;
  appointedBy: string;
  appointedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModeratorPermission {
  action: 'review_content' | 'ban_users' | 'delete_content' | 'manage_moderators' | 'view_reports' | 'handle_appeals';
  scope: 'community' | 'global';
}

export interface UserBan {
  id: string;
  userId: string;
  communityId?: string; // null for global bans
  reason: string;
  bannedBy: string;
  banType: 'temporary' | 'permanent';
  expiresAt?: Date;
  isActive: boolean;
  appealId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appeal {
  id: string;
  userId: string;
  type: 'content_removal' | 'user_ban' | 'account_suspension';
  originalDecisionId: string; // ID of the original moderation decision
  reason: string;
  evidence?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationAction {
  id: string;
  moderatorId: string;
  actionType: 'approve' | 'reject' | 'ban_user' | 'delete_content' | 'warn_user';
  targetType: 'content' | 'user' | 'comment';
  targetId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  communityId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ModerationDashboard {
  pendingReviews: number;
  completedToday: number;
  flaggedContent: number;
  activeBans: number;
  pendingAppeals: number;
  recentActions: ModerationAction[];
  topReportReasons: Array<{ reason: string; count: number }>;
  moderatorStats: Array<{
    moderatorId: string;
    actionsToday: number;
    averageResponseTime: number;
  }>;
}

export class CommunityModerationService {
  private moderators: CommunityModerator[] = [];
  private bans: UserBan[] = [];
  private appeals: Appeal[] = [];
  private actions: ModerationAction[] = [];
  private queueService: ModerationQueueService;
  private screeningService: ContentScreeningService;

  constructor(
    queueService: ModerationQueueService,
    screeningService: ContentScreeningService
  ) {
    this.queueService = queueService;
    this.screeningService = screeningService;
  }

  /**
   * Appoint a community moderator
   */
  appointModerator(
    userId: string,
    communityId: string,
    role: 'moderator' | 'admin' | 'super_admin',
    permissions: ModeratorPermission[],
    appointedBy: string
  ): string {
    const moderator: CommunityModerator = {
      id: uuidv4(),
      userId,
      communityId,
      role,
      permissions,
      isActive: true,
      appointedBy,
      appointedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.moderators.push(moderator);

    logger.info('Community moderator appointed', {
      moderatorId: moderator.id,
      userId,
      communityId,
      role,
      appointedBy
    });

    return moderator.id;
  }

  /**
   * Remove a community moderator
   */
  removeModerator(moderatorId: string, removedBy: string): boolean {
    const moderator = this.moderators.find(m => m.id === moderatorId);
    
    if (!moderator) {
      return false;
    }

    moderator.isActive = false;
    moderator.updatedAt = new Date();

    logger.info('Community moderator removed', {
      moderatorId,
      userId: moderator.userId,
      communityId: moderator.communityId,
      removedBy
    });

    return true;
  }

  /**
   * Check if user has moderation permissions
   */
  hasPermission(
    userId: string,
    action: ModeratorPermission['action'],
    communityId?: string
  ): boolean {
    const moderator = this.moderators.find(m => 
      m.userId === userId && 
      m.isActive &&
      (communityId ? m.communityId === communityId || m.permissions.some(p => p.scope === 'global') : true)
    );

    if (!moderator) {
      return false;
    }

    return moderator.permissions.some(p => 
      p.action === action && 
      (p.scope === 'global' || (communityId && communityId === moderator.communityId) || !communityId)
    );
  }

  /**
   * Ban a user from community or globally
   */
  banUser(
    userId: string,
    reason: string,
    bannedBy: string,
    banType: 'temporary' | 'permanent',
    communityId?: string,
    duration?: number // in hours for temporary bans
  ): string {
    // Check if moderator has permission
    if (!this.hasPermission(bannedBy, 'ban_users', communityId)) {
      throw new Error('Insufficient permissions to ban users');
    }

    const expiresAt = banType === 'temporary' && duration 
      ? new Date(Date.now() + duration * 60 * 60 * 1000)
      : undefined;

    const ban: UserBan = {
      id: uuidv4(),
      userId,
      communityId,
      reason,
      bannedBy,
      banType,
      expiresAt,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.bans.push(ban);

    // Record moderation action
    this.recordAction({
      moderatorId: bannedBy,
      actionType: 'ban_user',
      targetType: 'user',
      targetId: userId,
      reason,
      severity: 'high',
      communityId
    });

    logger.info('User banned', {
      banId: ban.id,
      userId,
      communityId,
      banType,
      reason,
      bannedBy
    });

    return ban.id;
  }

  /**
   * Unban a user
   */
  unbanUser(banId: string, unbannedBy: string): boolean {
    const ban = this.bans.find(b => b.id === banId && b.isActive);
    
    if (!ban) {
      return false;
    }

    // Check if moderator has permission
    if (!this.hasPermission(unbannedBy, 'ban_users', ban.communityId)) {
      throw new Error('Insufficient permissions to unban users');
    }

    ban.isActive = false;
    ban.updatedAt = new Date();

    logger.info('User unbanned', {
      banId,
      userId: ban.userId,
      communityId: ban.communityId,
      unbannedBy
    });

    return true;
  }

  /**
   * Check if user is banned
   */
  isUserBanned(userId: string, communityId?: string): boolean {
    const now = new Date();
    
    return this.bans.some(ban => 
      ban.userId === userId &&
      ban.isActive &&
      (ban.communityId === communityId || ban.communityId === undefined) &&
      (!ban.expiresAt || ban.expiresAt > now)
    );
  }

  /**
   * Submit an appeal
   */
  submitAppeal(
    userId: string,
    type: Appeal['type'],
    originalDecisionId: string,
    reason: string,
    evidence?: string[]
  ): string {
    const appeal: Appeal = {
      id: uuidv4(),
      userId,
      type,
      originalDecisionId,
      reason,
      evidence,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.appeals.push(appeal);

    logger.info('Appeal submitted', {
      appealId: appeal.id,
      userId,
      type,
      originalDecisionId
    });

    return appeal.id;
  }

  /**
   * Review an appeal
   */
  reviewAppeal(
    appealId: string,
    reviewerId: string,
    decision: 'approved' | 'rejected',
    resolution: string
  ): boolean {
    const appeal = this.appeals.find(a => a.id === appealId);
    
    if (!appeal || appeal.status !== 'pending') {
      return false;
    }

    // Check if reviewer has permission
    if (!this.hasPermission(reviewerId, 'handle_appeals')) {
      throw new Error('Insufficient permissions to review appeals');
    }

    appeal.status = decision;
    appeal.reviewedBy = reviewerId;
    appeal.reviewedAt = new Date();
    appeal.resolution = resolution;
    appeal.updatedAt = new Date();

    // If appeal is approved, reverse the original decision
    if (decision === 'approved') {
      this.reverseDecision(appeal.originalDecisionId, appeal.type);
    }

    logger.info('Appeal reviewed', {
      appealId,
      reviewerId,
      decision,
      resolution
    });

    return true;
  }

  /**
   * Get moderation dashboard data
   */
  getModerationDashboard(moderatorId: string, communityId?: string): ModerationDashboard {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get queue stats
    const queueStats = this.queueService.getQueueStatus();
    
    // Get recent actions
    const recentActions = this.actions
      .filter(a => 
        (!communityId || a.communityId === communityId) &&
        a.createdAt >= today
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Get user reports for analysis
    const reports = this.queueService.getUserReports('pending');
    const reportReasons = reports.reduce((acc, report) => {
      acc[report.reason] = (acc[report.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReportReasons = Object.entries(reportReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate moderator stats
    const moderatorStats = this.calculateModeratorStats(today);

    return {
      pendingReviews: queueStats.pendingItems,
      completedToday: this.actions.filter(a => a.createdAt >= today).length,
      flaggedContent: queueStats.inReviewItems,
      activeBans: this.bans.filter(b => b.isActive).length,
      pendingAppeals: this.appeals.filter(a => a.status === 'pending').length,
      recentActions,
      topReportReasons,
      moderatorStats
    };
  }

  /**
   * Get user's moderation history
   */
  getUserModerationHistory(userId: string): {
    bans: UserBan[];
    reports: UserReport[];
    appeals: Appeal[];
  } {
    const bans = this.bans.filter(b => b.userId === userId);
    const reports = this.queueService.getUserReports().filter(r => r.reporterId === userId);
    const appeals = this.appeals.filter(a => a.userId === userId);

    return { bans, reports, appeals };
  }

  /**
   * Bulk moderate content
   */
  async bulkModerate(
    contentIds: string[],
    action: 'approve' | 'reject',
    moderatorId: string,
    reason: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const contentId of contentIds) {
      try {
        // Convert action to the format expected by completeReview
        const reviewAction = action === 'approve' ? 'approved' : 'rejected';
        const success = this.queueService.completeReview(
          contentId,
          moderatorId,
          reviewAction,
          reason
        );

        if (success) {
          results.success++;
          this.recordAction({
            moderatorId,
            actionType: action,
            targetType: 'content',
            targetId: contentId,
            reason,
            severity: 'medium'
          });
        } else {
          results.failed++;
          results.errors.push(`Failed to moderate content ${contentId}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error moderating content ${contentId}: ${error}`);
      }
    }

    logger.info('Bulk moderation completed', {
      moderatorId,
      action,
      totalItems: contentIds.length,
      success: results.success,
      failed: results.failed
    });

    return results;
  }

  /**
   * Get community moderators
   */
  getCommunityModerators(communityId: string): CommunityModerator[] {
    return this.moderators.filter(m => 
      m.communityId === communityId && m.isActive
    );
  }

  /**
   * Get pending appeals
   */
  getPendingAppeals(limit: number = 50): Appeal[] {
    return this.appeals
      .filter(a => a.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Auto-expire temporary bans
   */
  expireTemporaryBans(): number {
    const now = new Date();
    let expiredCount = 0;

    this.bans.forEach(ban => {
      if (ban.isActive && ban.expiresAt && ban.expiresAt <= now) {
        ban.isActive = false;
        ban.updatedAt = new Date();
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      logger.info('Temporary bans expired', { count: expiredCount });
    }

    return expiredCount;
  }

  // Private helper methods
  private recordAction(action: Omit<ModerationAction, 'id' | 'createdAt'>): void {
    const moderationAction: ModerationAction = {
      ...action,
      id: uuidv4(),
      createdAt: new Date()
    };

    this.actions.push(moderationAction);
  }

  private reverseDecision(originalDecisionId: string, type: Appeal['type']): void {
    switch (type) {
      case 'user_ban':
        const ban = this.bans.find(b => b.id === originalDecisionId);
        if (ban) {
          ban.isActive = false;
          ban.updatedAt = new Date();
        }
        break;
      case 'content_removal':
        // Would integrate with content service to restore content
        logger.info('Content restoration requested', { originalDecisionId });
        break;
      case 'account_suspension':
        // Would integrate with user service to restore account
        logger.info('Account restoration requested', { originalDecisionId });
        break;
    }
  }

  private calculateModeratorStats(since: Date): Array<{
    moderatorId: string;
    actionsToday: number;
    averageResponseTime: number;
  }> {
    const moderatorActions = this.actions.filter(a => a.createdAt >= since);
    const moderatorMap = new Map<string, { actions: number; totalTime: number; count: number }>();

    moderatorActions.forEach(action => {
      const existing = moderatorMap.get(action.moderatorId) || { actions: 0, totalTime: 0, count: 0 };
      existing.actions++;
      moderatorMap.set(action.moderatorId, existing);
    });

    return Array.from(moderatorMap.entries()).map(([moderatorId, stats]) => ({
      moderatorId,
      actionsToday: stats.actions,
      averageResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0
    }));
  }
}