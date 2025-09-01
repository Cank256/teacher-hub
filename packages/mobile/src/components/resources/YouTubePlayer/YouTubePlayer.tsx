import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { YouTubeService } from '@/services/api/youtubeService';

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  controls?: boolean;
  start?: number;
  end?: number;
  loop?: boolean;
  mute?: boolean;
  onReady?: () => void;
  onStateChange?: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onError?: (error: string) => void;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  autoplay = false,
  controls = true,
  start,
  end,
  loop = false,
  mute = false,
  onReady,
  onStateChange,
  onError,
  style,
}) => {
  const { colors } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const embedUrl = YouTubeService.generateEmbedUrl(videoId, {
    autoplay,
    controls,
    start,
    end,
    loop,
    mute,
  });

  const playerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .video-container {
            position: relative;
            width: 100%;
            height: 100%;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe
            src="${embedUrl}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        
        <script>
          // Listen for YouTube player events
          window.addEventListener('message', function(event) {
            if (event.origin !== 'https://www.youtube.com') return;
            
            const data = event.data;
            if (typeof data === 'string') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.event === 'video-progress') {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'progress',
                    data: parsed.info
                  }));
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          });
          
          // Notify when player is ready
          setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready'
            }));
          }, 1000);
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          setIsLoading(false);
          onReady?.();
          break;
        case 'progress':
          // Handle progress updates if needed
          break;
        case 'stateChange':
          onStateChange?.(message.state);
          break;
        case 'error':
          setHasError(true);
          onError?.(message.error);
          break;
      }
    } catch (error) {
      console.error('Error parsing YouTube player message:', error);
    }
  };

  const handleLoadError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.('Failed to load video');
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderError = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.background.secondary }]}>
      <Icon name="error-outline" size={48} color={colors.text.secondary} />
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
        Video Unavailable
      </Text>
      <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
        This video cannot be played. It may be private, deleted, or restricted.
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={handleRetry}
      >
        <Text style={[styles.retryButtonText, { color: colors.background.primary }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}>
      <Icon name="play-circle-outline" size={48} color={colors.text.secondary} />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
        Loading video...
      </Text>
    </View>
  );

  const playerStyle = [
    styles.container,
    isFullscreen && styles.fullscreen,
    style,
  ];

  if (hasError) {
    return <View style={playerStyle}>{renderError()}</View>;
  }

  return (
    <View style={playerStyle}>
      {isLoading && renderLoading()}
      
      <WebView
        ref={webViewRef}
        source={{ html: playerHtml }}
        style={[styles.webView, isLoading && styles.hidden]}
        onMessage={handleMessage}
        onError={handleLoadError}
        onHttpError={handleLoadError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scalesPageToFit
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
      
      {!isLoading && !hasError && (
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={toggleFullscreen}
        >
          <Icon
            name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  fullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
    zIndex: 1000,
  },
  webView: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});