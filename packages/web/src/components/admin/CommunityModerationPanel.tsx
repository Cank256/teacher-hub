import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  ownerName: string;
  memberCount: number;
  postCount: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  status: 'active' | 'suspended' | 'under_review';
  createdAt: string;
  lastActivity: string;
  reports: CommunityReport[];
  moderators: CommunityModerator[];
  recentActivity: CommunityActivity[];
}

interface CommunityReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: 'inappropriate_content' | 'harassment' | 'spam' | 'fake_community' | 'other';
  description: string;
  createdAt: string;
}

interface CommunityModerator {
  id: string;
  userId: string;
  userName: string;
  role: 'owner' | 'moderator';
  assignedAt: string;
}

interface CommunityActivity {
  id: string;
  type: 'post_created' | 'member_joined' | 'member_removed' | 'rule_violation';
  description: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high';
}

interface CommunityModerationPanelProps {
  onClose?: () => void;
}

export const CommunityModerationPanel: React.FC<CommunityModerationPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [filter, setFilter] = useState<'all' | 'reported' | 'under_review' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_members' | 'most_active'>('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, [filter, sortBy]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'Advanced Mathematics',
          description: 'A community for advanced mathematics teachers and students',
          type: 'subject',
          ownerId: 'user1',
          ownerName: 'Dr. Smith',
          memberCount: 245,
          postCount: 89,
          isPrivate: false,
          requiresApproval: true,
          status: 'under_review',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          reports: [
            {
              id: 'r1',
              reporterId: 'user2',
              reporterName: 'Jane Doe',
              reason: 'inappropriate_content',
              description: 'Some posts contain inappropriate language and off-topic discussions',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          moderators: [
            {
              id: 'm1',
              userId: 'user1',
              userName: 'Dr. Smith',
              role: 'owner',
              assignedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'm2',
              userId: 'user3',
              userName: 'Prof. Johnson',
              role: 'moderator',
              assignedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          recentActivity: [
            {
              id: 'a1',
              type: 'rule_violation',
              description: 'Multiple reports of off-topic posts',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              severity: 'medium'
            },
            {
              id: 'a2',
              type: 'member_joined',
              description: '5 new members joined today',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              severity: 'low'
            }
          ]
        },
        {
          id: '2',
          name: 'Elementary Science',
          description: 'Science teaching resources for elementary grades',
          type: 'subject',
          ownerId: 'user4',
          ownerName: 'Ms. Wilson',
          memberCount: 156,
          postCount: 67,
          isPrivate: false,
          requiresApproval: false,
          status: 'active',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          reports: [],
          moderators: [
            {
              id: 'm3',
              userId: 'user4',
              userName: 'Ms. Wilson',
              role: 'owner',
              assignedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          recentActivity: [
            {
              id: 'a3',
              type: 'post_created',
              description: 'New experiment guide posted',
              userId: 'user5',
              userName: 'Teacher Bob',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              severity: 'low'
            }
          ]
        }
      ];
      setCommunities(mockCommunities);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (
    communityId: string, 
    action: 'approve' | 'suspend' | 'delete' | 'warn_owner',
    reason?: string
  ) => {
    try {
      setActionLoading(communityId);
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { 
              ...community, 
              status: action === 'approve' ? 'active' : action === 'suspend' ? 'suspended' : community.status
            }
          : community
      ));
      
      if (selectedCommunity?.id === communityId) {
        setSelectedCommunity(prev => prev ? {
          ...prev,
          status: action === 'approve' ? 'active' : action === 'suspend' ? 'suspended' : prev.status
        } : null);
      }
    } catch (error) {
      console.error('Failed to perform moderation action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      case 'under_review':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'inappropriate_content':
        return 'text-purple-600 bg-purple-100';
      case 'harassment':
        return 'text-red-600 bg-red-100';
      case 'spam':
        return 'text-orange-600 bg-orange-100';
      case 'fake_community':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredCommunities = communities.filter(community => {
    if (filter === 'reported') return community.reports.length > 0;
    if (filter === 'under_review') return community.status === 'under_review';
    if (filter === 'suspended') return community.status === 'suspended';
    return true;
  });

  const sortedCommunities = [...filteredCommunities].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'most_members':
        return b.memberCount - a.memberCount;
      case 'most_active':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      default: // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Community Moderation</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
        
        {/* Filters and Controls */}
        <div className="flex items-center space-x-4 mt-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'reported' | 'under_review' | 'suspended')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Communities</option>
            <option value="reported">Reported Communities</option>
            <option value="under_review">Under Review</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_members' | 'most_active')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_members">Most Members</option>
            <option value="most_active">Most Active</option>
          </select>
          
          <button
            onClick={fetchCommunities}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Communities List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading communities...</p>
            </div>
          ) : sortedCommunities.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No communities found for the selected filter
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {sortedCommunities.map((community) => (
                <div
                  key={community.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedCommunity?.id === community.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedCommunity(community)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{community.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(community.status)}`}>
                      {community.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{community.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Owner: {community.ownerName}</span>
                    <div className="flex items-center space-x-2">
                      <span>👥 {community.memberCount}</span>
                      <span>📝 {community.postCount}</span>
                      {community.reports.length > 0 && (
                        <span className="text-red-600">🚩 {community.reports.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(community.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Details */}
        <div className="w-1/2 overflow-y-auto">
          {selectedCommunity ? (
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCommunity.name}</h3>
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedCommunity.status)}`}>
                    {selectedCommunity.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <p>Owner: {selectedCommunity.ownerName}</p>
                  <p>Type: {selectedCommunity.type}</p>
                  <p>Privacy: {selectedCommunity.isPrivate ? 'Private' : 'Public'}</p>
                  <p>Approval Required: {selectedCommunity.requiresApproval ? 'Yes' : 'No'}</p>
                  <p>Created: {new Date(selectedCommunity.createdAt).toLocaleDateString()}</p>
                  <p>Last Activity: {new Date(selectedCommunity.lastActivity).toLocaleString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedCommunity.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedCommunity.memberCount}</div>
                    <div className="text-sm text-blue-800">Members</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedCommunity.postCount}</div>
                    <div className="text-sm text-green-800">Posts</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Moderators ({selectedCommunity.moderators.length})</h4>
                <div className="space-y-2">
                  {selectedCommunity.moderators.map((moderator) => (
                    <div key={moderator.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{moderator.userName}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        moderator.role === 'owner' ? 'text-purple-600 bg-purple-100' : 'text-blue-600 bg-blue-100'
                      }`}>
                        {moderator.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCommunity.reports.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reports ({selectedCommunity.reports.length})</h4>
                  <div className="space-y-3">
                    {selectedCommunity.reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{report.reporterName}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getReasonColor(report.reason)}`}>
                            {report.reason.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {selectedCommunity.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm">📊</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{activity.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                          {activity.severity && (
                            <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(activity.severity)}`}>
                              {activity.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moderation Actions */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Moderation Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleModerationAction(selectedCommunity.id, 'approve')}
                    disabled={actionLoading === selectedCommunity.id}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === selectedCommunity.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedCommunity.id, 'suspend')}
                    disabled={actionLoading === selectedCommunity.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedCommunity.id, 'warn_owner')}
                    disabled={actionLoading === selectedCommunity.id}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Warn Owner
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedCommunity.id, 'delete')}
                    disabled={actionLoading === selectedCommunity.id}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3">
                  <textarea
                    placeholder="Add moderation notes (optional)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Select a community to view details and moderation options
            </div>
          )}
        </div>
      </div>
    </div>
  );
};