import React from 'react';
import { CommunityCard } from './CommunityCard';
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

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface RecommendationReason {
  type: 'subject_match' | 'region_match' | 'grade_match' | 'popular' | 'new' | 'similar_members';
  description: string;
  score: number;
}

interface CommunityRecommendation {
  community: Community;
  membership?: CommunityMembership;
  reasons: RecommendationReason[];
  score: number;
}

interface CommunityRecommendationsProps {
  recommendations: CommunityRecommendation[];
  currentUser?: UserProfile;
  onJoin: (communityId: string) => Promise<void>;
  onLeave: (communityId: string) => Promise<void>;
  onCancelRequest: (communityId: string) => Promise<void>;
  onViewDetails: (communityId: string) => void;
  isLoading?: boolean;
}

export const CommunityRecommendations: React.FC<CommunityRecommendationsProps> = ({
  recommendations,
  currentUser,
  onJoin,
  onLeave,
  onCancelRequest,
  onViewDetails,
  isLoading = false
}) => {
  const getReasonIcon = (type: RecommendationReason['type']) => {
    switch (type) {
      case 'subject_match':
        return '📚';
      case 'region_match':
        return '📍';
      case 'grade_match':
        return '🎓';
      case 'popular':
        return '🔥';
      case 'new':
        return '✨';
      case 'similar_members':
        return '👥';
      default:
        return '💡';
    }
  };

  const getReasonColor = (type: RecommendationReason['type']) => {
    switch (type) {
      case 'subject_match':
        return 'bg-blue-100 text-blue-800';
      case 'region_match':
        return 'bg-green-100 text-green-800';
      case 'grade_match':
        return 'bg-purple-100 text-purple-800';
      case 'popular':
        return 'bg-red-100 text-red-800';
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
      case 'similar_members':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Communities</CardTitle>
        </CardHeader>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
          <p className="text-gray-600">
            We'll show personalized community recommendations based on your profile and interests.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Recommended for You</h2>
        <span className="text-sm text-gray-500">
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((recommendation) => (
          <div key={recommendation.community.id} className="relative">
            {/* Recommendation Reasons */}
            <div className="absolute -top-2 -right-2 z-10">
              <div className="flex flex-wrap gap-1 justify-end">
                {recommendation.reasons.slice(0, 2).map((reason, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${getReasonColor(reason.type)} flex items-center space-x-1`}
                    title={reason.description}
                  >
                    <span>{getReasonIcon(reason.type)}</span>
                    <span className="hidden sm:inline">{reason.description}</span>
                  </div>
                ))}
                {recommendation.reasons.length > 2 && (
                  <div
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                    title={`${recommendation.reasons.length - 2} more reasons`}
                  >
                    +{recommendation.reasons.length - 2}
                  </div>
                )}
              </div>
            </div>

            {/* Community Card */}
            <CommunityCard
              community={recommendation.community}
              currentUserId={currentUser?.id}
              membership={recommendation.membership}
              onJoin={onJoin}
              onLeave={onLeave}
              onCancelRequest={onCancelRequest}
              onViewDetails={onViewDetails}
              isLoading={isLoading}
            />

            {/* Recommendation Score */}
            <div className="absolute bottom-2 left-2">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-gray-600 border border-gray-200">
                {Math.round(recommendation.score * 100)}% match
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation Explanation */}
      <Card>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Why these communities?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span>📚</span>
              <span className="text-gray-600">Matches your subjects</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📍</span>
              <span className="text-gray-600">In your region</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🎓</span>
              <span className="text-gray-600">Similar grade levels</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🔥</span>
              <span className="text-gray-600">Popular communities</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>✨</span>
              <span className="text-gray-600">Newly created</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>👥</span>
              <span className="text-gray-600">Similar members</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};