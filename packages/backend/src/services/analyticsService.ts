import { Pool } from 'pg';
import { 
  PlatformAnalytics, 
  UserAnalytics, 
  ContentAnalytics,
  DateRange,
  PaginationOptions,
  PaginatedResponse
} from '../types';
import logger from '../utils/logger';

export class AnalyticsService {
  constructor(private db: Pool) {}

  // ===== PLATFORM ANALYTICS =====

  async getPlatformAnalytics(dateRange?: DateRange): Promise<PlatformAnalytics> {
    try {
      const queryParams: any[] = [];
      let postsFilter = '';
      let communitiesFilter = 'WHERE is_active = true';
      let resourcesFilter = 'WHERE is_active = true';
      let messagesFilter = '';

      if (dateRange) {
        postsFilter = 'WHERE created_at BETWEEN $1 AND $2';
        communitiesFilter = 'WHERE is_active = true AND created_at BETWEEN $1 AND $2';
        resourcesFilter = 'WHERE is_active = true AND created_at BETWEEN $1 AND $2';
        messagesFilter = 'WHERE created_at BETWEEN $1 AND $2';
        queryParams.push(dateRange.startDate, dateRange.endDate);
      }

      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as active_users,
          (SELECT COUNT(*) FROM posts ${postsFilter}) as total_posts,
          (SELECT COUNT(*) FROM communities ${communitiesFilter}) as total_communities,
          (SELECT COUNT(*) FROM resources ${resourcesFilter}) as total_resources,
          (SELECT COUNT(*) FROM messages ${messagesFilter}) as total_messages,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '1 day') as daily_active_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as weekly_active_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as monthly_active_users
      `;

      const result = await this.db.query(query, queryParams);
      const row = result.rows[0];

      return {
        totalUsers: parseInt(row.total_users),
        activeUsers: parseInt(row.active_users),
        totalPosts: parseInt(row.total_posts),
        totalCommunities: parseInt(row.total_communities),
        totalResources: parseInt(row.total_resources),
        totalMessages: parseInt(row.total_messages),
        dailyActiveUsers: parseInt(row.daily_active_users),
        weeklyActiveUsers: parseInt(row.weekly_active_users),
        monthlyActiveUsers: parseInt(row.monthly_active_users)
      };
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw new Error('Failed to retrieve platform analytics');
    }
  }

  // ===== USER ANALYTICS =====

  async getUserAnalytics(dateRange: DateRange): Promise<UserAnalytics> {
    try {
      // Get basic user metrics
      const userMetricsQuery = `
        SELECT 
          COUNT(CASE WHEN created_at BETWEEN $1 AND $2 THEN 1 END) as new_users,
          COUNT(CASE WHEN is_active = true AND last_login_at BETWEEN $1 AND $2 THEN 1 END) as active_users
        FROM users
      `;

      const userMetricsResult = await this.db.query(userMetricsQuery, [dateRange.startDate, dateRange.endDate]);
      const userMetrics = userMetricsResult.rows[0];

      // Calculate retention rate
      const retentionQuery = `
        SELECT 
          COUNT(CASE WHEN last_login_at BETWEEN $1 AND $2 THEN 1 END)::float / 
          NULLIF(COUNT(*), 0) * 100 as retention_rate
        FROM users 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const retentionResult = await this.db.query(retentionQuery, [dateRange.startDate, dateRange.endDate]);
      const retentionRate = parseFloat(retentionResult.rows[0].retention_rate) || 0;

      // Calculate average session duration (approximation based on login patterns)
      const sessionQuery = `
        SELECT AVG(
          EXTRACT(EPOCH FROM (
            COALESCE(last_login_at, created_at) - created_at
          )) / 3600
        ) as avg_session_duration
        FROM users 
        WHERE created_at BETWEEN $1 AND $2 
        AND last_login_at IS NOT NULL
      `;

      const sessionResult = await this.db.query(sessionQuery, [dateRange.startDate, dateRange.endDate]);
      const averageSessionDuration = parseFloat(sessionResult.rows[0].avg_session_duration) || 0;

      // Get top subjects
      const subjectsQuery = `
        SELECT 
          subject,
          COUNT(*) as count
        FROM (
          SELECT unnest(
            CASE 
              WHEN subjects_json::text = 'null' OR subjects_json::text = '[]' THEN ARRAY[]::text[]
              ELSE ARRAY(SELECT jsonb_array_elements_text(subjects_json))
            END
          ) as subject
          FROM users 
          WHERE created_at BETWEEN $1 AND $2
        ) subjects_expanded
        WHERE subject IS NOT NULL AND subject != ''
        GROUP BY subject 
        ORDER BY count DESC 
        LIMIT 10
      `;

      const subjectsResult = await this.db.query(subjectsQuery, [dateRange.startDate, dateRange.endDate]);
      const topSubjects = subjectsResult.rows.map(row => row.subject);

      // Get top regions
      const regionsQuery = `
        SELECT 
          region,
          COUNT(*) as count
        FROM (
          SELECT 
            CASE 
              WHEN school_location_json::text = 'null' THEN NULL
              ELSE school_location_json->>'region'
            END as region
          FROM users 
          WHERE created_at BETWEEN $1 AND $2
        ) regions_expanded
        WHERE region IS NOT NULL AND region != ''
        GROUP BY region 
        ORDER BY count DESC 
        LIMIT 10
      `;

      const regionsResult = await this.db.query(regionsQuery, [dateRange.startDate, dateRange.endDate]);
      const topRegions = regionsResult.rows.map(row => row.region);

      return {
        newUsers: parseInt(userMetrics.new_users),
        activeUsers: parseInt(userMetrics.active_users),
        retentionRate,
        averageSessionDuration,
        topSubjects,
        topRegions
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw new Error('Failed to retrieve user analytics');
    }
  }

