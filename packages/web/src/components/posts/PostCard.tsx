import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

interface Post {
  id: string;
  authorId: string;
  communityId?: string;
  title: string;
  content: string;
  mediaAttachments: MediaAttachment[];
  tags: string[];
  visibility: 'public' | 'community' | 'followers';
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Author {
  id: string;
  fullName: string;
  profileImageUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface Community {
  id: string;
  name: string;
}

interface PostCardProps {
  post: Post;
  author: Author;
  community?: Community;
  currentUserId?: string;
  isLiked?: boolean;
  onLike?: (postId: string) => void;
  onUnlike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  author,
  community,
  currentUserId,
  isLiked = false,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onBookmark,
  showActions = true,
  compact = false
}) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  const isAuthor = currentUserId === post.authorId;
  const contentPreviewLength = compact ? 150 : 300;
  const shouldTruncateContent = post.content.length > contentPreviewLength;
  const displayContent = shouldTruncateContent && !showFullContent 
    ? post.content.substring(0, contentPreviewLength) + '...'
    : post.content;

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

  const handleLikeClick = () => {
    if (isLiked) {
      onUnlike?.(post.id);
    } else {
      onLike?.(post.id);
    }
  };

  const handleImageError = (attachmentId: string) => {
    setImageError(prev => ({ ...prev, [attachmentId]: true }));
  };

  const renderMediaAttachment = (attachment: MediaAttachment) => {
    if (attachment.type === 'image') {
      if (imageError[attachment.id]) {
        return (
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Image unavailable</p>
            </div>
          </div>
        );
      }

      return (
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.filename}
          className="w-full aspect-video object-cover rounded-lg"
          onError={() => handleImageError(attachment.id)}
        />
      );
    }

    if (attachment.type === 'video') {
      return (
        <video
          src={attachment.url}
          poster={attachment.thumbnailUrl}
          controls
          className="w-full aspect-video rounded-lg"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    // Document attachment
    return (
      <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
        <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
          <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <Button variant="ghost" size="sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </Button>
      </div>
    );
  };

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} hover:shadow-lg transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Author Avatar */}
          <Link to={`/profile/${author.id}`} className="flex-shrink-0">
            {author.profileImageUrl ? (
              <img
                src={author.profileImageUrl}
                alt={author.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {author.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </Link>

          {/* Author Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link
                to={`/profile/${author.id}`}
                className="font-medium text-gray-900 hover:text-primary-600 truncate"
              >
                {author.fullName}
              </Link>
              {author.verificationStatus === 'verified' && (
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{formatDate(post.createdAt)}</span>
              {community && (
                <>
                  <span>•</span>
                  <Link
                    to={`/communities/${community.id}`}
                    className="hover:text-primary-600"
                  >
                    {community.name}
                  </Link>
                </>
              )}
              {post.visibility !== 'public' && (
                <>
                  <span>•</span>
                  <span className="capitalize">{post.visibility}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Actions Menu */}
        {showActions && isAuthor && (
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(post.id)}
                aria-label="Edit post"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(post.id)}
                aria-label="Delete post"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pinned Indicator */}
      {post.isPinned && (
        <div className="flex items-center space-x-2 mb-3 text-sm text-primary-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
            <path fillRule="evenodd" d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span>Pinned Post</span>
        </div>
      )}

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 mb-3 ${compact ? 'text-lg' : 'text-xl'}`}>
        {post.title}
      </h3>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-700 whitespace-pre-wrap">{displayContent}</p>
        {shouldTruncateContent && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Media Attachments */}
      {post.mediaAttachments.length > 0 && (
        <div className="mb-4">
          {post.mediaAttachments.length === 1 ? (
            renderMediaAttachment(post.mediaAttachments[0])
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {post.mediaAttachments.slice(0, 4).map((attachment, index) => (
                <div key={attachment.id} className="relative">
                  {renderMediaAttachment(attachment)}
                  {index === 3 && post.mediaAttachments.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <span className="text-white font-medium">
                        +{post.mediaAttachments.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            {/* Like Button */}
            <button
              onClick={handleLikeClick}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                isLiked
                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-medium">{post.likeCount}</span>
            </button>

            {/* Comment Button */}
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center space-x-2 px-3 py-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">{post.commentCount}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => onShare?.(post.id)}
              className="flex items-center space-x-2 px-3 py-1 rounded-md text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          {/* Bookmark Button */}
          {onBookmark && (
            <button
              onClick={() => onBookmark(post.id)}
              className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
              aria-label="Bookmark post"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </Card>
  );
};