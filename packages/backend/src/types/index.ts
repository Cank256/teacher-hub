// Core data model interfaces for Teacher Hub platform

export interface Location {
  district: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Credential {
  id: string;
  type: 'teaching_license' | 'degree' | 'certification';
  institution: string;
  issueDate: Date;
  expiryDate?: Date;
  documentUrl: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface UserPreferences {
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'teachers_only' | 'private';
    showLocation: boolean;
    showExperience: boolean;
  };
  contentFilters: {
    subjects: string[];
    gradeLevels: string[];
    contentTypes: string[];
  };
}

export interface TeacherProfile {
  id: string;
  email: string;
  passwordHash?: string; // Optional for Google OAuth users
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: Location;
  yearsExperience: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  credentials: Credential[];
  preferences: UserPreferences;
  profileImageUrl?: string;
  bio?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  // Google OAuth fields
  googleId?: string;
  authProvider: 'local' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'image' | 'document' | 'text';
  format: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  curriculumAlignment: string[];
  authorId: string;
  isGovernmentContent: boolean;
  verificationStatus: 'verified' | 'pending' | 'flagged';
  downloadCount: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  attachments: Attachment[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: Attachment[];
  timestamp: Date;
  readBy: string[];
  syncStatus: 'synced' | 'pending' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  replyToId?: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  members: string[];
  moderators: string[];
  isPrivate: boolean;
  rules: string[];
  imageUrl?: string;
  memberCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernmentContent {
  id: string;
  source: 'MOE' | 'UNEB' | 'NCDC';
  contentType: 'curriculum' | 'policy' | 'resource' | 'announcement';
  title: string;
  content: string;
  attachments: Attachment[];
  targetAudience: string[];
  priority: 'high' | 'medium' | 'low';
  effectiveDate: Date;
  expiryDate?: Date;
  digitalSignature: string;
  verificationHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceRating {
  id: string;
  resourceId: string;
  userId: string;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  isActive: boolean;
}

export interface UserConnection {
  id: string;
  followerId: string;
  followingId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

// Database entity types (for ORM/query builders)
export interface UserEntity extends Omit<TeacherProfile, 'credentials' | 'preferences' | 'schoolLocation'> {
  credentialsJson: string;
  preferencesJson: string;
  schoolLocationJson: string;
}

export interface ResourceEntity extends Omit<Resource, 'subjects' | 'gradeLevels' | 'curriculumAlignment' | 'tags' | 'attachments'> {
  subjectsJson: string;
  gradeLevelsJson: string;
  curriculumAlignmentJson: string;
  tagsJson: string;
  attachmentsJson: string;
}

export interface MessageEntity extends Omit<Message, 'attachments' | 'readBy'> {
  attachmentsJson: string;
  readByJson: string;
}

export interface CommunityEntity extends Omit<Community, 'members' | 'moderators' | 'rules'> {
  membersJson: string;
  moderatorsJson: string;
  rulesJson: string;
}

export interface GovernmentContentEntity extends Omit<GovernmentContent, 'attachments' | 'targetAudience'> {
  attachmentsJson: string;
  targetAudienceJson: string;
}

// ===== POST MANAGEMENT INTERFACES =====

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

export interface Post {
  id: string;
  authorId: string;
  communityId?: string;
  title: string;
  content: string;
  mediaAttachments: MediaAttachment[];
  tags: string[];
  visibility: 'public' | 'community' | 'followers';
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  content: string;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

// ===== ENHANCED COMMUNITY INTERFACES =====

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface CommunityPermission {
  action: 'post' | 'comment' | 'moderate' | 'invite' | 'manage_members';
  granted: boolean;
}

// Enhanced Community interface (replaces existing one)
export interface EnhancedCommunity {
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

// Enhanced CommunityMembership interface (replaces existing one)
export interface EnhancedCommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending' | 'banned';
  joinedAt: Date;
  permissions: CommunityPermission[];
}

// ===== ENHANCED MESSAGING INTERFACES =====

export interface MessageRead {
  userId: string;
  readAt: Date;
}

// Enhanced Message interface (replaces existing one)
export interface EnhancedMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments: Attachment[];
  timestamp: Date;
  readBy: MessageRead[];
  syncStatus: 'synced' | 'pending' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  replyToId?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: EnhancedMessage;
  lastActivity: Date;
  unreadCount: { [userId: string]: number };
}

export interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: Location;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  bio?: string;
  yearsExperience: number;
  createdAt: Date;
}

// ===== RESOURCE EXTENSIONS FOR VIDEO INTEGRATION =====

export interface SecurityScanResult {
  virusFound: boolean;
  malwareFound: boolean;
  suspiciousContent: boolean;
  scanDetails: string;
  scannedAt: Date;
}

export interface YouTubeVideoMetadata {
  title: string;
  description: string;
  duration: number;
  thumbnailUrl: string;
  privacy: 'unlisted';
}

export interface YouTubeVideo {
  id: string;
  resourceId: string;
  youtubeVideoId: string;
  uploadStatus: 'uploading' | 'processing' | 'completed' | 'failed';
  metadata: YouTubeVideoMetadata;
  uploadedAt: Date;
}

// Enhanced Resource interface (replaces existing one)
export interface EnhancedResource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'image' | 'document' | 'text';
  format: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  subjects: string[];
  gradeLevels: string[];
  curriculumAlignment: string[];
  authorId: string;
  isGovernmentContent: boolean;
  verificationStatus: 'verified' | 'pending' | 'flagged';
  downloadCount: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  attachments: Attachment[];
  youtubeVideoId?: string;
  securityScanStatus: 'pending' | 'passed' | 'failed';
  securityScanResults?: SecurityScanResult;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== ADMIN-SPECIFIC INTERFACES =====

export type AdminActionType = 
  | 'approve_post' | 'flag_post' | 'delete_post'
  | 'approve_comment' | 'delete_comment'
  | 'approve_community' | 'suspend_community' | 'delete_community'
  | 'approve_resource' | 'flag_resource' | 'delete_resource'
  | 'approve_message' | 'delete_message'
  | 'ban_user' | 'unban_user' | 'verify_user';

export interface AdminAction {
  id: string;
  adminId: string;
  action: AdminActionType;
  targetType: 'post' | 'comment' | 'community' | 'user' | 'resource' | 'message';
  targetId: string;
  reason: string;
  details?: any;
  timestamp: Date;
}

export interface ModerationQueue {
  id: string;
  itemType: 'post' | 'comment' | 'resource' | 'community' | 'message';
  itemId: string;
  reportReason: string;
  reportedBy: string;
  status: 'pending' | 'reviewed' | 'resolved';
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalCommunities: number;
  totalResources: number;
  totalMessages: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
}

export interface UserAnalytics {
  newUsers: number;
  activeUsers: number;
  retentionRate: number;
  averageSessionDuration: number;
  topSubjects: string[];
  topRegions: string[];
}

export interface ContentAnalytics {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  topTags: string[];
  engagementRate: number;
  averagePostsPerUser: number;
}

export interface ModerationResolution {
  action: 'approve' | 'reject' | 'escalate';
  reason: string;
  notes?: string;
}

// ===== ENHANCED DATABASE ENTITY TYPES =====

export interface PostEntity extends Omit<Post, 'mediaAttachments' | 'tags'> {
  mediaAttachmentsJson: string;
  tagsJson: string;
}

export interface PostCommentEntity extends PostComment {
  // No JSON fields needed for PostComment
}

export interface PostLikeEntity extends PostLike {
  // No JSON fields needed for PostLike
}

export interface EnhancedCommunityEntity extends Omit<EnhancedCommunity, 'moderators' | 'rules'> {
  moderatorsJson: string;
  rulesJson: string;
}

export interface EnhancedCommunityMembershipEntity extends Omit<EnhancedCommunityMembership, 'permissions'> {
  permissionsJson: string;
}

export interface ConversationEntity extends Omit<Conversation, 'participants' | 'lastMessage' | 'unreadCount'> {
  participantsJson: string;
  lastMessageJson?: string;
  unreadCountJson: string;
}

export interface EnhancedMessageEntity extends Omit<EnhancedMessage, 'attachments' | 'readBy'> {
  attachmentsJson: string;
  readByJson: string;
}

export interface EnhancedResourceEntity extends Omit<EnhancedResource, 'subjects' | 'gradeLevels' | 'curriculumAlignment' | 'tags' | 'attachments' | 'securityScanResults'> {
  subjectsJson: string;
  gradeLevelsJson: string;
  curriculumAlignmentJson: string;
  tagsJson: string;
  attachmentsJson: string;
  securityScanResultsJson?: string;
}

export interface YouTubeVideoEntity extends Omit<YouTubeVideo, 'metadata'> {
  metadataJson: string;
}

export interface AdminActionEntity extends Omit<AdminAction, 'details'> {
  detailsJson?: string;
}

export interface ModerationQueueEntity extends ModerationQueue {
  // No JSON fields needed for ModerationQueue
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface CreatePostRequest {
  title: string;
  content: string;
  communityId?: string;
  mediaAttachments?: MediaAttachment[];
  tags?: string[];
  visibility: 'public' | 'community' | 'followers';
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  tags?: string[];
  visibility?: 'public' | 'community' | 'followers';
}

export interface CreateCommunityRequest {
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  isPrivate: boolean;
  requiresApproval: boolean;
  rules?: CommunityRule[];
  imageUrl?: string;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  rules?: CommunityRule[];
  imageUrl?: string;
}

export interface SendMessageRequest {
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  attachments?: Attachment[];
  replyToId?: string;
}

export interface UploadResourceRequest {
  title: string;
  description: string;
  subjects: string[];
  gradeLevels: string[];
  curriculumAlignment?: string[];
  tags?: string[];
}

export interface UpdateResourceRequest {
  title?: string;
  description?: string;
  subjects?: string[];
  gradeLevels?: string[];
  curriculumAlignment?: string[];
  tags?: string[];
}

// ===== FILTER AND SEARCH INTERFACES =====

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommunitySearchFilters {
  type?: 'subject' | 'region' | 'grade' | 'general';
  isPrivate?: boolean;
  subjects?: string[];
  regions?: string[];
}

export interface UserSearchFilters {
  subjects?: string[];
  gradeLevels?: string[];
  regions?: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export interface ResourceSearchFilters {
  type?: 'video' | 'image' | 'document' | 'text';
  subjects?: string[];
  gradeLevels?: string[];
  verificationStatus?: 'verified' | 'pending' | 'flagged';
  hasVideo?: boolean;
}

export interface AdminPostFilters {
  authorId?: string;
  communityId?: string;
  visibility?: 'public' | 'community' | 'followers';
  flagged?: boolean;
}

export interface AdminCommunityFilters {
  ownerId?: string;
  type?: 'subject' | 'region' | 'grade' | 'general';
  isPrivate?: boolean;
  suspended?: boolean;
}

export interface AdminResourceFilters {
  authorId?: string;
  type?: 'video' | 'image' | 'document' | 'text';
  verificationStatus?: 'verified' | 'pending' | 'flagged';
  securityScanStatus?: 'pending' | 'passed' | 'failed';
}

export interface ModerationFilters {
  itemType?: 'post' | 'comment' | 'resource' | 'community' | 'message';
  status?: 'pending' | 'reviewed' | 'resolved';
  assignedTo?: string;
}

export interface MessageSearchFilters {
  content?: string;
  type?: 'text' | 'file' | 'image';
  dateFrom?: Date;
  dateTo?: Date;
  senderId?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ===== UTILITY TYPES =====

export type MemberAction = 'promote' | 'demote' | 'remove' | 'ban';

export interface YouTubeVideoStatus {
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}