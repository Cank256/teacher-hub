import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { adminService, AdminDashboardData } from '../services/adminService';

interface AdminNotification {
  id: string;
  type: 'flagged_content' | 'user_report' | 'system_alert' | 'moderation_required';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'post' | 'user' | 'community' | 'resource' | 'system';
  targetId?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [activityLog, setActivityLog] = useState<AdminActivityLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    fetchActivityLog();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getDashboardData(timeRange);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Mock notifications for now - would be replaced with actual API call
      const mockNotifications: AdminNotification[] = [
        {
          id: '1',
          type: 'flagged_content',
          title: 'Content Flagged for Review',
          message: 'A post has been flagged by multiple users for inappropriate content',
          severity: 'high',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/admin/moderation/posts'
        },
        {
          id: '2',
          type: 'user_report',
          title: 'User Report Received',
          message: 'A user has been reported for harassment',
          severity: 'medium',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/admin/moderation/users'
        },
        {
          id: '3',
          type: 'system_alert',
          title: 'High Server Load',
          message: 'Server CPU usage is above 85%',
          severity: 'medium',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          isRead: true
        }
      ];
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const fetchActivityLog = async () => {
    try {
      // Mock activity log for now - would be replaced with actual API call
      const mockActivityLog: AdminActivityLog[] = [
        {
          id: '1',
          adminId: 'admin1',
          adminName: 'John Admin',
          action: 'Deleted Post',
          targetType: 'post',
          targetId: 'post123',
          details: 'Deleted post for violating community guidelines',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          adminId: 'admin2',
          adminName: 'Sarah Moderator',
          action: 'Suspended User',
          targetType: 'user',
          targetId: 'user456',
          details: 'Suspended user for 7 days due to repeated violations',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.101'
        },
        {
          id: '3',
          adminId: 'admin1',
          adminName: 'John Admin',
          action: 'Approved Resource',
          targetType: 'resource',
          targetId: 'resource789',
          details: 'Approved educational video after security scan',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100'
        }
      ];
      setActivityLog(mockActivityLog);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500">No dashboard data available</p>
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return '👤';
      case 'content_published':
        return '📄';
      case 'login':
        return '🔐';
      case 'error':
        return '⚠️';
      default:
        return '📊';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800 bg-red-200 border-red-300';
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'flagged_content':
        return '🚩';
      case 'user_report':
        return '👤';
      case 'system_alert':
        return '⚠️';
      case 'moderation_required':
        return '🔍';
      default:
        return '📢';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('delete')) return '🗑️';
    if (action.toLowerCase().includes('suspend')) return '⏸️';
    if (action.toLowerCase().includes('approve')) return '✅';
    if (action.toLowerCase().includes('reject')) return '❌';
    if (action.toLowerCase().includes('edit')) return '✏️';
    return '📝';
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Admin Navigation */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard.title', 'Admin Dashboard')}</h1>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                >
                  <span className="text-xl">🔔</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-900">Admin Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                              !notification.isRead ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              markNotificationAsRead(notification.id);
                              if (notification.actionUrl) {
                                // Navigate to action URL
                                window.location.href = notification.actionUrl;
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(notification.severity)}`}>
                                    {notification.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-4 border-t">
                      <Link
                        to="/admin/notifications"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Log */}
              <button
                onClick={() => setShowActivityLog(!showActivityLog)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                title="Activity Log"
              >
                <span className="text-xl">📋</span>
              </button>

              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'hour' | 'day' | 'week')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hour">Last Hour</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <Link
                to="/admin"
                className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/moderation"
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Content Moderation
              </Link>
              <Link
                to="/admin/users"
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                User Management
              </Link>
              <Link
                to="/admin/analytics"
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Analytics
              </Link>
              <Link
                to="/admin/queue"
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Moderation Queue
              </Link>
              <Link
                to="/admin/settings"
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{(dashboardData.overview?.totalUsers || 0).toLocaleString()}</p>
                <p className="text-sm text-green-600">+{dashboardData.overview?.monthlyGrowth || 0}% this month</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{(dashboardData.overview?.activeUsers || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-500">{Math.round(((dashboardData.overview?.activeUsers || 0) / (dashboardData.overview?.totalUsers || 1)) * 100)}% of total</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">🟢</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{(dashboardData.overview?.totalContent || 0).toLocaleString()}</p>
                <p className="text-sm text-blue-600">{dashboardData.overview?.publishedContent || 0} published</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className={`text-2xl font-bold ${getStatusColor(dashboardData.overview?.systemStatus || 'unknown').split(' ')[0]}`}>
                  {(dashboardData.overview?.systemStatus || 'unknown').charAt(0).toUpperCase() + (dashboardData.overview?.systemStatus || 'unknown').slice(1)}
                </p>
                <p className="text-sm text-gray-500">{dashboardData.systemHealth?.uptime || 0}% uptime</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPU Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${dashboardData.systemHealth?.cpuUsage || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.systemHealth?.cpuUsage || 0}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${dashboardData.systemHealth?.memoryUsage || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.systemHealth?.memoryUsage || 0}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Disk Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ width: `${dashboardData.systemHealth?.diskUsage || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{dashboardData.systemHealth?.diskUsage || 0}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Network Latency</span>
                <span className="text-sm font-medium">{dashboardData.systemHealth?.networkLatency || 0}ms</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{(dashboardData.overview?.avgResponseTime || 0).toFixed(2)}ms</p>
                <p className="text-sm text-gray-600">Avg Response Time</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{((dashboardData.overview?.errorRate || 0) * 100).toFixed(2)}%</p>
                <p className="text-sm text-gray-600">Error Rate</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{dashboardData.overview?.serverLoad || 0}%</p>
                <p className="text-sm text-gray-600">Server Load</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{dashboardData.overview?.criticalErrors || 0}</p>
                <p className="text-sm text-gray-600">Critical Errors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {(dashboardData.recentActivity || []).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                  {activity.severity && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(activity.severity)}`}>
                      {activity.severity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/admin/moderation/posts"
                className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">🚩</div>
                <p className="text-sm font-medium text-red-900">Review Flagged Posts</p>
                <p className="text-xs text-red-600 mt-1">
                  {notifications.filter(n => n.type === 'flagged_content').length} pending
                </p>
              </Link>
              <Link
                to="/admin/moderation/users"
                className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">👤</div>
                <p className="text-sm font-medium text-orange-900">User Reports</p>
                <p className="text-xs text-orange-600 mt-1">
                  {notifications.filter(n => n.type === 'user_report').length} pending
                </p>
              </Link>
              <Link
                to="/admin/moderation/resources"
                className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📁</div>
                <p className="text-sm font-medium text-blue-900">Resource Review</p>
                <p className="text-xs text-blue-600 mt-1">
                  {dashboardData?.overview?.pendingContent || 0} pending
                </p>
              </Link>
              <Link
                to="/admin/moderation/communities"
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">🏘️</div>
                <p className="text-sm font-medium text-green-900">Community Oversight</p>
                <p className="text-xs text-green-600 mt-1">Monitor activity</p>
              </Link>
              <Link
                to="/admin/users"
                className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">👥</div>
                <p className="text-sm font-medium text-purple-900">Manage Users</p>
                <p className="text-xs text-purple-600 mt-1">
                  {dashboardData?.overview?.totalUsers || 0} total
                </p>
              </Link>
              <Link
                to="/admin/analytics"
                className="p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm font-medium text-indigo-900">View Analytics</p>
                <p className="text-xs text-indigo-600 mt-1">Platform insights</p>
              </Link>
              <Link
                to="/admin/queue"
                className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm font-medium text-yellow-900">Moderation Queue</p>
                <p className="text-xs text-yellow-600 mt-1">Review items</p>
              </Link>
              <Link
                to="/admin/settings"
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">⚙️</div>
                <p className="text-sm font-medium text-gray-900">System Settings</p>
                <p className="text-xs text-gray-600 mt-1">Configure platform</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Activity Log Modal */}
        {showActivityLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Admin Activity Log</h3>
                  <button
                    onClick={() => setShowActivityLog(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{getActionIcon(activity.action)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {activity.adminName} - {activity.action}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span>Target: {activity.targetType}</span>
                          {activity.targetId && <span>ID: {activity.targetId}</span>}
                          {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing recent admin activities
                  </p>
                  <Link
                    to="/admin/audit-log"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setShowActivityLog(false)}
                  >
                    View full audit log →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform Overview Metrics Summary */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {((dashboardData?.overview?.totalUsers || 0) / (dashboardData?.overview?.totalUsers || 1) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">User Engagement Rate</div>
              <div className="text-xs text-gray-400 mt-1">
                {dashboardData?.overview?.activeUsers || 0} of {dashboardData?.overview?.totalUsers || 0} users active
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {dashboardData?.overview?.publishedContent || 0}
              </div>
              <div className="text-sm text-gray-600">Published Content Items</div>
              <div className="text-xs text-gray-400 mt-1">
                {dashboardData?.overview?.pendingContent || 0} pending review
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {dashboardData?.systemHealth?.uptime || 0}%
              </div>
              <div className="text-sm text-gray-600">System Uptime</div>
              <div className="text-xs text-gray-400 mt-1">
                Status: {dashboardData?.overview?.systemStatus || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};