import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { CommunityPostCard } from '@/components/communities/CommunityPostCard/CommunityPostCard';
import {
  useInfiniteCommunityPosts,
  useLikeCommunityPost,
  useUnlikeCommunityPost,
  useCommunity,
} from '@/services/api/hooks/useCommunities';
import type { CommunitiesStackScreenProps } from '@/navigation/types';
import type { CommunityPost, CommunityPostFilters } from '@/types';

type Props = CommunitiesStackScreenProps<'CommunityPosts'>;

export const CommunityPostsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId } = route.params;
  const { colors } = useTheme();
  const [filters, setFilters] = useState<Omit<CommunityPostFilters, 'communityId'>>({
    sortBy: 'created',
    sortOrder: 'desc',
    limit: 20,
  });

  // Queries
  const { data: community } = useCommunity(communityId);
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteCommunityPosts({ ...filters, communityId });

  const likeMutation = useLikeCommunityPost();
  const unlikeMutation = useUnlikeCommunityPost();

  // Flatten posts data
  const posts = data?.pages.flatMap(page => page.data) ?? [];

  const handlePostPress = useCallback((post: CommunityPost) => {
    // Navigate to post detail screen (would need to be implemented)
    Alert.alert('Post Detail', `Navigate to post: ${post.title}`);
  }, []);

  const handleLike = useCallback(async (post: CommunityPost) => {
    try {
      if (post.isLiked) {
        await unlikeMutation.mutateAsync({ communityId, postId: post.id });
      } else {
        await likeMutation.mutateAsync({ communityId, postId: post.id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  }, [communityId, likeMutation, unlikeMutation]);

  const handleComment = useCallback((post: CommunityPost) => {
    // Navigate to comments screen (would need to be implemented)
    Alert.alert('Comments', `View comments for: ${post.title}`);
  }, []);

  const handleShare = useCallback((post: CommunityPost) => {
    // Implement share functionality
    Alert.alert('Share', `Share post: ${post.title}`);
  }, []);

  const handleAuthorPress = useCallback((userId: string) => {
    // Navigate to user profile (would need to be implemented)
    Alert.alert('Profile', `View profile for user: ${userId}`);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreatePost = useCallback(() => {
    // Navigate to create post screen (would need to be implemented)
    Alert.alert('Create Post', 'Navigate to create post screen');
  }, []);

  const renderPostCard = useCallback(({ item }: { item: CommunityPost }) => (
    <CommunityPostCard
      post={item}
      onPress={handlePostPress}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onAuthorPress={handleAuthorPress}
    />
  ), [handlePostPress, handleLike, handleComment, handleShare, handleAuthorPress]);

  const renderHeader = useCallback(() => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.communityName, { color: colors.onSurface }]}>
          {community?.name || 'Community Posts'}
        </Text>
        <Text style={[styles.postCount, { color: colors.onSurfaceVariant }]}>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </Text>
      </View>
      
      {/* Sort Options */}
      <View style={styles.sortContainer}>
        {[
          { key: 'created', label: 'Recent' },
          { key: 'likes', label: 'Popular' },
          { key: 'comments', label: 'Discussed' },
        ].map((sort) => (
          <TouchableOpacity
            key={sort.key}
            style={[
              styles.sortButton,
              {
                backgroundColor: filters.sortBy === sort.key ? colors.primary : colors.surfaceVariant,
              },
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                sortBy: sort.key as any,
                sortOrder: filters.sortBy === sort.key && filters.sortOrder === 'desc' ? 'asc' : 'desc',
              })
            }
          >
            <Text
              style={[
                styles.sortButtonText,
                {
                  color: filters.sortBy === sort.key ? colors.onPrimary : colors.onSurfaceVariant,
                },
              ]}
            >
              {sort.label}
              {filters.sortBy === sort.key && (
                <Text> {filters.sortOrder === 'desc' ? '↓' : '↑'}</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [community, posts.length, filters, colors, setFilters]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
          Loading more posts...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, colors.onSurfaceVariant]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          No Posts Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          Be the first to start a discussion in this community!
        </Text>
        <TouchableOpacity
          style={[styles.createPostButton, { backgroundColor: colors.primary }]}
          onPress={handleCreatePost}
        >
          <Text style={[styles.createPostButtonText, { color: colors.onPrimary }]}>
            Create First Post
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, colors, handleCreatePost]);

  if (isError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>
          Failed to Load Posts
        </Text>
        <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>
          {error?.message || 'Something went wrong. Please try again.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Floating Action Button */}
      {community?.isJoined && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleCreatePost}
        >
          <Text style={[styles.fabIcon, { color: colors.onPrimary }]}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Space for FAB
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerContent: {
    marginBottom: 16,
  },
  communityName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postCount: {
    fontSize: 14,
  },
  sortContainer: {
    flexDirection: 'row',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createPostButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});