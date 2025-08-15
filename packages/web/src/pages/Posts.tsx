import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PostFeed } from '../components/posts/PostFeed';
import { PostEditor } from '../components/posts/PostEditor';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// Mock data - in real app this would come from API
const mockPosts = [
  {
    id: '1',
    authorId: 'user1',
    title: 'New Mathematics Teaching Methods',
    content: 'I\'ve been experimenting with visual learning techniques for teaching algebra to Primary 6 students. The results have been amazing! Students are now more engaged and understanding concepts faster.',
    mediaAttachments: [],
    tags: ['mathematics', 'teaching-methods', 'primary-education'],
    visibility: 'public' as const,
    likeCount: 15,
    commentCount: 8,
    isPinned: false,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    author: {
      id: 'user1',
      fullName: 'Sarah Nakato',
      profileImageUrl: undefined,
      verificationStatus: 'verified' as const
    },
    isLiked: false,
    isBookmarked: false
  },
  {
    id: '2',
    authorId: 'user2',
    communityId: 'community1',
    title: 'Science Fair Project Ideas',
    content: 'Looking for creative science fair project ideas for Secondary 2 students. What projects have worked well in your schools? I\'m particularly interested in chemistry and physics experiments that are safe and engaging.',
    mediaAttachments: [
      {
        id: 'media1',
        type: 'image' as const,
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/400/300',
        filename: 'science-fair.jpg',
        size: 1024000
      }
    ],
    tags: ['science', 'chemistry', 'physics', 'secondary-education'],
    visibility: 'community' as const,
    likeCount: 23,
    commentCount: 12,
    isPinned: true,
    createdAt: new Date('2024-01-14T14:20:00Z'),
    updatedAt: new Date('2024-01-14T14:20:00Z'),
    author: {
      id: 'user2',
      fullName: 'John Mukasa',
      profileImageUrl: undefined,
      verificationStatus: 'verified' as const
    },
    community: {
      id: 'community1',
      name: 'Science Teachers Network'
    },
    isLiked: true,
    isBookmarked: true
  }
];

const mockCommunities = [
  { id: 'community1', name: 'Science Teachers Network' },
  { id: 'community2', name: 'Mathematics Educators' },
  { id: 'community3', name: 'Primary School Teachers' }
];

export const Posts: React.FC = () => {
  const [posts, setPosts] = useState(mockPosts);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentUserId = 'current-user'; // This would come from auth context

  const handleCreatePost = async (postData: any) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPost = {
        id: `post-${Date.now()}`,
        authorId: currentUserId,
        ...postData,
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: currentUserId,
          fullName: 'Current User',
          profileImageUrl: undefined,
          verificationStatus: 'verified' as const
        },
        isLiked: false,
        isBookmarked: false
      };

      setPosts(prev => [newPost, ...prev]);
      setShowCreatePost(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: true, likeCount: post.likeCount + 1 }
        : post
    ));
  };

  const handleUnlikePost = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: false, likeCount: Math.max(0, post.likeCount - 1) }
        : post
    ));
  };

  const handleCommentPost = (postId: string) => {
    // Navigate to post detail page or open comment modal
    console.log('Comment on post:', postId);
  };

  const handleSharePost = (postId: string) => {
    // Open share modal
    console.log('Share post:', postId);
  };

  const handleBookmarkPost = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isBookmarked: !post.isBookmarked }
        : post
    ));
  };

  const handleEditPost = (postId: string) => {
    // Navigate to edit post page or open edit modal
    console.log('Edit post:', postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setPosts(prev => prev.filter(post => post.id !== postId));
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, load more posts from API
      setHasMore(false); // No more posts to load
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, refresh posts from API
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (filters: any) => {
    setLoading(true);
    try {
      // Simulate API call with filters
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, search posts with filters
      console.log('Search with filters:', filters);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-600 mt-1">
            Share and discover educational content with the community
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreatePost(true)}
          className="flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Post
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{posts.length}</p>
            <p className="text-sm text-gray-600">Total Posts</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {posts.reduce((sum, post) => sum + post.likeCount, 0)}
            </p>
            <p className="text-sm text-gray-600">Total Likes</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {posts.reduce((sum, post) => sum + post.commentCount, 0)}
            </p>
            <p className="text-sm text-gray-600">Total Comments</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {posts.filter(post => post.isBookmarked).length}
            </p>
            <p className="text-sm text-gray-600">Bookmarked</p>
          </div>
        </Card>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCreatePost(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <PostEditor
                  communities={mockCommunities}
                  onSubmit={handleCreatePost}
                  onCancel={() => setShowCreatePost(false)}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <PostFeed
        posts={posts}
        currentUserId={currentUserId}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onLikePost={handleLikePost}
        onUnlikePost={handleUnlikePost}
        onCommentPost={handleCommentPost}
        onSharePost={handleSharePost}
        onBookmarkPost={handleBookmarkPost}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
        onSearch={handleSearch}
        showSearch={true}
        emptyStateTitle="No posts yet"
        emptyStateDescription="Be the first to share something with the community!"
        emptyStateAction={
          <Button onClick={() => setShowCreatePost(true)}>
            Create Your First Post
          </Button>
        }
      />
    </div>
  );
};