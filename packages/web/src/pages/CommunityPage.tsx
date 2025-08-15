import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { PostEditor, PostFeed } from '../components/posts';
import { CommunitySettings, MemberManagement } from '../components/communities';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  moderators: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  rules: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
  }>;
  imageUrl?: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: Date;
}

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

interface MemberWithProfile extends CommunityMembership {
  user: UserProfile;
}

export const CommunityPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<CommunityMembership | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MemberWithProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'settings'>('posts');
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock current user
  const currentUserId = 'current-user';
  const currentUser = {
    id: currentUserId,
    fullName: 'John Doe',
    email: 'john@example.com',
    subjects: ['Mathematics', 'Physics'],
    gradeLevels: ['Secondary'],
    verificationStatus: 'verified' as const
  };

  // Mock data
  const mockCommunity: Community = {
    id: communityId || '1',
    name: 'Mathematics Teachers Uganda',
    description: 'Connect with math teachers across Uganda to share resources and teaching strategies.',
    type: 'subject',
    ownerId: 'owner1',
    moderators: ['mod1', 'mod2'],
    isPrivate: false,
    requiresApproval: false,
    rules: [
      { id: '1', title: 'Be Respectful', description: 'Treat all members with respect and kindness.', order: 1 },
      { id: '2', title: 'Stay On Topic', description: 'Keep discussions related to mathematics education.', order: 2 }
    ],
    imageUrl: undefined,
    memberCount: 1250,
    postCount: 450,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-01')
  };

  const mockMembership: CommunityMembership = {
    id: 'membership1',
    communityId: communityId || '1',
    userId: currentUserId,
    role: 'member',
    status: 'active',
    joinedAt: new Date('2024-06-01')
  };

  const mockPosts: Post[] = [
    {
      id: '1',
      authorId: 'user1',
      communityId: communityId,
      title: 'New Teaching Method for Algebra',
      content: 'I\'ve been experimenting with a visual approach to teaching algebra that has shown great results...',
      mediaAttachments: [],
      tags: ['algebra', 'teaching-methods'],
      visibility: 'community',
      likeCount: 15,
      commentCount: 8,
      isPinned: true,
      createdAt: new Date('2024-12-07'),
      updatedAt: new Date('2024-12-07')
    },
    {
      id: '2',
      authorId: 'user2',
      communityId: communityId,
      title: 'Resource Sharing: Geometry Worksheets',
      content: 'I\'ve created some interactive geometry worksheets that might be useful for your classes...',
      mediaAttachments: [],
      tags: ['geometry', 'worksheets', 'resources'],
      visibility: 'community',
      likeCount: 23,
      commentCount: 12,
      isPinned: false,
      createdAt: new Date('2024-12-06'),
      updatedAt: new Date('2024-12-06')
    }
  ];

  useEffect(() => {
    // Mock API calls
    const loadCommunityData = async () => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCommunity(mockCommunity);
        setMembership(mockMembership);
        setPosts(mockPosts);
        setMembers([]);
        setPendingRequests([]);
      } catch (error) {
        console.error('Failed to load community data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (communityId) {
      loadCommunityData();
    }
  }, [communityId]);

  const isOwner = membership?.role === 'owner';
  const isModerator = membership?.role === 'moderator' || isOwner;
  const isMember = membership?.status === 'active';
  const canPost = isMember;
  const canManage = isModerator;

  const handleCreatePost = async (postData: any) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Creating community post:', postData);
      setShowPostEditor(false);
      // Refresh posts
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleUpdateCommunity = async (updates: any) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Updating community:', updates);
      if (community) {
        setCommunity({ ...community, ...updates });
      }
    } catch (error) {
      console.error('Failed to update community:', error);
    }
  };

  const handleDeleteCommunity = async () => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Deleting community');
      navigate('/communities');
    } catch (error) {
      console.error('Failed to delete community:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subject':
        return 'bg-blue-100 text-blue-800';
      case 'region':
        return 'bg-green-100 text-green-800';
      case 'grade':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Community Not Found</h1>
        <p className="text-gray-600 mb-6">The community you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/communities')}>
          Back to Communities
        </Button>
      </div>
    );
  }

  if (!isMember && community.isPrivate) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Community</h1>
        <p className="text-gray-600 mb-6">This is a private community. You need to be a member to view its content.</p>
        <Button onClick={() => navigate('/communities')}>
          Back to Communities
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Community Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              {community.imageUrl ? (
                <img
                  src={community.imageUrl}
                  alt={community.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-xl">
                    {community.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{community.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(community.type)}`}>
                    {community.type.charAt(0).toUpperCase() + community.type.slice(1)}
                  </span>
                  {community.isPrivate && (
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      Private
                    </span>
                  )}
                  {membership && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(membership.role)}`}>
                      {membership.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{community.memberCount.toLocaleString()} members</span>
                  <span>{community.postCount.toLocaleString()} posts</span>
                  <span>Created {new Date(community.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => navigate('/communities')}
              >
                ← Back
              </Button>
              {canPost && (
                <Button onClick={() => setShowPostEditor(true)}>
                  Create Post
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-gray-700 mb-4">{community.description}</p>

          {/* Community Rules */}
          {community.rules.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Community Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {community.rules.map((rule, index) => (
                  <div key={rule.id} className="text-sm">
                    <span className="font-medium text-gray-900">
                      {index + 1}. {rule.title}:
                    </span>
                    <span className="text-gray-600 ml-1">{rule.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members ({community.memberCount})
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {isOwner ? 'Settings' : 'Moderation'}
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Post Editor Modal */}
          {showPostEditor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Create Post in {community.name}</h2>
                    <button
                      onClick={() => setShowPostEditor(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <PostEditor
                    onSubmit={handleCreatePost}
                    onCancel={() => setShowPostEditor(false)}
                    defaultCommunityId={community.id}
                    defaultVisibility="community"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Posts Feed */}
          <PostFeed
            posts={posts}
            currentUserId={currentUserId}
            onLike={() => {}}
            onComment={() => {}}
            onShare={() => {}}
            onBookmark={() => {}}
            isLoading={false}
          />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Member Stats */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Member Stats</CardTitle>
              </CardHeader>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-2xl font-bold text-primary-600">{community.memberCount}</div>
                  <div className="text-sm text-gray-600">Total Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-gray-600">Owner</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{community.moderators.length}</div>
                  <div className="text-sm text-gray-600">Moderators</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{community.memberCount - 1 - community.moderators.length}</div>
                  <div className="text-sm text-gray-600">Members</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Member List */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Community Members</CardTitle>
              </CardHeader>
              <div className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-600">Member list functionality will be implemented with the backend integration.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'settings' && canManage && (
        <div className="space-y-6">
          {isOwner ? (
            <CommunitySettings
              community={community}
              onUpdate={handleUpdateCommunity}
              onDelete={handleDeleteCommunity}
              isOwner={isOwner}
              isLoading={false}
            />
          ) : (
            <MemberManagement
              communityId={community.id}
              members={members}
              pendingRequests={pendingRequests}
              currentUserRole={membership?.role || 'member'}
              onApproveMember={() => Promise.resolve()}
              onRejectMember={() => Promise.resolve()}
              onPromoteMember={() => Promise.resolve()}
              onRemoveMember={() => Promise.resolve()}
              onBanMember={() => Promise.resolve()}
              onUnbanMember={() => Promise.resolve()}
              onInviteMember={() => Promise.resolve()}
              isLoading={false}
            />
          )}
        </div>
      )}
    </div>
  );
};