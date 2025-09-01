import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { format } from 'date-fns';
import type { Message } from '@/types/messaging';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showAvatar = false,
  showTimestamp = false,
}) => {
  const handleAttachmentPress = (url: string, filename: string) => {
    // Handle attachment opening
    Linking.openURL(url).catch(err => {
      console.error('Failed to open attachment:', err);
    });
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    return (
      <View style={styles.attachmentsContainer}>
        {message.attachments.map((attachment) => (
          <TouchableOpacity
            key={attachment.id}
            style={styles.attachment}
            onPress={() => handleAttachmentPress(attachment.url, attachment.filename)}
          >
            {attachment.type === 'image' ? (
              <Image 
                source={{ uri: attachment.thumbnailUrl || attachment.url }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.documentAttachment}>
                <Text style={styles.documentIcon}>📄</Text>
                <Text style={styles.documentName} numberOfLines={1}>
                  {attachment.filename}
                </Text>
                <Text style={styles.documentSize}>
                  {(attachment.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMessageStatus = () => {
    if (!isCurrentUser) return null;

    let statusIcon = '';
    let statusColor = '#666';

    switch (message.deliveryStatus) {
      case 'sending':
        statusIcon = '⏳';
        statusColor = '#999';
        break;
      case 'sent':
        statusIcon = '✓';
        statusColor = '#666';
        break;
      case 'delivered':
        statusIcon = '✓✓';
        statusColor = '#666';
        break;
      case 'read':
        statusIcon = '✓✓';
        statusColor = '#007AFF';
        break;
      case 'failed':
        statusIcon = '⚠️';
        statusColor = '#FF3B30';
        break;
    }

    return (
      <Text style={[styles.messageStatus, { color: statusColor }]}>
        {statusIcon}
      </Text>
    );
  };

  const renderAvatar = () => {
    if (isCurrentUser || !showAvatar) return null;

    // In a real app, you'd get the sender's info from the message or context
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>U</Text>
      </View>
    );
  };

  const renderTimestamp = () => {
    if (!showTimestamp) return null;

    return (
      <Text style={styles.timestamp}>
        {format(message.timestamp, 'HH:mm')}
      </Text>
    );
  };

  const renderEditedIndicator = () => {
    if (!message.editedAt) return null;

    return (
      <Text style={styles.editedText}>edited</Text>
    );
  };

  if (message.type === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessage}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {renderAvatar()}
      
      <View style={[
        styles.bubble,
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
      ]}>
        {message.replyTo && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>Replying to message</Text>
          </View>
        )}

        {renderAttachments()}

        {message.content.trim() && (
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          {renderEditedIndicator()}
          {renderTimestamp()}
          {renderMessageStatus()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 1,
  },
  currentUserBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  messageStatus: {
    fontSize: 12,
    marginLeft: 4,
  },
  editedText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  replyContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 4,
    padding: 6,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  attachmentsContainer: {
    marginBottom: 8,
  },
  attachment: {
    marginBottom: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  documentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});