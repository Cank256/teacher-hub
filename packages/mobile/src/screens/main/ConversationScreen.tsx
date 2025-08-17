import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {VoiceMessageRecorder} from '../../components/messaging/VoiceMessageRecorder';
import {VoiceMessagePlayer} from '../../components/messaging/VoiceMessagePlayer';
import {
  fetchMessages,
  sendMessage,
  markMessageAsRead,
  Message,
} from '../../store/slices/messagesSlice';
import {VoiceMessage} from '../../services/audio/voiceMessageService';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface ConversationScreenProps {
  conversationId: string;
  onBack?: () => void;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  conversationId,
  onBack,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {messages, activeConversation} = useSelector((state: RootState) => state.messages);
  
  const [messageText, setMessageText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    loadMessages();
    markMessagesAsRead();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      await dispatch(fetchMessages(conversationId)).unwrap();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markMessagesAsRead = () => {
    // Mark unread messages as read
    conversationMessages.forEach(message => {
      if (!message.readBy.includes('current-user-id')) {
        dispatch(markMessageAsRead({
          conversationId,
          messageId: message.id,
        }));
      }
    });
  };

  const handleSendMessage = async () => {
    if (messageText.trim().length === 0) return;

    try {
      const messageData = {
        conversationId,
        content: messageText.trim(),
        type: 'text' as const,
      };

      await dispatch(sendMessage(messageData)).unwrap();
      setMessageText('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleVoiceRecordingComplete = async (voiceMessage: VoiceMessage) => {
    try {
      const messageData = {
        conversationId,
        content: `Voice message (${voiceMessage.duration}s)`,
        type: 'file' as const,
      };

      await dispatch(sendMessage(messageData)).unwrap();
      setIsRecordingVoice(false);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send voice message');
      setIsRecordingVoice(false);
    }
  };

  const handleVoiceRecordingCancel = () => {
    setIsRecordingVoice(false);
  };

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const isMessageFromCurrentUser = (message: Message): boolean => {
    return message.senderId === 'current-user-id';
  };

  const renderMessage = ({item, index}: {item: Message; index: number}) => {
    const isOwn = isMessageFromCurrentUser(item);
    const previousMessage = index > 0 ? conversationMessages[index - 1] : null;
    const showAvatar = !isOwn && (!previousMessage || previousMessage.senderId !== item.senderId);
    const showTimestamp = index === 0 || 
      new Date(item.timestamp).getTime() - new Date(previousMessage!.timestamp).getTime() > 5 * 60 * 1000;

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <Text style={styles.timestampText}>
            {formatMessageTime(item.timestamp)}
          </Text>
        )}
        
        <View style={[
          styles.messageRow,
          isOwn ? styles.ownMessageRow : styles.otherMessageRow,
        ]}>
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <View style={styles.avatar}>
                  <Icon name="person" size={16} color={theme.colors.textSecondary} />
                </View>
              ) : (
                <View style={styles.avatarSpacer} />
              )}
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}>
            {item.type === 'text' && (
              <Text style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}>
                {item.content}
              </Text>
            )}
            
            {item.type === 'file' && item.content.includes('Voice message') && (
              <VoiceMessagePlayer
                voiceMessage={{
                  id: item.id,
                  uri: `file://voice/${item.id}.mp4`,
                  duration: 15, // Mock duration
                  size: 150000, // Mock size
                  waveform: Array.from({length: 30}, () => Math.random() * 100),
                }}
                isOwn={isOwn}
              />
            )}
            
            {item.type === 'image' && (
              <Image
                source={{uri: item.content}}
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isOwn ? styles.ownMessageTime : styles.otherMessageTime,
              ]}>
                {formatMessageTime(item.timestamp)}
              </Text>
              
              {isOwn && (
                <View style={styles.messageStatus}>
                  {item.syncStatus === 'pending' && (
                    <Icon name="schedule" size={12} color={theme.colors.warning} />
                  )}
                  {item.syncStatus === 'synced' && (
                    <Icon name="done" size={12} color={theme.colors.success} />
                  )}
                  {item.syncStatus === 'failed' && (
                    <Icon name="error" size={12} color={theme.colors.error} />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderInputArea = () => {
    if (isRecordingVoice) {
      return (
        <View style={styles.inputContainer}>
          <VoiceMessageRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={handleVoiceRecordingCancel}
            style={styles.voiceRecorder}
          />
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => Alert.alert('Attach', 'File attachment feature')}
            activeOpacity={0.7}>
            <Icon name="attach-file" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textLight}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          
          {messageText.trim().length > 0 ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              activeOpacity={0.7}>
              <Icon name="send" size={20} color={theme.colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => setIsRecordingVoice(true)}
              activeOpacity={0.7}>
              <Icon name="mic" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>John Doe</Text>
          <Text style={styles.headerSubtitle}>Online</Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="more-vert" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: false})}
        />

        {/* Input Area */}
        {renderInputArea()}
      </KeyboardAvoidingView>
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
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.success,
    marginTop: 2,
  },
  moreButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  messageContainer: {
    marginBottom: theme.spacing.md,
  },
  timestampText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpacer: {
    width: 24,
    height: 24,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  ownMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.borderRadius.sm,
  },
  otherMessageBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.sm,
    ...theme.shadows.sm,
  },
  messageText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: 20,
  },
  ownMessageText: {
    color: theme.colors.surface,
  },
  otherMessageText: {
    color: theme.colors.textPrimary,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  messageTime: {
    fontSize: theme.typography.caption.fontSize,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: theme.colors.textLight,
  },
  messageStatus: {
    marginLeft: theme.spacing.xs,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRecorder: {
    flex: 1,
  },
});