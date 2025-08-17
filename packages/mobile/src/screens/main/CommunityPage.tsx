import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {PostFeed} from '../../components/posts/PostFeed';
import {CommunityMembersList} from '../../components/communities/CommunityMembersList';
import {
  Community,
  joinCommunity,
  leaveCommunity,
  setSelectedCommunity,
} from '../../store/slices/communitiesSlice';
import {Post} from '../../store/slices/postsSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface CommunityPageProps {
  communityId: string;
  onBack?: () => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  communityId,
  onBack,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {selectedCommunity} = useSelector((state: RootState) => state.communities);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about'>('posts');
  const [isJoining, setIsJoining] = useState(false);

  // Mock community data - in real app this would come from the store
  const community: Community = selectedCommunity || {
    id: communityId,
    name: 'Math Teachers United',
    description: 'A community for mathematics educators to share resources and discuss teaching strategies. We focus on innovative teaching methods, curriculum development, and student engagement techniques.',
    type: 'subject',
    ownerId: 'user1',
    ownerName: 'Sarah Johnson',
    moderators: ['user2'],
    isPrivate: false,
    requiresApproval: false,
    imageUrl: 'https://example.com/math-community.jpg',
    memberCount: 245,
    postCount: 89,
    isActive: true,
    isMember: false,
    membershipStatus: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    dispatch(setSelectedCommunity(community));
  }, [communityId]);

  const handleJoinLeave = async () => {
    if (isJoining) return;
    
    try {
      setIsJoining(true);
      
      if (community.isMember) {
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
              },
            },
          ]
        );
      } else {
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
                },
              },
            ]
          );
        } else {
          await dispatch(joinCommunity(community.id)).unwrap();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update membership status');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePostPress = (post: Post) => {
    console.log('Post pressed:', post.id);
  };

  const handleCommentPress = (post: Post) => {
    console.log('Comment pressed for post:', post.id);
  };

  const handleSharePress = (post: Post) => {
    Alert.alert('Share Post', 'Share functionality would be implemented here');
  };

  const handleAuthorPress = (authorId: string) => {
    console.log('Author pressed:', authorId);
  };

  const getJoinButtonText = () => {
    if (isJoining) return 'Loading...';
    if (community.isMember) {
      if (community.memberRole === 'owner') return 'Owner';
      if (community.memberRole === 'moderator') return 'Moderator';
      return 'Leave';
    }
    if (community.membershipStatus === 'pending') return 'Pending';
    return community.requiresApproval ? 'Request to Join' : 'Join';
  };

  const getJoinButtonStyle = () => {
    if (community.isMember && community.memberRole !== 'owner') {
      return [styles.joinButton, styles.leaveButton];
    }
    if (community.memberRole === 'owner') {
      return [styles.joinButton, styles.ownerButton];
    }
    return styles.joinButton;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle} numberOfLines={1}>
        {community.name}
      </Text>
      
      <TouchableOpacity style={styles.moreButton}>
        <Icon name="more-vert" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderCommunityInfo = () => (
    <View style={styles.communityInfo}>
      <View style={styles.communityImageContainer}>
        {community.imageUrl ? (
          <Image
            source={{uri: community.imageUrl}}
            style={styles.communityImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="group" size={40} color={theme.colors.primary} />
          </View>
        )}
      </View>
      
      <View style={styles.communityDetails}>
        <Text style={styles.communityName}>{community.name}</Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {community.description}
        </Text>
        
        <View style={styles.communityStats}>
          <View style={styles.statItem}>
            <Icon name="people" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{community.memberCount} members</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="article" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{community.postCount} posts</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="school" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{community.type}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={getJoinButtonStyle()}
          onPress={handleJoinLeave}
          disabled={isJoining || community.memberRole === 'owner'}
          activeOpacity={0.7}>
          <Text style={styles.joinButtonText}>
            {getJoinButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['posts', 'members', 'about'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab as any)}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <PostFeed
            communityId={community.id}
            showCreateButton={community.isMember}
            onPostPress={handlePostPress}
            onCommentPress={handleCommentPress}
            onSharePress={handleSharePress}
            onAuthorPress={handleAuthorPress}
          />
        );
      
      case 'members':
        return (
          <CommunityMembersList
            communityId={community.id}
            currentUserRole={community.memberRole}
          />
        );
      
      case 'about':
        return (
          <ScrollView style={styles.aboutContainer}>
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutText}>{community.description}</Text>
            </View>
            
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Community Info</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{community.type}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Owner:</Text>
                <Text style={styles.infoValue}>{community.ownerName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {new Date(community.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Privacy:</Text>
                <Text style={styles.infoValue}>
                  {community.isPrivate ? 'Private' : 'Public'}
                </Text>
              </View>
            </View>
            
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Community Guidelines</Text>
              <Text style={styles.aboutText}>
                • Keep discussions respectful and professional{'\n'}
                • Share resources that are relevant to the community{'\n'}
                • Help other teachers by answering questions{'\n'}
                • Follow platform rules and policies
              </Text>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderCommunityInfo()}
      {renderTabs()}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  moreButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  communityInfo: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  communityImageContainer: {
    marginRight: theme.spacing.md,
  },
  communityImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityDetails: {
    flex: 1,
  },
  communityName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  communityDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  communityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  leaveButton: {
    backgroundColor: theme.colors.error,
  },
  ownerButton: {
    backgroundColor: theme.colors.warning,
  },
  joinButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  aboutContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  aboutSection: {
    marginBottom: theme.spacing.xl,
  },
  aboutTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  aboutText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
  },
});