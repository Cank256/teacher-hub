import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useConversations, useMessageSyncStatus } from '@/services/api/hooks/useMessaging';
import { ConversationCard } from '@/components/messaging/ConversationCard/ConversationCard';
import { SyncStatusIndicator } from '@/components/messaging/SyncStatusIndicator/SyncStatusIndicator';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner';
import { SearchBar } from '@/components/common/SearchBar/SearchBar';
import type { MessagesStackScreenProps } from '@/navigation/types';
import type { Conversation, ConversationFilters } from '@/types/messaging';

type Props = MessagesStackScreenProps<'ConversationsList'>;

export const ConversationsListScreen: React.FC<Props> = ({ navigation }) => {
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const {
    data: conversations = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useConversations(filters);

  const { syncStatus } = useMessageSyncStatus();

  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  }, []);

  const toggleUnreadFilter = useCallback(() => {
    setShowUnreadOnly(prev => {
      const newValue = !prev;
      setFilters(prevFilters => ({ 
        ...prevFilters, 
        unreadOnly: newValue || undefined 
      }));
      return newValue;
    });
  }, []);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      recipientName: conversation.isGroup 
        ? conversation.name 
        : conversation.participants
            .filter(p => p.id !== 'current-user-id') // Replace with actual current user ID
            .map(p => `${p.firstName} ${p.lastName}`)
            .join(', ')
    });
  }, [navigation]);

  const handleNewConversation = useCallback(() => {
    navigation.navigate('NewConversation');
  }, [navigation]);

  const renderConversation = useCallback(({ item }: { item: Conversation }) => (
    <ConversationCard
      conversation={item}
      onPress={() => handleConversationPress(item)}
    />
  ), [handleConversationPress]);

  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        placeholder="Search conversations..."
        onSearch={handleSearch}
        style={styles.searchBar}
      />
      
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            showUnreadOnly && styles.filterButtonActive
          ]}
          onPress={toggleUnreadFilter}
        >
          <Text style={[
            styles.filterButtonText,
            showUnreadOnly && styles.filterButtonTextActive
          ]}>
            Unread Only
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newConversationButton}
          onPress={handleNewConversation}
        >
          <Text style={styles.newConversationButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {syncStatus && (
        <SyncStatusIndicator status={syncStatus} />
      )}
    </View>
  );

  const renderEmptyState = () => (
    <EmptyState
      title="No conversations yet"
      subtitle="Start a conversation with other teachers to collaborate and share ideas"
      actionText="Start New Conversation"
      onAction={handleNewConversation}
    />
  );

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <LoadingSpinner />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load conversations
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlashList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
      />
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
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  newConversationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  newConversationButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
  },
});