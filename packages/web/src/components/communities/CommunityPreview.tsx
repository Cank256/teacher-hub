import React from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  moderators: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  rules: CommunityRule[];
  imageUrl?: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  yearsExperience: number;
}

interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: Date;
}

interface MemberWithProfile extends CommunityMembership {
  user: UserProfile;
}

interface CommunityPreviewProps {
  community: Community;
  owner: UserProfile;
  moderators: UserProfile[];
  recentMembers: MemberWithProfile[];
  currentUserId?: string;
  membership?: CommunityMembership;
  onJoin: (communityId: string) => Promise<void>;
  onLeave: (communityId: string) => Promise<void>;
  onCancelRequest: (communityId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const CommunityPreview: React.FC<CommunityPreviewProps> = ({
  community,
  owner,
  moderators,
  recentMembers,
  currentUserId,
  membership,
  onJoin,
  onLeave,
  onCancelRequest,
  onClose,
  isLoading = false
}) => {
  const isOwner = membership?.role === 'owner';
  const isModerator = membership?.role === 'moderator';
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const isBanned = membership?.status === 'banned';

  const canJoin = currentUserId && !membership && !isBanned;
  const canLeave = membership && !isOwner;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Community Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Community Header */}
          <div className="flex items-start space-x-4">
            {community.imageUrl ? (
              <img
                src={community.imageUrl}
                alt={community.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">
                  {community.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{community.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
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
                    Pending Approval
                  </span>
                )}
                {isBanned && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                    Banned
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{community.memberCount.toLocaleString()} members</span>
                <span>{community.postCount.toLocaleString()} posts</span>
                <span>Created {new Date(community.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700">{community.description}</p>
          </div>

          {/* Community Rules */}
          {community.rules.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Community Rules</h3>
              <div className="space-y-3">
                {community.rules.map((rule, index) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {index + 1}. {rule.title}
                    </h4>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner and Moderators */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Community Leadership</h3>
            <div className="space-y-3">
              {/* Owner */}
              <div className="flex items-center space-x-3">
                {owner.profileImageUrl ? (
                  <img
                    src={owner.profileImageUrl}
                    alt={owner.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {owner.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{owner.fullName}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      Owner
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{owner.yearsExperience} years experience</p>
                </div>
              </div>

              {/* Moderators */}
              {moderators.map((moderator) => (
                <div key={moderator.id} className="flex items-center space-x-3">
                  {moderator.profileImageUrl ? (
                    <img
                      src={moderator.profileImageUrl}
                      alt={moderator.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {moderator.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{moderator.fullName}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Moderator
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{moderator.yearsExperience} years experience</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Members */}
          {recentMembers.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recent Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentMembers.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    {member.user.profileImageUrl ? (
                      <img
                        src={member.user.profileImageUrl}
                        alt={member.user.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {member.user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{member.user.fullName}</span>
                      <p className="text-xs text-gray-600">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {community.memberCount > 6 && (
                <p className="text-sm text-gray-500 mt-2">
                  And {community.memberCount - 6} more members...
                </p>
              )}
            </div>
          )}

          {/* Join Requirements */}
          {community.requiresApproval && !isMember && !isPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-medium text-yellow-800">Approval Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This community requires approval from moderators before you can join. 
                    Your request will be reviewed and you'll be notified of the decision.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Close
            </Button>

            {canJoin && (
              <Button
                onClick={() => onJoin(community.id)}
                disabled={isLoading}
              >
                {community.requiresApproval ? 'Request to Join' : 'Join Community'}
              </Button>
            )}

            {isPending && (
              <Button
                variant="outline"
                onClick={() => onCancelRequest(community.id)}
                disabled={isLoading}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Cancel Request
              </Button>
            )}

            {isMember && canLeave && (
              <Button
                variant="outline"
                onClick={() => onLeave(community.id)}
                disabled={isLoading}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Leave Community
              </Button>
            )}

            {isBanned && (
              <Button
                variant="outline"
                disabled
                className="opacity-50"
              >
                You are banned from this community
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};