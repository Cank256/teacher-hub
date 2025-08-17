import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Slider,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  VoiceMessage,
  voiceMessageService,
} from '../../services/audio/voiceMessageService';
import {theme} from '../../styles/theme';

interface VoiceMessagePlayerProps {
  voiceMessage: VoiceMessage;
  isOwn?: boolean;
  onDelete?: () => void;
  style?: any;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  voiceMessage,
  isOwn = false,
  onDelete,
  style,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const playButtonScale = useSharedValue(1);
  const waveformOpacity = useSharedValue(1);

  useEffect(() => {
    // Update playing state based on service status
    const {isPlaying: serviceIsPlaying, playerId} = voiceMessageService.getPlaybackStatus();
    setIsPlaying(serviceIsPlaying && playerId === voiceMessage.id);
  }, [voiceMessage.id]);

  const handlePlayPause = async () => {
    try {
      setIsLoading(true);
      playButtonScale.value = withSpring(0.9, {damping: 15, stiffness: 300}, () => {
        playButtonScale.value = withSpring(1, {damping: 15, stiffness: 300});
      });

      if (isPlaying) {
        await voiceMessageService.pausePlayback();
        setIsPlaying(false);
        waveformOpacity.value = withTiming(1);
      } else {
        await voiceMessageService.playVoiceMessage(voiceMessage);
        setIsPlaying(true);
        
        // Animate waveform during playback
        waveformOpacity.value = withRepeat(
          withTiming(0.3, {duration: 500}),
          -1,
          true
        );
        
        // Simulate playback progress
        const progressInterval = setInterval(() => {
          setCurrentTime(prev => {
            const newTime = prev + 0.1;
            if (newTime >= voiceMessage.duration) {
              clearInterval(progressInterval);
              setIsPlaying(false);
              setCurrentTime(0);
              waveformOpacity.value = withTiming(1);
              return 0;
            }
            return newTime;
          });
        }, 100);
      }
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = async (value: number) => {
    try {
      const seekTime = (value / 100) * voiceMessage.duration;
      await voiceMessageService.seekTo(seekTime);
      setCurrentTime(seekTime);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: playButtonScale.value}],
  }));

  const waveformAnimatedStyle = useAnimatedStyle(() => ({
    opacity: waveformOpacity.value,
  }));

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    return voiceMessage.duration > 0 ? (currentTime / voiceMessage.duration) * 100 : 0;
  };

  const renderWaveform = () => {
    if (!voiceMessage.waveform) return null;

    return (
      <Animated.View style={[styles.waveformContainer, waveformAnimatedStyle]}>
        {voiceMessage.waveform.map((height, index) => {
          const progress = getProgress();
          const barProgress = (index / voiceMessage.waveform!.length) * 100;
          const isActive = barProgress <= progress;
          
          return (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: Math.max(4, height * 0.4),
                  backgroundColor: isActive 
                    ? theme.colors.primary 
                    : theme.colors.border,
                },
              ]}
            />
          );
        })}
      </Animated.View>
    );
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer,
      style,
    ]}>
      {/* Play/Pause Button */}
      <Animated.View style={playButtonAnimatedStyle}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isOwn ? styles.ownPlayButton : styles.otherPlayButton,
          ]}
          onPress={handlePlayPause}
          disabled={isLoading}
          activeOpacity={0.7}>
          <Icon
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={20}
            color={isOwn ? theme.colors.surface : theme.colors.primary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Voice Message Content */}
      <View style={styles.content}>
        {/* Waveform or Progress Bar */}
        <View style={styles.visualContainer}>
          {voiceMessage.waveform ? (
            renderWaveform()
          ) : (
            <Slider
              style={styles.progressSlider}
              value={getProgress()}
              onValueChange={handleSeek}
              minimumValue={0}
              maximumValue={100}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
            />
          )}
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            isOwn ? styles.ownTimeText : styles.otherTimeText,
          ]}>
            {formatTime(currentTime)} / {formatTime(voiceMessage.duration)}
          </Text>
          
          <Text style={[
            styles.sizeText,
            isOwn ? styles.ownSizeText : styles.otherSizeText,
          ]}>
            {voiceMessageService.formatFileSize(voiceMessage.size)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {isOwn && onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}>
          <Icon name="delete" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
    maxWidth: '80%',
    ...theme.shadows.sm,
  },
  ownContainer: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
  },
  otherContainer: {
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  ownPlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  otherPlayButton: {
    backgroundColor: theme.colors.borderLight,
  },
  content: {
    flex: 1,
    minWidth: 120,
  },
  visualContainer: {
    height: 30,
    marginBottom: theme.spacing.xs,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  waveformBar: {
    width: 2,
    marginRight: 1,
    borderRadius: 1,
  },
  progressSlider: {
    height: 30,
  },
  sliderThumb: {
    width: 12,
    height: 12,
    backgroundColor: theme.colors.primary,
  },
  sliderTrack: {
    height: 2,
    borderRadius: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  ownTimeText: {
    color: theme.colors.surface,
  },
  otherTimeText: {
    color: theme.colors.textPrimary,
  },
  sizeText: {
    fontSize: theme.typography.caption.fontSize,
  },
  ownSizeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherSizeText: {
    color: theme.colors.textLight,
  },
  deleteButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
});