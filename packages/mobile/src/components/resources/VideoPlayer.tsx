import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {PanGestureHandler, TapGestureHandler, State} from 'react-native-gesture-handler';

import {theme} from '../../styles/theme';

interface VideoPlayerProps {
  videoUri: string;
  thumbnailUri?: string;
  title?: string;
  duration?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  onFullscreen?: () => void;
  onError?: (error: string) => void;
  style?: any;
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUri,
  thumbnailUri,
  title,
  duration = 0,
  autoPlay = false,
  showControls = true,
  onFullscreen,
  onError,
  style,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  
  const controlsOpacity = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const progressValue = useSharedValue(0);
  
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoPlay) {
      handlePlay();
    }
  }, [autoPlay]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControlsOverlay && isPlaying) {
      controlsTimer.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showControlsOverlay, isPlaying]);

  const showControls = () => {
    setShowControlsOverlay(true);
    controlsOpacity.value = withTiming(1, {duration: 200});
  };

  const hideControls = () => {
    setShowControlsOverlay(false);
    controlsOpacity.value = withTiming(0, {duration: 200});
  };

  const toggleControls = () => {
    if (showControlsOverlay) {
      hideControls();
    } else {
      showControls();
    }
  };

  const handlePlay = async () => {
    try {
      setIsLoading(true);
      playButtonScale.value = withSpring(0.9, {damping: 15, stiffness: 300}, () => {
        playButtonScale.value = withSpring(1, {damping: 15, stiffness: 300});
      });

      // In a real implementation, you would use react-native-video or expo-av
      console.log('Playing video:', videoUri);
      
      setIsPlaying(true);
      
      // Simulate video playback progress
      const progressInterval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            clearInterval(progressInterval);
            setIsPlaying(false);
            setCurrentTime(0);
            progressValue.value = 0;
            return 0;
          }
          
          progressValue.value = (newTime / duration) * 100;
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Video playback error:', error);
      onError?.('Failed to play video');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    console.log('Paused video');
  };

  const handleSeek = (position: number) => {
    const seekTime = (position / 100) * duration;
    setCurrentTime(seekTime);
    progressValue.value = position;
    console.log('Seeking to:', seekTime);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    onFullscreen?.();
  };

  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
    console.log('Playback rate changed to:', rates[nextIndex]);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: playButtonScale.value}],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const renderThumbnail = () => (
    <View style={styles.thumbnailContainer}>
      {thumbnailUri ? (
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailText}>Video Thumbnail</Text>
        </View>
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Icon name="play-circle-outline" size={64} color={theme.colors.surface} />
        </View>
      )}
      
      <TouchableOpacity
        style={styles.playOverlay}
        onPress={handlePlay}
        activeOpacity={0.8}>
        <Animated.View style={[styles.playButton, playButtonAnimatedStyle]}>
          <Icon name="play-arrow" size={32} color={theme.colors.surface} />
        </Animated.View>
      </TouchableOpacity>
      
      {duration > 0 && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <Animated.View style={[styles.controlsOverlay, controlsAnimatedStyle]}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          {title && (
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleFullscreen}
            activeOpacity={0.7}>
            <Icon
              name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
              size={24}
              color={theme.colors.surface}
            />
          </TouchableOpacity>
        </View>

        {/* Center Controls */}
        <View style={styles.centerControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleSeek(Math.max(0, (currentTime - 10) / duration * 100))}
            activeOpacity={0.7}>
            <Icon name="replay-10" size={32} color={theme.colors.surface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.playPauseButton]}
            onPress={isPlaying ? handlePause : handlePlay}
            activeOpacity={0.7}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Icon
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={40}
                color={theme.colors.surface}
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleSeek(Math.min(100, (currentTime + 10) / duration * 100))}
            activeOpacity={0.7}>
            <Icon name="forward-10" size={32} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.rateButton}
            onPress={handlePlaybackRateChange}
            activeOpacity={0.7}>
            <Text style={styles.rateText}>{playbackRate}x</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderVideoPlayer = () => (
    <View style={styles.videoContainer}>
      {/* Video would be rendered here using react-native-video */}
      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoPlaceholderText}>Video Player</Text>
        <Text style={styles.videoUri} numberOfLines={1}>
          {videoUri}
        </Text>
      </View>
      
      <TapGestureHandler
        numberOfTaps={1}
        onHandlerStateChange={({nativeEvent}) => {
          if (nativeEvent.state === State.ACTIVE) {
            toggleControls();
          }
        }}>
        <View style={styles.touchOverlay} />
      </TapGestureHandler>
      
      {renderControls()}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {!isPlaying ? renderThumbnail() : renderVideoPlayer()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
  },
  thumbnailContainer: {
    flex: 1,
    position: 'relative',
  },
  thumbnail: {
    flex: 1,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  durationText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.surface,
    fontWeight: '500',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  videoPlaceholderText: {
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  videoUri: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTitle: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.surface,
    fontWeight: '500',
    marginRight: theme.spacing.md,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    marginHorizontal: theme.spacing.lg,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.surface,
    fontWeight: '500',
    minWidth: 80,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  rateButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  rateText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.surface,
    fontWeight: '500',
  },
});