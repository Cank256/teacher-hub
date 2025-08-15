import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface PostSearchFilters {
  query?: string;
  tags?: string[];
  visibility?: 'public' | 'community' | 'followers' | 'all';
  communityId?: string;
  authorId?: string;
  hasMedia?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'created_at' | 'updated_at' | 'like_count' | 'comment_count';
  sortOrder?: 'asc' | 'desc';
}

interface Community {
  id: string;
  name: string;
}

interface PostSearchProps {
  initialFilters?: PostSearchFilters;
  communities?: Community[];
  onFiltersChange: (filters: PostSearchFilters) => void;
  onSearch: (filters: PostSearchFilters) => void;
  loading?: boolean;
  showAdvanced?: boolean;
}

export const PostSearch: React.FC<PostSearchProps> = ({
  initialFilters = {},
  communities = [],
  onFiltersChange,
  onSearch,
  loading = false,
  showAdvanced = false
}) => {
  const [filters, setFilters] = useState<PostSearchFilters>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(showAdvanced);
  const [tagInput, setTagInput] = useState('');

  // Update parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = <K extends keyof PostSearchFilters>(
    key: K,
    value: PostSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !filters.tags?.includes(trimmedTag)) {
      updateFilter('tags', [...(filters.tags || []), trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateFilter('tags', filters.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: PostSearchFilters = {
      query: '',
      tags: [],
      visibility: 'all',
      communityId: '',
      authorId: '',
      hasMedia: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    setTagInput('');
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseDateFromInput = (dateString: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Basic Search */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              label="Search posts"
              value={filters.query || ''}
              onChange={(e) => updateFilter('query', e.target.value)}
              placeholder="Search by title, content, or author..."
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              loading={loading}
              loadingText="Searching..."
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.visibility || 'all'}
            onChange={(e) => updateFilter('visibility', e.target.value as any)}
            disabled={loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Posts</option>
            <option value="public">Public</option>
            <option value="community">Community</option>
            <option value="followers">Followers</option>
          </select>

          {communities.length > 0 && (
            <select
              value={filters.communityId || ''}
              onChange={(e) => updateFilter('communityId', e.target.value)}
              disabled={loading}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Communities</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={`${filters.sortBy || 'created_at'}-${filters.sortOrder || 'desc'}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              updateFilter('sortBy', sortBy as any);
              updateFilter('sortOrder', sortOrder as any);
            }}
            disabled={loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="like_count-desc">Most Liked</option>
            <option value="comment_count-desc">Most Commented</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            {showAdvancedFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              
              {/* Tag Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="Add a tag to filter by..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={loading || !tagInput.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Tag List */}
              {filters.tags && filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={loading}
                        className="ml-2 text-primary-600 hover:text-primary-800 focus:outline-none"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  value={formatDateForInput(filters.dateFrom)}
                  onChange={(e) => updateFilter('dateFrom', parseDateFromInput(e.target.value))}
                  disabled={loading}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="dateTo"
                  value={formatDateForInput(filters.dateTo)}
                  onChange={(e) => updateFilter('dateTo', parseDateFromInput(e.target.value))}
                  disabled={loading}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.hasMedia || false}
                  onChange={(e) => updateFilter('hasMedia', e.target.checked || undefined)}
                  disabled={loading}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Has media attachments</span>
              </label>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                disabled={loading}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Active Filters Summary */}
      {(filters.query || filters.tags?.length || filters.communityId || filters.hasMedia || filters.dateFrom || filters.dateTo) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={loading}
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.query && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Query: "{filters.query}"
              </span>
            )}
            {filters.tags?.map((tag) => (
              <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Tag: #{tag}
              </span>
            ))}
            {filters.communityId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Community: {communities.find(c => c.id === filters.communityId)?.name || 'Unknown'}
              </span>
            )}
            {filters.hasMedia && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                Has media
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                From: {filters.dateFrom.toLocaleDateString()}
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                To: {filters.dateTo.toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};