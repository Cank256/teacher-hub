import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  CommunityCreator, 
  CommunityCard, 
  CommunitySearch, 
  CommunityPreview,
  CommunityRecommendations 
} from '../components/communities';

// Mock data - in real app, this would come from API
const mockCommunities = [
  {
    id: '1',
    name: 'Mathematics Teachers Uganda',
    description: 'Connect with math teachers across Uganda to share resources and teaching strategies.',
    type: 'subject' as const,
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
  },
  {
    id: '2',
    name: 'Kampala Region Teachers',
    description: 'Local community for teachers in the Kampala region.',
    type: 'region' as const,
    ownerId: 'owner2',
    moderators: ['mod3'],
    isPrivate: false,
    requiresApproval: true,
    rules: [],
    imageUrl: undefined,
    memberCount: 890,
    postCount: 320,
    isActive: true,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-11-28')
  },
  {
    id: '3',
    name: 'Primary School Educators',
    description: 'Community focused on primary education teaching methods and resources.',
    type: 'grade' as const,
    ownerId: 'owner3',
    moderators: [],
    isPrivate: false,
    requiresApproval: false,
    rules: [],
    imageUrl: undefined,
    memberCount: 2100,
    postCount: 780,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-12-05')
  },
  {
    id: '4',
    name: 'Science Teachers Network',
    description: 'Share experiments, resources, and teaching techniques for science subjects.',
    type: 'subject' as const,
    ownerId: 'owner4',
    moderators: ['mod4', 'mod5'],
    isPrivate: true,
    requiresApproval: true,
    rules: [
      { id: '3', title: 'Share Resources', description: 'Actively contribute educational resources.', order: 1 }
    ],
    imageUrl: undefined,
    memberCount: 750,
    postCount: 290,
    isActive: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-02')
  }
];

const mockRecommendations = [
  {
    community: mockCommunities[0],
    reasons: [
      { type: 'subject_match' as const, description: 'Matches Mathematics', score: 0.9 },
      { type: 'popular' as const, description: 'Popular community', score: 0.8 }
    ],
    score: 0.85
  },
  {
    community: mockCommunities[1],
    reasons: [
      { type: 'region_match' as const, description: 'In your region', score: 0.95 }
    ],
    score: 0.75
  }
];

export const Communities: React.FC = () => {
  const [view, setView] = useState<'browse' | 'create' | 'my-communities'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [filteredCommunities, setFilteredCommunities] = useState(mockCommunities);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock current user
  const currentUserId = 'current-user';
  const currentUser = {
    id: currentUserId,
    fullName: 'John Doe',
    email: 'john@example.com',
    subjects: ['Mathematics', 'Physics'],
    gradeLevels: ['Secondary'],
    schoolLocation: { district: 'Kampala', region: 'Central' },
    verificationStatus: 'verified' as const
  };

  useEffect(() => {
    // Filter communities based on search query and filters
    let filtered = mockCommunities;

    if (searchQuery) {
      filtered = filtered.filter(community =>
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply additional filters here based on searchFilters
    setFilteredCommunities(filtered);
  }, [searchQuery, searchFilters]);

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilters({});
  };

  const handleCreateCommunity = async (data: any) => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Creating community:', data);
      setView('browse');
    } catch (error) {
      console.error('Failed to create community:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Joining community:', communityId);
    } catch (error) {
      console.error('Failed to join community:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Leaving community:', communityId);
    } catch (error) {
      console.error('Failed to leave community:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (communityId: string) => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Canceling request for community:', communityId);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (communityId: string) => {
    setSelectedCommunity(communityId);
  };

  const selectedCommunityData = selectedCommunity 
    ? mockCommunities.find(c => c.id === selectedCommunity)
    : null;

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setView('browse')}
          >
            ← Back to Communities
          </Button>
        </div>
        <CommunityCreator
          onSubmit={handleCreateCommunity}
          onCancel={() => setView('browse')}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="mt-1 text-sm text-gray-600">
            Join teacher communities to collaborate and share knowledge
          </p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => setView(view === 'my-communities' ? 'browse' : 'my-communities')}
          >
            {view === 'my-communities' ? 'Browse All' : 'My Communities'}
          </Button>
          <Button onClick={() => setView('create')}>
            Create Community
          </Button>
        </div>
      </div>

      {view === 'browse' && (
        <>
          {/* Search */}
          <CommunitySearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isLoading}
            initialQuery={searchQuery}
            initialFilters={searchFilters}
          />

          {/* Recommendations */}
          {!searchQuery && Object.keys(searchFilters).length === 0 && (
            <CommunityRecommendations
              recommendations={mockRecommendations}
              currentUser={currentUser}
              onJoin={handleJoinCommunity}
              onLeave={handleLeaveCommunity}
              onCancelRequest={handleCancelRequest}
              onViewDetails={handleViewDetails}
              isLoading={isLoading}
            />
          )}

          {/* All Communities */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {searchQuery || Object.keys(searchFilters).length > 0 ? 'Search Results' : 'All Communities'}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredCommunities.length} communities)
              </span>
            </h2>
            
            {filteredCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    currentUserId={currentUserId}
                    onJoin={handleJoinCommunity}
                    onLeave={handleLeaveCommunity}
                    onCancelRequest={handleCancelRequest}
                    onViewDetails={handleViewDetails}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    {searchQuery || Object.keys(searchFilters).length > 0
                      ? 'No communities match your search criteria.'
                      : 'No communities found.'}
                  </p>
                  {(searchQuery || Object.keys(searchFilters).length > 0) && (
                    <Button variant="outline" onClick={handleClearSearch}>
                      Clear Search
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {view === 'my-communities' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Communities</h2>
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven't joined any communities yet.</p>
              <Button onClick={() => setView('browse')}>Browse Communities</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Community Preview Modal */}
      {selectedCommunityData && (
        <CommunityPreview
          community={selectedCommunityData}
          owner={{
            id: 'owner1',
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            profileImageUrl: undefined,
            subjects: ['Mathematics'],
            gradeLevels: ['Secondary'],
            verificationStatus: 'verified',
            bio: 'Experienced math teacher',
            yearsExperience: 10
          }}
          moderators={[]}
          recentMembers={[]}
          currentUserId={currentUserId}
          onJoin={handleJoinCommunity}
          onLeave={handleLeaveCommunity}
          onCancelRequest={handleCancelRequest}
          onClose={() => setSelectedCommunity(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};