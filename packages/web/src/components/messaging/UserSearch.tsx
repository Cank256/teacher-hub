import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  yearsExperience: number;
  createdAt: Date;
}

interface UserSearchFilters {
  subjects?: string[];
  gradeLevels?: string[];
  regions?: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

interface UserSearchProps {
  onUserSelect: (user: UserSearchResult) => void;
  onClose: () => void;
  selectedUsers?: UserSearchResult[];
  multiSelect?: boolean;
}

export const UserSearch: React.FC<UserSearchProps> = ({
  onUserSelect,
  onClose,
  selectedUsers = [],
  multiSelect = false
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<UserSearchFilters>({});
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'recent'>('suggestions');
  const [showFilters, setShowFilters] = useState(false);

  // Available filter options
  const subjectOptions = [
    'Mathematics', 'English', 'Science', 'Social Studies', 'Physics', 
    'Chemistry', 'Biology', 'History', 'Geography', 'Literature'
  ];
  
  const gradeLevelOptions = [
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7',
    'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6'
  ];

  const regionOptions = [
    'Central', 'Eastern', 'Northern', 'Western', 'Kampala'
  ];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: UserSearchFilters) => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          q: searchQuery,
          page: '1',
          limit: '20'
        });

        if (searchFilters.subjects?.length) {
          params.append('subjects', searchFilters.subjects.join(','));
        }
        if (searchFilters.gradeLevels?.length) {
          params.append('gradeLevels', searchFilters.gradeLevels.join(','));
        }
        if (searchFilters.regions?.length) {
          params.append('regions', searchFilters.regions.join(','));
        }
        if (searchFilters.verificationStatus) {
          params.append('verificationStatus', searchFilters.verificationStatus);
        }

        const response = await fetch(`/api/messages/users/search?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.data || []);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Load user suggestions on component mount
  useEffect(() => {
    loadUserSuggestions();
    loadRecentUsers();
  }, []);

  // Trigger search when query or filters change
  useEffect(() => {
    if (query.trim()) {
      setActiveTab('search');
      debouncedSearch(query, filters);
    } else {
      setSearchResults([]);
    }
  }, [query, filters, debouncedSearch]);

  const loadUserSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages/users/suggestions?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading user suggestions:', error);
    }
  };

  const loadRecentUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages/users/recent?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading recent users:', error);
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    onUserSelect(user);
    if (!multiSelect) {
      onClose();
    }
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(user => user.id === userId);
  };

  const handleFilterChange = (filterType: keyof UserSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getCurrentUsers = () => {
    switch (activeTab) {
      case 'search':
        return searchResults;
      case 'suggestions':
        return suggestions;
      case 'recent':
        return recentUsers;
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Find Teachers</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search by name, email, or bio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Subjects Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
                  <select
                    multiple
                    value={filters.subjects || []}
                    onChange={(e) => handleFilterChange('subjects', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    size={4}
                  >
                    {subjectOptions.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Levels Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade Levels</label>
                  <select
                    multiple
                    value={filters.gradeLevels || []}
                    onChange={(e) => handleFilterChange('gradeLevels', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    size={4}
                  >
                    {gradeLevelOptions.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* Regions Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                  <select
                    value={filters.regions?.[0] || ''}
                    onChange={(e) => handleFilterChange('regions', e.target.value ? [e.target.value] : [])}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Regions</option>
                    {regionOptions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                {/* Verification Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification</label>
                  <select
                    value={filters.verificationStatus || ''}
                    onChange={(e) => handleFilterChange('verificationStatus', e.target.value || undefined)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'suggestions'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'recent'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recently Active
            </button>
            {query.trim() && (
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'search'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Search Results ({searchResults.length})
              </button>
            )}
          </div>

          {/* User List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {getCurrentUsers().map(user => (
                  <UserSearchItem
                    key={user.id}
                    user={user}
                    onSelect={() => handleUserSelect(user)}
                    isSelected={isUserSelected(user.id)}
                    multiSelect={multiSelect}
                  />
                ))}
                {getCurrentUsers().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {activeTab === 'search' && query.trim() 
                      ? 'No users found matching your search.'
                      : activeTab === 'suggestions'
                      ? 'No suggestions available.'
                      : 'No recently active users found.'
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Users (for multi-select) */}
          {multiSelect && selectedUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Selected ({selectedUsers.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <span
                    key={user.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {user.fullName}
                    <button
                      onClick={() => onUserSelect(user)} // This will remove the user in multi-select mode
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

interface UserSearchItemProps {
  user: UserSearchResult;
  onSelect: () => void;
  isSelected: boolean;
  multiSelect: boolean;
}

const UserSearchItem: React.FC<UserSearchItemProps> = ({
  user,
  onSelect,
  isSelected,
  multiSelect
}) => {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary-300 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* Profile Image */}
        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.fullName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-gray-600 font-medium text-lg">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {user.fullName}
            </h3>
            {user.verificationStatus === 'verified' && (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {multiSelect && isSelected && (
              <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          <p className="text-sm text-gray-600 truncate">{user.email}</p>
          
          {user.bio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
          )}
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>{user.yearsExperience} years experience</span>
            <span>{user.schoolLocation.region}, {user.schoolLocation.district}</span>
          </div>
          
          {user.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {user.subjects.slice(0, 3).map(subject => (
                <span
                  key={subject}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {subject}
                </span>
              ))}
              {user.subjects.length > 3 && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  +{user.subjects.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}