import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ModerationItem {
  id: string;
  type: 'post' | 'comment' | 'resource' | 'user' | 'community' | 'message';
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'escalated' | 'resolved' | 'dismissed';
  category: string;
  reportReason: string;
  contentPreview?: string;
  reporterCount: number;
  lastUpdated: string;
  estimatedReviewTime: number; // in minutes
  relatedItems?: string[];
  metadata: {
    authorId?: string;
    authorName?: string;
    communityId?: string;
    communityName?: string;
    contentId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'behavior' | 'content_type';
  criteria: string;
  action: 'flag' | 'auto_remove' | 'require_approval' | 'notify_moderator';
  severity: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: string;
  triggeredCount: number;
}

interface ModerationQueueProps {
  onClose?: () => void;
}

export const ModerationQueue: React.FC<ModerationQueueProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review' | 'escalated'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'post' | 'comment' | 'resource' | 'user' | 'community' | 'message'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'reporter_count'>('priority');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchModerationItems();
    fetchModerationRules();
  }, [filter, priorityFilter, typeFilter, sortBy, assignmentFilter]);

  const fetchModerationItems = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockItems: ModerationItem[] = [
        {
          id: '1',
          type: 'post',
          title: 'Inappropriate Teaching Method Discussion',
          description: 'Post contains controversial teaching methods that may be harmful',
          reportedBy: 'user123',
          reportedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          assignedTo: 'moderator1',
          priority: 'high',
          status: 'in_review',
          category: 'Inappropriate Content',
          reportReason: 'Promotes unproven teaching methods',
          contentPreview: 'This new teaching method involves...',
          reporterCount: 3,
          lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          estimatedReviewTime: 15,
          metadata: {
            authorId: 'author1',
            authorName: 'John Teacher',
            communityId: 'comm1',
            communityName: 'Mathematics Teachers'
          }
        },
        {
          id: '2',
          type: 'resource',
          title: 'Suspicious File Upload',
          description: 'Resource failed security scan and contains potential malware',
          reportedBy: 'system',
          reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: 'critical',
          status: 'pending',
          category: 'Security Threat',
          reportReason: 'Failed security scan',
          contentPreview: 'chemistry-lab-guide.exe',
          reporterCount: 1,
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          estimatedReviewTime: 5,
          metadata: {
            authorId: 'author2',
            authorName: 'Unknown User',
            ipAddress: '192.168.1.100'
          }
        },
        {
          id: '3',
          type: 'message',
          title: 'Harassment Report',
          description: 'User reported receiving threatening messages',
          reportedBy: 'user456',
          reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'escalated',
          category: 'Harassment',
          reportReason: 'Threatening behavior',
          contentPreview: 'You better watch out...',
          reporterCount: 1,
          lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          estimatedReviewTime: 20,
          metadata: {
            authorId: 'author3',
            authorName: 'Aggressive User'
          }
        },
        {
          id: '4',
          type: 'community',
          title: 'Community Guidelines Violation',
          description: 'Community allowing off-topic and inappropriate discussions',
          reportedBy: 'user789',
          reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          status: 'pending',
          category: 'Community Management',
          reportReason: 'Lack of moderation',
          reporterCount: 2,
          lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          estimatedReviewTime: 30,
          metadata: {
            communityId: 'comm2',
            communityName: 'General Discussion'
          }
        }
      ];
      setItems(mockItems);
    } catch (error) {
      console.error('Failed to fetch moderation items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationRules = async () => {
    try {
      // Mock data - would be replaced with actual API call
      const mockRules: ModerationRule[] = [
        {
          id: '1',
          name: 'Spam Detection',
          description: 'Automatically flag posts with excessive promotional content',
          type: 'keyword',
          criteria: 'buy now, limited time, special offer',
          action: 'flag',
          severity: 'medium',
          isActive: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredCount: 45
        },
        {
          id: '2',
          name: 'Profanity Filter',
          description: 'Auto-remove content with inappropriate language',
          type: 'pattern',
          criteria: 'profanity_pattern_regex',
          action: 'auto_remove',
          severity: 'high',
          isActive: true,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredCount: 23
        },
        {
          id: '3',
          name: 'Suspicious File Types',
          description: 'Flag executable files and suspicious formats',
          type: 'content_type',
          criteria: '.exe, .bat, .scr, .com',
          action: 'require_approval',
          severity: 'high',
          isActive: true,
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          triggeredCount: 12
        }
      ];
      setRules(mockRules);
    } catch (error) {
      console.error('Failed to fetch moderation rules:', error);
    }
  };

  const handleItemAction = async (itemId: string, action: 'approve' | 'reject' | 'escalate' | 'assign', assignTo?: string) => {
    try {
      setActionLoading(itemId);
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: action === 'approve' ? 'resolved' : action === 'reject' ? 'dismissed' : action === 'escalate' ? 'escalated' : item.status,
              assignedTo: assignTo || item.assignedTo,
              lastUpdated: new Date().toISOString()
            }
          : item
      ));
      
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => prev ? {
          ...prev,
          status: action === 'approve' ? 'resolved' : action === 'reject' ? 'dismissed' : action === 'escalate' ? 'escalated' : prev.status,
          assignedTo: assignTo || prev.assignedTo,
          lastUpdated: new Date().toISOString()
        } : null);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'escalate' | 'assign', assignTo?: string) => {
    try {
      setActionLoading('bulk');
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setItems(prev => prev.map(item => 
        selectedItems.includes(item.id)
          ? { 
              ...item, 
              status: action === 'approve' ? 'resolved' : action === 'reject' ? 'dismissed' : action === 'escalate' ? 'escalated' : item.status,
              assignedTo: assignTo || item.assignedTo,
              lastUpdated: new Date().toISOString()
            }
          : item
      ));
      
      setSelectedItems([]);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'dismissed':
        return 'text-gray-600 bg-gray-100';
      case 'escalated':
        return 'text-red-600 bg-red-100';
      case 'in_review':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'comment': return '💬';
      case 'resource': return '📁';
      case 'user': return '👤';
      case 'community': return '🏘️';
      case 'message': return '✉️';
      default: return '📋';
    }
  };

  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (assignmentFilter === 'assigned' && !item.assignedTo) return false;
    if (assignmentFilter === 'unassigned' && item.assignedTo) return false;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      case 'reporter_count':
        return b.reporterCount - a.reporterCount;
      default: // newest
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    }
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading moderation queue...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Moderation Queue</h1>
            <p className="text-gray-600 mt-1">Review and manage flagged content and reports</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowRules(!showRules)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {showRules ? 'Hide Rules' : 'Show Rules'}
            </button>
            <button
              onClick={fetchModerationItems}
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

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="resource">Resources</option>
              <option value="user">Users</option>
              <option value="community">Communities</option>
              <option value="message">Messages</option>
            </select>

            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">By Priority</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="reporter_count">Most Reported</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              {sortedItems.length} items
            </div>
          </div>
        </div>

        {/* Moderation Rules Panel */}
        {showRules && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Moderation Rules</h3>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(rule.severity)}`}>
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      <div className="text-xs text-gray-500">
                        <span>Type: {rule.type}</span> • 
                        <span> Action: {rule.action}</span> • 
                        <span> Triggered: {rule.triggeredCount} times</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Items */}
        <div className="bg-white rounded-lg shadow">
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="p-4 border-b bg-blue-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedItems.length} items selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    disabled={actionLoading === 'bulk'}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    disabled={actionLoading === 'bulk'}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => handleBulkAction('escalate')}
                    disabled={actionLoading === 'bulk'}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Escalate All
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-gray-200">
            {sortedItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No items found matching the selected filters
              </div>
            ) : (
              sortedItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(prev => [...prev, item.id]);
                        } else {
                          setSelectedItems(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTypeIcon(item.type)}</span>
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.estimatedReviewTime}min review
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>Reported: {new Date(item.reportedAt).toLocaleString()}</span>
                          <span>Reports: {item.reporterCount}</span>
                          {item.assignedTo && <span>Assigned to: {item.assignedTo}</span>}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleItemAction(item.id, 'approve')}
                            disabled={actionLoading === item.id}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleItemAction(item.id, 'reject')}
                            disabled={actionLoading === item.id}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleItemAction(item.id, 'escalate')}
                            disabled={actionLoading === item.id}
                            className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50"
                          >
                            Escalate
                          </button>
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Item Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Moderation Item Details</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Item Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Type:</strong> {selectedItem.type}</div>
                        <div><strong>Priority:</strong> {selectedItem.priority}</div>
                        <div><strong>Status:</strong> {selectedItem.status}</div>
                        <div><strong>Category:</strong> {selectedItem.category}</div>
                        <div><strong>Reported:</strong> {new Date(selectedItem.reportedAt).toLocaleString()}</div>
                        <div><strong>Reports:</strong> {selectedItem.reporterCount}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedItem.description}</p>
                  </div>
                  
                  {selectedItem.contentPreview && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
                      <p className="text-gray-700 bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                        {selectedItem.contentPreview}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {selectedItem.metadata.authorName && (
                          <div><strong>Author:</strong> {selectedItem.metadata.authorName}</div>
                        )}
                        {selectedItem.metadata.communityName && (
                          <div><strong>Community:</strong> {selectedItem.metadata.communityName}</div>
                        )}
                        {selectedItem.metadata.ipAddress && (
                          <div><strong>IP Address:</strong> {selectedItem.metadata.ipAddress}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      handleItemAction(selectedItem.id, 'approve');
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleItemAction(selectedItem.id, 'reject');
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleItemAction(selectedItem.id, 'escalate');
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};