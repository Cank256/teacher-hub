import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { MessageSyncStatus } from '@/types/messaging';

interface SyncStatusIndicatorProps {
  status: MessageSyncStatus;
  onForceSync?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  onForceSync,
}) => {
  if (status.isOnline && status.pendingMessages === 0 && !status.syncInProgress) {
    return null; // Don't show anything when everything is synced and online
  }

  const getStatusText = () => {
    if (!status.isOnline) {
      return status.pendingMessages > 0 
        ? `${status.pendingMessages} messages queued for sending`
        : 'Offline';
    }

    if (status.syncInProgress) {
      return 'Syncing messages...';
    }

    if (status.pendingMessages > 0) {
      return `${status.pendingMessages} messages pending`;
    }

    return 'All messages synced';
  };

  const getStatusColor = () => {
    if (!status.isOnline) return '#FF9500'; // Orange for offline
    if (status.syncInProgress) return '#007AFF'; // Blue for syncing
    if (status.pendingMessages > 0) return '#FF3B30'; // Red for pending
    return '#34C759'; // Green for synced
  };

  return (
    <View style={[styles.container, { backgroundColor: `${getStatusColor()}15` }]}>
      <View style={styles.content}>
        <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
        
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>

        {status.syncInProgress && (
          <ActivityIndicator 
            size="small" 
            color={getStatusColor()} 
            style={styles.spinner}
          />
        )}

        {!status.isOnline && status.pendingMessages > 0 && onForceSync && (
          <TouchableOpacity 
            style={[styles.syncButton, { borderColor: getStatusColor() }]}
            onPress={onForceSync}
          >
            <Text style={[styles.syncButtonText, { color: getStatusColor() }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 8,
  },
  syncButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});