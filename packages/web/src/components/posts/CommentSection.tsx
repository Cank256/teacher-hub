import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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

interface CommentAuthor {
  id: string;
  fullName: string;
  profileImageUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface CommentWithAuthor extends PostComment {
  author: CommentAuthor;
  replies?: CommentWithAuthor[];
  isLiked?: boolean;
}

interface CommentSectionProps {
  postId: string;
  comments: CommentWithAuthor[];
  currentUserId?: string;
  onAddComment: (postId: string, content: string, parentCommentId?: string) => Promise<void>;
  onLikeComment: (commentId: string) => void;
  onUnlikeComment: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  loading?: boolean;
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onLike: (commentId: string) => void;
  onUnlike: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onReply,
  onLike,
  onUnlike,
  onEdit,
  onDelete,
  depth = 0
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);

  const isAuthor = currentUserId === comment.authorId;
  const maxDepth = 3; // Maximum nesting level

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || !onEdit) return;

    setSubmitting(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error editing comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeClick = () => {
    if (comment.isLiked) {
      onUnlike(comment.id);
    } else {
      onLike(comment.id);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDelete(comment.id);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <Link to={`/profile/${comment.author.id}`} className="flex-shrink-0">
          {comment.author.profileImageUrl ? (
            <img
              src={comment.author.profileImageUrl}
              alt={comment.author.fullName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-700">
                {comment.author.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            {/* Author Info */}
            <div className="flex items-center space-x-2 mb-2">
              <Link
                to={`/profile/${comment.author.id}`}
                className="font-medium text-gray-900 hover:text-primary-600 text-sm"
              >
                {comment.author.fullName}
              </Link>
              {comment.author.verificationStatus === 'verified' && (
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
              {comment.updatedAt > comment.createdAt && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>

            {/* Comment Text */}
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  disabled={submitting}
                />
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    size="sm"
                    loading={submitting}
                    loadingText="Saving..."
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>

          {/* Comment Actions */}
          <div className="flex items-center space-x-4 mt-2 text-xs">
            {/* Like Button */}
            <button
              onClick={handleLikeClick}
              className={`flex items-center space-x-1 hover:text-red-600 transition-colors ${
                comment.isLiked ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <svg
                className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`}
                fill={comment.isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{comment.likeCount}</span>
            </button>

            {/* Reply Button */}
            {depth < maxDepth && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-gray-500 hover:text-primary-600 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Edit/Delete Buttons for Author */}
            {isAuthor && (
              <>
                {onEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="mt-3 space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={2}
                disabled={submitting}
              />
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  loading={submitting}
                  loadingText="Replying..."
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onLike={onLike}
                  onUnlike={onUnlike}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  comments,
  currentUserId,
  onAddComment,
  onLikeComment,
  onUnlikeComment,
  onEditComment,
  onDeleteComment,
  loading = false
}) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(postId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    await onAddComment(postId, content, parentCommentId);
  };

  // Sort comments by creation date (newest first for top-level, oldest first for replies)
  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="mt-4">
      <div className="p-6">
        {/* Header */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comments ({comments.length})
        </h3>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex space-x-3">
            {/* Current User Avatar */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-700">You</span>
              </div>
            </div>

            {/* Comment Input */}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                disabled={submitting || loading}
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  size="sm"
                  loading={submitting}
                  loadingText="Posting..."
                  disabled={!newComment.trim() || loading}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onReply={handleReply}
                onLike={onLikeComment}
                onUnlike={onUnlikeComment}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};