import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import {PanGestureHandler, TapGestureHandler, State} from 'react-native-gesture-handler';
import {useDispatch} from 'react-redux';

import {Post} from '../../store/slices/postsSlice';
import {likePost, unlikePost} from '../../store/slices/postsSlice';
import {usePostGestures, useDoubleTapGesture} from '../../hooks/usePostGestures';
import {theme} from '../../styles/theme';
import {AppDispatch} from '../../store';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  onAuthorPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enableGestures?: boolean;
}

const {width: screenWidth} = Dimensions.get('window');
const cardWidth = screenWidth - (theme.spacing.lg * 2);

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPress,
  onCommentPress,
  onSharePress,
  onAuthorPress,
  onSwipeLeft,
  onSwipeRight,
  enableGestures = true,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [imageError, setImageError] = useState(false);
  
  const likeScale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  // Gesture handlers
  const {gestureHandler: swipeGestureHandler, animatedStyle: swipeAnimatedStyle} = usePostGestures({
    onSwipeLeft,
    onSwipeRight,
  });

  const {doubleTapHandler, animatedStyle: doubleTapAnimatedStyle} = useDoubleTapGesture(() => {
    handleLikePress();
  });

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: likeScale.value}],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: heartScale.value}],
  }));

  const combinedAnimatedStyle = useAnimatedStyle(() => ({
    ...swipeAnimatedStyle,
    ...doubleTapAnimatedStyle,
  }));

  const handleLikePress = async () => {
    try {
      // Animate the like button
      likeScale.value = withSequence(
        withSpring(0.8, {damping: 15, stiffness: 300}),
        withSpring(1, {damping: 15, stiffness: 300})
      );

      if (post.isLiked) {
        // Animate heart disappearing
        heartScale.value = withSequence(
          withSpring(1.2, {damping: 15, stiffness: 300}),
          withSpring(0, {damping: 15, stiffness: 300})
        );
        await dispatch(unlikePost(post.id)).unwrap();
      } else {
        // Animate heart appearing
        heartScale.value = withSequence(
          withSpring(0, {damping: 15, stiffness: 300}),
          withSpring(1.2, {damping: 15, stiffness: 300}),
          withSpring(1, {damping: 15, stiffness: 300})
        );
        await dispatch(likePost(post.id)).unwrap();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderMediaAttachments = () => {
    if (post.mediaAttachments.length === 0) return null;

    return (
      <View style={styles.mediaContainer}>
        {post.mediaAttachments.slice(0, 3).map((media, index) => (
          <View key={media.id} style={styles.mediaItem}>
            {media.type === 'image' && (
              <Image
                source={{uri: media.url}}
                style={styles.mediaImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
            {media.type === 'video' && (
              <View style={styles.videoContainer}>
                <Image
                  source={{uri: media.thumbnailUrl || media.url}}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                <View style={styles.playButton}>
                  <Icon name="play-arrow" size={24} color={theme.colors.surface} />
                </View>
              </View>
            )}
            {index === 2 && post.mediaAttachments.length > 3 && (
              <View style={styles.moreMediaOverlay}>
                <Text style={styles.moreMediaText}>
                  +{post.mediaAttachments.length - 3}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderTags = () => {
    if (post.tags.length === 0) return null;

    return (
      <View style={styles.tagsContainer}>
        {post.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
        {post.tags.length > 3 && (
          <Text style={styles.moreTagsText}>+{post.tags.length - 3} more</Text>
        )}
      </View>
    );
  };

  const CardContent = () => (
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={onAuthorPress}
          activeOpacity={0.7}>
          <View style={styles.avatar}>
            {post.authorAvatar ? (
              <Image
                source={{uri: post.authorAvatar}}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Icon name="person" size={20} color={theme.colors.textSecondary} />
            )}
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
              {post.communityName && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={styles.communityName}>{post.communityName}</Text>
                </>
              )}
              {post.visibility !== 'public' && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Icon 
                    name={post.visibility === 'community' ? 'group' : 'people'} 
                    size={12} 
                    color={theme.colors.textSecondary} 
                  />
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {post.isPinned && (
          <Icon name="push-pin" size={16} color={theme.colors.primary} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.contentText} numberOfLines={4}>
          {post.content}
        </Text>
        
        {renderTags()}
        {renderMediaAttachments()}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Animated.View style={likeAnimatedStyle}>
          <TouchableOpacity
            style={[styles.actionButton, post.isLiked && styles.likedButton]}
            onPress={handleLikePress}
            activeOpacity={0.7}>
            <View style={styles.actionIconContainer}>
              <Icon
                name={post.isLiked ? 'favorite' : 'favorite-border'}
                size={20}
                color={post.isLiked ? theme.colors.error : theme.colors.textSecondary}
              />
              {post.isLiked && (
                <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]}>
                  <Icon name="favorite" size={20} color={theme.colors.error} />
                </Animated.View>
              )}
            </View>
            <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
              {post.likeCount}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onCommentPress}
          activeOpacity={0.7}>
          <Icon name="chat-bubble-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSharePress}
          activeOpacity={0.7}>
          <Icon name="share" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (enableGestures) {
    return (
      <PanGestureHandler onGestureEvent={swipeGestureHandler}>
        <Animated.View style={combinedAnimatedStyle}>
          <TapGestureHandler
            numberOfTaps={2}
            onHandlerStateChange={({nativeEvent}) => {
              if (nativeEvent.state === State.ACTIVE) {
                doubleTapHandler();
              }
            }}>
            <Animated.View>
              <TouchableOpacity
                style={styles.container}
                onPress={onPress}
                activeOpacity={0.95}>
                <CardContent />
              </TouchableOpacity>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}>
      <CardContent />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  metaSeparator: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.xs,
  },
  communityName: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  contentText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    alignSelf: 'center',
    marginLeft: theme.spacing.xs,
  },
  mediaContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  mediaItem: {
    flex: 1,
    marginRight: theme.spacing.xs,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
  },
  videoContainer: {
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -12}, {translateY: -12}],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMediaText: {
    color: theme.colors.surface,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  likedButton: {
    backgroundColor: theme.colors.borderLight,
  },
  actionIconContainer: {
    position: 'relative',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  actionText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  likedText: {
    color: theme.colors.error,
  },
});