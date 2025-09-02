/**
 * Government Notifications List Component
 * Displays a list of government notifications with infinite scroll
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { GovernmentNotificationsListProps } from '../types';
import { GovernmentNotificationCard } from './GovernmentNotificationCard';
import {
  useInfiniteGovernmentNotifications,
  useMarkNotificationAsRead,
  useMarkNotificationsAsRead,
} from '../../../services/api/hooks/useGovernmentContent';
import { GovernmentNotification } from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentNotificationsList: React.FC<GovernmentNotificationsListProps> = ({
  unreadOnly = false,
  onNotificationPress,
  onMarkAsRead,
  onMarkAllAsRead,
  limit = 20,
  emptyStateMessage = 'No notifications available',
  refreshing = false,
  onRefresh,
}) => {
  const { colors, typography } = useTheme();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteGovernmentNotifications(limit, unreadOnly);

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkNotificationsAsRead();

  const allNotifications = data?.pages.flatMap(page => page.data) || [];
  const unreadNotifications = allNotifications.filter(n => !n.readAt);

  const handleNotificationPress = useCallback((notification: GovernmentNotification) => {
    onNotificationPress?.(notification);
  }, [onNotificationPress]);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
    onMarkAsRead?.(notificationId);
  }, [markAsReadMutation, onMarkAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadNotifications.length > 0) {
      const unreadIds = unreadNotifications.map(n => n.id);
      markAllAsReadMutation.mutate(unreadIds);
      onMarkAllAsRead?.();
    }
  }, [unreadNotifications, markAllAsReadMutation, onMarkAllAsRead]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      refetch();
    }
  }, [onRefresh, refetch]);

  const renderItem = useCallback(({ item }: { item: GovernmentNotification }) => (
    <GovernmentNotificationCard
      notification={item}
      onPress={handleNotificationPress}
      onMarkAsRead={handleMarkAsRead}
      showActions={true}
    />
  ), [handleNotificationPress, handleMarkAsRead]);

  const renderHeader = () => {
    if (unreadNotifications.length === 0) return null;

    return (
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.text.secondary }]}>
          {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Loading more notifications...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: colors.text.tertiary }]}>
        🔔
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No Notifications
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
        {emptyStateMessage}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={[styles.errorIcon, { color: colors.error }]}>
        ⚠️
      </Text>
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
        Failed to Load Notifications
      </Text>
      <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
        {error?.message || 'Something went wrong. Please try again.'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (isError) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 14,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
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
  },
});