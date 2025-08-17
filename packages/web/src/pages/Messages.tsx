import React, { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { UserSearch, UserProfilePreview, ContactList, PrivacyControls, ConversationView, ConversationList, ConnectionStatus, TypingIndicator } from '../components/messaging';
import { useRealTimeMessaging } from '../hooks/useRealTimeMessaging';
import { WebSocketDebug } from '../components/debug/WebSocketDebug';

interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  yearsExperience: number;
  createdAt: Date;
}

interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: any;
  lastActivity: Date;
  unreadCount: { [userId: string]: number };
  name?: string;
}

export const Messages: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
  const [showContactList, setShowContactList] = useState(false);
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  
  // Get current user from auth state
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const currentUserId = user?.id;

  // Real-time messaging hook - only initialize if user is authenticated
  const {
    connectionStatus,
    sendMessage: sendRealtimeMessage,
    markMessageAsRead,
    sendTypingIndicator,
    getTypingUsers,
    getUserPresence,
    getUnreadCount,
    isConnected
  } = useRealTimeMessaging({
    currentUserId: currentUserId || '',
    conversationId: selectedConversation?.id,
    onNewMessage: (message) => {
      console.log('New message received:', message);
      // In real implementation, this would update the messages state
    },
    onTypingUpdate: (typing) => {
      console.log('Typing update:', typing);
    },
    onPresenceUpdate: (presence) => {
      console.log('Presence update:', presence);
    }
  });

  // Message handling functions
  const handleSendMessage = (content: string, attachments?: File[], replyToId?: string) => {
    console.log('Sending message:', { content, attachments, replyToId });
    // Send via real-time service
    sendRealtimeMessage(content, attachments, replyToId);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    console.log('Editing message:', messageId, newContent);
    // In real implementation, this would edit the message via API
  };

  const handleDeleteMessage = (messageId: string) => {
    console.log('Deleting message:', messageId);
    // In real implementation, this would delete the message via API
  };

  const handleMarkAsRead = (messageIds: string[]) => {
    console.log('Marking messages as read:', messageIds);
    // In real implementation, this would mark messages as read via API
  };

  const handleUserSelect = (user: UserSearchResult) => {
    // Add user to contacts if not already there
    const existingContacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const isAlreadyContact = existingContacts.some((contact: any) => contact.id === user.id);
    
    if (!isAlreadyContact) {
      const newContact = { ...user, isFavorite: false };
      const updatedContacts = [...existingContacts, newContact];
      localStorage.setItem('userContacts', JSON.stringify(updatedContacts));
    }
    
    // Start a new conversation with the user
    // In a real implementation, this would create a conversation via API
    console.log('Starting conversation with:', user.fullName);
    setShowUserSearch(false);
  };

  const handleStartConversation = (user: UserSearchResult) => {
    // Start conversation logic
    console.log('Starting conversation with:', user.fullName);
    setShowUserProfile(null);
  };

  const handleAddToFavorites = (user: UserSearchResult) => {
    const existingContacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const updatedContacts = existingContacts.map((contact: any) =>
      contact.id === user.id ? { ...contact, isFavorite: true } : contact
    );
    
    // If user is not in contacts, add them as a favorite
    if (!existingContacts.some((contact: any) => contact.id === user.id)) {
      updatedContacts.push({ ...user, isFavorite: true });
    }
    
    localStorage.setItem('userContacts', JSON.stringify(updatedContacts));
  };

  // Show loading or redirect if not authenticated
  if (!isAuthenticated || !currentUserId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-600">
            Please log in to access messaging features
          </p>
        </div>
        <Card className="p-6 text-center">
          <p className="text-gray-600">You need to be logged in to send and receive messages.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect and collaborate with fellow teachers
        </p>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        isConnected={connectionStatus.isConnected}
        isConnecting={connectionStatus.isConnecting}
        lastConnected={connectionStatus.lastConnected}
        reconnectAttempts={connectionStatus.reconnectAttempts}
        onReconnect={() => {
          // Trigger reconnection
          window.location.reload();
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <ConversationList
            currentUserId={currentUserId}
            selectedConversationId={selectedConversation?.id}
            onConversationSelect={setSelectedConversation}
            onNewConversation={() => setShowUserSearch(true)}
          />
          
          {/* Quick Actions */}
          <div className="mt-4 flex space-x-2">
            <Button
              onClick={() => setShowContactList(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Contacts</span>
            </Button>
            
            <Button
              onClick={() => setShowPrivacyControls(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privacy</span>
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              <ConversationView
                conversation={selectedConversation}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onMarkAsRead={handleMarkAsRead}
                onTypingIndicator={sendTypingIndicator}
              />
              
              {/* Typing Indicator */}
              <div className="px-4 pb-2">
                <TypingIndicator
                  typingUsers={getTypingUsers()}
                  getUserName={(userId) => `User ${userId}`} // In real app, get actual names
                />
              </div>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-600 mb-2">Select a conversation to start messaging</p>
                <Button onClick={() => setShowUserSearch(true)} variant="outline">
                  Find Teachers to Message
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch
          onUserSelect={handleUserSelect}
          onClose={() => setShowUserSearch(false)}
        />
      )}

      {/* User Profile Preview Modal */}
      {showUserProfile && (
        <UserProfilePreview
          userId={showUserProfile}
          onClose={() => setShowUserProfile(null)}
          onStartConversation={handleStartConversation}
          onAddToFavorites={handleAddToFavorites}
        />
      )}

      {/* Contact List Modal */}
      {showContactList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md h-[80vh]">
            <ContactList
              onContactSelect={(contact) => {
                console.log('Selected contact:', contact.fullName);
                setShowContactList(false);
              }}
              onStartConversation={(contact) => {
                handleStartConversation(contact);
                setShowContactList(false);
              }}
            />
          </div>
          <button
            onClick={() => setShowContactList(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Privacy Controls Modal */}
      {showPrivacyControls && (
        <PrivacyControls
          onClose={() => setShowPrivacyControls(false)}
          onSave={(settings) => {
            console.log('Privacy settings saved:', settings);
          }}
        />
      )}

      {/* Debug component - remove in production */}
      <WebSocketDebug />
    </div>
  );
};