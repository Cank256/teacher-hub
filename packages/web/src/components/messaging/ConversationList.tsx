import React, { useState, useEffect } from 'react';
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
  avatarUrl?: string;
}

interface ConversationListProps {
  currentUserId: string;
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  currentUserId,
  selectedConversationId,
  onConversationSelect,
  onNewConversation
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

  useEffect(() => {
    loadConversations();
  }, [currentUserId]);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery, filter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real implementation, this would fetch from API
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participants: [currentUserId, 'user1'],
          type: 'direct',
          lastMessage: {
            id: '3',
            senderId: 'user1',
            recipientId: currentUserId,
            content: 'Thanks for sharing those math resources!',
            type: 'text',
            attachments: [],
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
            readBy: [],
            syncStatus: 'synced',
            isEdited: false
          },
          lastActivity: new Date(Date.now() - 7200000),
          unreadCount: { [currentUserId]: 1 },
          name: 'Sarah Nakato'
        },
        {
          id: '2',
          participants: [currentUserId, 'user2', 'user3', 'user4'],
          type: 'group',
          lastMessage: {
            id: '5',
            senderId: 'user2',
            groupId: '2',
            content: 'New curriculum guidelines discussion',
            type: 'text',
            attachments: [],
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            readBy: [{ userId: currentUserId, readAt: new Date(Date.now() - 86400000) }],
            syncStatus: 'synced',
            isEdited: false
          },
          lastActivity: new Date(Date.now() - 86400000),
          unreadCount: { [currentUserId]: 0 },
          name: 'Mathematics Teachers Group'
        },
        {
          id: '3',
          participants: [currentUserId, 'user5'],
          type: 'direct',
          lastMessage: {
            id: '7',
            senderId: 'user5',
            recipientId: currentUserId,
            content: 'How do you handle large class sizes?',
            type: 'text',
            attachments: [],
            timestamp: new Date(Date.now() - 259200000), // 3 days ago
            readBy: [{ userId: currentUserId, readAt: new Date(Date.now() - 259200000) }],
            syncStatus: 'synced',
            isEdited: false
          },
          lastActivity: new Date(Date.now() - 259200000),
          unreadCount: { [currentUserId]: 0 },
          name: 'John Mukasa'
        }
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(conversation =>
        conversation.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(conversation => 
          (conversation.unreadCount[currentUserId] || 0) > 0
        );
        break;
      case 'groups':
        filtered = filtered.filter(conversation => conversation.type === 'group');
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Sort by last activity (most recent first)
    filtered.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    setFilteredConversations(filtered);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCount[currentUserId] || 0;
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + getUnreadCount(conv), 0);
  };

  const getGroupsCount = () => {
    return conversations.filter(conv => conv.type === 'group').length;
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading conversations...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <Button
            onClick={onNewConversation}
            size="sm"
            className="flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New</span>
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3"
        />

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'unread'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Unread ({getTotalUnreadCount()})
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'groups'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Groups ({getGroupsCount()})
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="overflow-y-auto flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery.trim() 
              ? 'No conversations found matching your search.'
              : filter === 'unread'
              ? 'No unread messages.'
              : filter === 'groups'
              ? 'No group conversations yet.'
              : 'No conversations yet. Start by finding teachers to connect with.'
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                unreadCount={getUnreadCount(conversation)}
                onSelect={() => onConversationSelect(conversation)}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  unreadCount: number;
  onSelect: () => void;
  formatTimestamp: (timestamp: Date) => string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  unreadCount,
  onSelect,
  formatTimestamp
}) => {
  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    const { content, type, senderId } = conversation.lastMessage;
    const senderName = senderId === 'currentUser' ? 'You' : 'Sender';
    
    if (type === 'file') return `${senderName} sent a file`;
    if (type === 'image') return `${senderName} sent an image`;
    
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  const getConversationAvatar = () => {
    if (conversation.avatarUrl) {
      return (
        <img
          src={conversation.avatarUrl}
          alt={conversation.name}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }

    if (conversation.type === 'group') {
      return (
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      );
    }

    // Direct conversation - show first letter of name
    const firstLetter = conversation.name?.charAt(0).toUpperCase() || '?';
    return (
      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-gray-600 font-medium text-lg">{firstLetter}</span>
      </div>
    );
  };

  return (
    <div
      className={`p-4 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary-50 border-r-2 border-primary-500'
          : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {getConversationAvatar()}
        </div>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`text-sm font-medium truncate ${
              unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {conversation.name || 'Unknown'}
            </h3>
            <div className="flex items-center space-x-2">
              {conversation.lastMessage && (
                <span className="text-xs text-gray-500">
                  {formatTimestamp(conversation.lastMessage.timestamp)}
                </span>
              )}
              {unreadCount > 0 && (
                <div className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
          </div>
          
          <p className={`text-sm truncate ${
            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
          }`}>
            {getLastMessagePreview()}
          </p>
          
          {/* Conversation Type Indicator */}
          <div className="flex items-center space-x-2 mt-1">
            {conversation.type === 'group' && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{conversation.participants.length} members</span>
              </div>
            )}
            
            {conversation.lastMessage?.syncStatus === 'pending' && (
              <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
            
            {conversation.lastMessage?.syncStatus === 'failed' && (
              <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};