import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import type { UploadProgress as UploadProgressType } from '@/types/resources';

interface UploadProgressProps {
  visible: boolean;
  progress: UploadProgressType;
  fileName: string;
  onCancel?: () => void;
  canCancel?: boolean;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  visible,
  progress,
  fileName,
  onCancel,
  canCancel = true,
  status,
  errorMessage,
  onRetry,
  onClose,
}) => {
  const { colors, spacing } = useTheme();
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress.percentage / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress.percentage, progressAnim]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return 'cloud-upload';
      case 'processing':
        return 'hourglass-empty';
      case 'completed':
        return 'check-circle';
      case 'error':
        return 'error';
      default:
        return 'cloud-upload';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return colors.primary;
      case 'completed':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return colors.primary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Upload completed!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Uploading...';
    }
  };

  const renderProgressBar = () => (
    <View style={[styles.progressBarContainer, { backgroundColor: colors.background.secondary }]}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: getStatusColor(),
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );

  const renderContent = () => {
    if (status === 'error') {
      return (
        <View style={styles.content}>
          <Icon
            name={getStatusIcon()}
            size={48}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
          
          <Text style={[styles.fileName, { color: colors.text.primary }]}>
            {fileName}
          </Text>
          
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          
          {errorMessage && (
            <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
              {errorMessage}
            </Text>
          )}
          
          <View style={styles.actions}>
            {onRetry && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={onRetry}
              >
                <Text style={[styles.actionButtonText, { color: colors.background.primary }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            )}
            
            {onClose && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.text.secondary }]}
                onPress={onClose}
              >
                <Text style={[styles.actionButtonText, { color: colors.background.primary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (status === 'completed') {
      return (
        <View style={styles.content}>
          <Icon
            name={getStatusIcon()}
            size={48}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
          
          <Text style={[styles.fileName, { color: colors.text.primary }]}>
            {fileName}
          </Text>
          
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          
          {onClose && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: colors.background.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <Icon
          name={getStatusIcon()}
          size={48}
          color={getStatusColor()}
          style={styles.statusIcon}
        />
        
        <Text style={[styles.fileName, { color: colors.text.primary }]}>
          {fileName}
        </Text>
        
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        
        {renderProgressBar()}
        
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {progress.percentage}%
          </Text>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
          </Text>
        </View>
        
        {canCancel && onCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.text.secondary }]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={status === 'completed' || status === 'error' ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  content: {
    alignItems: 'center',
  },
  statusIcon: {
    marginBottom: 16,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorMessage: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});