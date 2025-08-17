export interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  location?: string;
  bio?: string;
  teachingExperience?: number;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface UserSearchFilters {
  subjects?: string[];
  location?: string;
  verificationStatus?: 'verified' | 'pending' | 'all';
  isOnline?: boolean;
  experienceRange?: [number, number];
}

class UserSearchService {
  async searchUsers(
    query: string,
    filters: UserSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{users: UserSearchResult[]; hasMore: boolean}> {
    try {
      // This would call the actual API
      // For now, return mock data
      const mockUsers: UserSearchResult[] = [
        {
          id: 'user1',
          fullName: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          profileImageUrl: 'https://example.com/avatar1.jpg',
          subjects: ['Mathematics', 'Statistics'],
          verificationStatus: 'verified',
          location: 'New York, NY',
          bio: 'High school math teacher with 8 years of experience',
          teachingExperience: 8,
          isOnline: true,
        },
        {
          id: 'user2',
          fullName: 'Mike Chen',
          email: 'mike.chen@email.com',
          subjects: ['Science', 'Physics'],
          verificationStatus: 'verified',
          location: 'San Francisco, CA',
          bio: 'Elementary science teacher passionate about hands-on learning',
          teachingExperience: 5,
          isOnline: false,
          lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        },
        {
          id: 'user3',
          fullName: 'Emma Davis',
          email: 'emma.davis@email.com',
          profileImageUrl: 'https://example.com/avatar3.jpg',
          subjects: ['History', 'Social Studies'],
          verificationStatus: 'verified',
          location: 'Chicago, IL',
          bio: 'Middle school history teacher and curriculum developer',
          teachingExperience: 12,
          isOnline: true,
        },
      ];

      // Filter based on query
      const filteredUsers = mockUsers.filter(user => {
        const matchesQuery = query.length === 0 || 
          user.fullName.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          user.subjects.some(subject => subject.toLowerCase().includes(query.toLowerCase()));

        const matchesSubjects = !filters.subjects?.length ||
          filters.subjects.some(subject => user.subjects.includes(subject));

        const matchesLocation = !filters.location ||
          user.location?.toLowerCase().includes(filters.location.toLowerCase());

        const matchesVerification = !filters.verificationStatus ||
          filters.verificationStatus === 'all' ||
          user.verificationStatus === filters.verificationStatus;

        const matchesOnline = filters.isOnline === undefined ||
          user.isOnline === filters.isOnline;

        const matchesExperience = !filters.experienceRange ||
          (user.teachingExperience !== undefined &&
           user.teachingExperience >= filters.experienceRange[0] &&
           user.teachingExperience <= filters.experienceRange[1]);

        return matchesQuery && matchesSubjects && matchesLocation && 
               matchesVerification && matchesOnline && matchesExperience;
      });

      // Simulate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      return {
        users: paginatedUsers,
        hasMore: endIndex < filteredUsers.length,
      };
    } catch (error) {
      console.error('User search failed:', error);
      throw new Error('Failed to search users');
    }
  }

  async getSuggestedUsers(limit: number = 10): Promise<UserSearchResult[]> {
    try {
      // This would call the actual API to get suggested users
      // Based on user's subjects, location, connections, etc.
      const {users} = await this.searchUsers('', {verificationStatus: 'verified'}, 1, limit);
      return users;
    } catch (error) {
      console.error('Failed to get suggested users:', error);
      return [];
    }
  }

  async getRecentContacts(limit: number = 10): Promise<UserSearchResult[]> {
    try {
      // This would call the actual API to get recent message contacts
      const mockRecentContacts: UserSearchResult[] = [
        {
          id: 'user1',
          fullName: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          profileImageUrl: 'https://example.com/avatar1.jpg',
          subjects: ['Mathematics'],
          verificationStatus: 'verified',
          isOnline: true,
        },
        {
          id: 'user2',
          fullName: 'Mike Chen',
          email: 'mike.chen@email.com',
          subjects: ['Science'],
          verificationStatus: 'verified',
          isOnline: false,
          lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ];

      return mockRecentContacts.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent contacts:', error);
      return [];
    }
  }

  formatLastSeen(lastSeen?: string): string {
    if (!lastSeen) return 'Offline';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return lastSeenDate.toLocaleDateString();
  }

  getOnlineStatus(user: UserSearchResult): 'online' | 'offline' | 'away' {
    if (user.isOnline) return 'online';
    
    if (user.lastSeen) {
      const now = new Date();
      const lastSeenDate = new Date(user.lastSeen);
      const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 5) return 'away';
    }
    
    return 'offline';
  }
}

export const userSearchService = new UserSearchService();