import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UserEngagementData {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionDuration: number;
  averagePageViews: number;
  bounceRate: number;
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
  engagementByRole: Array<{
    role: 'teacher' | 'student' | 'admin';
    users: number;
    avgSessions: number;
    avgDuration: number;
    engagementScore: number;
  }>;
  topActivities: Array<{
    activity: string;
    count: number;
    uniqueUsers: number;
    avgTimeSpent: number;
  }>;
  userJourney: Array<{
    step: string;
    users: number;
    dropoffRate: number;
  }>;
  engagementTrends: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
  }>;
}

interface UserEngagementReportProps {
  timeRange: 'day' | 'week' | 'month' | 'year';
  onClose?: () => void;
}

export const UserEngagementReport: React.FC<UserEngagementReportProps> = ({ timeRange, onClose }) => {
  const { t } = useTranslation();
  const [engagementData, setEngagementData] = useState<UserEngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'roles' | 'activities' | 'journey'>('overview');

  useEffect(() => {
    fetchEngagementData();
  }, [timeRange]);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockData: UserEngagementData = {
        totalUsers: 1247,
        activeUsers: 892,
        newUsers: 156,
        returningUsers: 736,
        averageSessionDuration: 8.5,
        averagePageViews: 12.3,
        bounceRate: 23.4,
        retentionRates: {
          day1: 78.5,
          day7: 45.2,
          day30: 28.7
        },
        engagementByRole: [
          {
            role: 'teacher',
            users: 567,
            avgSessions: 15.2,
            avgDuration: 12.8,
            engagementScore: 8.7
          },
          {
            role: 'student',
            users: 623,
            avgSessions: 8.9,
            avgDuration: 6.4,
            engagementScore: 6.2
          },
          {
            role: 'admin',
            users: 57,
            avgSessions: 25.6,
            avgDuration: 18.3,
            engagementScore: 9.4
          }
        ],
        topActivities: [
          {
            activity: 'Resource Browsing',
            count: 3456,
            uniqueUsers: 789,
            avgTimeSpent: 4.2
          },
          {
            activity: 'Community Participation',
            count: 2134,
            uniqueUsers: 567,
            avgTimeSpent: 6.8
          },
          {
            activity: 'Messaging',
            count: 1876,
            uniqueUsers: 445,
            avgTimeSpent: 3.1
          },
          {
            activity: 'Profile Management',
            count: 987,
            uniqueUsers: 234,
            avgTimeSpent: 2.5
          }
        ],
        userJourney: [
          { step: 'Landing Page', users: 1000, dropoffRate: 0 },
          { step: 'Registration', users: 850, dropoffRate: 15 },
          { step: 'Profile Setup', users: 720, dropoffRate: 15.3 },
          { step: 'First Resource View', users: 612, dropoffRate: 15 },
          { step: 'Community Join', users: 489, dropoffRate: 20.1 },
          { step: 'First Post/Comment', users: 367, dropoffRate: 24.9 }
        ],
        engagementTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          activeUsers: Math.floor(Math.random() * 200) + 700,
          sessions: Math.floor(Math.random() * 500) + 1200,
          pageViews: Math.floor(Math.random() * 2000) + 5000
        }))
      };
      setEngagementData(mockData);
    } catch (error) {
      console.error('Failed to fetch engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!engagementData) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{engagementData.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-blue-600">
                  {engagementData.activeUsers} active ({((engagementData.activeUsers / engagementData.totalUsers) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Users</p>
                <p className="text-2xl font-bold text-gray-900">{engagementData.newUsers.toLocaleString()}</p>
                <p className="text-sm text-green-600">
                  {engagementData.returningUsers} returning
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">🆕</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold text-gray-900">{engagementData.averageSessionDuration.toFixed(1)}m</p>
                <p className="text-sm text-purple-600">
                  {engagementData.averagePageViews.toFixed(1)} pages/session
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                <p className="text-2xl font-bold text-gray-900">{engagementData.bounceRate.toFixed(1)}%</p>
                <p className="text-sm text-orange-600">
                  {(100 - engagementData.bounceRate).toFixed(1)}% engaged
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Retention Rates */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Retention</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {engagementData.retentionRates.day1.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Day 1 Retention</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${engagementData.retentionRates.day1}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {engagementData.retentionRates.day7.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Day 7 Retention</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${engagementData.retentionRates.day7}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {engagementData.retentionRates.day30.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Day 30 Retention</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${engagementData.retentionRates.day30}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trends</h3>
          <div className="h-64 flex items-end justify-center space-x-1">
            {engagementData.engagementTrends.slice(-14).map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="bg-blue-600 rounded-t"
                  style={{ 
                    height: `${Math.max(day.activeUsers / Math.max(...engagementData.engagementTrends.map(d => d.activeUsers)) * 200, 10)}px`,
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
      </div>
    );
  };

  const renderRoleAnalysis = () => {
    if (!engagementData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement by Role</h3>
        <div className="space-y-6">
          {engagementData.engagementByRole.map((role, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 capitalize">{role.role}s</h4>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {role.users} users
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    role.engagementScore >= 8 ? 'bg-green-100 text-green-800' :
                    role.engagementScore >= 6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Score: {role.engagementScore}/10
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-xl font-bold text-gray-900">{role.avgSessions.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Sessions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-xl font-bold text-gray-900">{role.avgDuration.toFixed(1)}m</div>
                  <div className="text-sm text-gray-600">Avg Duration</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-xl font-bold text-gray-900">
                    {((role.users / engagementData.totalUsers) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Of Total Users</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTopActivities = () => {
    if (!engagementData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Activities</h3>
        <div className="space-y-4">
          {engagementData.topActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{activity.activity}</h4>
                <p className="text-sm text-gray-600">
                  {activity.count.toLocaleString()} actions by {activity.uniqueUsers.toLocaleString()} users
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {activity.avgTimeSpent.toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserJourney = () => {
    if (!engagementData) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Journey</h3>
        <div className="space-y-4">
          {engagementData.userJourney.map((step, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{step.step}</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {step.users.toLocaleString()} users
                    </span>
                    {step.dropoffRate > 0 && (
                      <span className="text-sm text-red-600">
                        -{step.dropoffRate.toFixed(1)}% dropoff
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(step.users / engagementData.userJourney[0].users) * 100}%` }}
                  ></div>
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
          <span className="ml-3 text-lg text-gray-600">Loading engagement data...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">User Engagement Report</h1>
            <p className="text-gray-600 mt-1">Detailed analysis of user behavior and engagement</p>
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
              { key: 'roles', label: 'By Role' },
              { key: 'activities', label: 'Top Activities' },
              { key: 'journey', label: 'User Journey' }
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
        {selectedView === 'roles' && renderRoleAnalysis()}
        {selectedView === 'activities' && renderTopActivities()}
        {selectedView === 'journey' && renderUserJourney()}
      </div>
    </div>
  );
};