import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/theme';
import {
  useCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  useCommunityMembers,
} from '@/services/api/hooks/useCommunities';
import type { CommunitiesStackScreenProps } from '@/navigation/types';

type Props = CommunitiesStackScreenProps<'CommunityDetail'>;

export const CommunityDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId } = route.params;
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const {
    data: community,
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunity(communityId);

  const {
    data: membersData,
    refetch: refetchMembers,
  } = useCommunityMembers(communityId, 1, 10);

  const joinCommunityMutation = useJoinCommunity();
  const leaveCommunityMutation = useLeaveCommunity();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchMembers()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchMembers]);

  const handleJoinCommunity = useCallback(async () => {
    if (!community) return;

    try {
      await joinCommunityMutation.mutateAsync({
        communityId: community.id,
        message: community.isPublic ? undefined : 'I would like to join this community.',
      });
      
      Alert.alert(
        'Success',
        community.isPublic 
          ? 'You have successfully joined the community!'
          : 'Your join request has been sent for approval.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to join community. Please try again.');
    }
  }, [community, joinCommunityMutation]);

  const handleLeaveCommunity = useCallback(async () => {
    if (!community) return;

    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave "${community.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunityMutation.mutateAsync(community.id);
              Alert.alert('Success', 'You have left the community.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave community. Please try again.');
            }
          },
        },
      ]
    );
  }, [community, leaveCommunityMutation, navigation]);

  const handleViewPosts = useCallback(() => {
    navigation.navigate('CommunityPosts', { communityId });
  }, [navigation, communityId]);

  const handleViewMembers = useCallback(() => {
    navigation.navigate('CommunityMembers', { communityId });
  }, [navigation, communityId]);

  const getActivityLevelColor = () => {
    if (!community) return colors.textSecondary;
    
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
    if (!community) return 'Unknown';
    
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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
          Loading community...
        </Text>
      </View>
    );
  }

  if (isError || !community) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>
          Failed to Load Community
        </Text>
        <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>
          {error?.message || 'Something went wrong. Please try again.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {community.coverImage ? (
          <Image source={{ uri: community.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.placeholderCover, { backgroundColor: community.category.color }]}>
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

      {/* Community Info */}
      <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.name, { color: colors.onSurface }]}>
              {community.name}
            </Text>
            <View style={styles.categoryContainer}>
              <Text style={[styles.category, { color: colors.primary }]}>
                {community.category.name}
              </Text>
              {!community.isPublic && (
                <Text style={[styles.privateLabel, { color: colors.warning }]}>
                  • Private
                </Text>
              )}
            </View>
          </View>

          {/* Join/Leave Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: community.isJoined ? colors.surfaceVariant : colors.primary,
              },
            ]}
            onPress={community.isJoined ? handleLeaveCommunity : handleJoinCommunity}
            disabled={joinCommunityMutation.isPending || leaveCommunityMutation.isPending}
          >
            <Text
              style={[
                styles.actionButtonText,
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

        {/* Description */}
        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          {community.description}
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.onSurface }]}>
              {community.memberCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              {community.memberCount === 1 ? 'Member' : 'Members'}
            </Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.onSurface }]}>
              {community.subjects.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              {community.subjects.length === 1 ? 'Subject' : 'Subjects'}
            </Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.onSurface }]}>
              {community.gradeLevels.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Grade Levels
            </Text>
          </View>
        </View>

        {/* Subjects */}
        {community.subjects.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Subjects
            </Text>
            <View style={styles.tagsContainer}>
              {community.subjects.map((subject) => (
                <View
                  key={subject.id}
                  style={[styles.tag, { backgroundColor: colors.primaryContainer }]}
                >
                  <Text style={[styles.tagText, { color: colors.onPrimaryContainer }]}>
                    {subject.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Grade Levels */}
        {community.gradeLevels.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Grade Levels
            </Text>
            <View style={styles.tagsContainer}>
              {community.gradeLevels.map((grade) => (
                <View
                  key={grade.id}
                  style={[styles.tag, { backgroundColor: colors.secondaryContainer }]}
                >
                  <Text style={[styles.tagText, { color: colors.onSecondaryContainer }]}>
                    {grade.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        {community.location && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Location
            </Text>
            <Text style={[styles.locationText, { color: colors.onSurfaceVariant }]}>
              {community.location.name}, {community.location.district}
            </Text>
          </View>
        )}

        {/* Rules */}
        {community.rules && community.rules.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Community Rules
            </Text>
            {community.rules.map((rule, index) => (
              <Text
                key={index}
                style={[styles.ruleText, { color: colors.onSurfaceVariant }]}
              >
                {index + 1}. {rule}
              </Text>
            ))}
          </View>
        )}

        {/* Recent Members */}
        {membersData && membersData.data.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Recent Members
              </Text>
              <TouchableOpacity onPress={handleViewMembers}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.membersContainer}>
              {membersData.data.slice(0, 5).map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <Image
                    source={{
                      uri: member.user.profilePicture || 'https://via.placeholder.com/40',
                    }}
                    style={styles.memberAvatar}
                  />
                  <Text
                    style={[styles.memberName, { color: colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {member.user.firstName}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {community.isJoined && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              onPress={handleViewPosts}
            >
              <Text style={[styles.primaryActionText, { color: colors.onPrimary }]}>
                View Posts & Discussions
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleViewMembers}
            >
              <Text style={[styles.secondaryActionText, { color: colors.onSurfaceVariant }]}>
                View Members
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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
    fontSize: 16,
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
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  activityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
  },
  privateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 16,
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  membersContainer: {
    flexDirection: 'row',
  },
  memberItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 24,
  },
  primaryAction: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});