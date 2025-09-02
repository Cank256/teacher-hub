/**
 * Government Content Card Component
 * Displays government content in a card format with verification badges
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { GovernmentContentCardProps } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { ContentPriority, GovernmentContentType } from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentContentCard: React.FC<GovernmentContentCardProps> = ({
  content,
  onPress,
  onBookmark,
  onShare,
  onDownload,
  showActions = true,
  compact = false,
}) => {
  const { colors, typography, spacing } = useTheme();

  const getPriorityColor = () => {
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

  const getTypeIcon = () => {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePress = () => {
    onPress?.(content);
  };

  const handleBookmark = () => {
    onBookmark?.(content.id);
  };

  const handleShare = () => {
    onShare?.(content.id);
  };

  const handleDownload = () => {
    if (content.attachments.length === 0) {
      Alert.alert('No Downloads', 'This content has no downloadable attachments.');
      return;
    }
    onDownload?.(content.id);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        compact && styles.compactContainer,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Priority Indicator */}
      <View
        style={[
          styles.priorityIndicator,
          { backgroundColor: getPriorityColor() },
        ]}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
            <VerificationBadge
              badge={content.verificationBadge}
              size="small"
              showText={!compact}
            />
          </View>
          {content.priority === ContentPriority.CRITICAL && (
            <View style={[styles.urgentBadge, { backgroundColor: colors.error }]}>
              <Text style={[styles.urgentText, { color: colors.white }]}>
                URGENT
              </Text>
            </View>
          )}
        </View>

        {/* Title and Description */}
        <Text
          style={[
            styles.title,
            { color: colors.text.primary },
            compact && styles.compactTitle,
          ]}
          numberOfLines={compact ? 2 : 3}
        >
          {content.title}
        </Text>

        {!compact && (
          <Text
            style={[styles.description, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {content.description}
          </Text>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={[styles.metadataText, { color: colors.text.tertiary }]}>
            {formatDate(content.publishedAt)}
          </Text>
          {content.subjects.length > 0 && (
            <>
              <Text style={[styles.separator, { color: colors.text.tertiary }]}>
                •
              </Text>
              <Text style={[styles.metadataText, { color: colors.text.tertiary }]}>
                {content.subjects.slice(0, 2).join(', ')}
                {content.subjects.length > 2 && ` +${content.subjects.length - 2}`}
              </Text>
            </>
          )}
          {content.attachments.length > 0 && (
            <>
              <Text style={[styles.separator, { color: colors.text.tertiary }]}>
                •
              </Text>
              <Text style={[styles.metadataText, { color: colors.text.tertiary }]}>
                📎 {content.attachments.length}
              </Text>
            </>
          )}
        </View>

        {/* Tags */}
        {!compact && content.tags.length > 0 && (
          <View style={styles.tags}>
            {content.tags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: colors.neutral.light }]}
              >
                <Text style={[styles.tagText, { color: colors.text.secondary }]}>
                  {tag}
                </Text>
              </View>
            ))}
            {content.tags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: colors.text.tertiary }]}>
                +{content.tags.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        {showActions && !compact && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleBookmark}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>
                🔖 Bookmark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>
                📤 Share
              </Text>
            </TouchableOpacity>
            {content.attachments.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownload}
              >
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  📥 Download
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    marginVertical: 4,
  },
  priorityIndicator: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    fontSize: 16,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
  },
  moreTagsText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});