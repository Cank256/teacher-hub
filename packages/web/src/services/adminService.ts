import { authService } from './authService';

const BACKEND_URL = import.meta.env.REACT_BACKEND_URL || "http://localhost:8001";

export interface AdminDashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    errorRate: number;
    avgResponseTime: number;
    systemStatus: string;
    criticalErrors: number;
    totalContent: number;
    publishedContent: number;
    pendingContent: number;
    totalRevenue: number;
    monthlyGrowth: number;
    serverLoad: number;
  };
  systemHealth: {
    status: string;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'user_registration' | 'content_published' | 'error' | 'login';
    message: string;
    timestamp: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  errors: any;
  performance: any;
  analytics: any;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  recentErrors: any[];
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive' | 'pending' | 'archived';
  joinDate: string;
  lastLogin: string;
  verified: boolean;
  subjects?: string[];
  gradeLevels?: string[];
  schoolLocation?: {
    district: string;
    region: string;
  };
  yearsExperience?: number;
}

export interface Content {
  id: string;
  title: string;
  type: 'article' | 'video' | 'document' | 'quiz' | 'course';
  author: string;
  authorId: string;
  status: 'published' | 'draft' | 'pending' | 'archived';
  category: string;
  subjects: string[];
  gradeLevels: string[];
  createdDate: string;
  lastModified: string;
  views: number;
  likes: number;
  downloadCount: number;
  rating: number;
  ratingCount: number;
}

export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSession: string;
  conversionRate: number;
  totalRevenue: number;
  userRetention: number;
  mobileTraffic: number;
  topPages: Array<{ page: string; views: number; change: number }>;
  userDemographics: Array<{ country: string; users: number; percentage: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number; users: number }>;
  trafficSources: Array<{ source: string; percentage: number; users: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  userEngagement: {
    averageEventsPerUser: number;
    sessionDuration: number;
    pagesPerSession: number;
  };
}

class AdminService {
  /**
   * Get admin dashboard data
   */
  async getDashboardData(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<AdminDashboardData> {
    const response = await fetch(`${BACKEND_URL}/api/admin/dashboard?timeRange=${timeRange}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch dashboard data');
    }

    return response.json();
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/admin/users?${searchParams}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch users');
    }

    return response.json();
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    name: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
    status: 'active' | 'inactive' | 'pending';
    password?: string;
  }): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create user');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update user');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Archive a user
   */
  async archiveUser(userId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/archive`, {
      method: 'PUT',
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to archive user');
    }
  }

  /**
   * Get all content with pagination and filtering
   */
  async getContent(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    category?: string;
    author?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    content: Content[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/admin/content?${searchParams}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch content');
    }

    return response.json();
  }

  /**
   * Create new content
   */
  async createContent(contentData: {
    title: string;
    type: 'article' | 'video' | 'document' | 'quiz' | 'course';
    author: string;
    status: 'published' | 'draft' | 'pending';
    category: string;
    subjects: string[];
    gradeLevels: string[];
    description?: string;
  }): Promise<Content> {
    const response = await fetch(`${BACKEND_URL}/api/admin/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(contentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create content');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update content
   */
  async updateContent(contentId: string, contentData: Partial<Content>): Promise<Content> {
    const response = await fetch(`${BACKEND_URL}/api/admin/content/${contentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(contentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update content');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Archive content
   */
  async archiveContent(contentId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/admin/content/${contentId}/archive`, {
      method: 'PUT',
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to archive content');
    }
  }

  /**
   * Publish content
   */
  async publishContent(contentId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/admin/content/${contentId}/publish`, {
      method: 'PUT',
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to publish content');
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AnalyticsData> {
    const response = await fetch(`${BACKEND_URL}/api/admin/reports/analytics?timeRange=${timeRange}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch analytics data');
    }

    const result = await response.json();
    return result.analysis || result.summary;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{
    total: number;
    active: number;
    pending: number;
    archived: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    growth: Array<{ date: string; count: number }>;
  }> {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/statistics`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch user statistics');
    }

    return response.json();
  }

  /**
   * Get content statistics
   */
  async getContentStatistics(): Promise<{
    total: number;
    published: number;
    pending: number;
    draft: number;
    archived: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    engagement: {
      totalViews: number;
      totalLikes: number;
      totalDownloads: number;
      averageRating: number;
    };
  }> {
    const response = await fetch(`${BACKEND_URL}/api/admin/content/statistics`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch content statistics');
    }

    return response.json();
  }
}

export const adminService = new AdminService();