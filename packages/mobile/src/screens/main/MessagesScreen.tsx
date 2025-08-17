import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {UserSearchModal} from '../../components/messaging/UserSearchModal';
import {
  fetchConversations,
  setActiveConversation,
  Conversation,
} from '../../store/slices/messagesSlice';
import {UserSearchResult} from '../../services/search/userSearchService';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

export const MessagesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {conversations, isLoading} = useSelector((state: RootState) => state.messages);
  
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      await dispatch(fetchConversations()).unwrap();
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    dispatch(setActiveConversation(conversation.id));
    // Navigate to conversation detail screen
    console.log('Conversation pressed:', conversation.id);
    // navigation.navigate('ConversationDetail', {conversationId: conversation.id});
  };

  const handleNewMessage = () => {
    setShowUserSearch(true);
  };

  const handleUserSelect = (user: UserSearchResult) => {
    // Create new conversation or navigate to existing one
    console.log('Selected user for messaging:', user.id);
    setShowUserSearch(false);
    
    // In a real implementation, you would:
    // 1. Check if conversation already exists with this user
    // 2. Create new conversation if it doesn't exist
    // 3. Navigate to the conversation screen
    
    Alert.alert('New Conversation', `Starting conversation with ${user.fullName}`);
  };

  const formatLastMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderConversation = ({item}: {item: Conversation}) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}>
      
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image
            source={{uri: item.avatar}}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon
              name={item.type === 'group' ? 'group' : 'person'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
        
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          
          {item.lastMessage && (
            <Text style={styles.lastMessageTime}>
              {formatLastMessageTime(item.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        
        {item.lastMessage && (
          <View style={styles.lastMessageContainer}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {item.lastMessage.type === 'text' 
                ? item.lastMessage.content
                : item.lastMessage.type === 'file'
                ? '📎 File'
                : '🎵 Voice message'
              }
            </Text>
            
            {item.lastMessage.syncStatus === 'pending' && (
              <Icon name="schedule" size={12} color={theme.colors.warning} />
            )}
            {item.lastMessage.syncStatus === 'failed' && (
              <Icon name="error" size={12} color={theme.colors.error} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat-bubble-outline" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateText}>
        Start a conversation by tapping the message button below
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleNewMessage}
        activeOpacity={0.7}>
        <Text style={styles.emptyStateButtonText}>Start Messaging</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Messages</Text>
      
      <TouchableOpacity
        style={styles.newMessageButton}
        onPress={handleNewMessage}
        activeOpacity={0.7}>
        <Icon name="edit" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          conversations.length === 0 && styles.emptyContentContainer,
        ]}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewMessage}
        activeOpacity={0.8}>
        <Icon name="message" size={24} color={theme.colors.surface} />
      </TouchableOpacity>

      {/* User Search Modal */}
      <UserSearchModal
        visible={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onUserSelect={handleUserSelect}
        title="New Message"
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
  },
  newMessageButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
  },
  contentContainer: {
    paddingBottom: 100, // Space for FAB
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  unreadCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  conversationTitle: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  lastMessageTime: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessageText: {
    flex: 1,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
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
    marginBottom: theme.spacing.xl,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyStateButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});