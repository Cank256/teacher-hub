import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/types/messaging';

interface ConversationCardProps {
  conversation: Conversation;
  onPress: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  onPress,
}) => {
  const getDisplayName = () => {
    if (conversation.isGroup) {
      return conversation.name || 'Group Chat';
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(
      p => p.id !== 'current-user-id' // Replace with actual current user ID
    );
    
    return otherParticipant 
      ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
      : 'Unknown User';
  };

  const getDisplayImage = () => {
    if (conversation.isGroup) {
      // For groups, could show group avatar or default group icon
      return null;
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.id !== 'current-user-id' // Replace with actual current user ID
    );
    
    return otherParticipant?.profilePicture;
  };

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const { content, type, senderId } = conversation.lastMessage;
    const isCurrentUser = senderId === 'current-user-id'; // Replace with actual current user ID
    const prefix = isCurrentUser ? 'You: ' : '';

    switch (type) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'document':
        return `${prefix}📄 Document`;
      case 'system':
        return content;
      default:
        return `${prefix}${content}`;
    }
  };

  const getTimeDisplay = () => {
    if (!conversation.lastMessage) {
      return formatDistanceToNow(conversation.createdAt, { addSuffix: true });
    }
    
    return formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true });
  };

  const displayImage = getDisplayImage();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {getDisplayName().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Online indicator for direct messages */}
        {!conversation.isGroup && (
          <View style={[
            styles.onlineIndicator,
            // Add online status logic here
            // conversation.participants[0]?.isOnline && styles.onlineIndicatorActive
          ]} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {getDisplayName()}
          </Text>
          <Text style={styles.time}>
            {getTimeDisplay()}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text 
            style={[
              styles.lastMessage,
              conversation.unreadCount > 0 && styles.unreadMessage
            ]} 
            numberOfLines={1}
          >
            {getLastMessagePreview()}
          </Text>
          
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#000',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});