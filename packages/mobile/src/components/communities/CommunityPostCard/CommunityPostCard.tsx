import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { ProfilePicture } from '@/components/ui/ProfilePicture/ProfilePicture';
import type { CommunityPost } from '@/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onComment: (post: CommunityPost) => void;
  onShare: (post: CommunityPost) => void;
  onAuthorPress: (userId: string) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onPress,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
}) => {
  const { colors, typography } = useTheme();

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleLike = () => {
    onLike(post);
  };

  const handleComment = () => {
    onComment(post);
  };

  const handleShare = () => {
    Alert.alert(
      'Share Post',
      'Choose how you want to share this post',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Link', onPress: () => onShare(post) },
        { text: 'Share External', onPress: () => onShare(post) },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => onPress(post)}
      activeOpacity={0.95}
    >
      {/* Pinned Badge */}
      {post.isPinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.pinnedText, { color: colors.onPrimary }]}>
            📌 Pinned
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={() => onAuthorPress(post.author.id)}
        >
          <ProfilePicture
            uri={post.author.profilePicture}
            name={`${post.author.firstName} ${post.author.lastName}`}
            size={40}
          />
          <View style={styles.authorDetails}>
            <Text style={[styles.authorName, { color: colors.onSurface }]}>
              {post.author.firstName} {post.author.lastName}
            </Text>
            <View style={styles.postMeta}>
              <Text style={[styles.timeAgo, { color: colors.onSurfaceVariant }]}>
                {formatTimeAgo(post.createdAt)}
              </Text>
              {post.category && (
                <>
                  <Text style={[styles.separator, { color: colors.onSurfaceVariant }]}>
                    •
                  </Text>
                  <Text style={[styles.category, { color: colors.primary }]}>
                    {post.category}
                  </Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Community Badge */}
        <View style={[styles.communityBadge, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.communityName, { color: colors.onPrimaryContainer }]}>
            {post.community.name}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={2}>
          {post.title}
        </Text>
        
        <Text
          style={[styles.contentText, { color: colors.onSurfaceVariant }]}
          numberOfLines={3}
        >
          {post.content}
        </Text>
      </View>

      {/* Media Attachments */}
      {post.mediaAttachments.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.mediaAttachments.slice(0, 2).map((media, index) => (
            <View key={media.id} style={styles.mediaItem}>
              {media.type === 'image' && (
                <Image
                  source={{ uri: media.thumbnailUrl || media.url }}
                  style={[
                    styles.mediaImage,
                    post.mediaAttachments.length === 1 && styles.singleMediaImage,
                  ]}
                />
              )}
              {media.type === 'video' && (
                <View style={[styles.videoThumbnail, { backgroundColor: colors.surfaceVariant }]}>
                  <Image
                    source={{ uri: media.thumbnailUrl }}
                    style={styles.mediaImage}
                  />
                  <View style={styles.playButton}>
                    <Text style={[styles.playIcon, { color: colors.onPrimary }]}>▶</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
          
          {post.mediaAttachments.length > 2 && (
            <View style={[styles.moreMedia, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.moreMediaText, { color: colors.onSurfaceVariant }]}>
                +{post.mediaAttachments.length - 2}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Text style={[styles.actionIcon, { color: post.isLiked ? colors.error : colors.onSurfaceVariant }]}>
            {post.isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, { color: colors.onSurfaceVariant }]}>
            {post.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Text style={[styles.actionIcon, { color: colors.onSurfaceVariant }]}>💬</Text>
          <Text style={[styles.actionText, { color: colors.onSurfaceVariant }]}>
            {post.comments}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={[styles.actionIcon, { color: colors.onSurfaceVariant }]}>📤</Text>
          <Text style={[styles.actionText, { color: colors.onSurfaceVariant }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  pinnedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
  },
  communityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  communityName: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mediaItem: {
    flex: 1,
    marginRight: 8,
  },
  mediaImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  singleMediaImage: {
    height: 200,
  },
  videoThumbnail: {
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 12,
  },
  moreMedia: {
    width: 60,
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMediaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});