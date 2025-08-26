/**
 * Database Models
 * TypeScript interfaces for database entities
 */

// Base model interface
export interface BaseModel {
  id: string
  created_at: string
  updated_at: string
  last_sync_at?: string
}

// User model
export interface UserModel extends BaseModel {
  email: string
  first_name: string
  last_name: string
  profile_picture?: string
  verification_status: 'pending' | 'verified' | 'rejected'
}

// Post model
export interface PostModel extends BaseModel {
  title: string
  content: string
  author_id: string
  category_id?: string
  likes_count: number
  comments_count: number
  is_liked: boolean
}

// Community model
export interface CommunityModel extends BaseModel {
  name: string
  description?: string
  category?: string
  member_count: number
  is_public: boolean
  is_joined: boolean
}

// Message model
export interface MessageModel extends BaseModel {
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'video'
  is_read: boolean
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed'
}

// Resource model
export interface ResourceModel extends BaseModel {
  title: string
  description?: string
  resource_type: 'document' | 'image' | 'video' | 'audio' | 'other'
  file_url?: string
  thumbnail_url?: string
  youtube_id?: string
  file_size: number
  category_id?: string
  uploaded_by: string
  rating: number
  download_count: number
  is_downloaded: boolean
  local_path?: string
}

// Offline operation model
export interface OfflineOperationModel {
  id: string
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE'
  resource_type: string
  resource_id?: string
  data: string // JSON stringified data
  retry_count: number
  max_retries: number
  created_at: string
  scheduled_at: string
}

// Sync status model
export interface SyncStatusModel {
  resource_type: string
  last_sync_at: string
  sync_token?: string
  is_syncing: boolean
}

// Conversation model (derived from messages)
export interface ConversationModel {
  id: string
  participants: string[]
  last_message?: MessageModel
  unread_count: number
  updated_at: string
}

// Media attachment model
export interface MediaAttachmentModel {
  id: string
  post_id?: string
  message_id?: string
  resource_id?: string
  type: 'image' | 'video' | 'document' | 'audio'
  url: string
  thumbnail_url?: string
  filename: string
  file_size: number
  mime_type: string
  local_path?: string
  is_downloaded: boolean
  created_at: string
}

// User preferences model
export interface UserPreferencesModel {
  user_id: string
  theme_mode: 'light' | 'dark' | 'system'
  language: string
  notifications_enabled: boolean
  push_notifications: boolean
  email_notifications: boolean
  offline_sync_enabled: boolean
  auto_download_resources: boolean
  data_saver_mode: boolean
  biometric_auth_enabled: boolean
  updated_at: string
}

// Cache metadata model
export interface CacheMetadataModel {
  key: string
  resource_type: string
  size: number
  expires_at?: string
  priority: 'low' | 'medium' | 'high'
  access_count: number
  last_accessed_at: string
  created_at: string
}

// Search history model
export interface SearchHistoryModel {
  id: string
  user_id: string
  query: string
  search_type: 'posts' | 'communities' | 'resources' | 'users'
  results_count: number
  created_at: string
}

// Notification model
export interface NotificationModel extends BaseModel {
  user_id: string
  title: string
  body: string
  type: 'message' | 'post_like' | 'comment' | 'community_invite' | 'system'
  data?: string // JSON stringified additional data
  is_read: boolean
  is_delivered: boolean
  scheduled_at?: string
}

// Analytics event model
export interface AnalyticsEventModel {
  id: string
  user_id?: string
  event_name: string
  event_data: string // JSON stringified event properties
  session_id: string
  timestamp: string
  is_synced: boolean
}

// File download model
export interface FileDownloadModel {
  id: string
  resource_id: string
  file_url: string
  local_path: string
  file_size: number
  downloaded_size: number
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  error_message?: string
  started_at: string
  completed_at?: string
}

// Database query filters
export interface QueryFilters {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  where?: Record<string, any>
}

// Pagination result
export interface PaginatedResult<T> {
  data: T[]
  total: number
  hasMore: boolean
  nextOffset?: number | undefined
}

// Search result
export interface SearchResult<T> {
  items: T[]
  total: number
  query: string
  searchTime: number
}

// Sync result
export interface SyncResult {
  success: boolean
  resourceType: string
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsDeleted: number
  errors: string[]
  syncToken?: string
  nextSyncAt?: string
}