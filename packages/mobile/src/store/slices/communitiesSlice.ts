import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  ownerName: string;
  moderators: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  imageUrl?: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  isMember: boolean;
  membershipStatus: 'none' | 'pending' | 'active' | 'banned';
  memberRole?: 'member' | 'moderator' | 'owner';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  subjects?: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export interface CreateCommunityRequest {
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  isPrivate: boolean;
  requiresApproval: boolean;
  imageUrl?: string;
}

export interface CommunitySearchFilters {
  type?: string[];
  subjects?: string[];
  regions?: string[];
  memberCountRange?: [number, number];
  isPrivate?: boolean;
}

export interface CommunitiesState {
  communities: Community[];
  myCommunities: Community[];
  searchResults: Community[];
  communityMembers: {[communityId: string]: CommunityMember[]};
  isLoading: boolean;
  isSearching: boolean;
  isCreating: boolean;
  error: string | null;
  searchQuery: string;
  searchFilters: CommunitySearchFilters;
  selectedCommunity: Community | null;
}

const initialState: CommunitiesState = {
  communities: [],
  myCommunities: [],
  searchResults: [],
  communityMembers: {},
  isLoading: false,
  isSearching: false,
  isCreating: false,
  error: null,
  searchQuery: '',
  searchFilters: {},
  selectedCommunity: null,
};

