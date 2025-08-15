import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface Post {
  id: string;
  authorId: string;
  communityId?: string;
  title: string;
  content: string;
  mediaAttachments: any[];
  tags: string[];
  visibility: 'public' | 'community' | 'followers';
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  content: string;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  yearsExperience: number;
}

interface PostWithAuthor extends Post {
  author: UserProfile;
}

interface CommentWithAuthor extends PostComment {
  author: UserProfile;
}

interface ModerationAction {
  type: 'approve' | 'flag' | 'delete' | 'pin' | 'unpin';
  reason?: string;
}

interface CommunityModerationToolsProps {
  communityId: string;
  flaggedPosts: PostWithAuthor[];
  flaggedComments: CommentWithAuthor[];
  currentUserRole: 'moderator' | 'owner';
  onModeratePost: (postId: string, action: ModerationAction) => Promise<void>;
  onModerateComment: (commentId: string, action: ModerationAction) => Promise<void>;
  isLoading?: boolean;
}

export const CommunityModerationTools: React.FC<CommunityModerationToolsProps> = ({
  communityId,
  flaggedPosts,
  flaggedComments,
  currentUserRole,
  onModeratePost,
  onModerateComment,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handlePostAction = async (postId: string, action: ModerationAction) => {
    setActionLoading(postId);
    try {
      await onModeratePost(postId, action);
    } catch (error) {
      console.error('Failed to moderate post:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommentAction = async (commentId: string, action: ModerationAction) => {
    setActionLoading(commentId);
    try {
      await onModerateComment(commentId, action);
    } catch (error) {
      console.error('Failed to moderate comment:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: ModerationAction) => {
    if (selectedItems.size === 0) return;

    setActionLoading('bulk');
    try {
      const promises = Array.from(selectedItems).map(itemId => {
        if (activeTab === 'posts') {
          return onModeratePost(itemId, action);
        } else {
          return onModerateComment(itemId, action);
        }
      });
      
      await Promise.all(promises);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (activeTab === 'posts') {
      setSelectedItems(new Set(flaggedPosts.map(post => post.id)));
    } else {
      setSelectedItems(new Set(flaggedComments.map(comment => comment.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Community Moderation Tools</CardTitle>
        </CardHeader>
        
        <div className="p-6">
          {/* Moderation Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{flaggedPosts.length}</div>
              <div className="text-sm text-yellow-700">Flagged Posts</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{flaggedComments.length}</div>
              <div className="text-sm text-orange-700">Flagged Comments</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{selectedItems.size}</div>
              <div className="text-sm text-blue-700">Selected Items</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flagged Posts ({flaggedPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'comments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flagged Comments ({flaggedComments.length})
              </button>
            </nav>
          </div>

          {/* Bulk Actions */}
          {(flaggedPosts.length > 0 || flaggedComments.length > 0) && (
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.size > 0}
                    onChange={() => selectedItems.size > 0 ? clearSelection() : selectAll()}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">
                    {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                  </span>
                </div>
                {selectedItems.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={isLoading}
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
              
              {selectedItems.size > 0 && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction({ type: 'approve' })}
                    disabled={isLoading || actionLoading === 'bulk'}
                  >
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction({ type: 'delete', reason: 'Bulk moderation action' })}
                    disabled={isLoading || actionLoading === 'bulk'}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Content Lists */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {flaggedPosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Flagged Posts</h3>
                  <p className="text-gray-600">All posts in this community are currently approved.</p>
                </div>
              ) : (
                flaggedPosts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(post.id)}
                        onChange={() => toggleItemSelection(post.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                        disabled={isLoading}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{post.title}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>By {post.author.fullName}</span>
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              <span>{post.likeCount} likes</span>
                              <span>{post.commentCount} comments</span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handlePostAction(post.id, { type: 'approve' })}
                              disabled={isLoading || actionLoading === post.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePostAction(post.id, { type: 'flag', reason: 'Requires review' })}
                              disabled={isLoading || actionLoading === post.id}
                            >
                              Keep Flagged
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePostAction(post.id, { type: 'delete', reason: 'Violates community guidelines' })}
                              disabled={isLoading || actionLoading === post.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                            {actionLoading === post.id && (
                              <div className="text-sm text-gray-500">Processing...</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {flaggedComments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Flagged Comments</h3>
                  <p className="text-gray-600">All comments in this community are currently approved.</p>
                </div>
              ) : (
                flaggedComments.map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(comment.id)}
                        onChange={() => toggleItemSelection(comment.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                        disabled={isLoading}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-gray-900">{comment.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>By {comment.author.fullName}</span>
                              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                              <span>{comment.likeCount} likes</span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleCommentAction(comment.id, { type: 'approve' })}
                              disabled={isLoading || actionLoading === comment.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCommentAction(comment.id, { type: 'flag', reason: 'Requires review' })}
                              disabled={isLoading || actionLoading === comment.id}
                            >
                              Keep Flagged
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCommentAction(comment.id, { type: 'delete', reason: 'Violates community guidelines' })}
                              disabled={isLoading || actionLoading === comment.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                            {actionLoading === comment.id && (
                              <div className="text-sm text-gray-500">Processing...</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};