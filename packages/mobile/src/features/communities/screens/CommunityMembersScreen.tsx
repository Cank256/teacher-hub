import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { ProfilePicture } from '@/components/ui/ProfilePicture/ProfilePicture';
import {
  useCommunityMembers,
  useCommunity,
} from '@/services/api/hooks/useCommunities';
import type { CommunitiesStackScreenProps } from '@/navigation/types';
import type { CommunityMember } from '@/types';

type Props = CommunitiesStackScreenProps<'CommunityMembers'>;

export const CommunityMembersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId } = route.params;
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Queries
  const { data: community } = useCommunity(communityId);
  const {
    data: membersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunityMembers(communityId, page, 50);

  // Filter members based on search query
  const filteredMembers = membersData?.data.filter(member =>
    `${member.user.firstName} ${member.user.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleMemberPress = useCallback((member: CommunityMember) => {
    // Navigate to user profile (would need to be implemented)
    Alert.alert('Profile', `View profile for ${member.user.firstName} ${member.user.lastName}`);
  }, []);

  const getMemberRoleColor = (status: string) => {
    switch (status) {
      case 'admin':
        return colors.error;
      case 'moderator':
        return colors.warning;
      case 'member':
        return colors.primary;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const getMemberRoleText = (status: string) => {
    switch (status) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      case 'member':
        return 'Member';
      case 'pending':
        return 'Pending';
      default:
        return 'Member';
    }
  };

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
    }).format(date);
  };

  const renderMemberItem = useCallback(({ item }: { item: CommunityMember }) => (
    <TouchableOpacity
      style={[styles.memberItem, { backgroundColor: colors.surface }]}
      onPress={() => handleMemberPress(item)}
    >
      <ProfilePicture
        uri={item.user.profilePicture}
        name={`${item.user.firstName} ${item.user.lastName}`}
        size={50}
      />
      
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={[styles.memberName, { color: colors.onSurface }]}>
            {item.user.firstName} {item.user.lastName}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: getMemberRoleColor(item.status) }]}>
            <Text style={[styles.roleText, { color: colors.onPrimary }]}>
              {getMemberRoleText(item.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.memberDetails}>
          {item.user.subjects.length > 0 && (
            <Text style={[styles.subjects, { color: colors.onSurfaceVariant }]}>
              {item.user.subjects.map(s => s.name).join(', ')}
            </Text>
          )}
          
          <Text style={[styles.joinDate, { color: colors.onSurfaceVariant }]}>
            Joined {formatJoinDate(item.joinedAt)}
          </Text>
        </View>
        
        {item.user.verificationStatus === 'verified' && (
          <View style={styles.verificationBadge}>
            <Text style={[styles.verificationText, { color: colors.success }]}>
              ✓ Verified Teacher
            </Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity style={styles.moreButton}>
        <Text style={[styles.moreIcon, { color: colors.onSurfaceVariant }]}>⋯</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [colors, handleMemberPress]);

  const renderHeader = useCallback(() => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <Text style={[styles.communityName, { color: colors.onSurface }]}>
        {community?.name || 'Community Members'}
      </Text>
      <Text style={[styles.memberCount, { color: colors.onSurfaceVariant }]}>
        {community?.memberCount || filteredMembers.length} {(community?.memberCount || filteredMembers.length) === 1 ? 'member' : 'members'}
      </Text>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.onSurface }]}
          placeholder="Search members..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  ), [community, filteredMembers.length, searchQuery, colors]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    const isSearching = searchQuery.length > 0;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          {isSearching ? 'No Members Found' : 'No Members Yet'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          {isSearching 
            ? 'Try adjusting your search terms.'
            : 'This community doesn\'t have any members yet.'
          }
        </Text>
        {!isSearching && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Invite', 'Invite members functionality')}
          >
            <Text style={[styles.inviteButtonText, { color: colors.onPrimary }]}>
              Invite Members
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, colors]);

  if (isError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>
          Failed to Load Members
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
        data={filteredMembers}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  communityName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    marginBottom: 16,
  },
  searchContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    paddingVertical: 12,
    fontSize: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberDetails: {
    marginBottom: 4,
  },
  subjects: {
    fontSize: 12,
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 11,
  },
  verificationBadge: {
    marginTop: 2,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
  },
  moreIcon: {
    fontSize: 16,
    fontWeight: 'bold',
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
  inviteButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteButtonText: {
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
});