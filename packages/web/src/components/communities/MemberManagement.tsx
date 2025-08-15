import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface CommunityPermission {
  action: 'post' | 'comment' | 'moderate' | 'invite' | 'manage_members';
  granted: boolean;
}

interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: Date;
  permissions: CommunityPermission[];
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

interface MemberWithProfile extends CommunityMembership {
  user: UserProfile;
}

interface MemberManagementProps {
  communityId: string;
  members: MemberWithProfile[];
  pendingRequests: MemberWithProfile[];
  currentUserRole: 'member' | 'moderator' | 'owner';
  onApproveMember: (membershipId: string) => Promise<void>;
  onRejectMember: (membershipId: string) => Promise<void>;
  onPromoteMember: (membershipId: string, newRole: 'moderator' | 'member') => Promise<void>;
  onRemoveMember: (membershipId: string) => Promise<void>;
  onBanMember: (membershipId: string) => Promise<void>;
  onUnbanMember: (membershipId: string) => Promise<void>;
  onInviteMember: (email: string) => Promise<void>;
  isLoading?: boolean;
}

type MemberAction = 'promote' | 'demote' | 'remove' | 'ban' | 'unban';

export const MemberManagement: React.FC<MemberManagementProps> = ({
  communityId,
  members,
  pendingRequests,
  currentUserRole,
  onApproveMember,
  onRejectMember,
  onPromoteMember,
  onRemoveMember,
  onBanMember,
  onUnbanMember,
  onInviteMember,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'moderator' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'banned'>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'moderator';
  const canPromoteToModerator = currentUserRole === 'owner';

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleMemberAction = async (membershipId: string, action: MemberAction, newRole?: 'moderator' | 'member') => {
    setActionLoading(membershipId);
    try {
      switch (action) {
        case 'promote':
        case 'demote':
          if (newRole) {
            await onPromoteMember(membershipId, newRole);
          }
          break;
        case 'remove':
          await onRemoveMember(membershipId);
          break;
        case 'ban':
          await onBanMember(membershipId);
          break;
        case 'unban':
          await onUnbanMember(membershipId);
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} member:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    try {
      await onInviteMember(inviteEmail);
      setInviteEmail('');
    } catch (error) {
      setInviteError('Failed to send invitation. Please try again.');
      console.error('Failed to invite member:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Management</CardTitle>
        </CardHeader>
        <div className="p-6">
          <p className="text-gray-600">
            Only community owners and moderators can manage members.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Membership Requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {request.user.profileImageUrl ? (
                      <img
                        src={request.user.profileImageUrl}
                        alt={request.user.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {request.user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{request.user.fullName}</h4>
                      <p className="text-sm text-gray-600">{request.user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {request.user.yearsExperience} years experience
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.user.verificationStatus === 'verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.user.verificationStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => onApproveMember(request.id)}
                      disabled={isLoading || actionLoading === request.id}
                    >
                      {actionLoading === request.id ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRejectMember(request.id)}
                      disabled={isLoading || actionLoading === request.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Invite Members */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New Members</CardTitle>
        </CardHeader>
        <div className="p-6">
          <form onSubmit={handleInvite} className="flex space-x-3">
            <div className="flex-1">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address to invite"
                disabled={isLoading}
              />
              {inviteError && (
                <p className="mt-1 text-sm text-red-600">{inviteError}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !inviteEmail.trim()}
            >
              Send Invite
            </Button>
          </form>
        </div>
      </Card>

      {/* Member List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Community Members ({members.length})</CardTitle>
          </div>
        </CardHeader>
        
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members by name or email"
                disabled={isLoading}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="moderator">Moderators</option>
              <option value="member">Members</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {member.user.profileImageUrl ? (
                    <img
                      src={member.user.profileImageUrl}
                      alt={member.user.fullName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-lg">
                        {member.user.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{member.user.fullName}</h4>
                    <p className="text-sm text-gray-600">{member.user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(member.status)}`}>
                        {member.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {member.user.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.user.subjects.slice(0, 3).map((subject) => (
                          <span key={subject} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {subject}
                          </span>
                        ))}
                        {member.user.subjects.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{member.user.subjects.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Actions */}
                {member.role !== 'owner' && (
                  <div className="flex items-center space-x-2">
                    {member.status === 'active' && (
                      <>
                        {canPromoteToModerator && member.role === 'member' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMemberAction(member.id, 'promote', 'moderator')}
                            disabled={isLoading || actionLoading === member.id}
                          >
                            Promote
                          </Button>
                        )}
                        {canPromoteToModerator && member.role === 'moderator' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMemberAction(member.id, 'demote', 'member')}
                            disabled={isLoading || actionLoading === member.id}
                          >
                            Demote
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMemberAction(member.id, 'ban')}
                          disabled={isLoading || actionLoading === member.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Ban
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMemberAction(member.id, 'remove')}
                          disabled={isLoading || actionLoading === member.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </>
                    )}
                    {member.status === 'banned' && (
                      <Button
                        size="sm"
                        onClick={() => handleMemberAction(member.id, 'unban')}
                        disabled={isLoading || actionLoading === member.id}
                      >
                        Unban
                      </Button>
                    )}
                    {actionLoading === member.id && (
                      <div className="text-sm text-gray-500">Processing...</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'No members match your search criteria.'
                    : 'No members found.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};