  // ===== CONTENT ANALYTICS =====

  async getContentAnalytics(dateRange: DateRange): Promise<ContentAnalytics> {
    try {
      // Get basic content metrics
      const contentMetricsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM posts WHERE created_at BETWEEN $1 AND $2) as total_posts,
          (SELECT COUNT(*) FROM post_comments WHERE created_at BETWEEN $1 AND $2) as total_comments,
          (SELECT COUNT(*) FROM post_likes WHERE created_at BETWEEN $1 AND $2) as total_likes,
          (SELECT COUNT(*) FROM posts WHERE created_at BETWEEN $1 AND $2) as total_shares
      `;

      const contentMetricsResult = await this.db.query(contentMetricsQuery, [dateRange.startDate, dateRange.endDate]);
      const contentMetrics = contentMetricsResult.rows[0];

      // Get top tags
      const tagsQuery = `
        SELECT 
          tag,
          COUNT(*) as count
        FROM (
          SELECT unnest(
            CASE 
              WHEN tags::text = 'null' OR tags::text = '[]' THEN ARRAY[]::text[]
              ELSE ARRAY(SELECT jsonb_array_elements_text(tags))
            END
          ) as tag
          FROM posts 
          WHERE created_at BETWEEN $1 AND $2
        ) tags_expanded
        WHERE tag IS NOT NULL AND tag != ''
        GROUP BY tag 
        ORDER BY count DESC 
        LIMIT 10
      `;

      const tagsResult = await this.db.query(tagsQuery, [dateRange.startDate, dateRange.endDate]);
      const topTags = tagsResult.rows.map(row => row.tag);

      // Calculate average posts per user
      const avgPostsQuery = `
        SELECT AVG(posts_per_user) as avg_posts_per_user
        FROM (
          SELECT author_id, COUNT(*) as posts_per_user
          FROM posts 
          WHERE created_at BETWEEN $1 AND $2 
          GROUP BY author_id
        ) user_posts
      `;

      const avgPostsResult = await this.db.query(avgPostsQuery, [dateRange.startDate, dateRange.endDate]);
      const averagePostsPerUser = parseFloat(avgPostsResult.rows[0].avg_posts_per_user) || 0;

      // Calculate engagement rate
      const totalPosts = parseInt(contentMetrics.total_posts);
      const totalLikes = parseInt(contentMetrics.total_likes);
      const totalComments = parseInt(contentMetrics.total_comments);
      const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts) * 100 : 0;

      return {
        totalPosts,
        totalComments,
        totalLikes,
        totalShares: parseInt(contentMetrics.total_shares),
        topTags,
        engagementRate,
        averagePostsPerUser
      };
    } catch (error) {
      logger.error('Error getting content analytics:', error);
      throw new Error('Failed to retrieve content analytics');
    }
  }

  // ===== COMMUNITY ANALYTICS =====

  async getCommunityAnalytics(dateRange: DateRange): Promise<{
    totalCommunities: number;
    newCommunities: number;
    activeCommunities: number;
    averageMembersPerCommunity: number;
    topCommunityTypes: string[];
    communityGrowthRate: number;
  }> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM communities WHERE is_active = true) as total_communities,
          (SELECT COUNT(*) FROM communities WHERE created_at BETWEEN $1 AND $2) as new_communities,
          (SELECT COUNT(*) FROM communities WHERE is_active = true AND updated_at BETWEEN $1 AND $2) as active_communities,
          (SELECT AVG(member_count) FROM communities WHERE is_active = true) as avg_members_per_community
      `;

      const result = await this.db.query(query, [dateRange.startDate, dateRange.endDate]);
      const row = result.rows[0];

      // Get top community types
      const typesQuery = `
        SELECT type, COUNT(*) as count
        FROM communities 
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY type 
        ORDER BY count DESC
      `;

      const typesResult = await this.db.query(typesQuery, [dateRange.startDate, dateRange.endDate]);
      const topCommunityTypes = typesResult.rows.map(r => r.type);

      // Calculate growth rate
      const previousPeriodStart = new Date(dateRange.startDate);
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);

