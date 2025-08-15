import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  memberCount: number;
  isPrivate: boolean;
  requiresApproval: boolean;
}

interface InvitationRequest {
  communityId: string;
  emails: string[];
  message?: string;
}

interface CommunityInvitationProps {
  community: Community;
  onSendInvitations: (request: InvitationRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CommunityInvitation: React.FC<CommunityInvitationProps> = ({
  community,
  onSendInvitations,
  onCancel,
  isLoading = false
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    
    if (!email) {
      setErrors({ email: 'Please enter an email address' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    if (emails.includes(email)) {
      setErrors({ email: 'This email has already been added' });
      return;
    }

    setEmails(prev => [...prev, email]);
    setEmailInput('');
    setErrors({});
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (emails.length === 0) {
      setErrors({ general: 'Please add at least one email address' });
      return;
    }

    try {
      await onSendInvitations({
        communityId: community.id,
        emails,
        message: message.trim() || undefined
      });
    } catch (error) {
      setErrors({ general: 'Failed to send invitations. Please try again.' });
      console.error('Failed to send invitations:', error);
    }
  };

  const handleBulkEmailInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const emailMatches = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g);
    
    if (emailMatches) {
      const validEmails = emailMatches
        .map(email => email.toLowerCase())
        .filter(email => validateEmail(email) && !emails.includes(email));
      
      if (validEmails.length > 0) {
        setEmails(prev => [...prev, ...validEmails]);
        e.target.value = '';
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Invite Members to {community.name}</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Community Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">{community.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{community.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{community.memberCount} members</span>
            <span className="capitalize">{community.type} community</span>
            {community.isPrivate && <span>Private</span>}
            {community.requiresApproval && <span>Requires approval</span>}
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Email Addresses</h3>
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter email address"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={addEmail}
              variant="outline"
              disabled={isLoading}
            >
              Add
            </Button>
          </div>

          {/* Bulk Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or paste multiple emails (separated by spaces, commas, or new lines)
            </label>
            <textarea
              onChange={handleBulkEmailInput}
              placeholder="user1@example.com, user2@example.com, user3@example.com"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            />
          </div>

          {/* Email List */}
          {emails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Email addresses to invite ({emails.length})
              </h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {emails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center bg-primary-100 text-primary-800 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        disabled={isLoading}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Custom Message (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to your invitation..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            {message.length}/500 characters
          </p>
        </div>

        {/* Preview */}
        {emails.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Invitation Preview</h4>
            <div className="text-sm text-blue-800">
              <p className="mb-2">
                <strong>Subject:</strong> You're invited to join {community.name} on Teacher Hub
              </p>
              <div className="bg-white border border-blue-200 rounded p-3">
                <p className="mb-2">Hi there!</p>
                <p className="mb-2">
                  You've been invited to join the <strong>{community.name}</strong> community on Teacher Hub.
                </p>
                {message && (
                  <div className="mb-2 p-2 bg-gray-50 rounded border-l-4 border-primary-500">
                    <p className="text-sm italic">"{message}"</p>
                  </div>
                )}
                <p className="mb-2">{community.description}</p>
                <p className="text-sm text-gray-600">
                  This {community.type} community has {community.memberCount} members.
                  {community.requiresApproval && ' Your membership will need approval from the moderators.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={emails.length === 0 || isLoading}
          >
            {isLoading ? 'Sending...' : `Send ${emails.length} Invitation${emails.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Card>
  );
};