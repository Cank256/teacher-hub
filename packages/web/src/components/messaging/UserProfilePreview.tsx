import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

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

interface UserProfilePreviewProps {
  userId: string;
  onClose: () => void;
  onStartConversation: (user: UserSearchResult) => void;
  onAddToFavorites?: (user: UserSearchResult) => void;
}

export const UserProfilePreview: React.FC<UserProfilePreviewProps> = ({
  userId,
  onClose,
  onStartConversation,
  onAddToFavorites
}) => {
  const [user, setUser] = useState<UserSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // TODO: Check if user is in favorites
        // setIsFavorite(checkIfFavorite(userData.id));
      } else {
        setError('Failed to load user profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (user) {
      onStartConversation(user);
      onClose();
    }
  };

  const handleAddToFavorites = () => {
    if (user && onAddToFavorites) {
      onAddToFavorites(user);
      setIsFavorite(!isFavorite);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <div className="p-6 text-center">
            <p className="text-red-600">{error || 'User not found'}</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Teacher Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile Header */}
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 font-medium text-2xl">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.fullName}
                </h3>
                {user.verificationStatus === 'verified' && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{user.email}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{user.yearsExperience} years experience</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  user.verificationStatus === 'verified' 
                    ? 'bg-green-100 text-green-800'
                    : user.verificationStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.verificationStatus === 'verified' ? 'Verified' : 
                   user.verificationStatus === 'pending' ? 'Pending' : 'Not Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">About</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Location */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Location</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{user.schoolLocation.region}, {user.schoolLocation.district}</span>
            </div>
          </div>

          {/* Subjects */}
          {user.subjects.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Subjects</h4>
              <div className="flex flex-wrap gap-2">
                {user.subjects.map(subject => (
                  <span
                    key={subject}
                    className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded-full"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grade Levels */}
          {user.gradeLevels.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Grade Levels</h4>
              <div className="flex flex-wrap gap-2">
                {user.gradeLevels.map(grade => (
                  <span
                    key={grade}
                    className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                  >
                    {grade}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Member Since</h4>
            <p className="text-sm text-gray-600">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleStartConversation}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Start Conversation</span>
            </Button>
            
            {onAddToFavorites && (
              <Button
                variant="outline"
                onClick={handleAddToFavorites}
                className="flex items-center justify-center space-x-2"
              >
                <svg 
                  className={`w-4 h-4 ${isFavorite ? 'fill-current text-yellow-500' : ''}`} 
                  fill={isFavorite ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};