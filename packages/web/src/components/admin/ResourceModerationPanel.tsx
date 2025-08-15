import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'image' | 'text';
  format: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  authorId: string;
  authorName: string;
  subjects: string[];
  gradeLevels: string[];
  verificationStatus: 'pending' | 'verified' | 'flagged' | 'rejected';
  securityScanStatus: 'pending' | 'passed' | 'failed';
  securityScanResults?: SecurityScanResult;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  reports: ResourceReport[];
  youtubeVideoId?: string;
}

interface SecurityScanResult {
  virusFound: boolean;
  malwareFound: boolean;
  suspiciousContent: boolean;
  scanDetails: string;
  scannedAt: string;
}

interface ResourceReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: 'inappropriate' | 'copyright' | 'malware' | 'misleading' | 'other';
  description: string;
  createdAt: string;
}

interface ResourceModerationPanelProps {
  onClose?: () => void;
}

export const ResourceModerationPanel: React.FC<ResourceModerationPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'security_failed'>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_reported' | 'largest'>('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, [filter, sortBy]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Advanced Calculus Tutorial Video',
          description: 'A comprehensive video tutorial covering advanced calculus concepts',
          type: 'video',
          format: 'mp4',
          size: 157286400, // ~150MB
          url: 'https://example.com/video1.mp4',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          authorId: 'user1',
          authorName: 'Dr. Mathematics',
          subjects: ['Mathematics', 'Calculus'],
          gradeLevels: ['Grade 12', 'University'],
          verificationStatus: 'pending',
          securityScanStatus: 'passed',
          downloadCount: 45,
          rating: 4.5,
          ratingCount: 12,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          reports: [],
          youtubeVideoId: 'abc123xyz'
        },
        {
          id: '2',
          title: 'Chemistry Lab Safety Guide',
          description: 'Essential safety guidelines for chemistry laboratory work',
          type: 'document',
          format: 'pdf',
          size: 2097152, // 2MB
          url: 'https://example.com/safety-guide.pdf',
          authorId: 'user2',
          authorName: 'Prof. Chemistry',
          subjects: ['Chemistry', 'Science'],
          gradeLevels: ['Grade 9', 'Grade 10', 'Grade 11'],
          verificationStatus: 'flagged',
          securityScanStatus: 'passed',
          downloadCount: 123,
          rating: 4.8,
          ratingCount: 25,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          reports: [
            {
              id: 'r1',
              reporterId: 'user3',
              reporterName: 'Safety Inspector',
              reason: 'misleading',
              description: 'Some safety procedures mentioned are outdated and potentially dangerous',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
          ]
        },
        {
          id: '3',
          title: 'Suspicious File Upload',
          description: 'This file failed security scanning',
          type: 'document',
          format: 'exe',
          size: 5242880, // 5MB
          url: 'https://example.com/suspicious.exe',
          authorId: 'user4',
          authorName: 'Unknown User',
          subjects: ['Computer Science'],
          gradeLevels: ['Grade 12'],
          verificationStatus: 'flagged',
          securityScanStatus: 'failed',
          securityScanResults: {
            virusFound: true,
            malwareFound: false,
            suspiciousContent: true,
            scanDetails: 'Detected potential virus: Trojan.Generic.123',
            scannedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          downloadCount: 0,
          rating: 0,
          ratingCount: 0,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          reports: []
        }
      ];
      setResources(mockResources);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (
    resourceId: string, 
    action: 'approve' | 'reject' | 'flag' | 'delete',
    reason?: string
  ) => {
    try {
      setActionLoading(resourceId);
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResources(prev => prev.map(resource => 
        resource.id === resourceId 
          ? { 
              ...resource, 
              verificationStatus: action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : action === 'flag' ? 'flagged' : resource.verificationStatus
            }
          : resource
      ));
      
      if (selectedResource?.id === resourceId) {
        setSelectedResource(prev => prev ? {
          ...prev,
          verificationStatus: action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : action === 'flag' ? 'flagged' : prev.verificationStatus
        } : null);
      }
    } catch (error) {
      console.error('Failed to perform moderation action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'flagged':
        return 'text-red-600 bg-red-100';
      case 'rejected':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSecurityStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'inappropriate':
        return 'text-purple-600 bg-purple-100';
      case 'copyright':
        return 'text-blue-600 bg-blue-100';
      case 'malware':
        return 'text-red-600 bg-red-100';
      case 'misleading':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      case 'image':
        return '🖼️';
      case 'text':
        return '📝';
      default:
        return '📁';
    }
  };

  const filteredResources = resources.filter(resource => {
    if (filter === 'pending') return resource.verificationStatus === 'pending';
    if (filter === 'flagged') return resource.verificationStatus === 'flagged' || resource.reports.length > 0;
    if (filter === 'security_failed') return resource.securityScanStatus === 'failed';
    return true;
  });

  const sortedResources = [...filteredResources].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'most_reported':
        return b.reports.length - a.reports.length;
      case 'largest':
        return b.size - a.size;
      default: // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Resource Moderation</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
        
        {/* Filters and Controls */}
        <div className="flex items-center space-x-4 mt-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'flagged' | 'security_failed')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Resources</option>
            <option value="pending">Pending Review</option>
            <option value="flagged">Flagged Resources</option>
            <option value="security_failed">Security Failed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_reported' | 'largest')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_reported">Most Reported</option>
            <option value="largest">Largest Files</option>
          </select>
          
          <button
            onClick={fetchResources}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Resources List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading resources...</p>
            </div>
          ) : sortedResources.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No resources found for the selected filter
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {sortedResources.map((resource) => (
                <div
                  key={resource.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedResource?.id === resource.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedResource(resource)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFileTypeIcon(resource.type)}</span>
                      <h3 className="font-medium text-gray-900 truncate">{resource.title}</h3>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(resource.verificationStatus)}`}>
                        {resource.verificationStatus}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getSecurityStatusColor(resource.securityScanStatus)}`}>
                        {resource.securityScanStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{resource.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>By {resource.authorName}</span>
                    <div className="flex items-center space-x-2">
                      <span>{formatFileSize(resource.size)}</span>
                      <span>⭐ {resource.rating.toFixed(1)}</span>
                      <span>📥 {resource.downloadCount}</span>
                      {resource.reports.length > 0 && (
                        <span className="text-red-600">🚩 {resource.reports.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(resource.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Details */}
        <div className="w-1/2 overflow-y-auto">
          {selectedResource ? (
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getFileTypeIcon(selectedResource.type)}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedResource.title}</h3>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedResource.verificationStatus)}`}>
                      {selectedResource.verificationStatus}
                    </span>
                    <span className={`px-2 py-1 text-sm rounded-full ${getSecurityStatusColor(selectedResource.securityScanStatus)}`}>
                      Security: {selectedResource.securityScanStatus}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <p>Author: {selectedResource.authorName}</p>
                  <p>Type: {selectedResource.type} ({selectedResource.format})</p>
                  <p>Size: {formatFileSize(selectedResource.size)}</p>
                  <p>Uploaded: {new Date(selectedResource.createdAt).toLocaleString()}</p>
                  <p>Downloads: {selectedResource.downloadCount}</p>
                  <p>Rating: {selectedResource.rating.toFixed(1)} ({selectedResource.ratingCount} reviews)</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedResource.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Subjects & Grade Levels</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedResource.subjects.map((subject, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedResource.gradeLevels.map((grade, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      {grade}
                    </span>
                  ))}
                </div>
              </div>

              {selectedResource.securityScanResults && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Security Scan Results</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={selectedResource.securityScanResults.virusFound ? 'text-red-600' : 'text-green-600'}>
                          {selectedResource.securityScanResults.virusFound ? '❌' : '✅'}
                        </span>
                        <span className="text-sm">Virus Found</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={selectedResource.securityScanResults.malwareFound ? 'text-red-600' : 'text-green-600'}>
                          {selectedResource.securityScanResults.malwareFound ? '❌' : '✅'}
                        </span>
                        <span className="text-sm">Malware Found</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={selectedResource.securityScanResults.suspiciousContent ? 'text-red-600' : 'text-green-600'}>
                          {selectedResource.securityScanResults.suspiciousContent ? '❌' : '✅'}
                        </span>
                        <span className="text-sm">Suspicious Content</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p><strong>Details:</strong> {selectedResource.securityScanResults.scanDetails}</p>
                      <p><strong>Scanned:</strong> {new Date(selectedResource.securityScanResults.scannedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedResource.youtubeVideoId && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">YouTube Integration</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Video ID: {selectedResource.youtubeVideoId}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      This video is hosted on YouTube as an unlisted video
                    </p>
                  </div>
                </div>
              )}

              {selectedResource.reports.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reports ({selectedResource.reports.length})</h4>
                  <div className="space-y-3">
                    {selectedResource.reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{report.reporterName}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getReasonColor(report.reason)}`}>
                            {report.reason}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Actions */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Moderation Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleModerationAction(selectedResource.id, 'approve')}
                    disabled={actionLoading === selectedResource.id || selectedResource.securityScanStatus === 'failed'}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === selectedResource.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedResource.id, 'flag')}
                    disabled={actionLoading === selectedResource.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Flag
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedResource.id, 'reject')}
                    disabled={actionLoading === selectedResource.id}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedResource.id, 'delete')}
                    disabled={actionLoading === selectedResource.id}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                {selectedResource.securityScanStatus === 'failed' && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                    ⚠️ This resource failed security scanning and cannot be approved until the issues are resolved.
                  </div>
                )}
                <div className="mt-3">
                  <textarea
                    placeholder="Add moderation notes (optional)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Select a resource to view details and moderation options
            </div>
          )}
        </div>
      </div>
    </div>
  );
};