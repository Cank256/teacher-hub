import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useOffline } from '../hooks/useOffline';

export const Resources: React.FC = () => {
  const { isOnline, queueAction } = useOffline();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Art'];
  const gradeLevels = ['Primary 1-3', 'Primary 4-7', 'Secondary 1-4', 'Secondary 5-6'];

  const [resources, setResources] = useState([
    {
      id: 1,
      title: 'Fraction Worksheets for Primary 5',
      description: 'Comprehensive worksheets covering basic fractions, mixed numbers, and decimal conversions.',
      subject: 'Mathematics',
      gradeLevel: 'Primary 4-7',
      author: 'Sarah Nakato',
      rating: 4.8,
      downloads: 234,
      type: 'PDF',
      size: '2.3 MB',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-15'
    },
    {
      id: 2,
      title: 'English Grammar Guide',
      description: 'Complete guide to English grammar rules with examples and exercises.',
      subject: 'English',
      gradeLevel: 'Secondary 1-4',
      author: 'Ministry of Education',
      rating: 4.9,
      downloads: 567,
      type: 'PDF',
      size: '5.1 MB',
      isGovernment: true,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-10'
    },
    {
      id: 3,
      title: 'Science Experiment Videos',
      description: 'Collection of safe and educational science experiments for classroom use.',
      subject: 'Science',
      gradeLevel: 'Primary 4-7',
      author: 'John Mukasa',
      rating: 4.6,
      downloads: 189,
      type: 'Video',
      size: '45.2 MB',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-12'
    }
  ]);

  const handleSearch = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleDownload = async (resourceId: number) => {
    if (!isOnline) {
      await queueAction(`/api/resources/${resourceId}/download`, 'POST');
      alert('Download queued for when you\'re back online');
      return;
    }
    
    // Handle download logic
    console.log('Downloading resource:', resourceId);
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || resource.subject === selectedSubject;
    const matchesGrade = !selectedGradeLevel || resource.gradeLevel === selectedGradeLevel;
    
    return matchesSearch && matchesSubject && matchesGrade;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Educational Resources</h1>
        <p className="mt-1 text-sm text-gray-600">
          Discover and share educational materials with fellow teachers
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedGradeLevel}
              onChange={(e) => setSelectedGradeLevel(e.target.value)}
            >
              <option value="">All Grade Levels</option>
              {gradeLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredResources.length} resources found
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Resources Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id}>
              <div className="aspect-video bg-gray-200 rounded-md mb-4 relative">
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resource.isGovernment 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {resource.type}
                  </span>
                </div>
                {resource.isGovernment && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Official
                    </span>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-base">{resource.title}</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {resource.subject}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {resource.gradeLevel}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {resource.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {resource.author}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span>{resource.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{resource.downloads} downloads</span>
                  <span>{resource.size}</span>
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownload(resource.id)}
                  >
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} padding="sm">
              <div className="flex items-start space-x-4">
                <div className="w-24 h-16 bg-gray-200 rounded-md flex-shrink-0 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-gray-600">{resource.type}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {resource.subject}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {resource.gradeLevel}
                        </span>
                        {resource.isGovernment && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Official
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>By {resource.author}</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">★</span>
                          <span>{resource.rating}</span>
                        </div>
                        <span>{resource.downloads} downloads</span>
                        <span>{resource.size}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button 
                        size="sm"
                        onClick={() => handleDownload(resource.id)}
                      >
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredResources.length > 0 && (
        <div className="text-center">
          <Button variant="outline">Load More Resources</Button>
        </div>
      )}

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse all resources.</p>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setSelectedSubject('');
            setSelectedGradeLevel('');
          }}>
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  );
};