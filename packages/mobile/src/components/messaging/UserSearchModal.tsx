import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDebouncedCallback} from 'use-debounce';

import {
  UserSearchResult,
  UserSearchFilters,
  userSearchService,
} from '../../services/search/userSearchService';
import {theme} from '../../styles/theme';

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onUserSelect: (user: UserSearchResult) => void;
  title?: string;
  multiSelect?: boolean;
  selectedUsers?: UserSearchResult[];
  excludeUsers?: string[];
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  visible,
  onClose,
  onUserSelect,
  title = 'Search Users',
  multiSelect = false,
  selectedUsers = [],
  excludeUsers = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [recentContacts, setRecentContacts] = useState<UserSearchResult[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<UserSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    } else {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setSearchQuery('');
    setUsers([]);
    setPage(1);
    setHasMore(true);
    setShowFilters(false);
  };

  const loadInitialData = async () => {
    try {
      const [recent, suggested] = await Promise.all([
        userSearchService.getRecentContacts(5),
        userSearchService.getSuggestedUsers(10),
      ]);
      
      setRecentContacts(recent.filter(user => !excludeUsers.includes(user.id)));
      setSuggestedUsers(suggested.filter(user => !excludeUsers.includes(user.id)));
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const searchUsers = useCallback(async (query: string, pageNum: number = 1, reset: boolean = true) => {
    if (query.trim().length === 0) {
      if (reset) {
        setUsers([]);
        setPage(1);
        setHasMore(true);
      }
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await userSearchService.searchUsers(query, filters, pageNum, 20);
      const filteredUsers = result.users.filter(user => !excludeUsers.includes(user.id));
      
      if (reset) {
        setUsers(filteredUsers);
        setPage(2);
      } else {
        setUsers(prev => [...prev, ...filteredUsers]);
        setPage(pageNum + 1);
      }
      
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setIsLoading(false);
    }
  }, [filters, excludeUsers]);

  const debouncedSearch = useDebouncedCallback(searchUsers, 300);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query, 1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore && searchQuery.trim().length > 0) {
      searchUsers(searchQuery, page, false);
    }
  };

  const handleUserPress = (user: UserSearchResult) => {
    if (multiSelect) {
      const isSelected = selectedUsers.some(u => u.id === user.id);
      if (isSelected) {
        // Remove from selection
        const updatedSelection = selectedUsers.filter(u => u.id !== user.id);
        onUserSelect(user); // Let parent handle the selection logic
      } else {
        // Add to selection
        onUserSelect(user);
      }
    } else {
      onUserSelect(user);
      onClose();
    }
  };

  const isUserSelected = (user: UserSearchResult) => {
    return selectedUsers.some(u => u.id === user.id);
  };

  const renderUser = ({item}: {item: UserSearchResult}) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        isUserSelected(item) && styles.selectedUserItem,
      ]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}>
      
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {item.profileImageUrl ? (
            <Image
              source={{uri: item.profileImageUrl}}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={20} color={theme.colors.textSecondary} />
            </View>
          )}
          
          {/* Online status indicator */}
          <View style={[
            styles.onlineIndicator,
            styles[`${userSearchService.getOnlineStatus(item)}Indicator`],
          ]} />
        </View>
        
        <View style={styles.userDetails}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>{item.fullName}</Text>
            {item.verificationStatus === 'verified' && (
              <Icon name="verified" size={16} color={theme.colors.success} />
            )}
          </View>
          
          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email}
          </Text>
          
          {item.subjects.length > 0 && (
            <Text style={styles.userSubjects} numberOfLines={1}>
              {item.subjects.slice(0, 2).join(', ')}
              {item.subjects.length > 2 && ` +${item.subjects.length - 2}`}
            </Text>
          )}
          
          {item.location && (
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={12} color={theme.colors.textLight} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.userActions}>
        {!item.isOnline && item.lastSeen && (
          <Text style={styles.lastSeenText}>
            {userSearchService.formatLastSeen(item.lastSeen)}
          </Text>
        )}
        
        {multiSelect && (
          <View style={[
            styles.checkbox,
            isUserSelected(item) && styles.checkedCheckbox,
          ]}>
            {isUserSelected(item) && (
              <Icon name="check" size={16} color={theme.colors.surface} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: UserSearchResult[]) => {
    if (data.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((user) => (
          <View key={user.id}>
            {renderUser({item: user})}
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (searchQuery.trim().length > 0) {
      return (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Icon name="search-off" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyStateText}>No users found</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return (
      <View style={styles.defaultContent}>
        {renderSection('Recent Contacts', recentContacts)}
        {renderSection('Suggested Users', suggestedUsers)}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{title}</Text>
          
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.headerButton}>
            <Icon name="tune" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or subject..."
              placeholderTextColor={theme.colors.textLight}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                style={styles.clearButton}>
                <Icon name="close" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected Users (for multi-select) */}
        {multiSelect && selectedUsers.length > 0 && (
          <View style={styles.selectedUsersContainer}>
            <Text style={styles.selectedUsersTitle}>
              Selected ({selectedUsers.length})
            </Text>
            <FlatList
              horizontal
              data={selectedUsers}
              renderItem={({item}) => (
                <View style={styles.selectedUserChip}>
                  <Text style={styles.selectedUserName} numberOfLines={1}>
                    {item.fullName.split(' ')[0]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleUserPress(item)}
                    style={styles.removeSelectedUser}>
                    <Icon name="close" size={14} color={theme.colors.surface} />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedUsersContent}
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  selectedUsersContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  selectedUsersTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  selectedUsersContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    maxWidth: 100,
  },
  selectedUserName: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.surface,
    fontWeight: '500',
    flex: 1,
  },
  removeSelectedUser: {
    marginLeft: theme.spacing.xs,
    padding: 2,
  },
  content: {
    flex: 1,
  },
  defaultContent: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.borderLight,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  selectedUserItem: {
    backgroundColor: theme.colors.borderLight,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  onlineIndicator: {
    backgroundColor: theme.colors.success,
  },
  awayIndicator: {
    backgroundColor: theme.colors.warning,
  },
  offlineIndicator: {
    backgroundColor: theme.colors.textLight,
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  userName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  userSubjects: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.xs,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  lastSeenText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  loadingFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});