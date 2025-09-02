/**
 * Government Content Detail Component
 * Displays detailed view of government content with actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { GovernmentContentDetailProps } from '../types';
import { VerificationBadge } from './VerificationBadge';
import {
  useGovernmentContentDetail,
  useBookmarkContent,
  useRemoveBookmark,
  useShareContent,
  useDownloadContentForOffline,
  useReportContentIssue,
} from '../../../services/api/hooks/useGovernmentContent';
import { ContentPriority, GovernmentContentType } from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentContentDetail: React.FC<GovernmentContentDetailProps> = ({
  contentId,
  onBack,
  onShare,
  onBookmark,
  onDownload,
  onReport,
}) => {
  const { colors, typography } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const {
    data: content,
    isLoading,
    isError,
    error,
  } = useGovernmentContentDetail(contentId);

  const bookmarkMutation = useBookmarkContent();
  const removeBookmarkMutation = useRemoveBookmark();
  const shareMutation = useShareContent();
  const downloadMutation = useDownloadContentForOffline();
  const reportMutation = useReportContentIssue();

  const getTypeIcon = () => {
    if (!content) return '📄';
    
    switch (content.type) {
      case GovernmentContentType.CURRICULUM_UPDATE:
        return '📚';
      case GovernmentContentType.POLICY_DOCUMENT:
        return '📋';
      case GovernmentContentType.TEACHING_GUIDE:
        return '📖';
      case GovernmentContentType.ASSESSMENT_GUIDELINE:
        return '📝';
      case GovernmentContentType.ANNOUNCEMENT:
        return '📢';
      case GovernmentContentType.TRAINING_MATERIAL:
        return '🎓';
      case GovernmentContentType.REGULATION:
        return '⚖️';
      case GovernmentContentType.CIRCULAR:
        return '🔄';
      default:
        return '📄';
    }
  };

  const getPriorityColor = () => {
    if (!content) return colors.neutral.medium;
    
    switch (content.priority) {
      case ContentPriority.CRITICAL:
        return colors.error;
      case ContentPriority.HIGH:
        return colors.warning;
      case ContentPriority.MEDIUM:
        return colors.info;
      default:
        return colors.neutral.medium;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      removeBookmarkMutation.mutate(contentId, {
        onSuccess: () => {
          setIsBookmarked(false);
          onBookmark?.(contentId);
        },
      });
    } else {
      bookmarkMutation.mutate(contentId, {
        onSuccess: () => {
          setIsBookmarked(true);
          onBookmark?.(contentId);
        },
      });
    }
  };

  const handleShare = () => {
    Alert.alert(
      'Share Content',
      'How would you like to share this content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy Link',
          onPress: () => {
            shareMutation.mutate({
              contentId,
              shareMethod: 'copy',
            });
            onShare?.(contentId);
          },
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            shareMutation.mutate({
              contentId,
              shareMethod: 'whatsapp',
            });
            onShare?.(contentId);
          },
        },
        {
          text: 'Email',
          onPress: () => {
            shareMutation.mutate({
              contentId,
              shareMethod: 'email',
            });
            onShare?.(contentId);
          },
        },
      ]
    );
  };

  const handleDownload = () => {
    if (!content || content.attachments.length === 0) {
      Alert.alert('No Downloads', 'This content has no downloadable attachments.');
      return;
    }

    downloadMutation.mutate(contentId, {
      onSuccess: () => {
        Alert.alert('Download Started', 'Content is being downloaded for offline access.');
        onDownload?.(contentId);
      },
      onError: (error) => {
        Alert.alert('Download Failed', error.message || 'Failed to download content.');
      },
    });
  };

  const handleAttachmentPress = (attachment: any) => {
    if (attachment.isOfflineAvailable && attachment.localPath) {
      // Open local file
      Alert.alert('Opening File', 'Opening offline file...');
    } else {
      // Open remote file
      Linking.openURL(attachment.downloadUrl).catch(() => {
        Alert.alert('Error', 'Unable to open file.');
      });
    }
  };

  const handleReport = () => {
    Alert.prompt(
      'Report Issue',
      'Please describe the issue with this content:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: (description) => {
            if (description && description.trim()) {
              reportMutation.mutate({
                contentId,
                issueType: 'content_issue',
                description: description.trim(),
              }, {
                onSuccess: () => {
                  Alert.alert('Report Submitted', 'Thank you for your feedback.');
                  onReport?.(contentId, 'content_issue', description.trim());
                },
              });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading content...
        </Text>
      </View>
    );
  }

  if (isError || !content) {
    return (
      <View style={styles.errorState}>
        <Text style={[styles.errorIcon, { color: colors.error }]}>
          ⚠️
        </Text>
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
          Failed to Load Content
        </Text>
        <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
          {error?.message || 'Content not found or unavailable.'}
        </Text>
        {onBack && (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={onBack}
          >
            <Text style={[styles.backButtonText, { color: colors.white }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Government Content
        </Text>
        <TouchableOpacity onPress={handleReport}>
          <Text style={[styles.reportIcon, { color: colors.text.tertiary }]}>
            ⚠️
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Priority Banner */}
        {content.priority === ContentPriority.CRITICAL && (
          <View style={[styles.priorityBanner, { backgroundColor: colors.error }]}>
            <Text style={[styles.priorityText, { color: colors.white }]}>
              🚨 CRITICAL: Immediate attention required
            </Text>
          </View>
        )}

        {/* Content Header */}
        <View style={styles.contentHeader}>
          <View style={styles.typeAndBadge}>
            <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
            <VerificationBadge
              badge={content.verificationBadge}
              size="medium"
              showText={true}
            />
          </View>
          
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {content.title}
          </Text>
          
          <Text style={[styles.description, { color: colors.text.secondary }]}>
            {content.description}
          </Text>
        </View>

        {/* Metadata */}
        <View style={[styles.metadata, { backgroundColor: colors.surface }]}>
          <View style={styles.metadataRow}>
            <Text style={[styles.metadataLabel, { color: colors.text.tertiary }]}>
              Published:
            </Text>
            <Text style={[styles.metadataValue, { color: colors.text.secondary }]}>
              {formatDate(content.publishedAt)}
            </Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={[styles.metadataLabel, { color: colors.text.tertiary }]}>
              Source:
            </Text>
            <Text style={[styles.metadataValue, { color: colors.text.secondary }]}>
              {content.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={[styles.metadataLabel, { color: colors.text.tertiary }]}>
              Category:
            </Text>
            <Text style={[styles.metadataValue, { color: colors.text.secondary }]}>
              {content.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
          
          {content.subjects.length > 0 && (
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: colors.text.tertiary }]}>
                Subjects:
              </Text>
              <Text style={[styles.metadataValue, { color: colors.text.secondary }]}>
                {content.subjects.join(', ')}
              </Text>
            </View>
          )}
          
          {content.gradeLevels.length > 0 && (
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: colors.text.tertiary }]}>
                Grade Levels:
              </Text>
              <Text style={[styles.metadataValue, { color: colors.text.secondary }]}>
                {content.gradeLevels.join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentBody}>
          <Text style={[styles.contentText, { color: colors.text.primary }]}>
            {content.content}
          </Text>
        </View>

        {/* Tags */}
        {content.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.tagsTitle, { color: colors.text.primary }]}>
              Tags
            </Text>
            <View style={styles.tags}>
              {content.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: colors.neutral.light }]}
                >
                  <Text style={[styles.tagText, { color: colors.text.secondary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Attachments */}
        {content.attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={[styles.attachmentsTitle, { color: colors.text.primary }]}>
              Attachments
            </Text>
            {content.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.attachment, { backgroundColor: colors.surface }]}
                onPress={() => handleAttachmentPress(attachment)}
              >
                <View style={styles.attachmentInfo}>
                  <Text style={[styles.attachmentName, { color: colors.text.primary }]}>
                    📎 {attachment.filename}
                  </Text>
                  <Text style={[styles.attachmentSize, { color: colors.text.secondary }]}>
                    {formatFileSize(attachment.fileSize)}
                    {attachment.isOfflineAvailable && ' • Available offline'}
                  </Text>
                </View>
                <Text style={[styles.attachmentIcon, { color: colors.primary }]}>
                  →
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.neutral.light }]}
          onPress={handleBookmark}
          disabled={bookmarkMutation.isPending || removeBookmarkMutation.isPending}
        >
          <Text style={[styles.actionText, { color: colors.text.primary }]}>
            {isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.neutral.light }]}
          onPress={handleShare}
          disabled={shareMutation.isPending}
        >
          <Text style={[styles.actionText, { color: colors.text.primary }]}>
            📤 Share
          </Text>
        </TouchableOpacity>

        {content.attachments.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
            disabled={downloadMutation.isPending}
          >
            {downloadMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.actionText, { color: colors.white }]}>
                📥 Download
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reportIcon: {
    fontSize: 16,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  priorityBanner: {
    padding: 12,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentHeader: {
    padding: 16,
  },
  typeAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  metadata: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  metadataValue: {
    fontSize: 14,
    flex: 1,
  },
  contentBody: {
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  tagsSection: {
    padding: 16,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
  attachmentsSection: {
    padding: 16,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
  },
  attachmentIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
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
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});