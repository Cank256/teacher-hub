import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: Attachment[];
  timestamp: Date;
  readBy: MessageRead[];
  syncStatus: 'synced' | 'pending' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  replyToId?: string;
}

interface MessageRead {
  userId: string;
  readAt: Date;
}

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: Message;
  lastActivity: Date;
  unreadCount: { [userId: string]: number };
  name?: string; // For group conversations
}

interface ConversationViewProps {
  conversation: Conversation;
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[], replyToId?: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMarkAsRead: (messageIds: string[]) => void;
  onTypingIndicator?: (isTyping: boolean) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onMarkAsRead,
  onTypingIndicator
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when conversation is viewed
    const unreadMessages = messages
      .filter(msg => 
        msg.senderId !== currentUserId && 
        !msg.readBy.some(read => read.userId === currentUserId)
      )
      .map(msg => msg.id);
    
    if (unreadMessages.length > 0) {
      onMarkAsRead(unreadMessages);
    }
  }, [messages, currentUserId, onMarkAsRead]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real implementation, this would fetch from API
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: 'user1',
          recipientId: currentUserId,
          content: 'Hi! I saw your post about fraction teaching methods.',
          type: 'text',
          attachments: [],
          timestamp: new Date(Date.now() - 3600000),
          readBy: [{ userId: currentUserId, readAt: new Date() }],
          syncStatus: 'synced',
          isEdited: false
        },
        {
          id: '2',
          senderId: currentUserId,
          recipientId: 'user1',
          content: 'Yes! I find visual aids really help students understand fractions better.',
          type: 'text',
          attachments: [],
          timestamp: new Date(Date.now() - 3300000),
          readBy: [{ userId: 'user1', readAt: new Date() }],
          syncStatus: 'synced',
          isEdited: false
        },
        {
          id: '3',
          senderId: 'user1',
          recipientId: currentUserId,
          content: 'Could you share some of those visual aids? I\'d love to try them with my class.',
          type: 'text',
          attachments: [],
          timestamp: new Date(Date.now() - 1800000),
          readBy: [],
          syncStatus: 'synced',
          isEdited: false,
          replyToId: '2'
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    onSendMessage(newMessage, attachments, replyingTo?.id);
    setNewMessage('');
    setAttachments([]);
    setReplyingTo(null);
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setEditingMessage(messageId);
      setEditContent(message.content);
    }
  };

  const handleSaveEdit = () => {
    if (editingMessage && editContent.trim()) {
      onEditMessage(editingMessage, editContent);
      setEditingMessage(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const getMessageSender = (senderId: string) => {
    // In a real implementation, this would look up user details
    return senderId === currentUserId ? 'You' : 'Sarah Nakato';
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getRepliedMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading conversation...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col" padding="none">
      {/* Conversation Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {conversation.type === 'group' ? conversation.name : 'Sarah Nakato'}
          </h3>
          <p className="text-sm text-gray-500">
            {conversation.type === 'group' 
              ? `${conversation.participants.length} members`
              : 'Online'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="More options">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
            senderName={getMessageSender(message.senderId)}
            repliedMessage={message.replyToId ? getRepliedMessage(message.replyToId) : undefined}
            isEditing={editingMessage === message.id}
            editContent={editContent}
            onEditContent={setEditContent}
            onEdit={() => handleEditMessage(message.id)}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={() => onDeleteMessage(message.id)}
            onReply={() => handleReplyToMessage(message)}
            formatTimestamp={formatTimestamp}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Replying to <span className="font-medium">{getMessageSender(replyingTo.senderId)}</span>
              </p>
              <p className="text-sm text-gray-500 truncate">{replyingTo.content}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white rounded-lg p-2 border">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-gray-700 truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);
                
                // Send typing indicator
                if (onTypingIndicator) {
                  if (value.trim() && !newMessage.trim()) {
                    // Started typing
                    onTypingIndicator(true);
                  } else if (!value.trim() && newMessage.trim()) {
                    // Stopped typing
                    onTypingIndicator(false);
                  }
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              onBlur={() => {
                // Stop typing indicator when input loses focus
                if (onTypingIndicator) {
                  onTypingIndicator(false);
                }
              }}
              multiline
              rows={1}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && attachments.length === 0}
              className="px-4 py-2"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  repliedMessage?: Message;
  isEditing: boolean;
  editContent: string;
  onEditContent: (content: string) => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  formatTimestamp: (timestamp: Date) => string;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  senderName,
  repliedMessage,
  isEditing,
  editContent,
  onEditContent,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
  formatTimestamp
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Replied Message Preview */}
        {repliedMessage && (
          <div className={`mb-2 p-2 rounded-lg border-l-4 text-sm ${
            isOwn 
              ? 'bg-primary-50 border-primary-300 text-primary-800'
              : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}>
            <p className="font-medium text-xs mb-1">
              Replying to {repliedMessage.senderId === message.senderId ? 'themselves' : 'previous message'}
            </p>
            <p className="truncate">{repliedMessage.content}</p>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => onEditContent(e.target.value)}
                className="w-full p-2 text-sm border rounded resize-none text-gray-900"
                rows={2}
              />
              <div className="flex space-x-2">
                <button
                  onClick={onSaveEdit}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm">{message.content}</p>
              
              {/* Attachments */}
              {message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>{attachment.originalName}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Message Info */}
        <div className={`flex items-center space-x-2 mt-1 text-xs ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span className={`${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
            {formatTimestamp(message.timestamp)}
          </span>
          {message.isEdited && (
            <span className={`${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
              (edited)
            </span>
          )}
          {message.syncStatus === 'pending' && (
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          )}
          {message.syncStatus === 'failed' && (
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Message Actions */}
      {showActions && !isEditing && (
        <div className={`flex items-center space-x-1 ${
          isOwn ? 'order-1 mr-2' : 'order-2 ml-2'
        }`}>
          <button
            onClick={onReply}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Reply"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          
          {isOwn && (
            <>
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};