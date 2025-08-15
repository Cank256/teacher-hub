import React, { useState, useEffect, useCallback } from 'react';
import { PostCard } from './PostCard';
import { PostSearch } from './PostSearch';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Post {
  id: string;
  authorId: string;
  communityId?: string;
  title: string;
  content: string;
  mediaAttachments: Array<{
    id: string;
    type: 'image' | 'video' | 'document';
    url: string;
    thumbnailUrl?: string;
    filename: string;
    size: number;
  }>;
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

interface PostWithDetails extends Post {
  author: Author;
  community?: Community;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface PostFeedProps {
  posts: PostWithDetails[];
  currentUserId?: string;
  loading?: boolean;
  error?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onLikePost?: (postId: string) => void;
  onUnlikePost?: (postId: string) => void;
  onCommentPost?: (postId: string) => void;
  onSharePost?: (postId: string) => void;
  onBookmarkPost?: (postId: string) => void;
  onEditPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onSearch?: (filters: any) => void;
  showSearch?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
}

export const PostFeed: React.FC<PostFeedProps> = ({
  posts,
  currentUserId,
  loading = false,
  error,
  hasMore = false,
  onLoadMore,
  onRefresh,
  onLikePost,
  onUnlikePost,
  onCommentPost,
  onSharePost,
  onBookmarkPost,
  onEditPost,
  onDeletePost,
  onSearch,
  showSearch = false,
  emptyStateTitle = "No posts yet",
  emptyStateDescription = "Be the first to share something with the community!",
  emptyStateAction
}) => {
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [isSearchVisible, setIsSearchVisible] = useState(showSearch);
  const [refreshing, setRefreshing] = useState(false);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (loading || !hasMore || !onLoadMore) return;

    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 1000) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Group posts by date for better organization
  const groupPostsByDate = (posts: PostWithDetails[]) => {
    const groups: { [key: string]: PostWithDetails[] } = {};
    
    posts.forEach(post => {
      const date = new Date(post.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(post);
    });
    
    return groups;
  };

  const postGroups = groupPostsByDate(posts);
  const groupKeys = Object.keys(postGroups);

  if (error) {
    return (
      <Card className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading posts</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        {onRefresh && (
          <Button onClick={handleRefresh} loading={refreshing}>
            Try Again
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search Toggle */}
      {onSearch && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Posts</h2>
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearchVisible ? 'Hide Search' : 'Search'}
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      {isSearchVisible && onSearch && (
        <PostSearch
          initialFilters={searchFilters}
          onFiltersChange={setSearchFilters}
          onSearch={onSearch}
          loading={loading}
        />
      )}

      {/* Loading State */}
      {loading && posts.length === 0 && (
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/6"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-4/6"></div>
              </div>
              <div className="h-32 bg-gray-300 rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
          <p className="text-gray-600 mb-6">{emptyStateDescription}</p>
          {emptyStateAction}
        </Card>
      )}

      {/* Posts Feed */}
      {posts.length > 0 && (
        <div className="space-y-8">
          {groupKeys.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-2 mb-4">
                <h3 className="text-sm font-medium text-gray-900">{dateKey}</h3>
              </div>

              {/* Posts for this date */}
              <div className="space-y-6">
                {postGroups[dateKey].map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    author={post.author}
                    community={post.community}
                    currentUserId={currentUserId}
                    isLiked={post.isLiked}
                    onLike={onLikePost}
                    onUnlike={onUnlikePost}
                    onComment={onCommentPost}
                    onShare={onSharePost}
                    onEdit={onEditPost}
                    onDelete={onDeletePost}
                    onBookmark={onBookmarkPost}
                    showActions={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && onLoadMore && posts.length > 0 && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            onClick={onLoadMore}
            loading={loading}
            loadingText="Loading more posts..."
          >
            Load More Posts
          </Button>
        </div>
      )}

      {/* Loading indicator for infinite scroll */}
      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
};