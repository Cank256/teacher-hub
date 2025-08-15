import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ContentPerformanceData {
  totalContent: number;
  publishedContent: number;
  pendingContent: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalDownloads: number;
  averageRating: number;
  topPerformingContent: Array<{
    id: string;
    title: string;
    type: 'post' | 'resource' | 'video' | 'document';
    author: string;
    views: number;
    likes: number;
    comments: number;
    downloads?: number;
    rating: number;
    engagementRate: number;
    publishedAt: string;
  }>;
  contentByCategory: Array<{
    category: string;
    count: number;
    views: number;
    avgRating: number;
    engagementRate: number;
  }>;
  contentTrends: Array<{
    date: string;
    published: number;
    views: number;
    engagement: number;
  }>;
  authorPerformance: Array<{
    authorId: string;
    authorName: string;
    contentCount: number;
    totalViews: number;
    avgRating: number;
    totalLikes: number;
    engagementScore: number;
  }>;
  trendingTopics: Array<{
    topic: string;
    mentions: number;
    growth: number;
    engagement: number;
  }>;
}

interface ContentPerformanceReportProps {
  timeRange: 'day' | 'week' | 'month' | 'year';
  onClose?: () => void;
}

export const ContentPerformanceReport: React.FC<ContentPerformanceReportProps> = ({ timeRange, onClose }) => {
  const { t } = useTranslation();
  const [performanceData, setPerformanceData] = useState<ContentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'top-content' | 'categories' | 'authors' | 'trends'>('overview');

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockData: ContentPerformanceData = {
        totalContent: 2847,
        publishedContent: 2456,
        pendingContent: 391,
        totalViews: 156789,
        totalLikes: 23456,
        totalComments: 8934,
        totalDownloads: 45678,
        averageRating: 4.3,
        topPerformingContent: [
          {
            id: '1',
            title: 'Advanced Calculus Tutorial Series',
            type: 'video',
            author: 'Dr. Mathematics',
            views: 8934,
            likes: 567,
            comments: 89,
            downloads: 234,
            rating: 4.8,
            engagementRate: 12.5,
            publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            title: 'Chemistry Lab Safety Guidelines',
            type: 'document',
            author: 'Prof. Chemistry',
            views: 7234,
            likes: 445,
            comments: 67,
            downloads: 1234,
            rating: 4.6,
            engagementRate: 11.2,
            publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            title: 'Effective Teaching Strategies Discussion',
            type: 'post',
            author: 'Teacher Jane',
            views: 6789,
            likes: 389,
            comments: 156,
            rating: 4.4,
            engagementRate: 10.8,
            publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            title: 'Physics Experiment Demonstrations',
            type: 'video',
            author: 'Prof. Physics',
            views: 5678,
            likes: 334,
            comments: 78,
            downloads: 456,
            rating: 4.5,
            engagementRate: 9.7,
            publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        contentByCategory: [
          {
            category: 'Mathematics',
            count: 456,
            views: 34567,
            avgRating: 4.4,
            engagementRate: 8.9
          },
          {
            category: 'Science',
            count: 389,
            views: 28934,
            avgRating: 4.3,
            engagementRate: 7.8
          },
          {
            category: 'Language Arts',
            count: 334,
            views: 23456,
            avgRating: 4.2,
            engagementRate: 7.2
          },
          {
            category: 'Social Studies',
            count: 278,
            views: 19876,
            avgRating: 4.1,
            engagementRate: 6.8
          },
          {
            category: 'Arts',
            count: 234,
            views: 15678,
            avgRating: 4.0,
            engagementRate: 6.5
          }
        ],
        contentTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          published: Math.floor(Math.random() * 20) + 10,
          views: Math.floor(Math.random() * 2000) + 3000,
          engagement: Math.floor(Math.random() * 500) + 200
        })),
        authorPerformance: [
          {
            authorId: '1',
            authorName: 'Dr. Mathematics',
            contentCount: 45,
            totalViews: 23456,
            avgRating: 4.7,
            totalLikes: 1234,
            engagementScore: 9.2
          },
          {
            authorId: '2',
            authorName: 'Prof. Chemistry',
            contentCount: 38,
            totalViews: 19876,
            avgRating: 4.5,
            totalLikes: 987,
            engagementScore: 8.8
          },
          {
            authorId: '3',
            authorName: 'Teacher Jane',
            contentCount: 52,
            totalViews: 18765,
            avgRating: 4.3,
            totalLikes: 876,
            engagementScore: 8.1
          },
          {
            authorId: '4',
            authorName: 'Prof. Physics',
            contentCount: 29,
            totalViews: 15432,
            avgRating: 4.4,
            totalLikes: 765,
            engagementScore: 7.9
          }
        ],
        trendingTopics: [
          {
            topic: 'Remote Learning',
            mentions: 234,
            growth: 45.2,
            engagement: 8.7
          },
          {
            topic: 'STEM Education',
            mentions: 189,
            growth: 32.1,
            engagement: 7.9
          },
          {
            topic: 'Assessment Strategies',
            mentions: 156,
            growth: 28.5,
            engagement: 7.2
          },
          {
            topic: 'Student Engagement',
            mentions: 134,
            growth: 22.3,
            engagement: 6.8
          }
        ]
      };
      setPerformanceData(mockData);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!performanceData) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{performanceData.totalContent.toLocaleString()}</p>
                <p className="text-sm text-green-600">
                  {performanceData.publishedContent} published
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{performanceData.totalViews.toLocaleString()}</p>
                <p className="text-sm text-blue-600">
                  {Math.floor(performanceData.totalViews / performanceData.publishedContent)} avg/content
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">👁️</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{performanceData.totalLikes.toLocaleString()}</p>
                <p className="text-sm text-purple-600">
                  {performanceData.totalComments.toLocaleString()} comments
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">❤️</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{performanceData.averageRating.toFixed(1)}</p>
                <p className="text-sm text-yellow-600">
                  {performanceData.totalDownloads.toLocaleString()} downloads
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Performance Trends</h3>
          <div className="h-64 flex items-end justify-center space-x-1">
            {performanceData.contentTrends.slice(-14).map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="bg-blue-600 rounded-t"
                  style={{ 
                    height: `${Math.max(day.views / Math.max(...performanceData.contentTrends.map(d => d.views)) * 200, 10)}px`,
                    width: '15px'
                  }}
                ></div>
                <div className="text-xs text-gray-600 mt-2 transform -rotate-45">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content by Category</h3>
            <div className="space-y-4">
              {performanceData.contentByCategory.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{category.category}</span>
                      <span className="text-sm text-gray-600">{category.count} items</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(category.count / Math.max(...performanceData.contentByCategory.map(c => c.count))) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                      <span>{category.views.toLocaleString()} views</span>
                      <span>⭐ {category.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-4">
              {performanceData.trendingTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{topic.topic}</h4>
                    <p className="text-sm text-gray-600">{topic.mentions} mentions</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      +{topic.growth.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {topic.engagement.toFixed(1)} engagement
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTopContent = () => {
    if (!performanceData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
        <div className="space-y-4">
          {performanceData.topPerformingContent.map((content, index) => (
            <div key={content.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">
                      {content.type === 'video' ? '🎥' : 
                       content.type === 'document' ? '📄' : 
                       content.type === 'post' ? '📝' : '📁'}
                    </span>
                    <h4 className="font-medium text-gray-900">{content.title}</h4>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {content.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">By {content.author}</p>
                  <p className="text-xs text-gray-500">
                    Published {new Date(content.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {content.engagementRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Engagement Rate</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{content.views.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{content.likes.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Likes</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">{content.comments.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Comments</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">⭐ {content.rating.toFixed(1)}</div>
                  <div className="text-xs text-gray-600">Rating</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAuthorPerformance = () => {
    if (!performanceData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Authors</h3>
        <div className="space-y-4">
          {performanceData.authorPerformance.map((author, index) => (
            <div key={author.authorId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                  {author.authorName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{author.authorName}</h4>
                  <p className="text-sm text-gray-600">
                    {author.contentCount} content items • {author.totalViews.toLocaleString()} views
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">⭐ {author.avgRating.toFixed(1)}</div>
                    <div className="text-xs text-gray-600">Avg Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{author.totalLikes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Total Likes</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${
                      author.engagementScore >= 8 ? 'text-green-600' :
                      author.engagementScore >= 6 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {author.engagementScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">Score</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading performance data...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Content Performance Report</h1>
            <p className="text-gray-600 mt-1">Analysis of content engagement and trending topics</p>
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
              { key: 'top-content', label: 'Top Content' },
              { key: 'categories', label: 'Categories' },
              { key: 'authors', label: 'Top Authors' },
              { key: 'trends', label: 'Trends' }
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
        {selectedView === 'top-content' && renderTopContent()}
        {selectedView === 'categories' && renderOverview()}
        {selectedView === 'authors' && renderAuthorPerformance()}
        {selectedView === 'trends' && renderOverview()}
      </div>
    </div>
  );
};