// Async thunks
export const fetchCommunities = createAsyncThunk(
  'communities/fetchCommunities',
  async (params: {page?: number; limit?: number} = {}) => {
    // This would call the actual API
    const mockCommunities: Community[] = [
      {
        id: '1',
        name: 'Math Teachers United',
        description: 'A community for mathematics educators to share resources and discuss teaching strategies.',
        type: 'subject',
        ownerId: 'user1',
        ownerName: 'Sarah Johnson',
        moderators: ['user2'],
        isPrivate: false,
        requiresApproval: false,
        imageUrl: 'https://example.com/math-community.jpg',
        memberCount: 245,
        postCount: 89,
        isActive: true,
        isMember: false,
        membershipStatus: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Elementary Science Hub',
        description: 'Sharing science experiments and activities for elementary school students.',
        type: 'subject',
        ownerId: 'user3',
        ownerName: 'Mike Chen',
        moderators: [],
        isPrivate: false,
        requiresApproval: true,
        memberCount: 156,
        postCount: 67,
        isActive: true,
        isMember: true,
        membershipStatus: 'active',
        memberRole: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    return mockCommunities;
  }
);

export const searchCommunities = createAsyncThunk(
  'communities/searchCommunities',
  async (params: {query: string; filters?: CommunitySearchFilters}) => {
    // This would call the actual API
    const mockResults: Community[] = [
      {
        id: '3',
        name: 'History Teachers Network',
        description: 'Connect with history educators worldwide.',
        type: 'subject',
        ownerId: 'user4',
        ownerName: 'Emma Davis',
        moderators: [],
        isPrivate: false,
        requiresApproval: false,
        memberCount: 89,
        postCount: 34,
        isActive: true,
        isMember: false,
        membershipStatus: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    return mockResults;
  }
);

export const createCommunity = createAsyncThunk(
  'communities/createCommunity',
  async (communityData: CreateCommunityRequest) => {
    // This would call the actual API
    const newCommunity: Community = {
      id: Date.now().toString(),
      ...communityData,
      ownerId: 'current-user',
      ownerName: 'Current User',
      moderators: [],
      memberCount: 1,
      postCount: 0,
      isActive: true,
      isMember: true,
      membershipStatus: 'active',
      memberRole: 'owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return newCommunity;
  }
);

export const joinCommunity = createAsyncThunk(
  'communities/joinCommunity',
  async (communityId: string) => {
    // This would call the actual API
    return {communityId, status: 'active' as const};
  }
);

export const leaveCommunity = createAsyncThunk(
  'communities/leaveCommunity',
  async (communityId: string) => {
    // This would call the actual API
    return {communityId};
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (communityId: string) => {
    // This would call the actual API
    const mockMembers: CommunityMember[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Sarah Johnson',
        userAvatar: 'https://example.com/avatar1.jpg',
        role: 'owner',
        status: 'active',
        joinedAt: new Date().toISOString(),
        subjects: ['Mathematics'],
        verificationStatus: 'verified',
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Mike Chen',
        role: 'moderator',
        status: 'active',
        joinedAt: new Date().toISOString(),
        subjects: ['Science'],
        verificationStatus: 'verified',
      },
    ];
    
    return {communityId, members: mockMembers};
  }
);

export const manageCommunityMember = createAsyncThunk(
  'communities/manageCommunityMember',
  async (params: {
    communityId: string;
    memberId: string;
    action: 'promote' | 'demote' | 'remove' | 'ban';
  }) => {
    // This would call the actual API
    return params;
  }
);

const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchFilters: (state, action: PayloadAction<CommunitySearchFilters>) => {
      state.searchFilters = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
      state.searchFilters = {};
    },
    setSelectedCommunity: (state, action: PayloadAction<Community | null>) => {
      state.selectedCommunity = action.payload;
    },
    updateCommunityInList: (state, action: PayloadAction<Community>) => {
      const community = action.payload;
      
      // Update in main communities list
      const mainIndex = state.communities.findIndex(c => c.id === community.id);
      if (mainIndex !== -1) {
        state.communities[mainIndex] = community;
      }
      
      // Update in my communities list
      const myIndex = state.myCommunities.findIndex(c => c.id === community.id);
      if (myIndex !== -1) {
        state.myCommunities[myIndex] = community;
      }
      
      // Update in search results
      const searchIndex = state.searchResults.findIndex(c => c.id === community.id);
      if (searchIndex !== -1) {
        state.searchResults[searchIndex] = community;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch communities
      .addCase(fetchCommunities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommunities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.communities = action.payload;
        state.myCommunities = action.payload.filter(c => c.isMember);
      })
      .addCase(fetchCommunities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch communities';
      })
      
      // Search communities
      .addCase(searchCommunities.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchCommunities.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchCommunities.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.error.message || 'Failed to search communities';
      })
      
      // Create community
      .addCase(createCommunity.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCommunity.fulfilled, (state, action) => {
        state.isCreating = false;
        state.communities.unshift(action.payload);
        state.myCommunities.unshift(action.payload);
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || 'Failed to create community';
      })
      
      // Join community
      .addCase(joinCommunity.fulfilled, (state, action) => {
        const {communityId, status} = action.payload;
        const community = state.communities.find(c => c.id === communityId);
        if (community) {
          community.isMember = true;
          community.membershipStatus = status;
          community.memberRole = 'member';
          community.memberCount += 1;
          state.myCommunities.push(community);
        }
      })
      
      // Leave community
      .addCase(leaveCommunity.fulfilled, (state, action) => {
        const {communityId} = action.payload;
        const community = state.communities.find(c => c.id === communityId);
        if (community) {
          community.isMember = false;
          community.membershipStatus = 'none';
          community.memberRole = undefined;
          community.memberCount -= 1;
        }
        state.myCommunities = state.myCommunities.filter(c => c.id !== communityId);
      })
      
      // Fetch community members
      .addCase(fetchCommunityMembers.fulfilled, (state, action) => {
        const {communityId, members} = action.payload;
        state.communityMembers[communityId] = members;
      })
      
      // Manage community member
      .addCase(manageCommunityMember.fulfilled, (state, action) => {
        const {communityId, memberId, action: memberAction} = action.payload;
        const members = state.communityMembers[communityId];
        if (members) {
          const memberIndex = members.findIndex(m => m.id === memberId);
          if (memberIndex !== -1) {
            if (memberAction === 'remove' || memberAction === 'ban') {
              members.splice(memberIndex, 1);
            } else if (memberAction === 'promote') {
              members[memberIndex].role = 'moderator';
            } else if (memberAction === 'demote') {
              members[memberIndex].role = 'member';
            }
          }
        }
      });
  },
});

export const {
  clearError,
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
  setSelectedCommunity,
  updateCommunityInList,
} = communitiesSlice.actions;

export default communitiesSlice.reducer;