import {Platform, Alert, Linking} from 'react-native';
import {request, PERMISSIONS, RESULTS, Permission} from 'react-native-permissions';

export interface VoiceMessage {
  id: string;
  uri: string;
  duration: number;
  size: number;
  waveform?: number[];
  isPlaying?: boolean;
  currentTime?: number;
}

export interface RecordingOptions {
  maxDuration?: number; // in seconds
  quality?: 'low' | 'medium' | 'high';
  format?: 'mp4' | 'wav' | 'aac';
}

class VoiceMessageService {
  private isRecording = false;
  private isPlaying = false;
  private currentRecording: string | null = null;
  private currentPlayer: string | null = null;

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.MICROPHONE 
        : PERMISSIONS.ANDROID.RECORD_AUDIO;
      
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }

  showPermissionAlert() {
    Alert.alert(
      'Microphone Permission',
      'This app needs access to your microphone to record voice messages.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Settings', onPress: () => Linking.openSettings()},
      ]
    );
  }

  async startRecording(options: RecordingOptions = {}): Promise<string | null> {
    try {
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        this.showPermissionAlert();
        return null;
      }

      if (this.isRecording) {
        console.warn('Already recording');
        return null;
      }

      // In a real implementation, you would use a library like react-native-audio-recorder-player
      // or @react-native-async-storage/async-storage with native audio recording
      
      const recordingId = `recording_${Date.now()}`;
      this.isRecording = true;
      this.currentRecording = recordingId;

      // Mock recording start
      console.log('Started recording:', recordingId);
      
      return recordingId;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.currentRecording = null;
      throw new Error('Failed to start recording');
    }
  }

  async stopRecording(): Promise<VoiceMessage | null> {
    try {
      if (!this.isRecording || !this.currentRecording) {
        console.warn('Not currently recording');
        return null;
      }

      this.isRecording = false;
      const recordingId = this.currentRecording;
      this.currentRecording = null;

      // In a real implementation, this would stop the actual recording
      // and return the recorded file information
      
      const mockVoiceMessage: VoiceMessage = {
        id: recordingId,
        uri: `file://recordings/${recordingId}.mp4`,
        duration: Math.floor(Math.random() * 30) + 5, // 5-35 seconds
        size: Math.floor(Math.random() * 500000) + 50000, // 50KB-550KB
        waveform: this.generateMockWaveform(),
      };

      console.log('Stopped recording:', mockVoiceMessage);
      
      return mockVoiceMessage;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      this.currentRecording = null;
      throw new Error('Failed to stop recording');
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (!this.isRecording || !this.currentRecording) {
        return;
      }

      this.isRecording = false;
      const recordingId = this.currentRecording;
      this.currentRecording = null;

      // In a real implementation, this would cancel and delete the recording
      console.log('Cancelled recording:', recordingId);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }

  async playVoiceMessage(voiceMessage: VoiceMessage): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stopPlayback();
      }

      this.isPlaying = true;
      this.currentPlayer = voiceMessage.id;

      // In a real implementation, this would play the audio file
      console.log('Playing voice message:', voiceMessage.id);
      
      // Mock playback duration
      setTimeout(() => {
        this.isPlaying = false;
        this.currentPlayer = null;
      }, voiceMessage.duration * 1000);
    } catch (error) {
      console.error('Failed to play voice message:', error);
      this.isPlaying = false;
      this.currentPlayer = null;
      throw new Error('Failed to play voice message');
    }
  }

  async pausePlayback(): Promise<void> {
    try {
      if (!this.isPlaying || !this.currentPlayer) {
        return;
      }

      // In a real implementation, this would pause the audio playback
      console.log('Paused playback:', this.currentPlayer);
    } catch (error) {
      console.error('Failed to pause playback:', error);
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (!this.isPlaying || !this.currentPlayer) {
        return;
      }

      this.isPlaying = false;
      const playerId = this.currentPlayer;
      this.currentPlayer = null;

      // In a real implementation, this would stop the audio playback
      console.log('Stopped playback:', playerId);
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      if (!this.isPlaying || !this.currentPlayer) {
        return;
      }

      // In a real implementation, this would seek to the specified position
      console.log('Seeking to position:', position);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }

  getRecordingStatus(): {isRecording: boolean; recordingId: string | null} {
    return {
      isRecording: this.isRecording,
      recordingId: this.currentRecording,
    };
  }

  getPlaybackStatus(): {isPlaying: boolean; playerId: string | null} {
    return {
      isPlaying: this.isPlaying,
      playerId: this.currentPlayer,
    };
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private generateMockWaveform(length: number = 50): number[] {
    return Array.from({length}, () => Math.random() * 100);
  }

  async deleteVoiceMessage(voiceMessage: VoiceMessage): Promise<void> {
    try {
      // In a real implementation, this would delete the audio file
      console.log('Deleted voice message:', voiceMessage.id);
    } catch (error) {
      console.error('Failed to delete voice message:', error);
      throw new Error('Failed to delete voice message');
    }
  }

  validateVoiceMessage(voiceMessage: VoiceMessage): {valid: boolean; error?: string} {
    // Check duration (max 5 minutes)
    if (voiceMessage.duration > 300) {
      return {
        valid: false,
        error: 'Voice message is too long (max 5 minutes)',
      };
    }

    // Check file size (max 10MB)
    if (voiceMessage.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Voice message file is too large (max 10MB)',
      };
    }

    // Check minimum duration (1 second)
    if (voiceMessage.duration < 1) {
      return {
        valid: false,
        error: 'Voice message is too short (min 1 second)',
      };
    }

    return {valid: true};
  }
}

export const voiceMessageService = new VoiceMessageService();