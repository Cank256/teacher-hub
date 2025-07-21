// Types for content moderation system

export interface ContentModerationResult {
  id: string;
  contentId: string;
  contentType: 'resource' | 'message' | 'profile' | 'comment';
  status: 'approved' | 'flagged' | 'rejected' | 'pending_review';
  confidence: number; // 0-1 confidence score
  flags: ModerationFlag[];
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationFlag {
  type: 'inappropriate_language' | 'spam' | 'harassment' | 'copyright' | 'misinformation' | 'adult_content' | 'violence' | 'hate_speech';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  detectedBy: 'automated' | 'user_report' | 'moderator';
}

export interface ModerationRule {
  id: string;
  name: string;
  type: 'keyword' | 'pattern' | 'ml_model' | 'custom';
  category: ModerationFlag['type'];
  severity: ModerationFlag['severity'];
  pattern?: string;
  keywords?: string[];
  isActive: boolean;
  threshold: number; // Confidence threshold for triggering
  action: 'flag' | 'auto_reject' | 'require_review';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReport {
  id: string;
  reporterId: string;
  contentId: string;
  contentType: 'resource' | 'message' | 'profile' | 'comment';
  reason: 'inappropriate' | 'spam' | 'harassment' | 'copyright' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationQueue {
  id: string;
  contentId: string;
  contentType: 'resource' | 'message' | 'profile' | 'comment';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  status: 'pending' | 'in_review' | 'completed';
  flags: ModerationFlag[];
  userReports: UserReport[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationConfig {
  autoApproveThreshold: number; // Content below this confidence is auto-approved
  autoRejectThreshold: number; // Content above this confidence is auto-rejected
  requireReviewThreshold: number; // Content in between requires manual review
  enabledCategories: ModerationFlag['type'][];
  maxQueueSize: number;
  reviewTimeoutHours: number;
}

export interface ContentAnalysis {
  textAnalysis?: {
    language: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    toxicity: number;
    keywords: string[];
    readabilityScore: number;
  };
  imageAnalysis?: {
    hasText: boolean;
    extractedText?: string;
    adultContent: number;
    violence: number;
    medicalContent: number;
  };
  metadata: {
    fileSize?: number;
    duration?: number;
    dimensions?: { width: number; height: number };
    format?: string;
  };
}

export interface ModerationStats {
  totalProcessed: number;
  autoApproved: number;
  autoRejected: number;
  flagged: number;
  pendingReview: number;
  averageProcessingTime: number;
  flagsByCategory: Record<ModerationFlag['type'], number>;
  moderatorStats: Record<string, {
    reviewed: number;
    approved: number;
    rejected: number;
    averageTime: number;
  }>;
}