import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CommunityHealthData {
  totalCommunities: number;
  activeCommunities: number;
  totalMembers: number;
  averageMembersPerCommunity: number;
  totalPosts: number;
  averagePostsPerCommunity: number;
  moderationActions: number;
  reportedContent: number;
  communityGrowth: number;
  memberRetention: number;
  communityMetrics: Array<{
    id: string;
    name: string;
    type: 'subject' | 'region' | 'grade' | 'general';
    memberCount: number;
    postCount: number;
    activeMembers: number;
    engagementRate: number;
    healthScore: number;
    lastActivity: string;
    moderationIssues: number;
    growthRate: number;
  }>;
  healthIndicators: {
    engagement: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      description: string;
    };
    moderation: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      description: string;
    };
    growth: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      description: string;
    };
    retention: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      description: string;
    };
  };
  communityTypes: Array<{
    type: string;
    count: number;
    avgMembers: number;
    avgPosts: number;
    healthScore: number;
  }>;
  moderationStats: Array<{
    action: string;
    count: number;
    trend: number;
  }>;
}

interface CommunityHealthMetricsProps {
  timeRange: 'day' | 'week' | 'month' | 'year';
  onClose?: () => void;
}

export const CommunityHealthMetrics: React.FC<CommunityHealthMetricsProps> = ({ timeRange, onClose }) => {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState<CommunityHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'communities' | 'health' | 'moderation'>('overview');

  useEffect(() => {
    fetchHealthData();
  }, [timeRange]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockData: CommunityHealthData = {
        totalCommunities: 156,
        activeCommunities: 134,
        totalMembers: 8934,
        averageMembersPerCommunity: 57.3,
        totalPosts: 12456,
        averagePostsPerCommunity: 79.8,
        moderationActions: 234,
        reportedContent: 45,
        communityGrowth: 12.5,
        memberRetention: 78.3,
        communityMetrics: [
          {
            id: '1',
            name: 'Advanced Mathematics',
            type: 'subject',
            memberCount: 245,
            postCount: 189,
            activeMembers: 156,
            engagementRate: 63.7,
            healthScore: 8.7,
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            moderationIssues: 2,
            growthRate: 15.2
          },
          {
            id: '2',
            name: 'Elementary Science',
            type: 'subject',
            memberCount: 189,
            postCount: 134,
            activeMembers: 123,
            engagementRate: 65.1,
            healthScore: 8.9,
            lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            moderationIssues: 0,
            growthRate: 18.7
          },
          {
            id: '3',
            name: 'California Teachers',
            type: 'region',
            memberCount: 167,
            postCount: 98,
            activeMembers: 89,
            engagementRate: 53.3,
            healthScore: 7.2,
            lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            moderationIssues: 1,
            growthRate: 8.9
          },
          {
            id: '4',
            name: 'High School Chemistry',
            type: 'subject',
            memberCount: 134,
            postCount: 156,
            activeMembers: 98,
            engagementRate: 73.1,
            healthScore: 8.4,
            lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            moderationIssues: 3,
            growthRate: 22.1
          }
        ],
        healthIndicators: {
          engagement: {
            score: 7.8,
            trend: 'up',
            description: 'Community engagement is improving with more active discussions'
          },
          moderation: {
            score: 8.5,
            trend: 'stable',
            description: 'Moderation issues are well-managed with quick response times'
          },
          growth: {
            score: 7.2,
            trend: 'up',
            description: 'Steady growth in new communities and member acquisition'
          },
          retention: {
            score: 6.9,
            trend: 'down',
            description: 'Member retention needs attention, especially in newer communities'
          }
        },
        communityTypes: [
          {
            type: 'Subject-based',
            count: 89,
            avgMembers: 67.2,
            avgPosts: 89.4,
            healthScore: 8.1
          },
          {
            type: 'Region-based',
            count: 34,
            avgMembers: 45.8,
            avgPosts: 56.7,
            healthScore: 7.3
          },
          {
            type: 'Grade-based',
            count: 23,
            avgMembers: 38.9,
            avgPosts: 42.1,
            healthScore: 7.8
          },
          {
            type: 'General',
            count: 10,
            avgMembers: 123.4,
            avgPosts: 156.8,
            healthScore: 8.9
          }
        ],
        moderationStats: [
          { action: 'Posts Removed', count: 89, trend: -12.3 },
          { action: 'Users Warned', count: 67, trend: -8.7 },
          { action: 'Comments Deleted', count: 45, trend: -15.2 },
          { action: 'Users Suspended', count: 23, trend: -22.1 },
          { action: 'Communities Reviewed', count: 12, trend: 5.4 }
        ]
      };
      setHealthData(mockData);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
    }
  };

  const renderOverview = () => {
    if (!healthData) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Communities</p>
                <p className="text-2xl font-bold text-gray-900">{healthData.totalCommunities}</p>
                <p className="text-sm text-green-600">
                  {healthData.activeCommunities} active ({((healthData.activeCommunities / healthData.totalCommunities) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">🏘️</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{healthData.totalMembers.toLocaleString()}</p>
                <p className="text-sm text-blue-600">
                  {healthData.averageMembersPerCommunity.toFixed(1)} avg/community
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Community Growth</p>
                <p className="text-2xl font-bold text-gray-900">+{healthData.communityGrowth.toFixed(1)}%</p>
                <p className="text-sm text-purple-600">
                  {healthData.memberRetention.toFixed(1)}% retention
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Moderation</p>
                <p className="text-2xl font-bold text-gray-900">{healthData.moderationActions}</p>
                <p className="text-sm text-orange-600">
                  {healthData.reportedContent} reports
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <span className="text-2xl">🛡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Indicators */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Health Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(healthData.healthIndicators).map(([key, indicator]) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">{key}</h4>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getTrendIcon(indicator.trend)}</span>
                    <span className={`text-sm font-medium ${getTrendColor(indicator.trend)}`}>
                      {indicator.trend}
                    </span>
                  </div>
                </div>
                <div className="text-center mb-3">
                  <div className={`text-2xl font-bold px-3 py-1 rounded-full ${getHealthScoreColor(indicator.score)}`}>
                    {indicator.score.toFixed(1)}
                  </div>
                </div>
                <p className="text-xs text-gray-600 text-center">{indicator.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Community Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Types</h3>
          <div className="space-y-4">
            {healthData.communityTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{type.type}</h4>
                    <span className={`px-2 py-1 text-sm rounded-full ${getHealthScoreColor(type.healthScore)}`}>
                      Health: {type.healthScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{type.count}</span> communities
                    </div>
                    <div>
                      <span className="font-medium">{type.avgMembers.toFixed(1)}</span> avg members
                    </div>
                    <div>
                      <span className="font-medium">{type.avgPosts.toFixed(1)}</span> avg posts
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCommunityList = () => {
    if (!healthData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Performance</h3>
        <div className="space-y-4">
          {healthData.communityMetrics.map((community) => (
            <div key={community.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{community.name}</h4>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {community.type}
                    </span>
                    {community.moderationIssues > 0 && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        {community.moderationIssues} issues
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Last activity: {new Date(community.lastActivity).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold px-3 py-1 rounded-full ${getHealthScoreColor(community.healthScore)}`}>
                    {community.healthScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Health Score</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{community.memberCount}</div>
                  <div className="text-xs text-gray-600">Members</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{community.activeMembers}</div>
                  <div className="text-xs text-gray-600">Active</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{community.postCount}</div>
                  <div className="text-xs text-gray-600">Posts</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{community.engagementRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Engagement</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-green-600">+{community.growthRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Growth</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderModerationStats = () => {
    if (!healthData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Moderation Statistics</h3>
        <div className="space-y-4">
          {healthData.moderationStats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{stat.action}</h4>
                <p className="text-sm text-gray-600">{stat.count} actions this {timeRange}</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${stat.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stat.trend >= 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">vs last period</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Moderation Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Overall moderation actions are decreasing, indicating better community self-regulation</li>
            <li>• User warnings are down 8.7%, suggesting improved behavior</li>
            <li>• Community reviews are up 5.4%, showing proactive monitoring</li>
          </ul>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading community health data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Health Metrics</h1>
            <p className="text-gray-600 mt-1">Monitor community engagement and growth patterns</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'communities', label: 'Communities' },
              { key: 'health', label: 'Health Indicators' },
              { key: 'moderation', label: 'Moderation' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'communities' && renderCommunityList()}
        {selectedView === 'health' && renderOverview()}
        {selectedView === 'moderation' && renderModerationStats()}
      </div>
    </div>
  );
};