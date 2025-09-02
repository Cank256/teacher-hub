/**
 * Offline Content Manager Component
 * Manages offline government content downloads and storage
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { OfflineContentManagerProps } from '../types';
import {
  useOfflineGovernmentContent,
  useOfflineContentStatus,
  useSyncOfflineContent,
  useRemoveOfflineContent,
} from '../../../services/api/hooks/useGovernmentContent';
import { OfflineGovernmentContent } from '../../../types';
import { useTheme } from '../../../theme';

export const OfflineContentManager: React.FC<OfflineContentManagerProps> = ({
  onDownload,
  onRemove,
  onSync,
  showStorageInfo = true,
}) => {
  const { colors, typography } = useTheme();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const {
    data: offlineContent = [],
    isLoading: isLoadingContent,
    refetch: refetchContent,
  } = useOfflineGovernmentContent();

  const {
    data: syncStatus,
    isLoading: isLoadingStatus,
  } = useOfflineContentStatus();

  const syncMutation = useSyncOfflineContent();
  const removeMutation = useRemoveOfflineContent();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleSelection = useCallback((contentId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(contentId)) {
      newSelection.delete(contentId);
    } else {
      newSelection.add(contentId);
    }
    setSelectedItems(newSelection);
  }, [selectedItems]);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(offlineContent.map(item => item.contentId)));
  }, [offlineContent]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleSync = useCallback(() => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        refetchContent();
        onSync?.();
      },
      onError: (error) => {
        Alert.alert('Sync Failed', error.message || 'Failed to sync offline content');
      },
    });
  }, [syncMutation, refetchContent, onSync]);

  const handleRemoveSelected = useCallback(() => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      'Remove Content',
      `Are you sure you want to remove ${selectedItems.size} item(s) from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const contentIds = Array.from(selectedItems);
            removeMutation.mutate(contentIds, {
              onSuccess: () => {
                setSelectedItems(new Set());
                refetchContent();
                onRemove?.(contentIds);
              },
              onError: (error) => {
                Alert.alert('Remove Failed', error.message || 'Failed to remove content');
              },
            });
          },
        },
      ]
    );
  }, [selectedItems, removeMutation, refetchContent, onRemove]);

  const renderStorageInfo = () => {
    if (!showStorageInfo || !syncStatus) return null;

    const usagePercentage = (syncStatus.storageUsed / syncStatus.storageLimit) * 100;

    return (
      <View style={[styles.storageInfo, { backgroundColor: colors.surface }]}>
        <Text style={[styles.storageTitle, { color: colors.text.primary }]}>
          Storage Usage
        </Text>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageProgress,
              {
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: usagePercentage > 90 ? colors.error : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.storageText, { color: colors.text.secondary }]}>
          {formatFileSize(syncStatus.storageUsed)} of {formatFileSize(syncStatus.storageLimit)} used
        </Text>
        <Text style={[styles.storageText, { color: colors.text.secondary }]}>
          {syncStatus.totalOfflineContent} items • Last sync: {
            syncStatus.lastSyncAt ? formatDate(syncStatus.lastSyncAt) : 'Never'
          }
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderStorageInfo()}
      <View style={styles.controls}>
        <View style={styles.controlsLeft}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.controlButtonText, { color: colors.white }]}>
                🔄 Sync
              </Text>
            )}
          </TouchableOpacity>
          
          {selectedItems.size > 0 && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.error }]}
              onPress={handleRemoveSelected}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.controlButtonText, { color: colors.white }]}>
                  🗑️ Remove ({selectedItems.size})
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlsRight}>
          {selectedItems.size === 0 ? (
            <TouchableOpacity onPress={selectAll}>
              <Text style={[styles.selectText, { color: colors.primary }]}>
                Select All
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={clearSelection}>
              <Text style={[styles.selectText, { color: colors.primary }]}>
                Clear Selection
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: OfflineGovernmentContent }) => {
    const isSelected = selectedItems.has(item.contentId);
    const isOutdated = !item.isUpToDate;

    return (
      <TouchableOpacity
        style={[
          styles.contentItem,
          {
            backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
            borderColor: isSelected ? colors.primary : colors.neutral.light,
          },
        ]}
        onPress={() => toggleSelection(item.contentId)}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.checkbox, { color: colors.primary }]}>
              {isSelected ? '☑' : '☐'}
            </Text>
            {isOutdated && (
              <View style={[styles.outdatedBadge, { backgroundColor: colors.warning }]}>
                <Text style={[styles.outdatedText, { color: colors.white }]}>
                  Update Available
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.itemTitle, { color: colors.text.primary }]}>
            Content ID: {item.contentId}
          </Text>
          
          <View style={styles.itemMetadata}>
            <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
              Size: {formatFileSize(item.size)}
            </Text>
            <Text style={[styles.separator, { color: colors.text.tertiary }]}>•</Text>
            <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
              Downloaded: {formatDate(item.downloadedAt)}
            </Text>
          </View>
          
          <View style={styles.itemMetadata}>
            <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
              Priority: {item.priority}
            </Text>
            <Text style={[styles.separator, { color: colors.text.tertiary }]}>•</Text>
            <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
              Last sync: {formatDate(item.lastSyncAt)}
            </Text>
          </View>
          
          {item.expiresAt && (
            <Text style={[styles.expirationText, { color: colors.warning }]}>
              Expires: {formatDate(item.expiresAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: colors.text.tertiary }]}>
        📱
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No Offline Content
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
        Download government content to access it offline
      </Text>
    </View>
  );

  if (isLoadingContent || isLoadingStatus) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading offline content...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={offlineContent}
        renderItem={renderItem}
        keyExtractor={(item) => item.contentId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  storageInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  storageProgress: {
    height: '100%',
    borderRadius: 4,
  },
  storageText: {
    fontSize: 12,
    marginBottom: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  controlsLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  controlsRight: {
    flexDirection: 'row',
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemContent: {
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    fontSize: 16,
  },
  outdatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outdatedText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metadataText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  expirationText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});