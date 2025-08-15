import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useOffline } from '../hooks/useOffline';
import { ResourceUploadForm, VideoResourceCard, VideoResourcePreview } from '../components/resources';

export const Resources: React.FC = () => {
  const { isOnline, queueAction } = useOffline();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'];
  const gradeLevels = ['Primary 1-3', 'Primary 4-7', 'Secondary 1-4', 'Secondary 5-6'];
  const resourceTypes = ['All', 'Video', 'Document', 'Image', 'Presentation'];
  const categories = ['All', 'Lesson Plan', 'Worksheet', 'Video Tutorial', 'Assessment', 'Reference Material'];
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'downloads', label: 'Most Downloaded' },
    { value: 'title', label: 'Title A-Z' }
  ];

  const [resources, setResources] = useState([
    {
      id: '1',
      title: 'Fraction Worksheets for Primary 5',
      description: 'Comprehensive worksheets covering basic fractions, mixed numbers, and decimal conversions.',
      subject: 'Mathematics',
      gradeLevel: 'Primary 4-7',
      author: 'Sarah Nakato',
      rating: 4.8,
      downloads: 234,
      type: 'Document',
      category: 'Worksheet',
      size: '2.3 MB',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-15',
      tags: ['fractions', 'mathematics', 'primary', 'worksheets'],
      views: 1250,
      likes: 89
    },
    {
      id: '2',
      title: 'English Grammar Guide',
      description: 'Complete guide to English grammar rules with examples and exercises.',
      subject: 'English',
      gradeLevel: 'Secondary 1-4',
      author: 'Ministry of Education',
      rating: 4.9,
      downloads: 567,
      type: 'Document',
      category: 'Reference Material',
      size: '5.1 MB',
      isGovernment: true,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-10',
      tags: ['grammar', 'english', 'secondary', 'reference'],
      views: 2340,
      likes: 156
    },
    {
      id: '3',
      title: 'Science Experiment Videos',
      description: 'Collection of safe and educational science experiments for classroom use.',
      youtubeVideoId: 'dQw4w9WgXcQ',
      subject: 'Science',
      gradeLevel: 'Primary 4-7',
      author: 'John Mukasa',
      rating: 4.6,
      downloads: 189,
      type: 'Video',
      category: 'Video Tutorial',
      size: '45.2 MB',
      duration: '15:30',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-12',
      tags: ['science', 'experiments', 'primary', 'video'],
      views: 890,
      likes: 67
    },
    {
      id: '4',
      title: 'Mathematics Problem Solving Techniques',
      description: 'Step-by-step video tutorials on advanced problem solving techniques for secondary mathematics.',
      youtubeVideoId: 'dQw4w9WgXcQ',
      subject: 'Mathematics',
      gradeLevel: 'Secondary 1-4',
      author: 'Dr. Mary Ssali',
      rating: 4.7,
      downloads: 345,
      type: 'Video',
      category: 'Video Tutorial',
      size: '78.5 MB',
      duration: '25:45',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-08',
      tags: ['mathematics', 'problem-solving', 'secondary', 'tutorial'],
      views: 1560,
      likes: 123
    },
    {
      id: '5',
      title: 'Art and Craft Ideas for Primary School',
      description: 'Creative art and craft projects suitable for primary school students with step-by-step instructions.',
      subject: 'Art',
      gradeLevel: 'Primary 1-3',
      author: 'Grace Namuli',
      rating: 4.5,
      downloads: 278,
      type: 'Document',
      category: 'Lesson Plan',
      size: '12.8 MB',
      isGovernment: false,
      thumbnail: '/api/placeholder/300/200',
      uploadDate: '2024-01-05',
      tags: ['art', 'craft', 'primary', 'creative'],
      views: 980,
      likes: 78
    }
  ]);

  const handleSearch = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleDownload = async (resource: any) => {
    if (!isOnline) {
      await queueAction(`/api/resources/${resource.id}/download`, 'POST');
      alert('Download queued for when you\'re back online');
      return;
    }
    
    // Handle download logic
    console.log('Downloading resource:', resource.title);
    
    // Update download count
    setResources(prev => prev.map(r => 
      r.id === resource.id 
        ? { ...r, downloads: r.downloads + 1 }
        : r
    ));
  };

  const handlePreview = (resource: any) => {
    setPreviewResource(resource);
  };

  const handlePlay = (resource: any) => {
    console.log('Playing video:', resource.title);
    // Update view count
    setResources(prev => prev.map(r => 
      r.id === resource.id 
        ? { ...r, views: r.views + 1 }
        : r
    ));
  };

  const handleUpload = async (file: File, metadata: any) => {
    try {
      // Simulate API call for upload
      console.log('Uploading file:', file.name, 'with metadata:', metadata);
      
      // Here you would make the actual API call
      // await uploadResource(file, metadata);
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowUploadForm(false);
      // Refresh resources list
      // await fetchResources();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = !selectedSubject || resource.subject === selectedSubject;
    const matchesGrade = !selectedGradeLevel || resource.gradeLevel === selectedGradeLevel;
    const matchesType = !selectedResourceType || selectedResourceType === 'All' || resource.type === selectedResourceType;
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || resource.category === selectedCategory;
    
    return matchesSearch && matchesSubject && matchesGrade && matchesType && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      case 'oldest':
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      case 'popular':
        return b.views - a.views;
      case 'rating':
        return b.rating - a.rating;
      case 'downloads':
        return b.downloads - a.downloads;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  if (showUploadForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Resource</h1>
            <p className="mt-1 text-sm text-gray-600">
              Share educational materials with the community
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowUploadForm(false)}
          >
            Back to Resources
          </Button>
        </div>
        
        <ResourceUploadForm
          onUpload={handleUpload}
          onCancel={() => setShowUploadForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Educational Resources</h1>
          <p className="mt-1 text-sm text-gray-600">
            Discover and share educational materials with fellow teachers
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          Upload Resource
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Input
              placeholder="Search resources by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type === 'All' ? '' : type}>{type}</option>
              ))}
            </select>

            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category === 'All' ? '' : category}>{category}</option>
              ))}
            </select>

            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600">
                {filteredResources.length} resources found
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubject('');
                  setSelectedGradeLevel('');
                  setSelectedResourceType('');
                  setSelectedCategory('');
                  setSortBy('newest');
                }}
              >
                Clear Filters
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </Button>
              
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
        </div>
      </Card>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Analytics</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Resources</h3>
              <p className="text-2xl font-bold text-blue-600">{resources.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Video Resources</h3>
              <p className="text-2xl font-bold text-green-600">
                {resources.filter(r => r.type === 'Video').length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Total Downloads</h3>
              <p className="text-2xl font-bold text-purple-600">
                {resources.reduce((sum, r) => sum + r.downloads, 0)}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-900">Total Views</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {resources.reduce((sum, r) => sum + r.views, 0)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Resources Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            resource.type === 'Video' && resource.youtubeVideoId ? (
              <VideoResourceCard
                key={resource.id}
                resource={resource}
                viewMode="grid"
                onPlay={handlePlay}
                onDownload={handleDownload}
                onPreview={handlePreview}
              />
            ) : (
              <Card key={resource.id}>
                <div className="aspect-video bg-gray-200 rounded-md mb-4 relative">
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resource.type === 'Video' ? 'bg-purple-100 text-purple-800' :
                      resource.type === 'Document' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    {resource.type === 'Document' ? (
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : resource.type === 'Image' ? (
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {resource.subject}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {resource.gradeLevel}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {resource.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
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
                    <span>{resource.views} views</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDownload(resource)}
                    >
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(resource)}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </Card>
            )
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            resource.type === 'Video' && resource.youtubeVideoId ? (
              <VideoResourceCard
                key={resource.id}
                resource={resource}
                viewMode="list"
                onPlay={handlePlay}
                onDownload={handleDownload}
                onPreview={handlePreview}
              />
            ) : (
              <Card key={resource.id} padding="sm">
                <div className="flex items-start space-x-4">
                  <div className="w-24 h-16 bg-gray-200 rounded-md flex-shrink-0 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {resource.type === 'Document' ? (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <span className="text-xs text-gray-600">{resource.type}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{resource.description}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {resource.subject}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {resource.gradeLevel}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {resource.category}
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
                          <span>{resource.views} views</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button 
                          size="sm"
                          onClick={() => handleDownload(resource)}
                        >
                          Download
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(resource)}
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
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

      {/* Video Resource Preview Modal */}
      {previewResource && previewResource.type === 'Video' && (
        <VideoResourcePreview
          resource={previewResource}
          isOpen={!!previewResource}
          onClose={() => setPreviewResource(null)}
          onPlay={() => handlePlay(previewResource)}
          onDownload={() => handleDownload(previewResource)}
        />
      )}

      {/* Regular Resource Preview Modal */}
      {previewResource && previewResource.type !== 'Video' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Resource Preview</h2>
              <button
                onClick={() => setPreviewResource(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {previewResource.title}
                  </h3>
                  <p className="text-gray-600">
                    {previewResource.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Author:</span>
                    <span className="ml-2 text-gray-600">{previewResource.author}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Subject:</span>
                    <span className="ml-2 text-gray-600">{previewResource.subject}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Grade Level:</span>
                    <span className="ml-2 text-gray-600">{previewResource.gradeLevel}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="ml-2 text-gray-600">{previewResource.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">File Size:</span>
                    <span className="ml-2 text-gray-600">{previewResource.size}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Downloads:</span>
                    <span className="ml-2 text-gray-600">{previewResource.downloads}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewResource.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button onClick={() => handleDownload(previewResource)} className="flex-1">
                    Download Resource
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewResource(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};