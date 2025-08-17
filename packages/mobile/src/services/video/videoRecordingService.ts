import {Platform, Alert, Linking} from 'react-native';
import {request, PERMISSIONS, RESULTS, Permission} from 'react-native-permissions';

export interface VideoRecording {
  id: string;
  uri: string;
  duration: number;
  size: number;
  width: number;
  height: number;
  thumbnailUri?: string;
  quality: 'low' | 'medium' | 'high';
}

export interface VideoRecordingOptions {
  maxDuration?: number; // in seconds
  quality?: 'low' | 'medium' | 'high';
  maxFileSize?: number; // in bytes
  aspectRatio?: '16:9' | '4:3' | '1:1';
}

class VideoRecordingService {
  private isRecording = false;
  private currentRecording: string | null = null;

  async requestCameraPermission(): Promise<boolean> {
    try {
      const permission: Permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

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

  showPermissionAlert(type: 'camera' | 'microphone') {
    const title = type === 'camera' ? 'Camera Permission' : 'Microphone Permission';
    const message = type === 'camera' 
      ? 'This app needs access to your camera to record videos.'
      : 'This app needs access to your microphone to record audio with videos.';

    Alert.alert(
      title,
      message,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Settings', onPress: () => Linking.openSettings()},
      ]
    );
  }

  async startRecording(options: VideoRecordingOptions = {}): Promise<string | null> {
    try {
      const [hasCameraPermission, hasMicPermission] = await Promise.all([
        this.requestCameraPermission(),
        this.requestMicrophonePermission(),
      ]);

      if (!hasCameraPermission) {
        this.showPermissionAlert('camera');
        return null;
      }

      if (!hasMicPermission) {
        this.showPermissionAlert('microphone');
        return null;
      }

      if (this.isRecording) {
        console.warn('Already recording');
        return null;
      }

      // In a real implementation, you would use react-native-camera or expo-camera
      const recordingId = `video_${Date.now()}`;
      this.isRecording = true;
      this.currentRecording = recordingId;

      console.log('Started video recording:', recordingId, options);
      
      return recordingId;
    } catch (error) {
      console.error('Failed to start video recording:', error);
      this.isRecording = false;
      this.currentRecording = null;
      throw new Error('Failed to start video recording');
    }
  }

  async stopRecording(): Promise<VideoRecording | null> {
    try {
      if (!this.isRecording || !this.currentRecording) {
        console.warn('Not currently recording');
        return null;
      }

      this.isRecording = false;
      const recordingId = this.currentRecording;
      this.currentRecording = null;

      // In a real implementation, this would stop the actual recording
      // and return the recorded video information
      
      const mockVideoRecording: VideoRecording = {
        id: recordingId,
        uri: `file://videos/${recordingId}.mp4`,
        duration: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
        size: Math.floor(Math.random() * 50000000) + 5000000, // 5MB-55MB
        width: 1920,
        height: 1080,
        thumbnailUri: `file://thumbnails/${recordingId}.jpg`,
        quality: 'medium',
      };

      console.log('Stopped video recording:', mockVideoRecording);
      
      return mockVideoRecording;
    } catch (error) {
      console.error('Failed to stop video recording:', error);
      this.isRecording = false;
      this.currentRecording = null;
      throw new Error('Failed to stop video recording');
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
      console.log('Cancelled video recording:', recordingId);
    } catch (error) {
      console.error('Failed to cancel video recording:', error);
    }
  }

  getRecordingStatus(): {isRecording: boolean; recordingId: string | null} {
    return {
      isRecording: this.isRecording,
      recordingId: this.currentRecording,
    };
  }

  validateVideoRecording(video: VideoRecording, maxSizeInMB: number = 100): {valid: boolean; error?: string} {
    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (video.size > maxSizeInBytes) {
      return {
        valid: false,
        error: `Video size exceeds ${maxSizeInMB}MB limit`,
      };
    }

    // Check duration (max 10 minutes for educational content)
    if (video.duration > 600) {
      return {
        valid: false,
        error: 'Video duration exceeds 10 minutes limit',
      };
    }

    // Check minimum duration (3 seconds)
    if (video.duration < 3) {
      return {
        valid: false,
        error: 'Video is too short (minimum 3 seconds)',
      };
    }

    // Check resolution (minimum 480p)
    if (video.width < 640 || video.height < 480) {
      return {
        valid: false,
        error: 'Video resolution is too low (minimum 640x480)',
      };
    }

    return {valid: true};
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

  getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return {
          width: 640,
          height: 480,
          bitrate: 1000000, // 1 Mbps
          frameRate: 24,
        };
      case 'medium':
        return {
          width: 1280,
          height: 720,
          bitrate: 2500000, // 2.5 Mbps
          frameRate: 30,
        };
      case 'high':
        return {
          width: 1920,
          height: 1080,
          bitrate: 5000000, // 5 Mbps
          frameRate: 30,
        };
      default:
        return this.getQualitySettings('medium');
    }
  }

  async generateThumbnail(videoUri: string): Promise<string | null> {
    try {
      // In a real implementation, you would use a library like react-native-video-processing
      // or ffmpeg to generate a thumbnail from the video
      
      const thumbnailUri = videoUri.replace('.mp4', '_thumb.jpg');
      console.log('Generated thumbnail:', thumbnailUri);
      
      return thumbnailUri;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }

  async compressVideo(
    videoUri: string, 
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string | null> {
    try {
      // In a real implementation, you would use a video compression library
      const compressedUri = videoUri.replace('.mp4', `_compressed_${quality}.mp4`);
      console.log('Compressed video:', compressedUri);
      
      return compressedUri;
    } catch (error) {
      console.error('Failed to compress video:', error);
      return null;
    }
  }

  async deleteVideoRecording(video: VideoRecording): Promise<void> {
    try {
      // In a real implementation, this would delete the video file and thumbnail
      console.log('Deleted video recording:', video.id);
    } catch (error) {
      console.error('Failed to delete video recording:', error);
      throw new Error('Failed to delete video recording');
    }
  }
}

export const videoRecordingService = new VideoRecordingService();