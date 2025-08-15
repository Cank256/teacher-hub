import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface CommunitySearchFilters {
  type?: 'subject' | 'region' | 'grade' | 'general';
  isPrivate?: boolean;
  subjects?: string[];
  regions?: string[];
}

interface CommunitySearchProps {
  onSearch: (query: string, filters: CommunitySearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
  initialQuery?: string;
  initialFilters?: CommunitySearchFilters;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'Literature',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education'
];

const REGIONS = [
  'Central',
  'Eastern',
  'Northern',
  'Western',
  'Kampala',
  'Wakiso',
  'Mukono',
  'Jinja',
  'Mbale',
  'Gulu',
  'Lira',
  'Mbarara',
  'Fort Portal',
  'Kabale'
];

export const CommunitySearch: React.FC<CommunitySearchProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  initialQuery = '',
  initialFilters = {}
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<CommunitySearchFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check if any advanced filters are set
  const hasAdvancedFilters = filters.type || filters.isPrivate !== undefined || 
                            (filters.subjects && filters.subjects.length > 0) ||
                            (filters.regions && filters.regions.length > 0);

  useEffect(() => {
    if (hasAdvancedFilters) {
      setShowAdvanced(true);
    }
  }, [hasAdvancedFilters]);

  const handleSearch = () => {
    onSearch(query.trim(), filters);
  };

  const handleClear = () => {
    setQuery('');
    setFilters({});
    setShowAdvanced(false);
    onClear();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const updateFilter = (key: keyof CommunitySearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSubject = (subject: string) => {
    const currentSubjects = filters.subjects || [];
    const newSubjects = currentSubjects.includes(subject)
      ? currentSubjects.filter(s => s !== subject)
      : [...currentSubjects, subject];
    
    updateFilter('subjects', newSubjects.length > 0 ? newSubjects : undefined);
  };

  const toggleRegion = (region: string) => {
    const currentRegions = filters.regions || [];
    const newRegions = currentRegions.includes(region)
      ? currentRegions.filter(r => r !== region)
      : [...currentRegions, region];
    
    updateFilter('regions', newRegions.length > 0 ? newRegions : undefined);
  };

  return (
    <div className="space-y-4">
      {/* Basic Search */}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search communities by name or description..."
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isLoading}
        >
          {showAdvanced ? 'Hide Filters' : 'Filters'}
        </Button>
        {(query || hasAdvancedFilters) && (
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Advanced Filters</h3>
          
          {/* Community Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['general', 'subject', 'region', 'grade'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateFilter('type', filters.type === type ? undefined : type as any)}
                  disabled={isLoading}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filters.type === type
                      ? 'bg-primary-100 border-primary-300 text-primary-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Privacy
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  checked={filters.isPrivate === undefined}
                  onChange={() => updateFilter('isPrivate', undefined)}
                  disabled={isLoading}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  checked={filters.isPrivate === false}
                  onChange={() => updateFilter('isPrivate', false)}
                  disabled={isLoading}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Public</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  checked={filters.isPrivate === true}
                  onChange={() => updateFilter('isPrivate', true)}
                  disabled={isLoading}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Private</span>
              </label>
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subjects ({filters.subjects?.length || 0} selected)
            </label>
            <div className="max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUBJECTS.map((subject) => (
                  <label key={subject} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.subjects?.includes(subject) || false}
                      onChange={() => toggleSubject(subject)}
                      disabled={isLoading}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{subject}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Regions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regions ({filters.regions?.length || 0} selected)
            </label>
            <div className="max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REGIONS.map((region) => (
                  <label key={region} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.regions?.includes(region) || false}
                      onChange={() => toggleRegion(region)}
                      disabled={isLoading}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{region}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setFilters({})}
              disabled={isLoading || !hasAdvancedFilters}
              size="sm"
            >
              Clear Filters
            </Button>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              size="sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasAdvancedFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.type && (
            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              Type: {filters.type}
            </span>
          )}
          {filters.isPrivate !== undefined && (
            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              {filters.isPrivate ? 'Private' : 'Public'}
            </span>
          )}
          {filters.subjects && filters.subjects.length > 0 && (
            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              {filters.subjects.length} subject{filters.subjects.length !== 1 ? 's' : ''}
            </span>
          )}
          {filters.regions && filters.regions.length > 0 && (
            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              {filters.regions.length} region{filters.regions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};