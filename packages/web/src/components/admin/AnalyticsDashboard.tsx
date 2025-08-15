import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService, AnalyticsData } from '../../services/adminService';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }>;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'content' | 'engagement' | 'performance'>('users');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf' | 'json') => {
    if (!analyticsData) return;

    try {
      // Mock export functionality - would be replaced with actual API call
      const reportData = {
        timeRange,
        generatedAt: new Date().toISOString(),
        metrics: {
          pageViews: analyticsData.pageViews,
          uniqueVisitors: analyticsData.uniqueVisitors,
          bounceRate: analyticsData.bounceRate,
          avgSession: analyticsData.avgSession,
          conversionRate: analyticsData.conversionRate,
          userRetention: analyticsData.userRetention
        },
        topPages: analyticsData.topPages,
        userDemographics: analyticsData.userDemographics,
        deviceBreakdown: analyticsData.deviceBreakdown,
        trafficSources: analyticsData.trafficSources
      };

      const dataStr = format === 'json' 
        ? JSON.stringify(reportData, null, 2)
        : format === 'csv'
        ? convertToCSV(reportData)
        : 'PDF export would be implemented with a PDF library';

      const blob = new Blob([dataStr], { 
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const convertToCSV = (data: any): string => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Page Views', data.metrics.pageViews],
      ['Unique Visitors', data.metrics.uniqueVisitors],
      ['Bounce Rate', data.metrics.bounceRate + '%'],
      ['Average Session', data.metrics.avgSession],
      ['Conversion Rate', data.metrics.conversionRate + '%'],
      ['User Retention', data.metrics.userRetention + '%']
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const renderMetricCards = () => {
    if (!analyticsData) return null;

    const metrics = [
      {
        title: 'Page Views',
        value: analyticsData.pageViews.toLocaleString(),
        change: '+12.5%',
        changeType: 'positive',
        icon: '👁️'
      },
      {
        title: 'Unique Visitors',
        value: analyticsData.uniqueVisitors.toLocaleString(),
        change: '+8.3%',
        changeType: 'positive',
        icon: '👤'
      },
      {
        title: 'Bounce Rate',
        value: analyticsData.bounceRate.toFixed(1) + '%',
        change: '-2.1%',
        changeType: 'positive',
        icon: '📊'
      },
      {
        title: 'Avg Session',
        value: analyticsData.avgSession,
        change: '+15.2%',
        changeType: 'positive',
        icon: '⏱️'
      },
      {
        title: 'Conversion Rate',
        value: analyticsData.conversionRate.toFixed(1) + '%',
        change: '+5.7%',
        changeType: 'positive',
        icon: '🎯'
      },
      {
        title: 'User Retention',
        value: analyticsData.userRetention.toFixed(1) + '%',
        change: '+3.4%',
        changeType: 'positive',
        icon: '🔄'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <p className={`text-sm mt-1 ${
                  metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change} from last period
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">{metric.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTopPages = () => {
    if (!analyticsData?.topPages) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
        <div className="space-y-3">
          {analyticsData.topPages.map((page, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{page.page}</p>
                <p className="text-sm text-gray-600">{page.views.toLocaleString()} views</p>
              </div>
              <div className={`text-sm font-medium ${
                page.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {page.change >= 0 ? '+' : ''}{page.change}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserDemographics = () => {
    if (!analyticsData?.userDemographics) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Demographics</h3>
        <div className="space-y-3">
          {analyticsData.userDemographics.map((demo, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-800">
                    {demo.country.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{demo.country}</p>
                  <p className="text-sm text-gray-600">{demo.users.toLocaleString()} users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{demo.percentage}%</p>
                <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-2 bg-blue-600 rounded-full"
                    style={{ width: `${demo.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDeviceBreakdown = () => {
    if (!analyticsData?.deviceBreakdown) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
        <div className="space-y-4">
          {analyticsData.deviceBreakdown.map((device, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {device.device === 'Mobile' ? '📱' : device.device === 'Desktop' ? '💻' : '📱'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{device.device}</p>
                  <p className="text-sm text-gray-600">{device.users.toLocaleString()} users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{device.percentage}%</p>
                <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-2 bg-green-600 rounded-full"
                    style={{ width: `${device.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrafficSources = () => {
    if (!analyticsData?.trafficSources) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
        <div className="space-y-4">
          {analyticsData.trafficSources.map((source, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {source.source === 'Direct' ? '🔗' : 
                   source.source === 'Search Engines' ? '🔍' : 
                   source.source === 'Social Media' ? '📱' : '🌐'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{source.source}</p>
                  <p className="text-sm text-gray-600">{source.users.toLocaleString()} users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{source.percentage}%</p>
                <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-2 bg-purple-600 rounded-full"
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserEngagement = () => {
    if (!analyticsData?.userEngagement) return null;

    const engagement = analyticsData.userEngagement;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {engagement.averageEventsPerUser.toFixed(1)}
            </div>
            <div className="text-sm text-blue-800">Avg Events per User</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {engagement.sessionDuration.toFixed(1)}m
            </div>
            <div className="text-sm text-green-800">Avg Session Duration</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {engagement.pagesPerSession.toFixed(1)}
            </div>
            <div className="text-sm text-purple-800">Pages per Session</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
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
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform metrics and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Last Day</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>

            {/* Export Options */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    exportReport(e.target.value as 'csv' | 'pdf' | 'json');
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Export Report</option>
                <option value="csv">Export as CSV</option>
                <option value="json">Export as JSON</option>
                <option value="pdf">Export as PDF</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        {renderMetricCards()}

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {renderTopPages()}
          {renderUserDemographics()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {renderDeviceBreakdown()}
          {renderTrafficSources()}
        </div>

        {/* User Engagement */}
        {renderUserEngagement()}

        {/* Daily Active Users Chart */}
        {analyticsData?.dailyActiveUsers && (
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
            <div className="h-64 flex items-end justify-center space-x-2">
              {analyticsData.dailyActiveUsers.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="bg-blue-600 rounded-t"
                    style={{ 
                      height: `${Math.max(day.count / Math.max(...analyticsData.dailyActiveUsers.map(d => d.count)) * 200, 10)}px`,
                      width: '20px'
                    }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2 transform -rotate-45">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};