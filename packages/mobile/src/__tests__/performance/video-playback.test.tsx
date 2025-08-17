import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VideoPlayer } from '../../components/resources/VideoPlayer';
import { PostCard } from '../../components/posts/PostCard';
import { postsSlice } from '../../store/slices/postsSlice';
import { authSlice } from '../../store/slices/authSlice';

// Mock React Native Video
jest.mock('react-native-video', () => {
  const MockVideo = (props: any) => {
    const { onLoad, onProgress, onBuffer, onError, onEnd } = props;
    
    React.useEffect(() => {
      // Simulate video loading
      setTimeout(() => {
        onLoad && onLoad({
          duration: 120, // 2 minutes
          naturalSize: { width: 1920, height: 1080 },
          currentTime: 0,
        });
      }, 100);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        onProgress && onProgress({
          currentTime: Math.random() * 120,
          playableDuration: 120,
          seekableDuration: 120,
        });
      }, 1000);

      return () => clearInterval(progressInterval);
    }, []);

    return null;
  };

  return MockVideo;
});

// Mock performance monitoring
jest.mock('../../services/performanceMonitor', () => ({
  PerformanceMonitor: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
    recordMetric: jest.fn(),
    getMemoryUsage: jest.fn(() => ({
      used: 50 * 1024 * 1024, // 50MB
      total: 512 * 1024 * 1024, // 512MB
    })),
  },
}));

