import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Note: Orientation control would require react-native-orientation-locker package
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { YouTubePlayer } from '@/components/resources/YouTubePlayer/YouTubePlayer';
import type { ResourcesStackScreenProps } from '@/navigation/types';

type Props = ResourcesStackScreenProps<'VideoPlayer'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const VideoPlayerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { videoUrl, title } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Note: Orientation control would be implemented here with react-native-orientation-locker
    // Orientation.lockToPortrait();
    
    return () => {
      // Orientation.unlockAllOrientations();
    };
  }, []);

  React.useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControls && isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [showControls, isPlaying]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      // Orientation.lockToPortrait();
      setIsFullscreen(false);
    } else {
      // Orientation.lockToLandscape();
      setIsFullscreen(true);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleBack = () => {
    if (isFullscreen) {
      toggleFullscreen();
    } else {
      navigation.goBack();
    }
  };

  const handleStateChange = (state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    setIsPlaying(state === 'playing');
    if (state === 'playing' || state === 'paused') {
      setShowControls(true);
    }
  };

  const handleError = (error: string) => {
    Alert.alert('Video Error', 'Unable to play this video. Please try again later.');
    console.error('Video player error:', error);
  };

  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.background.primary }]}>
        <Icon name="error-outline" size={64} color={colors.text.secondary} />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          Invalid video URL
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.background.primary }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const containerStyle = [
    styles.container,
    { backgroundColor: '#000' },
    isFullscreen && styles.fullscreenContainer,
  ];

  const playerStyle = [
    styles.player,
    isFullscreen && styles.fullscreenPlayer,
  ];

  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000"
        hidden={isFullscreen}
      />
      
      <TouchableOpacity
        style={styles.playerContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <YouTubePlayer
          videoId={videoId}
          title={title}
          autoplay={false}
          controls={false}
          style={playerStyle}
          onStateChange={handleStateChange}
          onError={handleError}
        />
      </TouchableOpacity>

      {showControls && (
        <View style={[styles.controls, isFullscreen && styles.fullscreenControls]}>
          <View style={[styles.topControls, { paddingTop: isFullscreen ? 20 : insets.top }]}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleBack}
            >
              <Icon name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title}
            </Text>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFullscreen}
            >
              <Icon
                name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isFullscreen && (
        <View style={[styles.info, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.infoDescription, { color: colors.text.secondary }]}>
            Tap the video to show/hide controls. Use the fullscreen button for better viewing experience.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerContainer: {
    position: 'relative',
  },
  player: {
    width: screenWidth,
    height: (screenWidth * 9) / 16, // 16:9 aspect ratio
  },
  fullscreenPlayer: {
    width: screenHeight,
    height: screenWidth,
    transform: [{ rotate: '90deg' }],
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fullscreenControls: {
    width: screenHeight,
    height: screenWidth,
    transform: [{ rotate: '90deg' }],
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  info: {
    flex: 1,
    padding: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});