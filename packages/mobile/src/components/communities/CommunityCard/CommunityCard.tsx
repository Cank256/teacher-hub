import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/theme';
import type { Community } from '@/types';

interface CommunityCardProps {
  community: Community;
  onPress: (community: Community) => void;
  onJoin?: (community: Community) => void;
  onLeave?: (community: Community) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 cards per row with margins

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onPress,
  onJoin,
  onLeave,
}) => {
  const { colors, typography } = useTheme();

  const handleJoinPress = (e: any) => {
    e.stopPropagation();
    if (community.isJoined && onLeave) {
      onLeave(community);
    } else if (!community.isJoined && onJoin) {
      onJoin(community);
    }
  };

  const getActivityLevelColor = () => {
    switch (community.activityLevel) {
      case 'very_high':
        return colors.success;
      case 'high':
        return colors.primary;
      case 'medium':
        return colors.warning;
      case 'low':
      default:
        return colors.textSecondary;
    }
  };

  const getActivityLevelText = () => {
    switch (community.activityLevel) {
      case 'very_high':
        return 'Very Active';
      case 'high':
        return 'Active';
      case 'medium':
        return 'Moderate';
      case 'low':
      default:
        return 'Quiet';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => onPress(community)}
      activeOpacity={0.7}
    >
      {/* Cover Image */}
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceVariant }]}>
        {community.coverImage ? (
          <Image source={{ uri: community.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: community.category.color }]}>
            <Text style={[styles.placeholderText, { color: colors.onPrimary }]}>
              {community.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Activity Level Badge */}
        <View style={[styles.activityBadge, { backgroundColor: getActivityLevelColor() }]}>
          <Text style={[styles.activityText, { color: colors.onPrimary }]}>
            {getActivityLevelText()}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.onSurface }]}
          numberOfLines={2}
        >
          {community.name}
        </Text>
        
        <Text
          style={[styles.description, { color: colors.onSurfaceVariant }]}
          numberOfLines={2}
        >
          {community.description}
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={[styles.memberCount, { color: colors.onSurfaceVariant }]}>
            {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
          </Text>
          
          {!community.isPublic && (
            <Text style={[styles.privateLabel, { color: colors.primary }]}>
              Private
            </Text>
          )}
        </View>

        {/* Subjects */}
        {community.subjects.length > 0 && (
          <View style={styles.subjects}>
            <Text
              style={[styles.subjectsText, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {community.subjects.map(s => s.name).join(', ')}
            </Text>
          </View>
        )}

        {/* Join/Leave Button */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            {
              backgroundColor: community.isJoined ? colors.surfaceVariant : colors.primary,
            },
          ]}
          onPress={handleJoinPress}
        >
          <Text
            style={[
              styles.joinButtonText,
              {
                color: community.isJoined ? colors.onSurfaceVariant : colors.onPrimary,
              },
            ]}
          >
            {community.joinRequestPending
              ? 'Pending'
              : community.isJoined
              ? 'Leave'
              : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  imageContainer: {
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  activityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  privateLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  subjects: {
    marginBottom: 12,
  },
  subjectsText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});