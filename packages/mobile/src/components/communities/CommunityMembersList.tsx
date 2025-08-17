import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {
  CommunityMember,
  fetchCommunityMembers,
  manageCommunityMember,
} from '../../store/slices/communitiesSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface CommunityMembersListProps {
  communityId: string;
  currentUserRole?: 'member' | 'moderator' | 'owner';
  onMemberPress?: (member: CommunityMember) => void;
}

export const CommunityMembersList: React.FC<CommunityMembersListProps> = ({
  communityId,
  currentUserRole,
  onMemberPress,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {communityMembers} = useSelector((state: RootState) => state.communities);
  
  const [refreshing, setRefreshing] = useState(false);
  const members = communityMembers[communityId] || [];

  useEffect(() => {
    loadMembers();
  }, [communityId]);

  const loadMembers = async () => {
    try {
      await dispatch(fetchCommunityMembers(communityId)).unwrap();
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleMemberAction = (member: CommunityMember, action: 'promote' | 'demote' | 'remove' | 'ban') => {
    const actionLabels = {
      promote: 'Promote to Moderator',
      demote: 'Demote to Member',
      remove: 'Remove from Community',
      ban: 'Ban from Community',
    };

    const actionMessages = {
      promote: `Are you sure you want to promote ${member.userName} to moderator?`,
      demote: `Are you sure you want to demote ${member.userName} to member?`,
      remove: `Are you sure you want to remove ${member.userName} from the community?`,
      ban: `Are you sure you want to ban ${member.userName} from the community?`,
    };

    Alert.alert(
      actionLabels[action],
      actionMessages[action],
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: actionLabels[action].split(' ')[0],
          style: action === 'remove' || action === 'ban' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await dispatch(manageCommunityMember({
                communityId,
                memberId: member.id,
                action,
              })).unwrap();
              
              Alert.alert('Success', `${member.userName} has been ${action}d.`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} member.`);
            }
          },
        },
      ]
    );
  };

  const canManageMember = (member: CommunityMember): boolean => {
    if (!currentUserRole || currentUserRole === 'member') return false;
    if (member.role === 'owner') return false;
    if (currentUserRole === 'moderator' && member.role === 'moderator') return false;
    return true;
  };

  const getMemberActions = (member: CommunityMember) => {
    if (!canManageMember(member)) return [];

    const actions = [];
    
    if (member.role === 'member') {
      actions.push({label: 'Promote', action: 'promote' as const, icon: 'arrow-upward'});
    } else if (member.role === 'moderator' && currentUserRole === 'owner') {
      actions.push({label: 'Demote', action: 'demote' as const, icon: 'arrow-downward'});
    }
    
    actions.push({label: 'Remove', action: 'remove' as const, icon: 'person-remove'});
    actions.push({label: 'Ban', action: 'ban' as const, icon: 'block'});
    
    return actions;
  };

  const showMemberActions = (member: CommunityMember) => {
    const actions = getMemberActions(member);
    if (actions.length === 0) return;

    const alertActions = actions.map(action => ({
      text: action.label,
      onPress: () => handleMemberAction(member, action.action),
      style: action.action === 'remove' || action.action === 'ban' ? 'destructive' as const : 'default' as const,
    }));

    Alert.alert(
      'Manage Member',
      `What would you like to do with ${member.userName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        ...alertActions,
      ]
    );
  };

  const renderMember = ({item}: {item: CommunityMember}) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => onMemberPress?.(item)}
      onLongPress={() => showMemberActions(item)}
      activeOpacity={0.7}>
      
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          {item.userAvatar ? (
            <Image
              source={{uri: item.userAvatar}}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Icon name="person" size={20} color={theme.colors.textSecondary} />
          )}
        </View>
        
        <View style={styles.memberDetails}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>{item.userName}</Text>
            {item.verificationStatus === 'verified' && (
              <Icon name="verified" size={16} color={theme.colors.success} />
            )}
          </View>
          
          <View style={styles.memberMeta}>
            <View style={styles.roleContainer}>
              <Icon
                name={item.role === 'owner' ? 'star' : item.role === 'moderator' ? 'shield' : 'person'}
                size={12}
                color={
                  item.role === 'owner' ? theme.colors.warning :
                  item.role === 'moderator' ? theme.colors.primary :
                  theme.colors.textSecondary
                }
              />
              <Text style={[
                styles.roleText,
                item.role === 'owner' && styles.ownerText,
                item.role === 'moderator' && styles.moderatorText,
              ]}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
            </View>
            
            {item.subjects && item.subjects.length > 0 && (
              <Text style={styles.subjectsText}>
                {item.subjects.slice(0, 2).join(', ')}
                {item.subjects.length > 2 && ` +${item.subjects.length - 2}`}
              </Text>
            )}
          </View>
          
          <Text style={styles.joinedDate}>
            Joined {new Date(item.joinedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      {canManageMember(item) && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => showMemberActions(item)}
          activeOpacity={0.7}>
          <Icon name="more-vert" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyStateTitle}>No members found</Text>
      <Text style={styles.emptyStateText}>
        This community doesn't have any members yet.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        Members ({members.length})
      </Text>
      <Text style={styles.headerSubtitle}>
        {currentUserRole && currentUserRole !== 'member' && 'Long press to manage members'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          members.length === 0 && styles.emptyContentContainer,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.lg,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberDetails: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  memberName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.xs,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  roleText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  ownerText: {
    color: theme.colors.warning,
  },
  moderatorText: {
    color: theme.colors.primary,
  },
  subjectsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  joinedDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
  },
  actionButton: {
    padding: theme.spacing.sm,
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
  },
});