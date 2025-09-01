import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Loading, Card } from '../../../components/ui';
import PostCard from '../../../components/posts/PostCard';
import { useInfinitePosts, usePostCategories } from '../../../services/api/hooks/usePosts';
import { Post, PostFilters, PostSortBy } from '../../../types/posts';
import type { PostsStackScreenProps } from '../../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = PostsStackScreenProps<'PostsFeed'>;

interface FilterOption {
  label: string;
  value: PostSortBy;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'Latest', value: PostSortBy.CREATED_AT, icon: 'time-outline' },
  { label: 'Popular', value: PostSortBy.LIKES, icon: 'heart-outline' },
  { label: 'Most Discussed', value: PostSortBy.COMMENTS, icon: 'chatbubble-outline' },
];

export const PostsFeedScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<PostSortBy>(PostSortBy.CREATED_AT);
  const [showFilters, setShowFilters] = useState(false);

  // Prepare filters
  const filters: PostFilters = useMemo(() => ({
    sortBy: selectedFilter,
    sortOrder: selectedFilter === PostSortBy.CREATED_AT ? 'desc' : 'desc',
  }), [selectedFilter]);

  // Fetch posts with infinite scrolling
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfinitePosts(filters, {
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Flatten posts from all pages
  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Navigation handlers
  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost');
  }, [navigation]);

  const handlePostPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation]);

  const handleAuthorPress = useCallback((userId: string) => {
    // Navigate to user profile (will be implemented in profile feature)
    console.log('Navigate to user profile:', userId);
  }, []);

  const handleCategoryPress = useCallback((categoryId: string) => {
    // Filter by category
    console.log('Filter by category:', categoryId);
  }, []);

  const handleCommentPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation]);

  // Filter handlers
  const handleFilterPress = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleFilterSelect = useCallback((filter: PostSortBy) => {
    setSelectedFilter(filter);
    setShowFilters(false);
  }, []);

  // List handlers
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render functions
  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={handlePostPress}
      onAuthorPress={handleAuthorPress}
      onCategoryPress={handleCategoryPress}
      onCommentPress={handleCommentPress}
      testID={`post-card-${item.id}`}
    />
  ), [handlePostPress, handleAuthorPress, handleCategoryPress, handleCommentPress]);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Posts
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleFilterPress}
            accessibilityRole="button"
            accessibilityLabel="Filter posts"
          >
            <Icon name="filter-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Button
            title="Create Post"
            onPress={handleCreatePost}
            size="small"
            style={styles.createButton}
            testID="create-post-button"
          />
        </View>
      </View>

      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface }]}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterOption,
                selectedFilter === option.value && {
                  backgroundColor: theme.colors.primary + '20',
                },
              ]}
              onPress={() => handleFilterSelect(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected: selectedFilter === option.value }}
            >
              <Icon
                name={option.icon}
                size={16}
                color={
                  selectedFilter === option.value
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.filterOptionText,
                  {
                    color:
                      selectedFilter === option.value
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  ), [
    theme,
    showFilters,
    selectedFilter,
    handleFilterPress,
    handleCreatePost,
    handleFilterSelect,
  ]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footer}>
        <Loading size="small" />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="document-text-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No posts yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Be the first to share something with the community!
      </Text>
      <Button
        title="Create First Post"
        onPress={handleCreatePost}
        style={styles.emptyButton}
      />
    </View>
  ), [theme, handleCreatePost]);

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
      <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
        {error?.message || 'Failed to load posts'}
      </Text>
      <Button
        title="Try Again"
        onPress={handleRefresh}
        style={styles.errorButton}
      />
    </View>
  ), [theme, error, handleRefresh]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        estimatedItemSize={300}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        testID="posts-feed-list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createButton: {
    paddingHorizontal: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    paddingHorizontal: 24,
  },
});