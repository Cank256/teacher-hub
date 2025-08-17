import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import {
  VoiceMessage,
  voiceMessageService,
} from '../../services/audio/voiceMessageService';
import {theme} from '../../styles/theme';

interface VoiceMessageRecorderProps {
  onRecordingComplete: (voiceMessage: VoiceMessage) => void;
  onCancel: () => void;
  maxDuration?: number;
  style?: any;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes
  style,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const waveformTimer = useRef<NodeJS.Timeout | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Gesture handling for slide to cancel
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (waveformTimer.current) {
        clearInterval(waveformTimer.current);
      }
      if (isRecording) {
        voiceMessageService.cancelRecording();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const id = await voiceMessageService.startRecording({
        maxDuration,
        quality: 'medium',
        format: 'mp4',
      });
      
      if (!id) {
        Alert.alert('Permission Required', 'Microphone access is required to record voice messages.');
        return;
      }

      setIsRecording(true);
      setRecordingId(id);
      setRecordingDuration(0);
      setWaveformData([]);
      
      // Start recording timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
      
      // Start waveform animation
      waveformTimer.current = setInterval(() => {
        setWaveformData(prev => {
          const newData = [...prev, Math.random() * 100];
          return newData.slice(-50); // Keep last 50 data points
        });
      }, 100);
      
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!isRecording || !recordingId) return;
      
      const voiceMessage = await voiceMessageService.stopRecording();
      
      if (voiceMessage) {
        const validation = voiceMessageService.validateVoiceMessage(voiceMessage);
        if (validation.valid) {
          onRecordingComplete(voiceMessage);
        } else {
          Alert.alert('Invalid Recording', validation.error);
          onCancel();
        }
      } else {
        onCancel();
      }
      
      cleanup();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      onCancel();
      cleanup();
    }
  };

  const cancelRecording = async () => {
    try {
      if (isRecording) {
        await voiceMessageService.cancelRecording();
      }
      onCancel();
      cleanup();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      onCancel();
      cleanup();
    }
  };

  const cleanup = () => {
    setIsRecording(false);
    setRecordingId(null);
    setRecordingDuration(0);
    setWaveformData([]);
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (waveformTimer.current) {
      clearInterval(waveformTimer.current);
      waveformTimer.current = null;
    }
    
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(1);
    
    translateX.value = withSpring(0);
    opacity.value = withSpring(1);
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {startX: number}
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newTranslateX = Math.min(0, context.startX + event.translationX);
      translateX.value = newTranslateX;
      
      // Fade out as user slides left
      const progress = Math.abs(newTranslateX) / 100;
      opacity.value = Math.max(0.3, 1 - progress);
    },
    onEnd: (event) => {
      const shouldCancel = event.translationX < -100 || event.velocityX < -500;
      
      if (shouldCancel) {
        runOnJS(cancelRecording)();
      } else {
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
    opacity: opacity.value,
  }));

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => (
    <View style={styles.waveformContainer}>
      {waveformData.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveformBar,
            {
              height: Math.max(4, height * 0.3),
              opacity: 1 - (waveformData.length - index) * 0.02,
            },
          ]}
        />
      ))}
    </View>
  );

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={[styles.recordButton, style]}
        onPress={startRecording}
        activeOpacity={0.7}>
        <Icon name="mic" size={24} color={theme.colors.surface} />
      </TouchableOpacity>
    );
  }

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.recordingContainer, animatedStyle]}>
        <View style={styles.recordingContent}>
          {/* Recording indicator */}
          <Animated.View
            style={[
              styles.recordingIndicator,
              {transform: [{scale: pulseAnimation}]},
            ]}>
            <Icon name="fiber-manual-record" size={12} color={theme.colors.error} />
          </Animated.View>
          
          {/* Duration */}
          <Text style={styles.durationText}>
            {formatDuration(recordingDuration)}
          </Text>
          
          {/* Waveform */}
          {renderWaveform()}
          
          {/* Slide to cancel hint */}
          <Text style={styles.slideHint}>← Slide to cancel</Text>
        </View>
        
        {/* Stop button */}
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopRecording}
          activeOpacity={0.7}>
          <Icon name="send" size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  recordingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  durationText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.md,
    minWidth: 40,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  waveformBar: {
    width: 2,
    backgroundColor: theme.colors.primary,
    marginRight: 1,
    borderRadius: 1,
  },
  slideHint: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginRight: theme.spacing.sm,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});