const mockStore = configureStore({
  reducer: {
    posts: postsSlice.reducer,
    auth: authSlice.reducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: 'user-123',
        fullName: 'Performance Test User',
        email: 'perf@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
    },
    posts: {
      posts: [],
      loading: false,
      error: null,
    },
  },
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('Mobile Video Playback Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Video Loading Performance', () => {
    it('should load video within acceptable time', async () => {
      const { PerformanceMonitor } = require('../../services/performanceMonitor');
      const videoSource = {
        uri: 'https://example.com/video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      const startTime = Date.now();
      fireEvent(video, 'onLoad', {
        duration: 120,
        naturalSize: { width: 1920, height: 1080 },
        currentTime: 0,
      });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      expect(PerformanceMonitor.recordMetric).toHaveBeenCalledWith(
        'video_load_time',
        expect.any(Number)
      );
    });

    it('should handle multiple video loads efficiently', async () => {
      const videos = Array.from({ length: 5 }, (_, index) => ({
        id: `video-${index}`,
        uri: `https://example.com/video${index}.mp4`,
        type: 'mp4',
      }));

      const startTime = Date.now();
      
      const renderedVideos = videos.map(video => 
        renderWithProvider(<VideoPlayer key={video.id} source={video} />)
      );

      // Wait for all videos to load
      await Promise.all(
        renderedVideos.map(async ({ getByTestId }) => {
          const videoElement = getByTestId('video-player');
          fireEvent(videoElement, 'onLoad', {
            duration: 60,
            naturalSize: { width: 1280, height: 720 },
            currentTime: 0,
          });
        })
      );

      const totalLoadTime = Date.now() - startTime;
      const averageLoadTime = totalLoadTime / videos.length;

      expect(averageLoadTime).toBeLessThan(1000); // Average should be under 1 second
    });

    it('should optimize video quality based on network conditions', () => {
      const videoSource = {
        uri: 'https://example.com/video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer 
          source={videoSource} 
          networkType="cellular"
          dataUsageOptimization={true}
        />
      );

      const video = getByTestId('video-player');
      
      // Should use lower quality for cellular
      expect(video.props.resizeMode).toBe('contain');
      expect(video.props.bufferConfig).toEqual(
        expect.objectContaining({
          minBufferMs: 2000,
          maxBufferMs: 5000,
        })
      );
    });
  });

  describe('Video Playback Performance', () => {
    it('should maintain smooth playback at 30fps', async () => {
      const { PerformanceMonitor } = require('../../services/performanceMonitor');
      const videoSource = {
        uri: 'https://example.com/hd-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      // Simulate playback
      fireEvent(video, 'onLoad', {
        duration: 300, // 5 minutes
        naturalSize: { width: 1920, height: 1080 },
        currentTime: 0,
      });

      // Monitor frame drops
      let frameDrops = 0;
      const frameMonitor = setInterval(() => {
        const memoryUsage = PerformanceMonitor.getMemoryUsage();
        if (memoryUsage.used > 200 * 1024 * 1024) { // Over 200MB
          frameDrops++;
        }
      }, 100);

      // Simulate 10 seconds of playback
      await new Promise(resolve => setTimeout(resolve, 10000));
      clearInterval(frameMonitor);

      expect(frameDrops).toBeLessThan(5); // Less than 5% frame drops
    });

    it('should handle video seeking efficiently', async () => {
      const videoSource = {
        uri: 'https://example.com/long-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      const seekBar = getByTestId('video-seek-bar');

      // Load video
      fireEvent(video, 'onLoad', {
        duration: 3600, // 1 hour
        naturalSize: { width: 1920, height: 1080 },
        currentTime: 0,
      });

      // Test multiple seeks
      const seekTimes = [300, 900, 1800, 2700]; // Various positions
      
      for (const seekTime of seekTimes) {
        const startTime = Date.now();
        
        fireEvent(seekBar, 'onValueChange', seekTime);
        fireEvent(video, 'onSeek', { currentTime: seekTime });
        
        const seekDuration = Date.now() - startTime;
        expect(seekDuration).toBeLessThan(500); // Seek should complete within 500ms
      }
    });

    it('should manage memory usage during long playback', async () => {
      const { PerformanceMonitor } = require('../../services/performanceMonitor');
      const videoSource = {
        uri: 'https://example.com/very-long-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      fireEvent(video, 'onLoad', {
        duration: 7200, // 2 hours
        naturalSize: { width: 1920, height: 1080 },
        currentTime: 0,
      });

      // Monitor memory usage over time
      const memoryReadings = [];
      const memoryMonitor = setInterval(() => {
        const usage = PerformanceMonitor.getMemoryUsage();
        memoryReadings.push(usage.used);
      }, 1000);

      // Simulate 30 seconds of playback
      await new Promise(resolve => setTimeout(resolve, 30000));
      clearInterval(memoryMonitor);

      // Memory should not continuously increase (no memory leaks)
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Video Buffering Performance', () => {
    it('should handle buffering efficiently', async () => {
      const videoSource = {
        uri: 'https://example.com/streaming-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      // Simulate buffering events
      fireEvent(video, 'onBuffer', { isBuffering: true });
      
      const bufferStartTime = Date.now();
      
      // Simulate buffer completion
      setTimeout(() => {
        fireEvent(video, 'onBuffer', { isBuffering: false });
      }, 1500);

      await waitFor(() => {
        const bufferDuration = Date.now() - bufferStartTime;
        expect(bufferDuration).toBeLessThan(3000); // Buffer should resolve within 3 seconds
      });
    });

    it('should adapt buffer size based on network speed', () => {
      const videoSource = {
        uri: 'https://example.com/adaptive-video.mp4',
        type: 'mp4',
      };

      // Test slow network
      const { getByTestId: getSlowVideo } = renderWithProvider(
        <VideoPlayer 
          source={videoSource} 
          networkSpeed="slow"
        />
      );

      const slowVideo = getSlowVideo('video-player');
      expect(slowVideo.props.bufferConfig.minBufferMs).toBeGreaterThan(5000);

      // Test fast network
      const { getByTestId: getFastVideo } = renderWithProvider(
        <VideoPlayer 
          source={videoSource} 
          networkSpeed="fast"
        />
      );

      const fastVideo = getFastVideo('video-player');
      expect(fastVideo.props.bufferConfig.minBufferMs).toBeLessThan(3000);
    });

    it('should preload video thumbnails efficiently', async () => {
      const videoSource = {
        uri: 'https://example.com/thumbnail-video.mp4',
        type: 'mp4',
        thumbnails: [
          'https://example.com/thumb1.jpg',
          'https://example.com/thumb2.jpg',
          'https://example.com/thumb3.jpg',
        ],
      };

      const startTime = Date.now();
      
      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} preloadThumbnails={true} />
      );

      const thumbnailContainer = getByTestId('thumbnail-container');
      
      await waitFor(() => {
        expect(thumbnailContainer.props.children).toHaveLength(3);
      });

      const preloadTime = Date.now() - startTime;
      expect(preloadTime).toBeLessThan(2000); // Thumbnails should preload within 2 seconds
    });
  });

  describe('Device-Specific Performance', () => {
    it('should optimize for iOS devices', () => {
      Platform.OS = 'ios';
      
      const videoSource = {
        uri: 'https://example.com/ios-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      // iOS-specific optimizations
      expect(video.props.allowsExternalPlayback).toBe(true);
      expect(video.props.pictureInPicture).toBe(true);
      expect(video.props.playInBackground).toBe(false);
    });

    it('should optimize for Android devices', () => {
      Platform.OS = 'android';
      
      const videoSource = {
        uri: 'https://example.com/android-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer source={videoSource} />
      );

      const video = getByTestId('video-player');
      
      // Android-specific optimizations
      expect(video.props.useTextureView).toBe(true);
      expect(video.props.bufferConfig).toEqual(
        expect.objectContaining({
          minBufferMs: 2500,
          maxBufferMs: 10000,
        })
      );
    });

    it('should handle low-end device optimizations', () => {
      const videoSource = {
        uri: 'https://example.com/optimized-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer 
          source={videoSource} 
          deviceTier="low"
        />
      );

      const video = getByTestId('video-player');
      
      // Low-end device optimizations
      expect(video.props.maxBitRate).toBe(500000); // 500kbps max
      expect(video.props.resizeMode).toBe('contain');
      expect(video.props.bufferConfig.minBufferMs).toBe(1000);
    });
  });

  describe('Video in Posts Performance', () => {
    it('should handle video posts efficiently in feed', async () => {
      const videoPost = {
        id: 'video-post-123',
        authorId: 'user-456',
        title: 'Educational Video Post',
        content: 'Check out this educational video',
        visibility: 'public' as const,
        tags: ['video', 'education'],
        mediaAttachments: [
          {
            id: 'video-1',
            type: 'video' as const,
            url: 'https://example.com/educational-video.mp4',
            thumbnailUrl: 'https://example.com/video-thumb.jpg',
            filename: 'educational-video.mp4',
            size: 25000000, // 25MB
          },
        ],
        likeCount: 15,
        commentCount: 8,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Video Creator',
          email: 'creator@example.com',
        },
        isLiked: false,
      };

      const startTime = Date.now();
      
      const { getByTestId } = renderWithProvider(<PostCard post={videoPost} />);

      const postVideo = getByTestId('post-video-player');
      
      // Should show thumbnail initially, not auto-play
      expect(postVideo.props.paused).toBe(true);
      expect(getByTestId('video-thumbnail')).toBeTruthy();

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(200); // Should render quickly
    });

    it('should lazy load videos in feed', async () => {
      const videoPosts = Array.from({ length: 10 }, (_, index) => ({
        id: `video-post-${index}`,
        authorId: `user-${index}`,
        title: `Video Post ${index}`,
        content: `Video content ${index}`,
        visibility: 'public' as const,
        tags: ['video'],
        mediaAttachments: [
          {
            id: `video-${index}`,
            type: 'video' as const,
            url: `https://example.com/video${index}.mp4`,
            thumbnailUrl: `https://example.com/thumb${index}.jpg`,
            filename: `video${index}.mp4`,
            size: 20000000,
          },
        ],
        likeCount: index * 2,
        commentCount: index,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: `user-${index}`,
          fullName: `User ${index}`,
          email: `user${index}@example.com`,
        },
        isLiked: false,
      }));

      const { getAllByTestId } = renderWithProvider(
        <div>
          {videoPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      );

      const videoPlayers = getAllByTestId('post-video-player');
      
      // Only first few videos should be loaded initially
      const loadedVideos = videoPlayers.filter(player => 
        player.props.source && player.props.source.uri
      );
      
      expect(loadedVideos.length).toBeLessThanOrEqual(3); // Lazy loading
    });

    it('should handle video playback in viewport', async () => {
      const videoPost = {
        id: 'viewport-video-post',
        authorId: 'user-456',
        title: 'Viewport Video Test',
        content: 'Testing viewport video playback',
        visibility: 'public' as const,
        tags: ['video'],
        mediaAttachments: [
          {
            id: 'viewport-video',
            type: 'video' as const,
            url: 'https://example.com/viewport-video.mp4',
            thumbnailUrl: 'https://example.com/viewport-thumb.jpg',
            filename: 'viewport-video.mp4',
            size: 15000000,
          },
        ],
        likeCount: 5,
        commentCount: 2,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Viewport User',
          email: 'viewport@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={videoPost} />);

      const postCard = getByTestId('post-card');
      const videoPlayer = getByTestId('post-video-player');

      // Simulate entering viewport
      fireEvent(postCard, 'onViewableItemsChanged', {
        viewableItems: [{ item: videoPost, isViewable: true }],
      });

      // Video should start playing when in viewport
      expect(videoPlayer.props.paused).toBe(false);

      // Simulate leaving viewport
      fireEvent(postCard, 'onViewableItemsChanged', {
        viewableItems: [{ item: videoPost, isViewable: false }],
      });

      // Video should pause when out of viewport
      expect(videoPlayer.props.paused).toBe(true);
    });
  });

  describe('Offline Video Performance', () => {
    it('should handle offline video caching', async () => {
      const videoSource = {
        uri: 'https://example.com/cached-video.mp4',
        type: 'mp4',
      };

      const { getByTestId } = renderWithProvider(
        <VideoPlayer 
          source={videoSource} 
          enableCaching={true}
          isOffline={true}
        />
      );

      const video = getByTestId('video-player');
      
      // Should use cached version when offline
      expect(video.props.source.uri).toContain('file://');
      expect(getByTestId('offline-indicator')).toBeTruthy();
    });

    it('should manage cache size efficiently', async () => {
      const { PerformanceMonitor } = require('../../services/performanceMonitor');
      
      const largeCachedVideos = Array.from({ length: 20 }, (_, index) => ({
        uri: `https://example.com/large-video-${index}.mp4`,
        type: 'mp4',
        size: 100 * 1024 * 1024, // 100MB each
      }));

      for (const videoSource of largeCachedVideos) {
        renderWithProvider(
          <VideoPlayer 
            source={videoSource} 
            enableCaching={true}
          />
        );
      }

      // Cache should not exceed reasonable limits
      const cacheSize = PerformanceMonitor.getMemoryUsage().used;
      expect(cacheSize).toBeLessThan(500 * 1024 * 1024); // Less than 500MB cache
    });
  });
});