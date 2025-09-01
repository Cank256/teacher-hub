import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  useMessages, 
  useSendMessage, 
  useMarkAsRead, 
  useRealTimeMessaging 
} from '@/services/api/hooks/useMessaging';
import { MessageBubble } from '@/components/messaging/MessageBubble/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator/TypingIndicator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import type { MessagesStackScreenProps } from '@/navigation/types';
import type { Message, MessageType } from '@/types/messaging';

type Props = MessagesStackScreenProps<'Chat'>;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, recipientName } = route.params;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: messagesData,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const { typingUsers, startTyping, stopTyping } = useRealTimeMessaging(conversationId);

  // Flatten messages from all pages
  const messages = messagesData?.pages.flatMap(page => page.data) || [];

  // Set navigation title
  useEffect(() => {
    if (recipientName) {
      navigation.setOptions({ title: recipientName });
    }
  }, [recipientName, navigation]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    const unreadMessages = messages.filter(msg => 
      !msg.isRead && msg.senderId !== 'current-user-id' // Replace with actual current user ID
    );

    if (unreadMessages.length > 0) {
      // Mark the latest unread message as read (this will mark all previous as read too)
      const latestUnread = unreadMessages[0];
      markAsReadMutation.mutate({
        messageId: latestUnread.id,
        conversationId,
      });
    }
  }, [messages, conversationId, markAsReadMutation]);

  const handleSendMessage = useCallback(async (
    content: string, 
    type: MessageType = 'text',
    attachments?: File[]
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: content.trim(),
        type,
        attachments,
      });

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error) {
      Alert.alert(
        'Failed to send message',
        'Please check your connection and try again.'
      );
    }
  }, [conversationId, sendMessageMutation]);

  const handleLoadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        await fetchNextPage();
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [hasNextPage, isFetchingNextPage, isLoadingMore, fetchNextPage]);

  const handleTypingStart = useCallback(() => {
    startTyping();
  }, [startTyping]);

  const handleTypingStop = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === 'current-user-id'; // Replace with actual current user ID
    const previousMessage = messages[index + 1];
    const nextMessage = messages[index - 1];
    
    const showAvatar = !isCurrentUser && (
      !previousMessage || 
      previousMessage.senderId !== item.senderId ||
      (new Date(item.timestamp).getTime() - new Date(previousMessage.timestamp).getTime()) > 300000 // 5 minutes
    );

    const showTimestamp = !nextMessage || 
      (new Date(nextMessage.timestamp).getTime() - new Date(item.timestamp).getTime()) > 300000; // 5 minutes

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
      />
    );
  }, [messages]);

  const renderTypingIndicator = () => {
    const otherUsersTyping = typingUsers.filter(
      user => user.userId !== 'current-user-id' // Replace with actual current user ID
    );

    if (otherUsersTyping.length === 0) return null;

    return <TypingIndicator users={otherUsersTyping} />;
  };

  const renderEmptyState = () => (
    <EmptyState
      title="Start the conversation"
      subtitle="Send a message to begin chatting"
      style={styles.emptyState}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Failed to load messages"
          subtitle="Please check your connection and try again"
          actionText="Retry"
          onAction={() => window.location.reload()} // Replace with proper retry logic
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : undefined}
      />

      {renderTypingIndicator()}

      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        isLoading={sendMessageMutation.isPending}
        style={{ paddingBottom: insets.bottom }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    transform: [{ scaleY: -1 }], // Flip to account for inverted FlatList
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
});