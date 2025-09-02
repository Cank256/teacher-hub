/**
 * Government Feature Component Types
 */

import {
  GovernmentContent,
  GovernmentContentFilters,
  GovernmentNotification,
  VerificationBadge as VerificationBadgeType,
  OfflineGovernmentContent,
} from '../../types';

export interface GovernmentContentListProps {
  filters?: GovernmentContentFilters;
  onContentPress?: (content: GovernmentContent) => void;
  onFilterChange?: (filters: GovernmentContentFilters) => void;
  showFilters?: boolean;
  showSearch?: boolean;
  limit?: number;
  emptyStateMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export interface GovernmentContentCardProps {
  content: GovernmentContent;
  onPress?: (content: GovernmentContent) => void;
  onBookmark?: (contentId: string) => void;
  onShare?: (contentId: string) => void;
  onDownload?: (contentId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface GovernmentContentDetailProps {
  contentId: string;
  onBack?: () => void;
  onShare?: (contentId: string) => void;
  onBookmark?: (contentId: string) => void;
  onDownload?: (contentId: string) => void;
  onReport?: (contentId: string, issueType: string, description: string) => void;
}

export interface GovernmentNotificationsListProps {
  unreadOnly?: boolean;
  onNotificationPress?: (notification: GovernmentNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  limit?: number;
  emptyStateMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export interface GovernmentNotificationCardProps {
  notification: GovernmentNotification;
  onPress?: (notification: GovernmentNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  showActions?: boolean;
}

export interface VerificationBadgeProps {
  badge: VerificationBadgeType;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: any;
}

export interface OfflineContentManagerProps {
  onDownload?: (contentId: string) => void;
  onRemove?: (contentIds: string[]) => void;
  onSync?: () => void;
  showStorageInfo?: boolean;
}

export interface GovernmentContentSearchProps {
  onSearch?: (query: string, filters?: GovernmentContentFilters) => void;
  initialQuery?: string;
  initialFilters?: GovernmentContentFilters;
  placeholder?: string;
  showFilters?: boolean;
}

export interface GovernmentContentFiltersProps {
  filters: GovernmentContentFilters;
  onFiltersChange: (filters: GovernmentContentFilters) => void;
  onReset?: () => void;
  availableSubjects?: string[];
  availableGradeLevels?: string[];
}

export interface GovernmentContentState {
  selectedFilters: GovernmentContentFilters;
  searchQuery: string;
  bookmarkedContent: Set<string>;
  offlineContent: Set<string>;
  notificationSettings: {
    enabled: boolean;
    subjects: string[];
    gradeLevels: string[];
    contentTypes: string[];
    sources: string[];
  };
}