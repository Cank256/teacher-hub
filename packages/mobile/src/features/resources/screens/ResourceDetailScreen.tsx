import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import { YouTubePlayer } from '@/components/resources/YouTubePlayer/YouTubePlayer';
import { UploadProgress } from '@/components/resources/UploadProgress/UploadProgress';
import {
  useResource,
  useDownloadResource,
  useRateResource,
} from '@/services/api/hooks/useResources';
import { OfflineResourceService } from '@/services/storage/offlineResourceService';
import { formatFileSize, formatDate } from '@/utils';
import type { ResourcesStackScreenProps } from '@/navigation/types';
import type { ResourceType, DownloadProgress } from '@/types/resources';

type Props = ResourcesStackScreenProps<'ResourceDetail'>;

export const ResourceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { resourceId } = route.params;
  const { colors, spacing } = useTheme();
  
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    resourceId,
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [userRating, setUserRating] = useState(0);

  const { data: resource, isLoading, isError, error, refetch } = useResource(resourceId);
  const downloadMutation = useDownloadResource();
  const rateMutation = useRateResource();

  // Check if resource is downloaded
  React.useEffect(() => {
    const checkDownloadStatus = async () => {
      if (resource) {
        const downloaded = await OfflineResourceService.isResourceDownloaded(resource.id);
        setIsDownloaded(downloaded);
      }
    };
    checkDownloadStatus();
  }, [resource]);

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

  const handleDownload = async () => {
    if (!resource) return;

    if (isDownloaded) {
      Alert.alert(
        'Resource Downloaded',
        'This resource is already available offline.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowDownloadProgress(true);
    
    try {
      await downloadMutation.mutateAsync({
        id: resource.id,
        onProgress: (progress) => {
          setDownloadProgress({
            resourceId: resource.id,
            loaded: progress.loaded,
            total: progress.total,
            percentage: progress.percentage,
          });
        },
      });
      
      setIsDownloaded(true);
      setShowDownloadProgress(false);
      Alert.alert('Success', 'Resource downloaded successfully');
    } catch (error) {
      setShowDownloadProgress(false);
      Alert.alert('Error', 'Failed to download resource');
    }
  };

  const handleOpenFile = async () => {
    if (!resource) return;

    try {
      if (isDownloaded) {
        const localPath = await OfflineResourceService.getLocalPath(resource.id);
        if (localPath) {
          // Open local file
          await Linking.openURL(`file://${localPath}`);
        }
      } else {
        // Open remote file
        await Linking.openURL(resource.fileUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open file');
    }
  };

  const handleRate = (rating: number) => {
    if (!resource) return;

    setUserRating(rating);
    rateMutation.mutate({
      id: resource.id,
      rating,
    });
  };

  const handleShare = async () => {
    if (!resource) return;

    try {
      await Share.share({
        message: `Check out this resource: ${resource.title}\n\n${resource.description}`,
        url: resource.fileUrl,
        title: resource.title,
      });
    } catch (error) {
      console.error('Error sharing resource:', error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report Resource',
      'Why are you reporting this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => reportResource('inappropriate') },
        { text: 'Copyright Violation', onPress: () => reportResource('copyright') },
        { text: 'Spam', onPress: () => reportResource('spam') },
        { text: 'Other', onPress: () => reportResource('other') },
      ]
    );
  };

  const reportResource = (reason: string) => {
    // TODO: Implement report functionality
    Alert.alert('Thank you', 'Your report has been submitted for review.');
  };

  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRate(i)}
          style={styles.starButton}
        >
          <Icon
            name={i <= (userRating || resource?.rating || 0) ? 'star' : 'star-border'}
            size={24}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.ratingStars}>{stars}</View>;
  };

  const renderMediaPreview = () => {
    if (!resource) return null;

    if (resource.type === 'youtube_video' && resource.youtubeId) {
      return (
        <YouTubePlayer
          videoId={resource.youtubeId}
          title={resource.title}
          style={styles.mediaPreview}
        />
      );
    }

    if (resource.type === 'image' && resource.thumbnailUrl) {
      return (
        <FastImage
          source={{ uri: resource.thumbnailUrl }}
          style={styles.imagePreview}
          resizeMode={FastImage.resizeMode.cover}
        />
      );
    }

    return (
      <View style={[styles.mediaPlaceholder, { backgroundColor: colors.background.secondary }]}>
        <Icon
          name={getResourceIcon(resource.type)}
          size={64}
          color={colors.text.secondary}
        />
        <Text style={[styles.mediaPlaceholderText, { color: colors.text.secondary }]}>
          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} File
        </Text>
      </View>
    );
  };

  const renderTags = () => {
    if (!resource?.tags || resource.tags.length === 0) return null;

    return (
      <View style={styles.tagsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Tags
        </Text>
        <View style={styles.tags}>
          {resource.tags.map((tag, index) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: colors.primary, opacity: 0.1 }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background.primary }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (isError || !resource) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <ErrorState
          title="Failed to load resource"
          message={error?.message || 'Resource not found'}
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderMediaPreview()}

        <View style={styles.details}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {resource.title}
            </Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
                <Icon name="share" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleReport} style={styles.headerAction}>
                <Icon name="flag" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Icon name="person" size={16} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {resource.uploadedBy.firstName} {resource.uploadedBy.lastName}
              </Text>
              {resource.uploadedBy.verificationStatus === 'verified' && (
                <Icon name="verified" size={16} color={colors.primary} />
              )}
            </View>

            <View style={styles.metadataRow}>
              <Icon name="folder" size={16} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {resource.category.name}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Icon name="storage" size={16} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {formatFileSize(resource.size)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Icon name="access-time" size={16} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {formatDate(resource.createdAt)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Icon name="download" size={16} color={colors.text.secondary} />
              <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
                {resource.downloadCount} downloads
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.text.primary }]}>
            {resource.description}
          </Text>

          {renderTags()}

          <View style={styles.ratingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Rate this resource
            </Text>
            {renderRatingStars()}
            <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
              Average rating: {resource.rating.toFixed(1)} stars
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: colors.background.primary, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleDownload}
          disabled={downloadMutation.isPending}
        >
          <Icon
            name={isDownloaded ? 'offline-pin' : 'download'}
            size={20}
            color={colors.background.primary}
          />
          <Text style={[styles.actionButtonText, { color: colors.background.primary }]}>
            {isDownloaded ? 'Downloaded' : 'Download'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={handleOpenFile}
        >
          <Icon name="open-in-new" size={20} color={colors.background.primary} />
          <Text style={[styles.actionButtonText, { color: colors.background.primary }]}>
            Open
          </Text>
        </TouchableOpacity>
      </View>

      <UploadProgress
        visible={showDownloadProgress}
        progress={downloadProgress}
        fileName={resource.title}
        status="uploading"
        canCancel={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  mediaPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  mediaPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  details: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    padding: 8,
  },
  metadata: {
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});