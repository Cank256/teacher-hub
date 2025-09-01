/**
 * PostCard Component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Card, Button, ProfilePicture } from '../../ui';
import { useTheme } from '../../../theme/ThemeContext';
import { HapticService } from '../../../services/haptics';
import { useTogglePostLike, useTogglePostBookmark, useSharePost } from '../../../services/api/hooks/usePosts';
import { Post, SharePlatform } from '../../../types/posts';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = screenWidth - (CARD_MARGIN * 2);

export interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
  onAuthorPress?: (userId: string) => void;
  onCategoryPress?: (categoryId: string) => void;
  onCommentPress?: (post: Post) => void;
  showFullContent?: boolean;
  testID?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onPress,
  onAuthorPress,
  onCategoryPress,
  onCommentPress,
  showFullContent = false,
  testID,
}) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [showFullText, setShowFullText] = useState(showFullContent);
  
  // Animations
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  
  // Mutations
  const toggleLikeMutation = useTogglePostLike();
  const toggleBookmarkMutation = useTogglePostBookmark();
  const sharePostMutation = useSharePost();

  const handleLike = async () => {
    try {
      await HapticService.light();
      
      // Animate like button
      likeScale.value = withSpring(1.2, { damping: 10, stiffness: 300 }, () => {
        likeScale.value = withSpring(1);
      });
      
      toggleLikeMutation.mutate(post.id);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      await HapticService.light();
      
      // Animate bookmark button
      bookmarkScale.value = withSpring(1.2, { damping: 10, stiffness: 300 }, () => {
        bookmarkScale.value = withSpring(1);
      });
      
      toggleBookmarkMutation.mutate(post.id);
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleShare = async () => {
    try {
      await HapticService.medium();
      
      const shareOptions = {
        message: `${post.title}\n\n${post.content.substring(0, 100)}...`,
        url: `https://teacherhub.ug/posts/${post.id}`,
        title: post.title,
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        sharePostMutation.mutate({
          postId: post.id,
          shareData: {
            platform: SharePlatform.MORE,
            message: shareOptions.message,
            url: shareOptions.url,
          },
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleAuthorPress = () => {
    onAuthorPress?.(post.author.id);
  };

  const handleCategoryPress = () => {
    onCategoryPress?.(post.category.id);
  };

  const handleCommentPress = () => {
    onCommentPress?.(post);
  };

  const handleCardPress = () => {
    onPress?.(post);
  };

  const handleToggleText = () => {
    setShowFullText(!showFullText);
  };

  const renderMediaAttachment = () => {
    if (!post.mediaAttachments || post.mediaAttachments.length === 0) {
      return null;
    }

    const attachment = post.mediaAttachments[0]; // Show first attachment
    
    if (attachment.type === 'image' && !imageError) {
      return (
        <FastImage
          source={{ uri: attachment.url }}
          style={styles.mediaImage}
          resizeMode={FastImage.resizeMode.cover}
          onError={() => setImageError(true)}
        />
      );
    }

    return null;
  };

  const renderContent = () => {
    const maxLength = 200;
    const shouldTruncate = post.content.length > maxLength && !showFullText;
    const displayContent = shouldTruncate 
      ? post.content.substring(0, maxLength) + '...'
      : post.content;

    return (
      <View style={styles.contentContainer}>
        <Text style={[styles.content, { color: theme.colors.text }]}>
          {displayContent}
        </Text>
        {post.content.length > maxLength && (
          <TouchableOpacity onPress={handleToggleText} style={styles.readMoreButton}>
            <Text style={[styles.readMoreText, { color: theme.colors.primary }]}>
              {showFullText ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.card }]}
      pressable={!!onPress}
      onPress={handleCardPress}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.authorInfo}
          onPress={handleAuthorPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.author.firstName} ${post.author.lastName}'s profile`}
        >
          <ProfilePicture
            uri={post.author.profilePicture}
            size={40}
            name={`${post.author.firstName} ${post.author.lastName}`}
          />
          <View style={styles.authorDetails}>
            <Text style={[styles.authorName, { color: theme.colors.text }]}>
              {post.author.firstName} {post.author.lastName}
            </Text>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryBadge, { backgroundColor: post.category.color + '20' }]}
          onPress={handleCategoryPress}
          accessibilityRole="button"
          accessibilityLabel={`View posts in ${post.category.name} category`}
        >
          <Text style={[styles.categoryText, { color: post.category.color }]}>
            {post.category.name}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {post.title}
      </Text>

      {/* Content */}
      {renderContent()}

      {/* Media */}
      {renderMediaAttachment()}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <Animated.View style={likeAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              disabled={toggleLikeMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={post.isLiked ? 'Unlike post' : 'Like post'}
              accessibilityState={{ selected: post.isLiked }}
            >
              <Icon
                name={post.isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={post.isLiked ? theme.colors.error : theme.colors.textSecondary}
              />
              <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCommentPress}
            accessibilityRole="button"
            accessibilityLabel={`View ${post.comments} comments`}
          >
            <Icon
              name="chatbubble-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {post.comments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            disabled={sharePostMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Share post"
          >
            <Icon
              name="share-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {post.shares}
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={bookmarkAnimatedStyle}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBookmark}
            disabled={toggleBookmarkMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
            accessibilityState={{ selected: post.isBookmarked }}
          >
            <Icon
              name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={post.isBookmarked ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: CARD_MARGIN,
    marginVertical: 8,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  contentContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaImage: {
    width: CARD_WIDTH,
    height: 200,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default PostCard;