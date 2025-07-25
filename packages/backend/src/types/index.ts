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