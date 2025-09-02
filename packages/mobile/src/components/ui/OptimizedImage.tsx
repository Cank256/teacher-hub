/**
 * Optimized Image Component with FastImage and Caching
 * Provides high-performance image rendering with automatic optimization
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import FastImage, {
  FastImageProps,
  Priority,
  ResizeMode,
  OnLoadEvent,
  OnProgressEvent,
} from 'react-native-fast-image';
import { ImageCacheService } from '@/services/performance/imageCacheService';
import { useTheme } from '@/theme';

interface OptimizedImageProps extends Omit<FastImageProps, 'source'> {
  uri: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  priority?: Priority;
  cache?: 'immutable' | 'web' | 'cacheOnly';
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  showLoadingIndicator?: boolean;
  showProgressBar?: boolean;
  fallbackUri?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  containerStyle?: ViewStyle;
  imageStyle?: ImageStyle;
  testID?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  width,
  height,
  aspectRatio,
  priority = FastImage.priority.normal,
  cache = 'web',
  placeholder,
  errorComponent,
  showLoadingIndicator = true,
  showProgressBar = false,
  fallbackUri,
  onLoadStart,
  onLoadEnd,
  onError,
  containerStyle,
  imageStyle,
  resizeMode = FastImage.resizeMode.cover,
  testID,
  ...fastImageProps
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const imageSource = useMemo(() => {
    if (!uri) return null;

    const cacheService = ImageCacheService.getInstance();
    return cacheService.getOptimizedSource(uri, {
      width,
      height,
      priority,
      cache,
    });
  }, [uri, width, height, priority, cache]);

  const fallbackSource = useMemo(() => {
    if (!fallbackUri) return null;

    const cacheService = ImageCacheService.getInstance();
    return cacheService.getOptimizedSource(fallbackUri, {
      width,
      height,
      priority: FastImage.priority.low,
      cache: 'web',
    });
  }, [fallbackUri, width, height]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
    setProgress(0);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoad = useCallback((event: OnLoadEvent) => {
    setLoading(false);
    setError(null);
    onLoadEnd?.();
    fastImageProps.onLoad?.(event);
  }, [onLoadEnd, fastImageProps.onLoad]);

  const handleError = useCallback((errorEvent: any) => {
    setLoading(false);
    setError('Failed to load image');
    onError?.(errorEvent);
    fastImageProps.onError?.(errorEvent);
  }, [onError, fastImageProps.onError]);

  const handleProgress = useCallback((event: OnProgressEvent) => {
    if (showProgressBar) {
      const progressValue = event.nativeEvent.loaded / event.nativeEvent.total;
      setProgress(progressValue);
    }
    fastImageProps.onProgress?.(event);
  }, [showProgressBar, fastImageProps.onProgress]);

  const containerStyles = useMemo(() => {
    const styles: ViewStyle = {
      ...containerStyle,
    };

    if (width) styles.width = width;
    if (height) styles.height = height;
    if (aspectRatio) styles.aspectRatio = aspectRatio;

    return styles;
  }, [containerStyle, width, height, aspectRatio]);

  const finalImageStyle = useMemo(() => {
    const styles: ImageStyle = {
      width: '100%',
      height: '100%',
      ...imageStyle,
    };

    return styles;
  }, [imageStyle]);

  if (!imageSource) {
    return (
      <View style={[styles.container, containerStyles]} testID={`${testID}-empty`}>
        {placeholder || (
          <View style={[styles.placeholder, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.placeholderText, { color: theme.colors.onSurface }]}>
              No Image
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyles]} testID={testID}>
      <FastImage
        {...fastImageProps}
        source={imageSource}
        style={finalImageStyle}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        onProgress={handleProgress}
        fallback={fallbackSource || undefined}
      />

      {/* Loading Indicator */}
      {loading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            testID={`${testID}-loading`}
          />
        </View>
      )}

      {/* Progress Bar */}
      {loading && showProgressBar && progress > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorOverlay}>
          {errorComponent || (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>
                {error}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Placeholder while loading */}
      {loading && placeholder && (
        <View style={styles.placeholderOverlay}>
          {placeholder}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  placeholderText: {
    fontSize: 14,
    opacity: 0.6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    height: '100%',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default OptimizedImage;