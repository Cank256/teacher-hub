import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface ActivityMetrics {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  activeMembers: number;
  newMembers: number;
  engagementRate: number;
  averagePostsPerDay: number;
  topContributors: Array<{
    userId: string;
    fullName: string;
    profileImageUrl?: string;
    postCount: number;
    commentCount: number;
    likeCount: number;
  }>;
  popularTags: Array<{
    tag: string;
    count: number;
  }>;
  activityTrend: Array<{
    date: string;
    posts: number;
    comments: number;
    likes: number;
  }>;
}

interface CommunityActivityMetricsProps {
  communityId: string;
  metrics: ActivityMetrics;
  dateRange: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  isLoading?: boolean;
}

export const CommunityActivityMetrics: React.FC<CommunityActivityMetricsProps> = ({
  communityId,
  metrics,
  dateRange,
  onDateRangeChange,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'contributors' | 'trends'>('overview');

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEngagementLabel = (rate: number): string => {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Good';
    if (rate >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Activity</CardTitle>
        </CardHeader>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-20 rounded"></div>
              ))}
            </div>
            <div className="bg-gray-200 h-40 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Community Activity Metrics</CardTitle>
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </CardHeader>

        <div className="p-6">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('contributors')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contributors'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Top Contributors
              </button>
              <button
                onClick={() => setActiveTab('trends')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'trends'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Trends
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics.totalPosts)}</div>
                  <div className="text-sm text-blue-700">Total Posts</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.totalComments)}</div>
                  <div className="text-sm text-green-700">Total Comments</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{formatNumber(metrics.totalLikes)}</div>
                  <div className="text-sm text-purple-700">Total Likes</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics.totalShares)}</div>
                  <div className="text-sm text-orange-700">Total Shares</div>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-600">{metrics.activeMembers}</div>
                  <div className="text-sm text-gray-700">Active Members</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.newMembers} new this {dateRange}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className={`text-2xl font-bold ${getEngagementColor(metrics.engagementRate)}`}>
                    {metrics.engagementRate}%
                  </div>
                  <div className="text-sm text-gray-700">Engagement Rate</div>
                  <div className={`text-xs mt-1 ${getEngagementColor(metrics.engagementRate)}`}>
                    {getEngagementLabel(metrics.engagementRate)}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-600">{metrics.averagePostsPerDay.toFixed(1)}</div>
                  <div className="text-sm text-gray-700">Avg Posts/Day</div>
                </div>
              </div>

              {/* Popular Tags */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {metrics.popularTags.slice(0, 10).map((tag) => (
                    <div
                      key={tag.tag}
                      className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm flex items-center space-x-1"
                    >
                      <span>#{tag.tag}</span>
                      <span className="text-primary-600">({tag.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contributors' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Top Contributors</h3>
              {metrics.topContributors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No contributor data available for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.topContributors.map((contributor, index) => (
                    <div key={contributor.userId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full font-semibold text-sm">
                          #{index + 1}
                        </div>
                        {contributor.profileImageUrl ? (
                          <img
                            src={contributor.profileImageUrl}
                            alt={contributor.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {contributor.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{contributor.fullName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{contributor.postCount} posts</span>
                            <span>{contributor.commentCount} comments</span>
                            <span>{contributor.likeCount} likes received</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {contributor.postCount + contributor.commentCount}
                        </div>
                        <div className="text-sm text-gray-600">Total Contributions</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Activity Trends</h3>
              
              {metrics.activityTrend.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No trend data available for this period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Simple trend visualization */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Daily Activity</h4>
                    <div className="space-y-2">
                      {metrics.activityTrend.slice(-7).map((day, index) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>{day.posts} posts</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>{day.comments} comments</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span>{day.likes} likes</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Growth indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-lg font-semibold text-blue-600">
                        {metrics.activityTrend.reduce((sum, day) => sum + day.posts, 0)}
                      </div>
                      <div className="text-sm text-blue-700">Total Posts in Period</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-lg font-semibold text-green-600">
                        {metrics.activityTrend.reduce((sum, day) => sum + day.comments, 0)}
                      </div>
                      <div className="text-sm text-green-700">Total Comments in Period</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-lg font-semibold text-purple-600">
                        {metrics.activityTrend.reduce((sum, day) => sum + day.likes, 0)}
                      </div>
                      <div className="text-sm text-purple-700">Total Likes in Period</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};