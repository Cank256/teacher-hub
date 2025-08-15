import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';

interface VideoPlayerProps {
  youtubeVideoId: string;
  title?: string;
  thumbnail?: string;
  autoplay?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  youtubeVideoId,
  title = 'Educational Video',
  thumbnail,
  autoplay = false,
  controls = true,
  width = '100%',
  height = 315,
  className = '',
  onPlay,
  onPause,
  onEnded
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(autoplay);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?${new URLSearchParams({
    rel: '0', // Don't show related videos
    modestbranding: '1', // Minimal YouTube branding
    controls: controls ? '1' : '0',
    autoplay: autoplay ? '1' : '0',
    enablejsapi: '1', // Enable JavaScript API
    origin: window.location.origin
  }).toString()}`;

  const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

  useEffect(() => {
    // Listen for YouTube player events
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'video-progress') {
          // Handle video progress
        } else if (data.event === 'video-play') {
          setIsPlaying(true);
          onPlay?.();
        } else if (data.event === 'video-pause') {
          setIsPlaying(false);
          onPause?.();
        } else if (data.event === 'video-ended') {
          setIsPlaying(false);
          onEnded?.();
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlay, onPause, onEnded]);

  const handlePlayClick = () => {
    setShowPlayer(true);
    setIsLoaded(true);
  };

  const handleIframeLoad = () => {
    setIsLoaded(true);
    setError(null);
  };

  const handleIframeError = () => {
    setError('Failed to load video. Please check your connection and try again.');
  };

  if (error) {
    return (
      <div 
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-6">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setShowPlayer(true);
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!showPlayer) {
    return (
      <div 
        className={`relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group ${className}`}
        style={{ width, height }}
        onClick={handlePlayClick}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default thumbnail if custom one fails
            const target = e.target as HTMLImageElement;
            if (target.src !== `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`) {
              target.src = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
            }
          }}
        />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        
        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <h3 className="text-white font-medium text-sm truncate">{title}</h3>
          <p className="text-gray-300 text-xs mt-1">Click to play video</p>
        </div>
        
        {/* YouTube Logo */}
        <div className="absolute top-3 right-3">
          <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
            YouTube
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        className={`w-full h-full ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}
      />
      
      {/* Loading Spinner */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex items-center space-x-2 text-white">
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading video...</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface VideoUploadStatusProps {
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  youtubeVideoId?: string;
  error?: string;
  onRetry?: () => void;
}

export const VideoUploadStatus: React.FC<VideoUploadStatusProps> = ({
  status,
  progress = 0,
  youtubeVideoId,
  error,
  onRetry
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="animate-pulse h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return `Uploading to YouTube... ${progress}%`;
      case 'processing':
        return 'YouTube is processing your video...';
      case 'completed':
        return 'Video uploaded successfully!';
      case 'failed':
        return error || 'Upload failed. Please try again.';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'processing': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            Video Upload Status
          </p>
          <p className={`text-xs ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>
        </div>
        {status === 'failed' && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>

      {/* Progress Bar for Uploading */}
      {status === 'uploading' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {status === 'processing' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This may take a few minutes depending on video length and quality.
          </p>
        </div>
      )}

      {/* Success State with Video ID */}
      {status === 'completed' && youtubeVideoId && (
        <div className="mt-3 p-3 bg-green-50 rounded-md">
          <p className="text-xs text-green-700">
            Video ID: <code className="bg-green-100 px-1 rounded">{youtubeVideoId}</code>
          </p>
          <p className="text-xs text-green-600 mt-1">
            Your video is now available for viewing within the platform.
          </p>
        </div>
      )}

      {/* Error Details */}
      {status === 'failed' && error && (
        <div className="mt-3 p-3 bg-red-50 rounded-md">
          <p className="text-xs text-red-700">{error}</p>
          <p className="text-xs text-red-600 mt-1">
            Please check your file format and try again, or contact support if the problem persists.
          </p>
        </div>
      )}
    </div>
  );
};

interface VideoThumbnailProps {
  youtubeVideoId: string;
  title?: string;
  duration?: string;
  quality?: 'default' | 'medium' | 'high' | 'standard' | 'maxres';
  className?: string;
  onClick?: () => void;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  youtubeVideoId,
  title,
  duration,
  quality = 'high',
  className = '',
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault'
  };

  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/${qualityMap[quality]}.jpg`;
  const fallbackUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

  return (
    <div 
      className={`relative bg-gray-200 rounded-lg overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Loading State */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={imageError ? fallbackUrl : thumbnailUrl}
        alt={title || 'Video thumbnail'}
        className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          if (!imageError) {
            setImageError(true);
            setImageLoaded(false);
          }
        }}
      />

      {/* Play Button Overlay */}
      {onClick && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Duration Badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>
      )}

      {/* YouTube Badge */}
      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
        YouTube
      </div>

      {/* Error State */}
      {imageError && !imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-500">Video thumbnail unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};