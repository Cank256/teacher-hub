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
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/dashboard?timeRange=${timeRange}`, {
        headers: {
          ...authService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication required for admin dashboard, using mock data');
        } else {
          console.warn(`Backend error (${response.status}), using mock data for admin dashboard`);
        }
        return this.getMockDashboardData();
      }

      return response.json();
    } catch (error) {
      // Fallback to mock data when backend is not available
      console.warn('Backend not available, using mock data for admin dashboard');
      return this.getMockDashboardData();
    }
  }

  private getMockDashboardData(): AdminDashboardData {
    return {
      overview: {
        totalUsers: 2543,
        activeUsers: 1892,
        errorRate: 0.02,
        avgResponseTime: 120,
        systemStatus: 'healthy',
        criticalErrors: 0,
        totalContent: 1234,
        publishedContent: 987,
        pendingContent: 45,
        totalRevenue: 125000,
        monthlyGrowth: 12.5,
        serverLoad: 65
      },
      systemHealth: {
        status: 'healthy',
        uptime: 99.9,
        memoryUsage: 68,
        cpuUsage: 45,
        diskUsage: 72,
        networkLatency: 23
      },
      recentActivity: [
        { id: '1', type: 'user_registration', message: '[DEMO] New user registered: john.doe@example.com', timestamp: '2 minutes ago' },
        { id: '2', type: 'content_published', message: '[DEMO] New resource published: "Advanced React Patterns"', timestamp: '5 minutes ago' },
        { id: '3', type: 'login', message: '[DEMO] Admin login from IP: 192.168.1.100', timestamp: '8 minutes ago' },
        { id: '4', type: 'error', message: '[DEMO] Database connection timeout', timestamp: '15 minutes ago', severity: 'medium' }
      ],
      errors: null,
      performance: null,
      analytics: null,
      dailyActiveUsers: [],
      recentErrors: [],
      timestamp: new Date().toISOString()
    };
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
    try {
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
        if (response.status === 401) {
          console.warn('Authentication required for admin users, using mock data');
        } else {
          console.warn(`Backend error (${response.status}), using mock data for users`);
        }
        return this.getMockUsersData(params);
      }

      return response.json();
    } catch (error) {
      // Fallback to mock data when backend is not available
      console.warn('Backend not available, using mock data for users');
      return this.getMockUsersData(params);
    }
  }

  private getMockUsersData(params: any) {
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'teacher',
        status: 'active',
        joinDate: '2024-01-15',
        lastLogin: '2024-02-08',
        verified: true
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'teacher',
        status: 'active',
        joinDate: '2024-02-01',
        lastLogin: '2024-02-07',
        verified: true
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike.johnson@example.com',
        role: 'admin',
        status: 'active',
        joinDate: '2023-12-10',
        lastLogin: '2024-02-08',
        verified: true
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@example.com',
        role: 'teacher',
        status: 'pending',
        joinDate: '2024-02-05',
        lastLogin: 'Never',
        verified: false
      }
    ];

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = mockUsers.length;

    return {
      users: mockUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
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
    try {
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
        if (response.status === 401) {
          console.warn('Authentication required for admin content, using mock data');
        } else {
          console.warn(`Backend error (${response.status}), using mock data for content`);
        }
        return this.getMockContentData(params);
      }

      return response.json();
    } catch (error) {
      // Fallback to mock data when backend is not available
      console.warn('Backend not available, using mock data for content');
      return this.getMockContentData(params);
    }
  }

  private getMockContentData(params: any) {
    const mockContent: Content[] = [
      {
        id: '1',
        title: 'Introduction to React Hooks',
        type: 'article',
        author: 'John Doe',
        authorId: '1',
        status: 'published',
        category: 'Programming',
        subjects: ['Computer Science'],
        gradeLevels: ['Senior 4', 'Senior 5'],
        createdDate: '2024-01-15',
        lastModified: '2024-02-01',
        views: 1250,
        likes: 89,
        downloadCount: 234,
        rating: 4.5,
        ratingCount: 45
      },
      {
        id: '2',
        title: 'Advanced JavaScript Patterns',
        type: 'video',
        author: 'Jane Smith',
        authorId: '2',
        status: 'published',
        category: 'Programming',
        subjects: ['Computer Science'],
        gradeLevels: ['Senior 5', 'Senior 6'],
        createdDate: '2024-01-20',
        lastModified: '2024-01-25',
        views: 2100,
        likes: 156,
        downloadCount: 567,
        rating: 4.8,
        ratingCount: 78
      }
    ];

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = mockContent.length;

    return {
      content: mockContent,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
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
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/reports/analytics?timeRange=${timeRange}`, {
        headers: {
          ...authService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication required for admin analytics, using mock data');
        } else {
          console.warn(`Backend error (${response.status}), using mock data for analytics`);
        }
        return this.getMockAnalyticsData();
      }

      const result = await response.json();
      return result.analysis || result.summary;
    } catch (error) {
      // Fallback to mock data when backend is not available
      console.warn('Backend not available, using mock data for analytics');
      return this.getMockAnalyticsData();
    }
  }

  private getMockAnalyticsData(): AnalyticsData {
    return {
      pageViews: 45231,
      uniqueVisitors: 12543,
      bounceRate: 23.4,
      avgSession: '4m 32s',
      conversionRate: 3.2,
      totalRevenue: 125000,
      userRetention: 68.5,
      mobileTraffic: 72.3,
      topPages: [
        { page: '/dashboard', views: 8543, change: 12 },
        { page: '/resources', views: 6234, change: 8 },
        { page: '/communities', views: 4321, change: -2 },
        { page: '/profile', views: 3456, change: 15 },
        { page: '/messages', views: 2987, change: 5 }
      ],
      userDemographics: [
        { country: 'Uganda', users: 4521, percentage: 36.1 },
        { country: 'Kenya', users: 2134, percentage: 17.0 },
        { country: 'Tanzania', users: 1876, percentage: 15.0 },
        { country: 'Rwanda', users: 1234, percentage: 9.8 },
        { country: 'South Sudan', users: 987, percentage: 7.9 }
      ],
      deviceBreakdown: [
        { device: 'Mobile', percentage: 72.3, users: 9067 },
        { device: 'Desktop', percentage: 23.1, users: 2897 },
        { device: 'Tablet', percentage: 4.6, users: 577 }
      ],
      trafficSources: [
        { source: 'Direct', percentage: 42.1, users: 5281 },
        { source: 'Search Engines', percentage: 28.7, users: 3600 },
        { source: 'Social Media', percentage: 18.2, users: 2283 },
        { source: 'Referrals', percentage: 11.0, users: 1380 }
      ],
      dailyActiveUsers: [
        { date: '2024-02-01', count: 1234 },
        { date: '2024-02-02', count: 1456 },
        { date: '2024-02-03', count: 1123 },
        { date: '2024-02-04', count: 1678 },
        { date: '2024-02-05', count: 1892 }
      ],
      userEngagement: {
        averageEventsPerUser: 12.5,
        sessionDuration: 4.5,
        pagesPerSession: 3.2
      }
    };
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