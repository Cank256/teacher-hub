import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useOffline } from '../hooks/useOffline';

export const Dashboard: React.FC = () => {
  const { isOnline, queuedActionsCount } = useOffline();
  const [stats, setStats] = useState({
    resourcesShared: 24,
    totalDownloads: 156,
    communitiesJoined: 3,
    unreadMessages: 5
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'resource_shared',
      title: 'Mathematics Worksheets for Primary 5',
      timestamp: '2 hours ago',
      icon: '📚'
    },
    {
      id: 2,
      type: 'message_received',
      title: 'New message from Sarah Nakato',
      timestamp: '4 hours ago',
      icon: '💬'
    },
    {
      id: 3,
      type: 'community_joined',
      title: 'Joined Science Teachers Network',
      timestamp: '1 day ago',
      icon: '👥'
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Header with offline indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome to your Teacher Hub dashboard
          </p>
        </div>
        
        {!isOnline && (
          <div className="mt-2 sm:mt-0 flex items-center space-x-2 text-sm text-yellow-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Offline Mode</span>
            {queuedActionsCount > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                {queuedActionsCount} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.resourcesShared}</p>
            <p className="text-sm text-gray-600">Resources Shared</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.totalDownloads}</p>
            <p className="text-sm text-gray-600">Total Downloads</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.communitiesJoined}</p>
            <p className="text-sm text-gray-600">Communities</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.unreadMessages}</p>
            <p className="text-sm text-gray-600">Unread Messages</p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md transition-colors">
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="w-full">
                  View All Activity
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <Link to="/resources" className="block">
                <div className="p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Upload Resource</p>
                      <p className="text-sm text-gray-600">Share materials</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/communities" className="block">
                <div className="p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Join Community</p>
                      <p className="text-sm text-gray-600">Connect with peers</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/messages" className="block">
                <div className="p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Send Message</p>
                      <p className="text-sm text-gray-600">Chat with teachers</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Government Updates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Government Updates</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">New Curriculum Guidelines</h3>
                <p className="text-sm text-blue-700 mt-1">Updated mathematics curriculum for primary schools now available</p>
                <p className="text-xs text-blue-600 mt-2">Ministry of Education - 2 days ago</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-green-900">UNEB Examination Updates</h3>
                <p className="text-sm text-green-700 mt-1">Important changes to examination format and dates</p>
                <p className="text-xs text-green-600 mt-2">UNEB - 1 week ago</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};