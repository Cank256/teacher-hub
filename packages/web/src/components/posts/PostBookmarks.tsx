import React, { useState } from 'react';
import { PostCard } from './PostCard';
import { PostSearch } from './PostSearch';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface BookmarkedPost {
  id: string;
  postId: string;
  userId: string;
  bookmarkedAt: Date;
  post: {
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
  };
  author: {
    id: string;
    fullName: string;
    profileImageUrl?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  community?: {
    id: string;
    name: string;
  };
}

interface PostBookmarksProps {
  bookmarks: BookmarkedPost[];
  currentUserId?: string;
  loading?: boolean;
  onRemoveBookmark: (postId: string) => void;
  onLikePost?: (postId: string) => void;
  onUnlikePost?: (postId: string) => void;
  onCommentPost?: (postId: string) => void;
  onSharePost?: (postId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onSearch?: (filters: any) => void;
}

export const PostBookmarks: React.FC<PostBookmarksProps> = ({
  bookmarks,
  currentUserId,
  loading = false,
  onRemoveBookmark,
  onLikePost,
  onUnlikePost,
  onCommentPost,
  onSharePost,
  onLoadMore,
  hasMore = false,
  onSearch
}) => {
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [showSearch, setShowSearch] = useState(false);

  const handleRemoveBookmark = (postId: string) => {
    if (window.confirm('Remove this post from your bookmarks?')) {
      onRemoveBookmark(postId);
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (!searchFilters.query) return true;
    
    const query = searchFilters.query.toLowerCase();
    return (
      bookmark.post.title.toLowerCase().includes(query) ||
      bookmark.post.content.toLowerCase().includes(query) ||
      bookmark.author.fullName.toLowerCase().includes(query) ||
      bookmark.post.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookmarked Posts</h1>
          <p className="text-gray-600 mt-1">
            {bookmarks.length} {bookmarks.length === 1 ? 'post' : 'posts'} saved
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowSearch(!showSearch)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {showSearch ? 'Hide Search' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search */}
      {showSearch && onSearch && (
        <PostSearch
          initialFilters={searchFilters}
          onFiltersChange={setSearchFilters}
          onSearch={onSearch}
          loading={loading}
          showAdvanced={false}
        />
      )}

      {/* Bookmarks List */}
      {loading && bookmarks.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {bookmarks.length === 0 ? 'No bookmarks yet' : 'No matching bookmarks'}
          </h3>
          <p className="text-gray-600 mb-6">
            {bookmarks.length === 0 
              ? 'Start bookmarking posts to save them for later reading.'
              : 'Try adjusting your search criteria to find the bookmarks you\'re looking for.'
            }
          </p>
          {bookmarks.length === 0 && (
            <Button variant="outline">
              Explore Posts
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="relative">
              {/* Bookmark Date */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">
                  Bookmarked {new Date(bookmark.bookmarkedAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBookmark(bookmark.post.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </Button>
              </div>

              {/* Post Card */}
              <PostCard
                post={bookmark.post}
                author={bookmark.author}
                community={bookmark.community}
                currentUserId={currentUserId}
                onLike={onLikePost}
                onUnlike={onUnlikePost}
                onComment={onCommentPost}
                onShare={onSharePost}
                onBookmark={() => handleRemoveBookmark(bookmark.post.id)}
                showActions={true}
              />
            </div>
          ))}

          {/* Load More */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={onLoadMore}
                loading={loading}
                loadingText="Loading more..."
              >
                Load More Bookmarks
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {bookmarks.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Bookmark Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600">{bookmarks.length}</p>
              <p className="text-sm text-gray-600">Total Bookmarks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {new Set(bookmarks.map(b => b.author.id)).size}
              </p>
              <p className="text-sm text-gray-600">Authors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {new Set(bookmarks.map(b => b.community?.id).filter(Boolean)).size}
              </p>
              <p className="text-sm text-gray-600">Communities</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {bookmarks.reduce((sum, b) => sum + b.post.likeCount, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Likes</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};