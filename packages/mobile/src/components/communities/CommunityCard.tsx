import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useDispatch} from 'react-redux';

import {Community} from '../../store/slices/communitiesSlice';
import {joinCommunity, leaveCommunity} from '../../store/slices/communitiesSlice';
import {theme} from '../../styles/theme';
import {AppDispatch} from '../../store';

interface CommunityCardProps {
  community: Community;
  onPress?: () => void;
  onJoin?: () => void;
  onLeave?: () => void;
  showJoinButton?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onPress,
  onJoin,
  onLeave,
  showJoinButton = true,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isJoining, setIsJoining] = useState(false);
  
  const scale = useSharedValue(1);
  const joinButtonScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const joinButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: joinButtonScale.value}],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.98, {damping: 15, stiffness: 300}, () => {
      scale.value = withSpring(1, {damping: 15, stiffness: 300});
    });
    onPress?.();
  };

  const handleJoinPress = async (event: any) => {
    event.stopPropagation();
    
    if (isJoining) return;
    
    try {
      setIsJoining(true);
      joinButtonScale.value = withSpring(0.9, {damping: 15, stiffness: 300});
      
      if (community.isMember) {
        // Leave community
        Alert.alert(
          'Leave Community',
          `Are you sure you want to leave "${community.name}"?`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                await dispatch(leaveCommunity(community.id)).unwrap();
                onLeave?.();
              },
            },
          ]
        );
      } else {
        // Join community
        if (community.requiresApproval) {
          Alert.alert(
            'Join Community',
            `"${community.name}" requires approval to join. Your request will be sent to the moderators.`,
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Request to Join',
                onPress: async () => {
                  await dispatch(joinCommunity(community.id)).unwrap();
                  onJoin?.();
                },
              },
            ]
          );
        } else {
          await dispatch(joinCommunity(community.id)).unwrap();
          onJoin?.();
        }
      }
      
      joinButtonScale.value = withSpring(1, {damping: 15, stiffness: 300});
    } catch (error) {
      Alert.alert('Error', 'Failed to update membership status');
      joinButtonScale.value = withSpring(1, {damping: 15, stiffness: 300});
    } finally {
      setIsJoining(false);
    }
  };

  const getJoinButtonText = () => {
    if (isJoining) return 'Loading...';
    if (community.isMember) {
      if (community.memberRole === 'owner') return 'Owner';
      if (community.memberRole === 'moderator') return 'Moderator';
      return 'Joined';
    }
    if (community.membershipStatus === 'pending') return 'Pending';
    return community.requiresApproval ? 'Request' : 'Join';
  };

  const getJoinButtonStyle = () => {
    if (community.isMember) {
      return [styles.joinButton, styles.joinedButton];
    }
    if (community.membershipStatus === 'pending') {
      return [styles.joinButton, styles.pendingButton];
    }
    return styles.joinButton;
  };

  const getJoinButtonTextStyle = () => {
    if (community.isMember) {
      return [styles.joinButtonText, styles.joinedButtonText];
    }
    if (community.membershipStatus === 'pending') {
      return [styles.joinButtonText, styles.pendingButtonText];
    }
    return styles.joinButtonText;
  };

  const getCommunityTypeIcon = () => {
    switch (community.type) {
      case 'subject':
        return 'school';
      case 'region':
        return 'location-on';
      case 'grade':
        return 'grade';
      default:
        return 'group';
    }
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      activeOpacity={1}>
      
      {/* Community Image */}
      <View style={styles.imageContainer}>
        {community.imageUrl ? (
          <Image
            source={{uri: community.imageUrl}}
            style={styles.communityImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon
              name={getCommunityTypeIcon()}
              size={32}
              color={theme.colors.primary}
            />
          </View>
        )}
        
        {community.isPrivate && (
          <View style={styles.privateIndicator}>
            <Icon name="lock" size={12} color={theme.colors.surface} />
          </View>
        )}
      </View>

      {/* Community Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {community.name}
          </Text>
          
          {showJoinButton && (
            <Animated.View style={joinButtonAnimatedStyle}>
              <TouchableOpacity
                style={getJoinButtonStyle()}
                onPress={handleJoinPress}
                disabled={isJoining || community.memberRole === 'owner'}
                activeOpacity={0.7}>
                <Text style={getJoinButtonTextStyle()}>
                  {getJoinButtonText()}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {community.description}
        </Text>

        <View style={styles.metadata}>
          <View style={styles.metadataItem}>
            <Icon name="people" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metadataText}>
              {formatMemberCount(community.memberCount)} members
            </Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Icon name="article" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metadataText}>
              {community.postCount} posts
            </Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Icon name={getCommunityTypeIcon()} size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metadataText}>
              {community.type}
            </Text>
          </View>
        </View>

        {community.requiresApproval && !community.isMember && (
          <View style={styles.approvalNotice}>
            <Icon name="info" size={12} color={theme.colors.warning} />
            <Text style={styles.approvalText}>Requires approval</Text>
          </View>
        )}
      </View>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  communityImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateIndicator: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  joinedButton: {
    backgroundColor: theme.colors.success,
  },
  pendingButton: {
    backgroundColor: theme.colors.warning,
  },
  joinButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  joinedButtonText: {
    color: theme.colors.surface,
  },
  pendingButtonText: {
    color: theme.colors.surface,
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.xs,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  metadataText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  approvalText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
});