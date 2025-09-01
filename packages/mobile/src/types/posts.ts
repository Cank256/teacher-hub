/**
 * Posts Feature Types
 */

import { User } from './index';

export interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  category: PostCategory;
  mediaAttachments: MediaAttachment[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
  isLiked: boolean;
  isBookmarked: boolean;
  visibility: PostVisibility;
  communityId?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number; // For videos
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  parentId?: string; // For nested comments
  replies: Comment[];
  likes: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: string;
  mediaAttachments?: File[];
  visibility: PostVisibility;
  communityId?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  visibility?: PostVisibility;
}

export interface PostFilters {
  category?: string;
  author?: string;
  community?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  visibility?: PostVisibility;
  sortBy?: PostSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface PostInteraction {
  postId: string;
  type: InteractionType;
  userId: string;
  createdAt: Date;
}

export interface ShareData {
  platform: SharePlatform;
  message?: string;
  url?: string;
}

// Enums
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

export enum PostVisibility {
  PUBLIC = 'public',
  COMMUNITY = 'community',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

export enum PostSortBy {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  LIKES = 'likes',
  COMMENTS = 'comments',
  SHARES = 'shares',
  RELEVANCE = 'relevance',
}

export enum InteractionType {
  LIKE = 'like',
  BOOKMARK = 'bookmark',
  SHARE = 'share',
  VIEW = 'view',
}

export enum SharePlatform {
  WHATSAPP = 'whatsapp',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  EMAIL = 'email',
  SMS = 'sms',
  COPY_LINK = 'copy_link',
  MORE = 'more',
}

// API Response Types
export interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PostDetailResponse {
  post: Post;
  comments: Comment[];
  relatedPosts: Post[];
}

export interface PostCategoriesResponse {
  categories: PostCategory[];
}

// Form Types
export interface PostFormData {
  title: string;
  content: string;
  categoryId: string;
  visibility: PostVisibility;
  communityId?: string;
  mediaFiles: File[];
}

export interface CommentFormData {
  content: string;
  parentId?: string;
}

// Hook Types
export interface UsePostsOptions {
  filters?: PostFilters;
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export interface UsePostDetailOptions {
  postId: string;
  enabled?: boolean;
}

export interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  refreshing: boolean;
}

export interface PostDetailState {
  post: Post | null;
  comments: Comment[];
  loading: boolean;
  error: string | null;
  commentsLoading: boolean;
  commentsError: string | null;
}