import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  communityId?: string;
  communityName?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  status: 'active' | 'flagged' | 'hidden' | 'deleted';
  reports: PostReport[];
  mediaAttachments?: MediaAttachment[];
}

interface PostReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description: string;
  createdAt: string;
}

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  filename: string;
}

interface PostModerationPanelProps {
  onClose?: () => void;
}

export const PostModerationPanel: React.FC<PostModerationPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'reported'>('flagged');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_reported'>('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [filter, sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockPosts: Post[] = [
        {
          id: '1',
          title: 'Controversial Teaching Method',
          content: 'This new teaching method has been causing debates in our community...',
          authorId: 'user1',
          authorName: 'John Teacher',
          communityId: 'comm1',
          communityName: 'Mathematics Teachers',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likeCount: 15,
          commentCount: 8,
          reportCount: 3,
          status: 'flagged',
          reports: [
            {
              id: 'r1',
              reporterId: 'user2',
              reporterName: 'Sarah Smith',
              reason: 'inappropriate',
              description: 'This content promotes unproven teaching methods',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
          ]
        },
        {
          id: '2',
          title: 'Student Behavior Issues',
          content: 'How do you handle disruptive students in your classroom?',
          authorId: 'user3',
          authorName: 'Mike Wilson',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          likeCount: 25,
          commentCount: 12,
          reportCount: 1,
          status: 'flagged',
          reports: [
            {
              id: 'r2',
              reporterId: 'user4',
              reporterName: 'Lisa Brown',
              reason: 'other',
              description: 'This seems to be targeting specific students',
              createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      ];
      setPosts(mockPosts);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (postId: string, action: 'approve' | 'hide' | 'delete', reason?: string) => {
    try {
      setActionLoading(postId);
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, status: action === 'approve' ? 'active' : action === 'hide' ? 'hidden' : 'deleted' }
          : post
      ));
      
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
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
      case 'flagged':
        return 'text-red-600 bg-red-100';
      case 'hidden':
        return 'text-yellow-600 bg-yellow-100';
      case 'deleted':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'text-orange-600 bg-orange-100';
      case 'harassment':
        return 'text-red-600 bg-red-100';
      case 'inappropriate':
        return 'text-purple-600 bg-purple-100';
      case 'misinformation':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'flagged') return post.status === 'flagged';
    if (filter === 'reported') return post.reportCount > 0;
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'most_reported':
        return b.reportCount - a.reportCount;
      default: // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Post Moderation</h2>
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
            onChange={(e) => setFilter(e.target.value as 'all' | 'flagged' | 'reported')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Posts</option>
            <option value="flagged">Flagged Posts</option>
            <option value="reported">Reported Posts</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_reported')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_reported">Most Reported</option>
          </select>
          
          <button
            onClick={fetchPosts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Posts List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No posts found for the selected filter
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {sortedPosts.map((post) => (
                <div
                  key={post.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedPost?.id === post.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(post.status)}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>By {post.authorName}</span>
                    <div className="flex items-center space-x-2">
                      <span>👍 {post.likeCount}</span>
                      <span>💬 {post.commentCount}</span>
                      {post.reportCount > 0 && (
                        <span className="text-red-600">🚩 {post.reportCount}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post Details */}
        <div className="w-1/2 overflow-y-auto">
          {selectedPost ? (
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPost.title}</h3>
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedPost.status)}`}>
                    {selectedPost.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  By {selectedPost.authorName} • {new Date(selectedPost.createdAt).toLocaleString()}
                  {selectedPost.communityName && (
                    <span> • in {selectedPost.communityName}</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedPost.content}</p>
                </div>
              </div>

              {selectedPost.mediaAttachments && selectedPost.mediaAttachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {selectedPost.mediaAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <span className="text-sm">📎</span>
                        <span className="text-sm text-gray-700">{attachment.filename}</span>
                        <span className="text-xs text-gray-500">({attachment.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPost.reports.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reports ({selectedPost.reports.length})</h4>
                  <div className="space-y-3">
                    {selectedPost.reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{report.reporterName}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getReasonColor(report.reason)}`}>
                            {report.reason}
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

              {/* Moderation Actions */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Moderation Actions</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleModerationAction(selectedPost.id, 'approve')}
                    disabled={actionLoading === selectedPost.id}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === selectedPost.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedPost.id, 'hide')}
                    disabled={actionLoading === selectedPost.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedPost.id, 'delete')}
                    disabled={actionLoading === selectedPost.id}
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
              Select a post to view details and moderation options
            </div>
          )}
        </div>
      </div>
    </div>
  );
};