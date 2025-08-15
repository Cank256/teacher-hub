import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';

interface VideoControlsProps {
  youtubeVideoId: string;
  onQualityChange?: (quality: string) => void;
  onPlaybackSpeedChange?: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  onFullscreenToggle?: () => void;
  className?: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  youtubeVideoId,
  onQualityChange,
  onPlaybackSpeedChange,
  onVolumeChange,
  onFullscreenToggle,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [quality, setQuality] = useState('auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const controlsRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

  const qualities = [
    { value: 'auto', label: 'Auto' },
    { value: 'hd1080', label: '1080p HD' },
    { value: 'hd720', label: '720p HD' },
    { value: 'large', label: '480p' },
    { value: 'medium', label: '360p' },
    { value: 'small', label: '240p' }
  ];

  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseLeave = () => {
      if (isPlaying) {
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 1000);
      }
    };

    const controlsElement = controlsRef.current;
    if (controlsElement) {
      controlsElement.addEventListener('mousemove', handleMouseMove);
      controlsElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (controlsElement) {
        controlsElement.removeEventListener('mousemove', handleMouseMove);
        controlsElement.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality);
    setShowQualityMenu(false);
    onQualityChange?.(newQuality);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    setShowSpeedMenu(false);
    onPlaybackSpeedChange?.(newSpeed);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    onFullscreenToggle?.();
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={controlsRef}
      className={`relative bg-gradient-to-t from-black via-transparent to-transparent ${className}`}
    >
      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${progressPercentage}%, #4b5563 ${progressPercentage}%, #4b5563 100%)`
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button className="text-white hover:text-gray-300 transition-colors">
                {volume === 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 50 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Time Display */}
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white hover:text-gray-300 transition-colors text-sm px-2 py-1 rounded"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 rounded-lg py-2 min-w-[80px]">
                  {playbackSpeeds.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`block w-full text-left px-3 py-1 text-sm transition-colors ${
                        speed === playbackSpeed 
                          ? 'text-red-400 bg-gray-800' 
                          : 'text-white hover:bg-gray-800'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 rounded-lg py-2 min-w-[120px]">
                  {qualities.map(q => (
                    <button
                      key={q.value}
                      onClick={() => handleQualityChange(q.value)}
                      className={`block w-full text-left px-3 py-1 text-sm transition-colors ${
                        q.value === quality 
                          ? 'text-red-400 bg-gray-800' 
                          : 'text-white hover:bg-gray-800'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreenToggle}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Click to show controls overlay */}
      {!showControls && (
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => setShowControls(true)}
        />
      )}
    </div>
  );
};

interface VideoQualityIndicatorProps {
  currentQuality: string;
  availableQualities: string[];
  isBuffering?: boolean;
  connectionSpeed?: 'slow' | 'medium' | 'fast';
}

export const VideoQualityIndicator: React.FC<VideoQualityIndicatorProps> = ({
  currentQuality,
  availableQualities,
  isBuffering = false,
  connectionSpeed = 'medium'
}) => {
  const getQualityLabel = (quality: string): string => {
    const qualityMap: { [key: string]: string } = {
      'auto': 'Auto',
      'hd1080': '1080p HD',
      'hd720': '720p HD',
      'large': '480p',
      'medium': '360p',
      'small': '240p'
    };
    return qualityMap[quality] || quality;
  };

  const getQualityColor = (quality: string): string => {
    if (quality.includes('hd')) return 'text-green-500';
    if (quality === 'large') return 'text-blue-500';
    if (quality === 'medium') return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getConnectionIcon = () => {
    switch (connectionSpeed) {
      case 'fast':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L8 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L12 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L16 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L20 11.47l.85 1.48c.3-.3.7-.5 1.15-.5" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L8 11.47l.85 1.48c.3-.3.7-.5 1.15-.5s.85.2 1.15.5L12 11.47" />
          </svg>
        );
      case 'slow':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48c.3-.3.7-.5 1.15-.5" />
          </svg>
        );
    }
  };

  return (
    <div className="absolute top-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center space-x-2">
      {isBuffering && (
        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      <span className={getQualityColor(currentQuality)}>
        {getQualityLabel(currentQuality)}
      </span>
      
      {getConnectionIcon()}
    </div>
  );
};

interface VideoPlaybackStatsProps {
  stats: {
    resolution: string;
    fps: number;
    bitrate: string;
    droppedFrames: number;
    bufferHealth: number;
    playbackRate: number;
  };
  isVisible: boolean;
}

export const VideoPlaybackStats: React.FC<VideoPlaybackStatsProps> = ({
  stats,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-3 right-3 bg-black bg-opacity-90 text-white p-3 rounded text-xs font-mono space-y-1 min-w-[200px]">
      <div className="text-yellow-400 font-bold mb-2">Playback Stats</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-gray-300">Resolution:</span>
        <span>{stats.resolution}</span>
        
        <span className="text-gray-300">FPS:</span>
        <span>{stats.fps}</span>
        
        <span className="text-gray-300">Bitrate:</span>
        <span>{stats.bitrate}</span>
        
        <span className="text-gray-300">Dropped:</span>
        <span className={stats.droppedFrames > 0 ? 'text-red-400' : 'text-green-400'}>
          {stats.droppedFrames}
        </span>
        
        <span className="text-gray-300">Buffer:</span>
        <span className={stats.bufferHealth > 50 ? 'text-green-400' : 'text-yellow-400'}>
          {stats.bufferHealth}%
        </span>
        
        <span className="text-gray-300">Speed:</span>
        <span>{stats.playbackRate}x</span>
      </div>
    </div>
  );
};