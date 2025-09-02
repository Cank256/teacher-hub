/**
 * Government Notification Card Component
 * Displays government notifications with priority indicators
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { GovernmentNotificationCardProps } from '../types';
import { NotificationType, ContentPriority } from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentNotificationCard: React.FC<GovernmentNotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  showActions = true,
}) => {
  const { colors, typography } = useTheme();

  const getTypeIcon = () => {
    switch (notification.type) {
      case NotificationType.CURRICULUM_UPDATE:
        return '📚';
      case NotificationType.POLICY_CHANGE:
        return '📋';
      case NotificationType.DEADLINE_REMINDER:
        return '⏰';
      case NotificationType.NEW_RESOURCE:
        return '📄';
      case NotificationType.TRAINING_ANNOUNCEMENT:
        return '🎓';
      case NotificationType.EMERGENCY_ALERT:
        return '🚨';
      default:
        return '📢';
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
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
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return notificationDate.toLocaleDateString('en-UG', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handlePress = () => {
    if (!notification.readAt) {
      onMarkAsRead?.(notification.id);
    }
    onPress?.(notification);
  };

  const handleMarkAsRead = (e: any) => {
    e.stopPropagation();
    onMarkAsRead?.(notification.id);
  };

  const isUnread = !notification.readAt;
  const isExpired = notification.expiresAt && new Date(notification.expiresAt) < new Date();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isUnread ? colors.primary + '10' : colors.surface,
          opacity: isExpired ? 0.6 : 1,
        },
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
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.timestamp, { color: colors.text.tertiary }]}>
              {formatDate(notification.scheduledAt)}
            </Text>
            {notification.priority === ContentPriority.CRITICAL && (
              <View style={[styles.urgentBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.urgentText, { color: colors.white }]}>
                  URGENT
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Title and Message */}
        <Text
          style={[
            styles.title,
            { 
              color: colors.text.primary,
              fontWeight: isUnread ? '600' : '500',
            },
          ]}
          numberOfLines={2}
        >
          {notification.title}
        </Text>

        <Text
          style={[styles.message, { color: colors.text.secondary }]}
          numberOfLines={3}
        >
          {notification.message}
        </Text>

        {/* Action Required */}
        {notification.actionRequired && (
          <View style={styles.actionRequired}>
            <Text style={[styles.actionIcon, { color: colors.warning }]}>
              ⚠️
            </Text>
            <Text style={[styles.actionText, { color: colors.warning }]}>
              Action Required
            </Text>
          </View>
        )}

        {/* Expiration Warning */}
        {notification.expiresAt && !isExpired && (
          <View style={styles.expirationWarning}>
            <Text style={[styles.expirationText, { color: colors.text.tertiary }]}>
              Expires: {new Date(notification.expiresAt).toLocaleDateString('en-UG')}
            </Text>
          </View>
        )}

        {/* Actions */}
        {showActions && isUnread && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleMarkAsRead}
            >
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Mark as Read
              </Text>
            </TouchableOpacity>
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
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    fontSize: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  urgentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expirationWarning: {
    marginBottom: 8,
  },
  expirationText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});