import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  ViewStyle,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import ImagePicker from 'react-native-image-crop-picker';
import type { MessageType } from '@/types/messaging';

interface MessageInputProps {
  onSendMessage: (content: string, type?: MessageType, attachments?: File[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  isLoading?: boolean;
  style?: ViewStyle;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isLoading = false,
  style,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleTextChange = useCallback((text: string) => {
    setMessage(text);

    // Handle typing indicators
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 1000);
  }, [isTyping, onTypingStart, onTypingStop]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [message, isLoading, isTyping, onSendMessage, onTypingStop]);

  const handleAttachmentPress = useCallback(() => {
    const options = [
      'Camera',
      'Photo Library',
      'Document',
      'Cancel'
    ];

    const showActionSheet = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 3,
          },
          (buttonIndex) => {
            switch (buttonIndex) {
              case 0:
                handleCameraPress();
                break;
              case 1:
                handlePhotoLibraryPress();
                break;
              case 2:
                handleDocumentPress();
                break;
            }
          }
        );
      } else {
        // For Android, you might want to use a custom modal or react-native-action-sheet
        Alert.alert(
          'Add Attachment',
          'Choose an option',
          [
            { text: 'Camera', onPress: handleCameraPress },
            { text: 'Photo Library', onPress: handlePhotoLibraryPress },
            { text: 'Document', onPress: handleDocumentPress },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    };

    showActionSheet();
  }, []);

  const handleCameraPress = useCallback(async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 1024,
        height: 1024,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      const file = {
        uri: image.path,
        type: image.mime,
        name: `image_${Date.now()}.jpg`,
      } as any;

      onSendMessage('', 'image', [file]);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  }, [onSendMessage]);

  const handlePhotoLibraryPress = useCallback(async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 1024,
        height: 1024,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      const file = {
        uri: image.path,
        type: image.mime,
        name: `image_${Date.now()}.jpg`,
      } as any;

      onSendMessage('', 'image', [file]);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select photo');
      }
    }
  }, [onSendMessage]);

  const handleDocumentPress = useCallback(async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const document = result[0];
        
        // Check file size (10MB limit)
        if (document.size && document.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
          return;
        }

        const file = {
          uri: document.fileCopyUri || document.uri,
          type: document.type,
          name: document.name,
        } as any;

        onSendMessage('', 'document', [file]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select document');
      }
    }
  }, [onSendMessage]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={handleAttachmentPress}
          disabled={isLoading}
        >
          <Text style={styles.attachmentIcon}>📎</Text>
        </TouchableOpacity>

        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={message}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (message.trim().length === 0 || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={message.trim().length === 0 || isLoading}
        >
          <Text style={[
            styles.sendButtonText,
            (message.trim().length === 0 || isLoading) && styles.sendButtonTextDisabled
          ]}>
            {isLoading ? '...' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 40,
  },
  attachmentButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  attachmentIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 100,
    color: '#000',
  },
  sendButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});