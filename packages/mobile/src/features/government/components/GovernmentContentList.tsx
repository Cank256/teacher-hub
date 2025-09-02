/**
 * Government Content List Component
 * Displays a list of government content with infinite scroll and search
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GovernmentContentListProps } from '../types';
import { GovernmentContentCard } from './GovernmentContentCard';
import { GovernmentContentSearch } from './GovernmentContentSearch';
import { GovernmentContentFilters } from './GovernmentContentFilters';
import { useInfiniteGovernmentContent } from '../../../services/api/hooks/useGovernmentContent';
import { GovernmentContent } from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentContentList: React.FC<GovernmentContentListProps> = ({
  filters,
  onContentPress,
  onFilterChange,
  showFilters = true,
  showSearch = true,
  limit = 20,
  emptyStateMessage = 'No government content available',
  refreshing = false,
  onRefresh,
}) => {
  const { colors, typography } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(filters || {});
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteGovernmentContent(
    { ...activeFilters, searchQuery: searchQuery || undefined },
    limit
  );

  const allContent = data?.pages.flatMap(page => page.data) || [];

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFiltersChange = useCallback((newFilters: typeof activeFilters) => {
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [onFilterChange]);

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

  const renderItem = useCallback(({ item }: { item: GovernmentContent }) => (
    <GovernmentContentCard
      content={item}
      onPress={onContentPress}
      showActions={true}
    />
  ), [onContentPress]);

  const renderHeader = () => (
    <View style={styles.header}>
      {showSearch && (
        <GovernmentContentSearch
          onSearch={handleSearch}
          initialQuery={searchQuery}
          placeholder="Search government content..."
          showFilters={showFilters}
          onToggleFilters={() => setShowFiltersPanel(!showFiltersPanel)}
        />
      )}
      {showFilters && showFiltersPanel && (
        <GovernmentContentFilters
          filters={activeFilters}
          onFiltersChange={handleFiltersChange}
          onReset={() => handleFiltersChange({})}
        />
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>
          Loading more content...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: colors.text.tertiary }]}>
        📄
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No Content Found
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
        Failed to Load Content
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
          Loading government content...
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
        data={allContent}
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
    paddingBottom: 8,
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