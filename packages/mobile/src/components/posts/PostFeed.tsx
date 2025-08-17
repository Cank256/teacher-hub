import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {PostCard} from './PostCard';
import {PostCreator} from './PostCreator';
import {fetchFeedPosts, resetFeed, Post} from '../../store/slices/postsSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface PostFeedProps {
  communityId?: string;
  userId?: string;
  showCreateButton?: boolean;
  onPostPress?: (post: Post) => void;
  onCommentPress?: (post: Post) => void;
  onSharePress?: (post: Post) => void;
  onAuthorPress?: (authorId: string) => void;
}

const {height: screenHeight} = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export const PostFeed: React.FC<PostFeedProps> = ({
  communityId,
  userId,
  showCreateButton = true,
  onPostPress,
  onCommentPress,
  onSharePress,
  onAuthorPress,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {posts, isLoading, refreshing, hasMorePosts, feedPage} = useSelector(
    (state: RootState) => state.posts
  );
  
  const [showCreatePost, setShowCreatePost] = useState(false);
  const scrollY = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    loadInitialPosts();
  }, [communityId, userId]);

  const loadInitialPosts = useCallback(() => {
    dispatch(resetFeed());
    dispatch(fetchFeedPosts({page: 1, refresh: true}));
  }, [dispatch, communityId, userId]);

  const loadMorePosts = useCallback(() => {
    if (!isLoading && hasMorePosts) {
      dispatch(fetchFeedPosts({page: feedPage + 1}));
    }
  }, [dispatch, isLoading, hasMorePosts, feedPage]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchFeedPosts({page: 1, refresh: true}));
  }, [dispatch]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Hide FAB when scrolling down, show when scrolling up
      const velocity = event.velocity?.y || 0;
      if (velocity > 0) {
        // Scrolling down
        fabScale.value = 0;
      } else if (velocity < -50) {
        // Scrolling up with some velocity
        fabScale.value = 1;
      }
    },
  });

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          fabScale.value,
          [0, 1],
          [0, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      fabScale.value,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const renderPost = useCallback(({item}: {item: Post}) => (
    <PostCard
      post={item}
      onPress={() => onPostPress?.(item)}
      onCommentPress={() => onCommentPress?.(item)}
      onSharePress={() => onSharePress?.(item)}
      onAuthorPress={() => onAuthorPress?.(item.authorId)}
    />
  ), [onPostPress, onCommentPress, onSharePress, onAuthorPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="post-add" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyStateTitle}>No posts yet</Text>
      <Text style={styles.emptyStateText}>
        {communityId 
          ? 'Be the first to share something in this community!'
          : 'Start following people or join communities to see posts here.'
        }
      </Text>
      {showCreateButton && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => setShowCreatePost(true)}
          activeOpacity={0.7}>
          <Text style={styles.emptyStateButtonText}>Create Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || posts.length === 0) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  };

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate height of a post card
    offset: 200 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          posts.length === 0 && styles.emptyContentContainer,
        ]}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
      />

      {/* Floating Action Button */}
      {showCreateButton && (
        <Animated.View style={[styles.fab, fabAnimatedStyle]}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => setShowCreatePost(true)}
            activeOpacity={0.8}>
            <Icon name="add" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <View style={styles.modalContainer}>
          <PostCreator
            onClose={() => setShowCreatePost(false)}
            onPostCreated={() => {
              setShowCreatePost(false);
              handleRefresh();
            }}
            communityId={communityId}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: 100, // Space for FAB
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyStateButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    zIndex: 1000,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 2000,
  },
});