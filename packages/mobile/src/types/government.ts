/**
 * Government Content Types
 */

export interface GovernmentContent {
  id: string;
  title: string;
  description: string;
  content: string;
  type: GovernmentContentType;
  category: GovernmentContentCategory;
  source: GovernmentSource;
  priority: ContentPriority;
  isOfficial: boolean;
  verificationBadge: VerificationBadge;
  publishedAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags: string[];
  subjects: string[];
  gradeLevels: string[];
  attachments: GovernmentAttachment[];
  metadata: GovernmentContentMetadata;
}

export enum GovernmentContentType {
  CURRICULUM_UPDATE = 'curriculum_update',
  POLICY_DOCUMENT = 'policy_document',
  TEACHING_GUIDE = 'teaching_guide',
  ASSESSMENT_GUIDELINE = 'assessment_guideline',
  ANNOUNCEMENT = 'announcement',
  TRAINING_MATERIAL = 'training_material',
  REGULATION = 'regulation',
  CIRCULAR = 'circular'
}

export enum GovernmentContentCategory {
  CURRICULUM = 'curriculum',
  ASSESSMENT = 'assessment',
  TEACHER_DEVELOPMENT = 'teacher_development',
  POLICY = 'policy',
  ADMINISTRATION = 'administration',
  RESOURCES = 'resources',
  EVENTS = 'events',
  EMERGENCY = 'emergency'
}

export enum GovernmentSource {
  UNEB = 'uneb', // Uganda National Examinations Board
  NCDC = 'ncdc', // National Curriculum Development Centre
  MINISTRY_OF_EDUCATION = 'ministry_of_education',
  DISTRICT_EDUCATION_OFFICE = 'district_education_office',
  SCHOOL_INSPECTION = 'school_inspection',
  TEACHER_SERVICE_COMMISSION = 'teacher_service_commission'
}

export enum ContentPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface VerificationBadge {
  isVerified: boolean;
  verifiedBy: GovernmentSource;
  verificationDate: Date;
  badgeType: BadgeType;
  description: string;
}

export enum BadgeType {
  OFFICIAL = 'official',
  VERIFIED = 'verified',
  ENDORSED = 'endorsed',
  DRAFT = 'draft'
}

export interface GovernmentAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  isOfflineAvailable: boolean;
  localPath?: string;
  checksum: string;
}

export interface GovernmentContentMetadata {
  documentNumber?: string;
  version: string;
  language: string;
  targetAudience: string[];
  implementationDate?: Date;
  reviewDate?: Date;
  relatedDocuments: string[];
  keywords: string[];
  accessLevel: AccessLevel;
}

export enum AccessLevel {
  PUBLIC = 'public',
  TEACHERS_ONLY = 'teachers_only',
  VERIFIED_TEACHERS = 'verified_teachers',
  ADMINISTRATORS = 'administrators'
}

export interface GovernmentContentFilters {
  type?: GovernmentContentType[];
  category?: GovernmentContentCategory[];
  source?: GovernmentSource[];
  priority?: ContentPriority[];
  subjects?: string[];
  gradeLevels?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  isOfflineAvailable?: boolean;
  searchQuery?: string;
}

export interface GovernmentNotification {
  id: string;
  contentId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: ContentPriority;
  targetAudience: NotificationAudience;
  scheduledAt: Date;
  sentAt?: Date;
  readAt?: Date;
  actionRequired: boolean;
  actionUrl?: string;
  expiresAt?: Date;
}

export enum NotificationType {
  CURRICULUM_UPDATE = 'curriculum_update',
  POLICY_CHANGE = 'policy_change',
  DEADLINE_REMINDER = 'deadline_reminder',
  NEW_RESOURCE = 'new_resource',
  TRAINING_ANNOUNCEMENT = 'training_announcement',
  EMERGENCY_ALERT = 'emergency_alert'
}

export interface NotificationAudience {
  subjects?: string[];
  gradeLevels?: string[];
  districts?: string[];
  schoolTypes?: string[];
  verificationStatus?: string[];
}

export interface ContentTrackingEvent {
  id: string;
  contentId: string;
  userId: string;
  eventType: TrackingEventType;
  timestamp: Date;
  metadata: Record<string, any>;
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export enum TrackingEventType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  SHARE = 'share',
  BOOKMARK = 'bookmark',
  PRINT = 'print',
  SEARCH = 'search',
  FILTER = 'filter',
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened'
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  appVersion: string;
}

export interface GovernmentContentSearchResult {
  content: GovernmentContent[];
  totalCount: number;
  facets: SearchFacets;
  suggestions: string[];
}

export interface SearchFacets {
  types: FacetCount[];
  categories: FacetCount[];
  sources: FacetCount[];
  subjects: FacetCount[];
  gradeLevels: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface OfflineGovernmentContent {
  contentId: string;
  localPath: string;
  downloadedAt: Date;
  size: number;
  priority: ContentPriority;
  expiresAt?: Date;
  isUpToDate: boolean;
  lastSyncAt: Date;
}

export interface GovernmentContentSyncStatus {
  isEnabled: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  pendingDownloads: number;
  totalOfflineContent: number;
  storageUsed: number;
  storageLimit: number;
  syncInProgress: boolean;
  errors: string[];
}