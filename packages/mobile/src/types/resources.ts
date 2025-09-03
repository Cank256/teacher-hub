export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  fileUrl: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  size: number;
  category: ResourceCategory;
  uploadedBy: User;
  rating: number;
  downloadCount: number;
  isDownloaded: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ResourceType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  PRESENTATION = 'presentation',
  SPREADSHEET = 'spreadsheet',
  YOUTUBE_VIDEO = 'youtube_video',
}

export interface ResourceCategory {
  id: string;
  name: string;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  color: string;
  icon: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  order: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  verificationStatus: VerificationStatus;
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export interface ResourceFilters {
  category?: string;
  subject?: string;
  gradeLevel?: string;
  type?: ResourceType;
  rating?: number;
  search?: string;
  tags?: string[];
  uploadedBy?: string;
}

export interface CreateResourceRequest {
  title: string;
  description: string;
  type: ResourceType;
  categoryId: string;
  tags: string[];
  file?: File;
  youtubeUrl?: string;
}

export interface UpdateResourceRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
}

export interface ResourceMetadata {
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  type: ResourceType;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface DownloadProgress {
  resourceId: string;
  loaded: number;
  total: number;
  percentage: number;
}

export interface CachedResource {
  id: string;
  resourceId: string;
  localPath: string;
  downloadedAt: Date;
  size: number;
  priority: CachePriority;
}

export enum CachePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface OfflineResourceStatus {
  totalResources: number;
  downloadedResources: number;
  storageUsed: number;
  storageLimit: number;
  pendingDownloads: number;
}

export interface YouTubeUploadResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  uploadStatus: 'processing' | 'completed' | 'failed';
}

export interface ResourceRating {
  resourceId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ResourceSearchResult extends Resource {
  relevanceScore: number;
  matchedFields: string[];
}

export interface ResourceStats {
  totalResources: number;
  totalDownloads: number;
  averageRating: number;
  popularCategories: Array<{
    category: ResourceCategory;
    count: number;
  }>;
  recentUploads: Resource[];
}