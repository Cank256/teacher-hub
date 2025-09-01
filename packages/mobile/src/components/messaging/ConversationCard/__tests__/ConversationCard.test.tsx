import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ConversationCard } from '../ConversationCard';
import type { Conversation } from '@/types/messaging';

const mockConversation: Conversation = {
  id: 'conv-1',
  participants: [
    {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: 'https://example.com/avatar.jpg',
    },
    {
      id: 'current-user-id',
      email: 'me@example.com',
      firstName: 'Current',
      lastName: 'User',
    },
  ],
  unreadCount: 2,
  isGroup: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  lastMessage: {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello there!',
    type: 'text',
    timestamp: new Date('2024-01-02'),
    isRead: false,
    deliveryStatus: 'delivered',
  },
};

const mockGroupConversation: Conversation = {
  ...mockConversation,
  id: 'group-conv-1',
  isGroup: true,
  name: 'Math Teachers Group',
  participants: [
    ...mockConversation.participants,
    {
      id: 'user-2',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ],
};

describe('ConversationCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render direct conversation correctly', () => {
    render(
      <ConversationCard 
        conversation={mockConversation} 
        onPress={mockOnPress} 
      />
    );

    // Should show the other participant's name
    expect(screen.getByText('John Doe')).toBeTruthy();
    
    // Should show last message with sender prefix
    expect(screen.getByText('Hello there!')).toBeTruthy();
    
    // Should show unread count
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('should render group conversation correctly', () => {
    render(
      <ConversationCard 
        conversation={mockGroupConversation} 
        onPress={mockOnPress} 
      />
    );

    // Should show group name
    expect(screen.getByText('Math Teachers Group')).toBeTruthy();
  });

  it('should handle conversation without last message', () => {
    const conversationWithoutMessage = {
      ...mockConversation,
      lastMessage: undefined,
    };

    render(
      <ConversationCard 
        conversation={conversationWithoutMessage} 
        onPress={mockOnPress} 
      />
    );

    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  it('should handle different message types', () => {
    const conversationWithImage = {
      ...mockConversation,
      lastMessage: {
        ...mockConversation.lastMessage!,
        type: 'image' as const,
        content: '',
      },
    };

    render(
      <ConversationCard 
        conversation={conversationWithImage} 
        onPress={mockOnPress} 
      />
    );

    expect(screen.getByText('📷 Photo')).toBeTruthy();
  });

  it('should show current user prefix for own messages', () => {
    const conversationWithOwnMessage = {
      ...mockConversation,
      lastMessage: {
        ...mockConversation.lastMessage!,
        senderId: 'current-user-id',
        content: 'My message',
      },
    };

    render(
      <ConversationCard 
        conversation={conversationWithOwnMessage} 
        onPress={mockOnPress} 
      />
    );

    expect(screen.getByText('You: My message')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    render(
      <ConversationCard 
        conversation={mockConversation} 
        onPress={mockOnPress} 
      />
    );

    fireEvent.press(screen.getByText('John Doe'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not show unread badge when count is 0', () => {
    const readConversation = {
      ...mockConversation,
      unreadCount: 0,
    };

    render(
      <ConversationCard 
        conversation={readConversation} 
        onPress={mockOnPress} 
      />
    );

    expect(screen.queryByText('0')).toBeNull();
  });

  it('should show 99+ for high unread counts', () => {
    const highUnreadConversation = {
      ...mockConversation,
      unreadCount: 150,
    };

    render(
      <ConversationCard 
        conversation={highUnreadConversation} 
        onPress={mockOnPress} 
      />
    );

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('should render default avatar when no profile picture', () => {
    const conversationWithoutAvatar = {
      ...mockConversation,
      participants: [
        {
          ...mockConversation.participants[0],
          profilePicture: undefined,
        },
        mockConversation.participants[1],
      ],
    };

    render(
      <ConversationCard 
        conversation={conversationWithoutAvatar} 
        onPress={mockOnPress} 
      />
    );

    // Should show first letter of name
    expect(screen.getByText('J')).toBeTruthy();
  });
});