import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useUserSearch, useCreateConversation } from '@/services/api/hooks/useMessaging';
import { SearchBar } from '@/components/common/SearchBar/SearchBar';
import { UserCard } from '@/components/messaging/UserCard/UserCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import type { MessagesStackScreenProps } from '@/navigation/types';
import type { User } from '@/types/messaging';

type Props = MessagesStackScreenProps<'NewConversation'>;

export const NewConversationScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const {
    data: searchResults = [],
    isLoading: isSearching,
    isError: searchError,
  } = useUserSearch({
    query: searchQuery,
    excludeIds: ['current-user-id'], // Replace with actual current user ID
  });

  const createConversationMutation = useCreateConversation();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleCreateConversation = useCallback(async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No users selected', 'Please select at least one user to start a conversation.');
      return;
    }

    try {
      const participantIds = selectedUsers.map(user => user.id);
      const isGroup = selectedUsers.length > 1;

      const conversation = await createConversationMutation.mutateAsync({
        participantIds,
        isGroup,
        name: isGroup ? undefined : undefined, // Group name can be set later
      });

      // Navigate to the new conversation
      navigation.replace('Chat', {
        conversationId: conversation.id,
        recipientName: isGroup 
          ? `Group with ${selectedUsers.map(u => u.firstName).join(', ')}`
          : `${selectedUsers[0].firstName} ${selectedUsers[0].lastName}`,
      });
    } catch (error) {
      Alert.alert(
        'Failed to create conversation',
        'Please try again later.'
      );
    }
  }, [selectedUsers, createConversationMutation, navigation]);

  const renderSelectedUsers = () => {
    if (selectedUsers.length === 0) return null;

    return (
      <View style={styles.selectedUsersContainer}>
        <Text style={styles.selectedUsersTitle}>
          Selected ({selectedUsers.length})
        </Text>
        <FlatList
          horizontal
          data={selectedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.selectedUserChip}
              onPress={() => handleUserSelect(item)}
            >
              <Text style={styles.selectedUserName}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.removeIcon}>×</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectedUsersList}
        />
      </View>
    );
  };

  const renderUser = useCallback(({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    
    return (
      <UserCard
        user={item}
        isSelected={isSelected}
        onPress={() => handleUserSelect(item)}
      />
    );
  }, [selectedUsers, handleUserSelect]);

  const renderEmptyState = () => {
    if (searchQuery.length < 2) {
      return (
        <EmptyState
          title="Search for teachers"
          subtitle="Enter at least 2 characters to search for other teachers"
        />
      );
    }

    if (searchError) {
      return (
        <EmptyState
          title="Search failed"
          subtitle="Please check your connection and try again"
        />
      );
    }

    return (
      <EmptyState
        title="No teachers found"
        subtitle="Try adjusting your search terms"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          placeholder="Search teachers by name, subject, or location..."
          onSearch={handleSearch}
          style={styles.searchBar}
        />

        {renderSelectedUsers()}

        {selectedUsers.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateConversation}
            disabled={createConversationMutation.isPending}
          >
            <Text style={styles.createButtonText}>
              {createConversationMutation.isPending 
                ? 'Creating...' 
                : `Start Conversation${selectedUsers.length > 1 ? ' (Group)' : ''}`
              }
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <LoadingSpinner />
      ) : (
        <FlashList
          data={searchResults}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          estimatedItemSize={70}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 16,
  },
  selectedUsersContainer: {
    marginBottom: 16,
  },
  selectedUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  selectedUsersList: {
    paddingVertical: 4,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  removeIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
  },
});