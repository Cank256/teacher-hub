import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { VideoPlayer, VideoThumbnail } from './VideoPlayer';

interface VideoResource {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
  thumbnail?: string;
  duration?: string;
  subject: string;
  gradeLevel: string;
  author: string;
  rating: number;
  downloads: number;
  uploadDate: string;
  tags: string[];
  isGovernment: boolean;
  size?: string;
}

interface VideoResourceCardProps {
  resource: VideoResource;
  viewMode?: 'grid' | 'list';
  onPlay?: (resource: VideoResource) => void;
  onDownload?: (resource: VideoResource) => void;
  onPreview?: (resource: VideoResource) => void;
  className?: string;
}

export const VideoResourceCard: React.FC<VideoResourceCardProps> = ({
  resource,
  viewMode = 'grid',
  onPlay,
  onDownload,
  onPreview,
  className = ''
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    setShowPlayer(true);
    onPlay?.(resource);
  };

  const handleDownloadClick = () => {
    onDownload?.(resource);
  };

  const handlePreviewClick = () => {
    onPreview?.(resource);
  };

  if (viewMode === 'list') {
    return (
      <Card className={`${className}`} padding="sm">
        <div className="flex items-start space-x-4">
          {/* Video Thumbnail */}
          <div className="w-32 h-20 flex-shrink-0">
            <VideoThumbnail
              youtubeVideoId={resource.youtubeVideoId}
              title={resource.title}
              duration={resource.duration}
              className="w-full h-full"
              onClick={handlePlayClick}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{resource.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{resource.description}</p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {resource.subject}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {resource.gradeLevel}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    Video
                  </span>
                  {resource.isGovernment && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Official
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>By {resource.author}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span>{resource.rating}</span>
                  </div>
                  <span>{resource.downloads} views</span>
                  {resource.duration && <span>{resource.duration}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 ml-4">
                <Button size="sm" onClick={handlePlayClick}>
                  Play
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreviewClick}>
                  Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Video Player/Thumbnail */}
      <div className="aspect-video mb-4 relative">
        {showPlayer ? (
          <VideoPlayer
            youtubeVideoId={resource.youtubeVideoId}
            title={resource.title}
            thumbnail={resource.thumbnail}
            className="w-full h-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <VideoThumbnail
            youtubeVideoId={resource.youtubeVideoId}
            title={resource.title}
            duration={resource.duration}
            className="w-full h-full"
            onClick={handlePlayClick}
          />
        )}

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            Video
          </span>
        </div>

        {/* Official Badge */}
        {resource.isGovernment && (
          <div className="absolute top-2 left-16">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Official
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <CardHeader>
        <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
      </CardHeader>

      <div className="space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {resource.subject}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            {resource.gradeLevel}
          </span>
          {resource.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
              {tag}
            </span>
          ))}
          {resource.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{resource.tags.length - 2} more
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {resource.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>By {resource.author}</span>
          <div className="flex items-center space-x-1">
            <span className="text-yellow-400">★</span>
            <span>{resource.rating}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{resource.downloads} views</span>
          <div className="flex items-center space-x-2">
            {resource.duration && <span>{resource.duration}</span>}
            {resource.size && <span>{resource.size}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={handlePlayClick}
          >
            {showPlayer && isPlaying ? 'Playing...' : 'Play Video'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePreviewClick}
          >
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
};

interface VideoResourcePreviewProps {
  resource: VideoResource;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: () => void;
  onDownload?: () => void;
}

export const VideoResourcePreview: React.FC<VideoResourcePreviewProps> = ({
  resource,
  isOpen,
  onClose,
  onPlay,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Video Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <div className="space-y-4">
              <div className="aspect-video">
                <VideoPlayer
                  youtubeVideoId={resource.youtubeVideoId}
                  title={resource.title}
                  thumbnail={resource.thumbnail}
                  className="w-full h-full"
                />
              </div>
              
              {/* Video Actions */}
              <div className="flex space-x-3">
                <Button onClick={onPlay} className="flex-1">
                  Watch Full Video
                </Button>
                <Button variant="outline" onClick={onDownload}>
                  Download
                </Button>
              </div>
            </div>

            {/* Video Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {resource.title}
                </h3>
                <p className="text-gray-600">
                  {resource.description}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Author</span>
                  <span className="text-sm font-medium text-gray-900">{resource.author}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Subject</span>
                  <span className="text-sm font-medium text-gray-900">{resource.subject}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Grade Level</span>
                  <span className="text-sm font-medium text-gray-900">{resource.gradeLevel}</span>
                </div>
                
                {resource.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-gray-900">{resource.duration}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Rating</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium text-gray-900">{resource.rating}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Views</span>
                  <span className="text-sm font-medium text-gray-900">{resource.downloads}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Upload Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(resource.uploadDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quality Indicators */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Video Quality</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Source</span>
                    <span className="text-gray-900">YouTube (Unlisted)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Security</span>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-600">Verified Safe</span>
                    </div>
                  </div>
                  {resource.isGovernment && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Content Type</span>
                      <span className="text-blue-600">Official Government Content</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};