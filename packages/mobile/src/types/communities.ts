// Community types for the Teacher Hub mobile app

import type { User, Subject, GradeLevel, Location, PaginatedResponse } from './index';

export interface Community {
  id: string;
  name: string;
  description: string;
  category: CommunityCategory;
  memberCount: number;
  isPublic: boolean;
  isJoined: boolean;
  joinRequestPending?: boolean;
  moderators: User[];
  createdAt: Date;
  updatedAt: Date;
  location?: Location;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  coverImage?: string;
  rules?: string[];
  activityLevel: ActivityLevel;
  lastActivityAt: Date;
}

export interface CommunityCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export enum ActivityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum MembershipStatus {
  NOT_MEMBER = 'not_member',
  PENDING = 'pending',
  MEMBER = 'member',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface CommunityMember {
  id: string;
  user: User;
  community: Community;
  status: MembershipStatus;
  joinedAt: Date;
  role?: string;
  permissions: MemberPermission[];
}

export enum MemberPermission {
  CREATE_POST = 'create_post',
  MODERATE_POSTS = 'moderate_posts',
  INVITE_MEMBERS = 'invite_members',
  MANAGE_MEMBERS = 'manage_members',
  EDIT_COMMUNITY = 'edit_community',
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: User;
  community: Community;
  category?: string;
  mediaAttachments: MediaAttachment[];
  likes: number;
  comments: number;
  createdAt: Date;
  updatedAt: Date;
  isLiked: boolean;
  isPinned: boolean;
  isModerated: boolean;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

export interface CommunityFilters {
  search?: string;
  category?: string;
  subjects?: string[];
  gradeLevels?: string[];
  location?: string;
  activityLevel?: ActivityLevel;
  isPublic?: boolean;
  sortBy?: 'name' | 'memberCount' | 'activity' | 'created';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CommunityPostFilters {
  communityId: string;
  search?: string;
  category?: string;
  author?: string;
  isPinned?: boolean;
  sortBy?: 'created' | 'likes' | 'comments' | 'activity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface JoinCommunityRequest {
  communityId: string;
  message?: string;
}

export interface CreateCommunityPostRequest {
  communityId: string;
  title: string;
  content: string;
  category?: string;
  mediaAttachments?: File[];
}

export interface CommunityNotification {
  id: string;
  type: CommunityNotificationType;
  community: Community;
  actor?: User;
  post?: CommunityPost;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export enum CommunityNotificationType {
  NEW_POST = 'new_post',
  NEW_MEMBER = 'new_member',
  MEMBER_LEFT = 'member_left',
  POST_LIKED = 'post_liked',
  POST_COMMENTED = 'post_commented',
  COMMUNITY_UPDATED = 'community_updated',
  MODERATOR_ACTION = 'moderator_action',
  JOIN_REQUEST = 'join_request',
  JOIN_APPROVED = 'join_approved',
  JOIN_REJECTED = 'join_rejected',
}

export interface CommunityActivity {
  id: string;
  type: CommunityActivityType;
  community: Community;
  actor: User;
  target?: User | CommunityPost;
  description: string;
  createdAt: Date;
}

export enum CommunityActivityType {
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  POST_CREATED = 'post_created',
  POST_LIKED = 'post_liked',
  POST_COMMENTED = 'post_commented',
  COMMUNITY_CREATED = 'community_created',
  COMMUNITY_UPDATED = 'community_updated',
}

// API Request/Response types
export interface GetCommunitiesResponse extends PaginatedResponse<Community> {}

export interface GetCommunityMembersResponse extends PaginatedResponse<CommunityMember> {}

export interface GetCommunityPostsResponse extends PaginatedResponse<CommunityPost> {}

export interface GetCommunityActivitiesResponse extends PaginatedResponse<CommunityActivity> {}

export interface GetCommunityNotificationsResponse extends PaginatedResponse<CommunityNotification> {}