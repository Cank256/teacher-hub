# API Integration Guide

## Overview

This document outlines how the Teacher Hub mobile app integrates with backend APIs, including authentication, data synchronization, error handling, and offline capabilities.

## API Client Configuration

### Base Configuration

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { authService } from '@/services/auth';
import { performanceOptimizer } from '@/utils/performanceOptimizer';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        'X-API-Version': '1.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = await authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Start performance timer
        config.metadata = { startTime: performance.now() };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Track API performance
        const duration = performance.now() - response.config.metadata?.startTime;
        if (duration > 5000) {
          console.warn(`Slow API response: ${response.config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error) => {
        // Handle token refresh
        if (error.response?.status === 401) {
          try {
            await authService.refreshToken();
            // Retry original request
            return this.client.request(error.config);
          } catch (refreshError) {
            // Redirect to login
            authService.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient(process.env.API_BASE_URL!);
```

## Authentication API

### Login and Registration

```typescript
// src/services/api/auth.ts
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  gradeLevels: string[];
}

export class AuthApi {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post('/auth/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    return apiClient.post('/auth/register', userData);
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    return apiClient.post('/auth/refresh', { refreshToken });
  }

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  }

  async verifyCredentials(documents: FormData): Promise<VerificationResult> {
    return apiClient.post('/auth/verify-credentials', documents, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async googleAuth(idToken: string): Promise<LoginResponse> {
    return apiClient.post('/auth/google', { idToken });
  }
}

export const authApi = new AuthApi();
```

## Posts API

### CRUD Operations

```typescript
// src/services/api/posts.ts
interface CreatePostRequest {
  title: string;
  content: string;
  category: string;
  mediaAttachments?: File[];
}

interface PostFilters {
  category?: string;
  author?: string;
  dateRange?: { start: Date; end: Date };
  page?: number;
  limit?: number;
}

export class PostsApi {
  async getPosts(filters: PostFilters = {}): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    return apiClient.get(`/posts?${params.toString()}`);
  }

  async getPost(id: string): Promise<Post> {
    return apiClient.get(`/posts/${id}`);
  }

  async createPost(postData: CreatePostRequest): Promise<Post> {
    const formData = new FormData();
    
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('category', postData.category);
    
    postData.mediaAttachments?.forEach((file, index) => {
      formData.append(`media_${index}`, file);
    });

    return apiClient.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async updatePost(id: string, updates: Partial<CreatePostRequest>): Promise<Post> {
    return apiClient.put(`/posts/${id}`, updates);
  }

  async deletePost(id: string): Promise<void> {
    return apiClient.delete(`/posts/${id}`);
  }

  async likePost(id: string): Promise<void> {
    return apiClient.post(`/posts/${id}/like`);
  }

  async unlikePost(id: string): Promise<void> {
    return apiClient.delete(`/posts/${id}/like`);
  }

  async getComments(postId: string): Promise<Comment[]> {
    return apiClient.get(`/posts/${postId}/comments`);
  }

  async addComment(postId: string, content: string): Promise<Comment> {
    return apiClient.post(`/posts/${postId}/comments`, { content });
  }
}

export const postsApi = new PostsApi();
```

## React Query Integration

### Query Configuration

```typescript
// src/hooks/api/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/services/api/posts';

export const usePosts = (filters: PostFilters = {}) => {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => postsApi.getPosts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const usePost = (id: string) => {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => postsApi.getPost(id),
    enabled: !!id,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.createPost,
    onSuccess: (newPost) => {
      // Update posts list cache
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData) return { data: [newPost], total: 1 };
        return {
          ...oldData,
          data: [newPost, ...oldData.data],
          total: oldData.total + 1,
        };
      });

      // Invalidate posts queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.likePost,
    onMutate: async (postId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousPosts = queryClient.getQueryData(['posts']);

      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((post: Post) =>
            post.id === postId
              ? { ...post, likes: post.likes + 1, isLiked: true }
              : post
          ),
        };
      });

      return { previousPosts };
    },
    onError: (err, postId, context) => {
      // Revert optimistic update
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
```

## Offline Synchronization

### Offline Queue

```typescript
// src/services/sync/offlineQueue.ts
interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: OfflineOperation[] = [];
  private isProcessing = false;

  async addOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: OfflineOperation = {
      ...operation,
      id: generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queueItem);
    await this.saveQueue();

    // Process queue if online
    if (await this.isOnline()) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const operations = [...this.queue];
      
      for (const operation of operations) {
        try {
          await this.executeOperation(operation);
          this.removeFromQueue(operation.id);
        } catch (error) {
          operation.retryCount++;
          
          if (operation.retryCount >= 3) {
            // Remove failed operation after 3 retries
            this.removeFromQueue(operation.id);
            console.error('Operation failed after 3 retries:', operation);
          }
        }
      }

      await this.saveQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.resource) {
      case 'posts':
        return this.executePostOperation(operation);
      case 'comments':
        return this.executeCommentOperation(operation);
      default:
        throw new Error(`Unknown resource: ${operation.resource}`);
    }
  }

  private async executePostOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE':
        await postsApi.createPost(operation.data);
        break;
      case 'UPDATE':
        await postsApi.updatePost(operation.data.id, operation.data);
        break;
      case 'DELETE':
        await postsApi.deletePost(operation.data.id);
        break;
    }
  }

  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
  }

  private async saveQueue(): Promise<void> {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  private async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }
}

export const offlineQueue = new OfflineQueue();
```

## Error Handling

### API Error Types

```typescript
// src/types/api.ts
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  code?: string;
  details?: any;
}

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    if (error.code === 'NETWORK_ERROR') {
      return {
        type: ApiErrorType.NETWORK_ERROR,
        message: 'Network connection failed. Please check your internet connection.',
      };
    }

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return {
            type: ApiErrorType.VALIDATION_ERROR,
            message: data.message || 'Invalid request data',
            details: data.errors,
          };
        case 401:
          return {
            type: ApiErrorType.AUTHENTICATION_ERROR,
            message: 'Authentication failed. Please log in again.',
          };
        case 500:
          return {
            type: ApiErrorType.SERVER_ERROR,
            message: 'Server error. Please try again later.',
          };
        default:
          return {
            type: ApiErrorType.SERVER_ERROR,
            message: data.message || 'An unexpected error occurred',
          };
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        type: ApiErrorType.TIMEOUT_ERROR,
        message: 'Request timeout. Please try again.',
      };
    }

    return {
      type: ApiErrorType.SERVER_ERROR,
      message: 'An unexpected error occurred',
    };
  }
}
```

## Real-time Updates

### WebSocket Integration

```typescript
// src/services/websocket/client.ts
import io, { Socket } from 'socket.io-client';
import { authService } from '@/services/auth';

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<void> {
    try {
      const token = await authService.getToken();
      
      this.socket = io(process.env.WEBSOCKET_URL!, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Message events
    this.socket.on('new_message', (message) => {
      // Handle new message
      this.handleNewMessage(message);
    });

    this.socket.on('post_updated', (post) => {
      // Handle post update
      this.handlePostUpdate(post);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  private handleNewMessage(message: any): void {
    // Update React Query cache
    queryClient.setQueryData(['messages'], (oldData: any) => {
      if (!oldData) return { data: [message] };
      return {
        ...oldData,
        data: [message, ...oldData.data],
      };
    });
  }

  private handlePostUpdate(post: any): void {
    // Update post in cache
    queryClient.setQueryData(['posts', post.id], post);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const webSocketClient = new WebSocketClient();
```

## Performance Optimization

### Request Batching

```typescript
// src/services/api/batcher.ts
class RequestBatcher {
  private batches: Map<string, any[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  batch<T>(
    key: string,
    request: T,
    batchFn: (requests: T[]) => Promise<any>,
    delay = 100
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add request to batch
      const batch = this.batches.get(key) || [];
      batch.push({ request, resolve, reject });
      this.batches.set(key, batch);

      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        const currentBatch = this.batches.get(key) || [];
        this.batches.delete(key);
        this.timers.delete(key);

        try {
          const requests = currentBatch.map(item => item.request);
          const results = await batchFn(requests);

          // Resolve all promises
          currentBatch.forEach((item, index) => {
            item.resolve(results[index]);
          });
        } catch (error) {
          // Reject all promises
          currentBatch.forEach(item => {
            item.reject(error);
          });
        }
      }, delay);

      this.timers.set(key, timer);
    });
  }
}

export const requestBatcher = new RequestBatcher();
```

## Testing API Integration

### Mock API Responses

```typescript
// src/test/apiMocks.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('/api/posts', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '1',
            title: 'Test Post',
            content: 'Test content',
            author: { id: '1', name: 'Test User' },
          },
        ],
        total: 1,
      })
    );
  }),

  rest.post('/api/posts', (req, res, ctx) => {
    return res(
      ctx.json({
        id: '2',
        title: 'New Post',
        content: 'New content',
        author: { id: '1', name: 'Test User' },
      })
    );
  }),
];

export const server = setupServer(...handlers);
```

This comprehensive API integration guide provides the foundation for robust, performant, and reliable communication between the mobile app and backend services.