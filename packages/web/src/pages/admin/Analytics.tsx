import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService, AnalyticsData } from '../../services/adminService';



export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </div>
    );
  }



  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? '↗️' : '↘️';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.analytics.title', 'Analytics')}</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month' | 'year')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Page Views</h3>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.pageViews.toLocaleString()}</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">👁️</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Unique Visitors</h3>
              <p className="text-2xl font-bold text-green-600">{analyticsData.uniqueVisitors.toLocaleString()}</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Conversion Rate</h3>
              <p className="text-2xl font-bold text-purple-600">{analyticsData.conversionRate}%</p>
              <p className="text-sm text-green-600">+0.5% from last month</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Total Revenue</h3>
              <p className="text-2xl font-bold text-yellow-600">${analyticsData.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600">+18% from last month</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">Bounce Rate</h3>
          <p className="text-2xl font-bold text-red-600">{analyticsData.bounceRate}%</p>
          <p className="text-sm text-green-600">-3% from last month</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">Avg. Session Duration</h3>
          <p className="text-2xl font-bold text-blue-600">{analyticsData.avgSession}</p>
          <p className="text-sm text-green-600">+15% from last month</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">User Retention</h3>
          <p className="text-2xl font-bold text-green-600">{analyticsData.userRetention}%</p>
          <p className="text-sm text-green-600">+5% from last month</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">Mobile Traffic</h3>
          <p className="text-2xl font-bold text-purple-600">{analyticsData.mobileTraffic}%</p>
          <p className="text-sm text-green-600">+2% from last month</p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {analyticsData.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{page.page}</p>
                  <p className="text-sm text-gray-600">{page.views.toLocaleString()} views</p>
                </div>
                <div className={`flex items-center space-x-1 ${getChangeColor(page.change)}`}>
                  <span>{getChangeIcon(page.change)}</span>
                  <span className="text-sm font-medium">{Math.abs(page.change)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Demographics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Demographics</h3>
          <div className="space-y-3">
            {analyticsData.userDemographics.map((demo, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">{demo.country.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="font-medium text-gray-900">{demo.country}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{demo.users.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{demo.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            {analyticsData.deviceBreakdown.map((device, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{device.device}</span>
                  <span className="text-sm text-gray-600">{device.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${device.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{device.users.toLocaleString()} users</p>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {analyticsData.trafficSources.map((source, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                  <span className="text-sm text-gray-600">{source.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{source.users.toLocaleString()} users</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};