      const growthQuery = `
        SELECT 
          (SELECT COUNT(*) FROM communities WHERE created_at BETWEEN $1 AND $2) as current_period,
          (SELECT COUNT(*) FROM communities WHERE created_at BETWEEN $3 AND $1) as previous_period
      `;

      const growthResult = await this.db.query(growthQuery, [
        dateRange.startDate, 
        dateRange.endDate, 
        previousPeriodStart
      ]);

      const currentPeriod = parseInt(growthResult.rows[0].current_period);
      const previousPeriod = parseInt(growthResult.rows[0].previous_period);
      const communityGrowthRate = previousPeriod > 0 ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 : 0;

      return {
        totalCommunities: parseInt(row.total_communities),
        newCommunities: parseInt(row.new_communities),
        activeCommunities: parseInt(row.active_communities),
        averageMembersPerCommunity: parseFloat(row.avg_members_per_community) || 0,
        topCommunityTypes,
        communityGrowthRate
      };
    } catch (error) {
      logger.error('Error getting community analytics:', error);
      throw new Error('Failed to retrieve community analytics');
    }
  }

  // ===== RESOURCE ANALYTICS =====

  async getResourceAnalytics(dateRange: DateRange): Promise<{
    totalResources: number;
    newResources: number;
    totalDownloads: number;
    averageRating: number;
    topResourceTypes: string[];
    videoResources: number;
    verifiedResources: number;
  }> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM resources WHERE is_active = true) as total_resources,
          (SELECT COUNT(*) FROM resources WHERE created_at BETWEEN $1 AND $2) as new_resources,
          (SELECT SUM(download_count) FROM resources WHERE created_at BETWEEN $1 AND $2) as total_downloads,
          (SELECT AVG(rating) FROM resources WHERE rating_count > 0 AND created_at BETWEEN $1 AND $2) as average_rating,
          (SELECT COUNT(*) FROM resources WHERE youtube_video_id IS NOT NULL AND created_at BETWEEN $1 AND $2) as video_resources,
          (SELECT COUNT(*) FROM resources WHERE verification_status = 'verified' AND created_at BETWEEN $1 AND $2) as verified_resources
      `;

      const result = await this.db.query(query, [dateRange.startDate, dateRange.endDate]);
      const row = result.rows[0];

      // Get top resource types
      const typesQuery = `
        SELECT type, COUNT(*) as count
        FROM resources 
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY type 
        ORDER BY count DESC
      `;

      const typesResult = await this.db.query(typesQuery, [dateRange.startDate, dateRange.endDate]);
      const topResourceTypes = typesResult.rows.map(r => r.type);

      return {
        totalResources: parseInt(row.total_resources),
        newResources: parseInt(row.new_resources),
        totalDownloads: parseInt(row.total_downloads) || 0,
        averageRating: parseFloat(row.average_rating) || 0,
        topResourceTypes,
        videoResources: parseInt(row.video_resources),
        verifiedResources: parseInt(row.verified_resources)
      };
    } catch (error) {
      logger.error('Error getting resource analytics:', error);
      throw new Error('Failed to retrieve resource analytics');
    }
  }

  // ===== MESSAGING ANALYTICS =====

  async getMessagingAnalytics(dateRange: DateRange): Promise<{
    totalMessages: number;
    newMessages: number;
    activeConversations: number;
    averageMessagesPerConversation: number;
    messageTypes: { [key: string]: number };
  }> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM messages WHERE timestamp BETWEEN $1 AND $2) as new_messages,
          (SELECT COUNT(DISTINCT conversation_id) FROM messages WHERE timestamp BETWEEN $1 AND $2 AND conversation_id IS NOT NULL) as active_conversations
      `;

      const result = await this.db.query(query, [dateRange.startDate, dateRange.endDate]);
      const row = result.rows[0];

      // Get average messages per conversation
      const avgQuery = `
        SELECT AVG(message_count) as avg_messages_per_conversation
        FROM (
          SELECT conversation_id, COUNT(*) as message_count
          FROM messages 
          WHERE timestamp BETWEEN $1 AND $2 AND conversation_id IS NOT NULL
          GROUP BY conversation_id
        ) conversation_stats
      `;

      const avgResult = await this.db.query(avgQuery, [dateRange.startDate, dateRange.endDate]);
      const averageMessagesPerConversation = parseFloat(avgResult.rows[0].avg_messages_per_conversation) || 0;

      // Get message types distribution
      const typesQuery = `
        SELECT type, COUNT(*) as count
        FROM messages 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY type
      `;

      const typesResult = await this.db.query(typesQuery, [dateRange.startDate, dateRange.endDate]);
      const messageTypes: { [key: string]: number } = {};
      typesResult.rows.forEach(row => {
        messageTypes[row.type] = parseInt(row.count);
      });

      return {
        totalMessages: parseInt(row.total_messages),
        newMessages: parseInt(row.new_messages),
        activeConversations: parseInt(row.active_conversations),
        averageMessagesPerConversation,
        messageTypes
      };
    } catch (error) {
      logger.error('Error getting messaging analytics:', error);
      throw new Error('Failed to retrieve messaging analytics');
    }
  }

  // ===== ACTIVITY TRACKING =====

  async trackUserActivity(
    userId: string,
    activity: string,
    details?: any
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_activity_log (user_id, activity, details_json, timestamp)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [userId, activity, details ? JSON.stringify(details) : null]);
    } catch (error) {
      logger.error('Error tracking user activity:', error);
      // Don't throw error for activity tracking failures
    }
  }

  async getUserActivityReport(
    userId: string,
    dateRange: DateRange
  ): Promise<{
    totalActivities: number;
    activitiesByType: { [key: string]: number };
    dailyActivity: { date: string; count: number }[];
  }> {
    try {
      // Get total activities
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM user_activity_log 
        WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
      `;

      const totalResult = await this.db.query(totalQuery, [userId, dateRange.startDate, dateRange.endDate]);
      const totalActivities = parseInt(totalResult.rows[0].total);

      // Get activities by type
      const typesQuery = `
        SELECT activity, COUNT(*) as count
        FROM user_activity_log 
        WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
        GROUP BY activity
        ORDER BY count DESC
      `;

      const typesResult = await this.db.query(typesQuery, [userId, dateRange.startDate, dateRange.endDate]);
      const activitiesByType: { [key: string]: number } = {};
      typesResult.rows.forEach(row => {
        activitiesByType[row.activity] = parseInt(row.count);
      });

      // Get daily activity
      const dailyQuery = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM user_activity_log 
        WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
        GROUP BY DATE(timestamp)
        ORDER BY date
      `;

      const dailyResult = await this.db.query(dailyQuery, [userId, dateRange.startDate, dateRange.endDate]);
      const dailyActivity = dailyResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      }));

      return {
        totalActivities,
        activitiesByType,
        dailyActivity
      };
    } catch (error) {
      logger.error('Error getting user activity report:', error);
      throw new Error('Failed to retrieve user activity report');
    }
  }
}