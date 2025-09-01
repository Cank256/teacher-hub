import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { formatFileSize, formatDate } from '@/utils';
import { OfflineResourceService } from '@/services/storage/offlineResourceService';
import type { Resource, ResourceType } from '@/types/resources';

interface ResourceCardProps {
  resource: Resource;
  onPress: () => void;
  onDownload?: () => void;
  onRate?: () => void;
  onShare?: () => void;
  showActions?: boolean;
  isDownloaded?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onPress,
  onDownload,
  onRate,
  onShare,
  showActions = true,
  isDownloaded = false,
}) => {
  const { colors, spacing } = useTheme();

  const getResourceIcon = (type: ResourceType): string => {
    switch (type) {
      case 'document':
        return 'description';
      case 'image':
        return 'image';
      case 'video':
      case 'youtube_video':
        return 'play-circle-filled';
      case 'audio':
        return 'audiotrack';
      case 'presentation':
        return 'slideshow';
      case 'spreadsheet':
        return 'grid-on';
      default:
        return 'insert-drive-file';
    }
  };

  const getResourceTypeColor = (type: ResourceType): string => {
    switch (type) {
      case 'document':
        return '#FF6B6B';
      case 'image':
        return '#4ECDC4';
      case 'video':
      case 'youtube_video':
        return '#45B7D1';
      case 'audio':
        return '#96CEB4';
      case 'presentation':
        return '#FFEAA7';
      case 'spreadsheet':
        return '#DDA0DD';
      default:
        return colors.text.secondary;
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      Alert.alert(
        'Download Resource',
        'Do you want to download this resource for offline access?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => downloadResource() },
        ]
      );
    }
  };

  const downloadResource = async () => {
    try {
      await OfflineResourceService.downloadResource(resource);
      Alert.alert('Success', 'Resource downloaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to download resource');
    }
  };

  const renderThumbnail = () => {
    if (resource.thumbnailUrl) {
      return (
        <FastImage
          source={{ uri: resource.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode={FastImage.resizeMode.cover}
        />
      );
    }

    return (
      <View style={[styles.thumbnailPlaceholder, { backgroundColor: getResourceTypeColor(resource.type) }]}>
        <Icon
          name={getResourceIcon(resource.type)}
          size={32}
          color={colors.background.primary}
        />
      </View>
    );
  };

  const renderRating = () => {
    const stars = [];
    const fullStars = Math.floor(resource.rating);
    const hasHalfStar = resource.rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Icon key={i} name="star" size={14} color="#FFD700" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Icon key={i} name="star-half" size={14} color="#FFD700" />
        );
      } else {
        stars.push(
          <Icon key={i} name="star-border" size={14} color="#FFD700" />
        );
      }
    }

    return (
      <View style={styles.ratingContainer}>
        <View style={styles.stars}>{stars}</View>
        <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
          ({resource.rating.toFixed(1)})
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.thumbnailContainer}>
          {renderThumbnail()}
          {isDownloaded && (
            <View style={[styles.downloadedBadge, { backgroundColor: colors.primary }]}>
              <Icon name="offline-pin" size={12} color={colors.background.primary} />
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Text
            style={[styles.title, { color: colors.text.primary }]}
            numberOfLines={2}
          >
            {resource.title}
          </Text>

          <Text
            style={[styles.description, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {resource.description}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Icon name="person" size={14} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {resource.uploadedBy.firstName} {resource.uploadedBy.lastName}
              </Text>
              {resource.uploadedBy.verificationStatus === 'verified' && (
                <Icon name="verified" size={14} color={colors.primary} />
              )}
            </View>

            <View style={styles.metadataRow}>
              <Icon name="folder" size={14} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {resource.category.name}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Icon name="storage" size={14} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {formatFileSize(resource.size)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Icon name="access-time" size={14} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {formatDate(resource.createdAt)}
              </Text>
            </View>
          </View>

          {renderRating()}

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Icon name="download" size={14} color={colors.text.secondary} />
              <Text style={[styles.statText, { color: colors.text.secondary }]}>
                {resource.downloadCount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
          >
            <Icon
              name={isDownloaded ? "offline-pin" : "download"}
              size={16}
              color={colors.background.primary}
            />
          </TouchableOpacity>

          {onRate && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={onRate}
            >
              <Icon name="star" size={16} color={colors.background.primary} />
            </TouchableOpacity>
          )}

          {onShare && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={onShare}
            >
              <Icon name="share" size={16} color={colors.background.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  metadata: {
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metadataText: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});