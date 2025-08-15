import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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

interface Contact extends UserSearchResult {
  isFavorite: boolean;
  lastMessageAt?: Date;
  isOnline?: boolean;
}

interface ContactListProps {
  onContactSelect: (contact: Contact) => void;
  onStartConversation: (contact: Contact) => void;
  selectedContactId?: string;
}

export const ContactList: React.FC<ContactListProps> = ({
  onContactSelect,
  onStartConversation,
  selectedContactId
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'online'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery, activeTab]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // For now, we'll simulate loading contacts from localStorage
      // In a real implementation, this would come from an API
      const savedContacts = localStorage.getItem('userContacts');
      const contactsData = savedContacts ? JSON.parse(savedContacts) : [];
      
      // Add mock online status and last message data
      const contactsWithStatus = contactsData.map((contact: Contact) => ({
        ...contact,
        isOnline: Math.random() > 0.5, // Mock online status
        lastMessageAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random last message within a week
      }));
      
      setContacts(contactsWithStatus);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(contact =>
        contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.subjects.some(subject => 
          subject.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by tab
    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(contact => contact.isFavorite);
        break;
      case 'online':
        filtered = filtered.filter(contact => contact.isOnline);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Sort by favorites first, then by last message time
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });

    setFilteredContacts(filtered);
  };

  const addToFavorites = (contactId: string) => {
    const updatedContacts = contacts.map(contact =>
      contact.id === contactId
        ? { ...contact, isFavorite: !contact.isFavorite }
        : contact
    );
    
    setContacts(updatedContacts);
    
    // Save to localStorage
    localStorage.setItem('userContacts', JSON.stringify(updatedContacts));
  };

  const removeContact = (contactId: string) => {
    const updatedContacts = contacts.filter(contact => contact.id !== contactId);
    setContacts(updatedContacts);
    
    // Save to localStorage
    localStorage.setItem('userContacts', JSON.stringify(updatedContacts));
  };

  const getTabCount = (tab: 'all' | 'favorites' | 'online') => {
    switch (tab) {
      case 'favorites':
        return contacts.filter(c => c.isFavorite).length;
      case 'online':
        return contacts.filter(c => c.isOnline).length;
      default:
        return contacts.length;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading contacts...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-3">Contacts</h2>
        
        {/* Search */}
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3"
        />

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              activeTab === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({getTabCount('all')})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              activeTab === 'favorites'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Favorites ({getTabCount('favorites')})
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              activeTab === 'online'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Online ({getTabCount('online')})
          </button>
        </div>
      </div>

      {/* Contact List */}
      <div className="overflow-y-auto flex-1">
        {filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery.trim() 
              ? 'No contacts found matching your search.'
              : activeTab === 'favorites'
              ? 'No favorite contacts yet.'
              : activeTab === 'online'
              ? 'No contacts are currently online.'
              : 'No contacts yet. Start by searching for teachers to connect with.'
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map(contact => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={contact.id === selectedContactId}
                onSelect={() => onContactSelect(contact)}
                onStartConversation={() => onStartConversation(contact)}
                onToggleFavorite={() => addToFavorites(contact.id)}
                onRemove={() => removeContact(contact.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

interface ContactItemProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onStartConversation: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
}

const ContactItem: React.FC<ContactItemProps> = ({
  contact,
  isSelected,
  onSelect,
  onStartConversation,
  onToggleFavorite,
  onRemove
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`p-3 cursor-pointer transition-colors relative ${
        isSelected
          ? 'bg-primary-50 border-r-2 border-primary-500'
          : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center space-x-3">
        {/* Profile Image with Online Status */}
        <div className="relative">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
            {contact.profileImageUrl ? (
              <img
                src={contact.profileImageUrl}
                alt={contact.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {contact.fullName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {contact.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        {/* Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {contact.fullName}
            </p>
            {contact.isFavorite && (
              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
            {contact.verificationStatus === 'verified' && (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{contact.schoolLocation.region}</span>
            {contact.subjects.length > 0 && (
              <>
                <span>•</span>
                <span>{contact.subjects[0]}{contact.subjects.length > 1 ? ` +${contact.subjects.length - 1}` : ''}</span>
              </>
            )}
          </div>
          
          {contact.lastMessageAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last active {formatRelativeTime(contact.lastMessageAt)}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onStartConversation}
              className="p-1 text-gray-400 hover:text-primary-600 rounded"
              title="Start conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <button
              onClick={onToggleFavorite}
              className={`p-1 rounded ${
                contact.isFavorite 
                  ? 'text-yellow-500 hover:text-yellow-600' 
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg 
                className="w-4 h-4" 
                fill={contact.isFavorite ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Remove contact"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}