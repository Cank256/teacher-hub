import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  errorRate: number;
  avgResponseTime: number;
  systemStatus: string;
  criticalErrors: number;
}

interface SystemHealth {
  status: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AdminDashboardData {
  overview: AdminMetrics;
  systemHealth: SystemHealth;
  errors: any;
  performance: any;
  analytics: any;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  recentErrors: any[];
  timestamp: string;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false); // Start with false for testing
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');

  useEffect(() => {
    // Comment out API call for now to test basic rendering
    // fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Simplified rendering for testing
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'hour' | 'day' | 'week')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last Day</option>
              <option value="week">Last Week</option>
            </select>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Simplified content for testing */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Admin Dashboard is Working!</h2>
          <p className="text-gray-600 mb-4">
            This is a simplified version of the admin dashboard to test that routing is working correctly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-medium text-blue-900">Total Users</h3>
              <p className="text-2xl font-bold text-blue-600">1,234</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-medium text-green-900">Active Users</h3>
              <p className="text-2xl font-bold text-green-600">567</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-medium text-yellow-900">System Status</h3>
              <p className="text-2xl font-bold text-yellow-600">Healthy</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-medium text-purple-900">Response Time</h3>
              <p className="text-2xl font-bold text-purple-600">120ms</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <p>Loading dashboard data...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

      </div>
    </div>
  );
};