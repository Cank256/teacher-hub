import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  moderators: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  imageUrl?: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: Date;
}

interface CommunityCardProps {
  community: Community;
  currentUserId?: string;
  membership?: CommunityMembership;
  onJoin: (communityId: string) => Promise<void>;
  onLeave: (communityId: string) => Promise<void>;
  onCancelRequest: (communityId: string) => Promise<void>;
  onViewDetails: (communityId: string) => void;
  isLoading?: boolean;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  currentUserId,
  membership,
  onJoin,
  onLeave,
  onCancelRequest,
  onViewDetails,
  isLoading = false
}) => {
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = membership?.role === 'owner';
  const isModerator = membership?.role === 'moderator';
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const isBanned = membership?.status === 'banned';

  const canJoin = currentUserId && !membership && !isBanned;
  const canLeave = membership && !isOwner;

  const handleJoin = async () => {
    if (!canJoin) return;
    
    setActionLoading(true);
    try {
      await onJoin(community.id);
    } catch (error) {
      console.error('Failed to join community:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!canLeave) return;
    
    setActionLoading(true);
    try {
      await onLeave(community.id);
    } catch (error) {
      console.error('Failed to leave community:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!isPending) return;
    
    setActionLoading(true);
    try {
      await onCancelRequest(community.id);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subject':
        return 'bg-blue-100 text-blue-800';
      case 'region':
        return 'bg-green-100 text-green-800';
      case 'grade':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {community.imageUrl ? (
                <img
                  src={community.imageUrl}
                  alt={community.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {community.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <CardTitle className="text-lg">{community.name}</CardTitle>
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(community.type)}`}>
                {community.type.charAt(0).toUpperCase() + community.type.slice(1)}
              </span>
              {community.isPrivate && (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                  Private
                </span>
              )}
              {membership && (
                <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(membership.role)}`}>
                  {membership.role}
                </span>
              )}
              {isPending && (
                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                  Pending
                </span>
              )}
              {isBanned && (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                  Banned
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              <span>{community.memberCount.toLocaleString()} members</span>
              <span>{community.postCount.toLocaleString()} posts</span>
              {community.requiresApproval && (
                <span className="text-xs text-gray-500">Requires approval</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="px-6 pb-4 flex-1">
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {community.description}
        </p>

        <div className="text-xs text-gray-500 mb-4">
          Created {new Date(community.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex space-x-2">
          {/* Join/Leave Actions */}
          {canJoin && (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isLoading || actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Joining...' : 
               community.requiresApproval ? 'Request to Join' : 'Join Community'}
            </Button>
          )}

          {isPending && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelRequest}
              disabled={isLoading || actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Canceling...' : 'Cancel Request'}
            </Button>
          )}

          {isMember && canLeave && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLeave}
              disabled={isLoading || actionLoading}
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              {actionLoading ? 'Leaving...' : 'Leave Community'}
            </Button>
          )}

          {isBanned && (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="flex-1 opacity-50"
            >
              Banned
            </Button>
          )}

          {/* View Details */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(community.id)}
            disabled={isLoading}
          >
            View Details
          </Button>
        </div>

        {/* Additional info for owners/moderators */}
        {(isOwner || isModerator) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>You can manage this community</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetails(community.id)}
                className="text-xs py-1 px-2 h-auto"
              >
                Manage
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};