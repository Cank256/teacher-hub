/**
 * Posts API Service
 */

import { ApiClient } from './apiClient';
import { ApiResponse, PaginatedResponse } from './types';
import {
  Post,
  PostCategory,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
  PostsResponse,
  PostDetailResponse,
  PostCategoriesResponse,
  ShareData,
  CommentFormData,
} from '../../types/posts';

export class PostsService {
  private static instance: PostsService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  static getInstance(): PostsService {
    if (!PostsService.instance) {
      PostsService.instance = new PostsService();
    }
    return PostsService.instance;
  }

  /**
   * Get paginated posts with filters
   */
  async getPosts(
    page: number = 1,
    limit: number = 20,
    filters?: PostFilters
  ): Promise<PaginatedResponse<Post>> {
    const params = {
      page,
      limit,
      ...filters,
    };

    const response = await this.apiClient.getPaginated<Post>(
      '/posts',
      params,
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Get post by ID with comments
   */
  async getPostById(postId: string): Promise<PostDetailResponse> {
    const response = await this.apiClient.get<PostDetailResponse>(
      `/posts/${postId}`,
      undefined,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostRequest): Promise<Post> {
    const formData = new FormData();
    
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('categoryId', postData.categoryId);
    formData.append('visibility', postData.visibility);
    
    if (postData.communityId) {
      formData.append('communityId', postData.communityId);
    }

    // Add media attachments
    if (postData.mediaAttachments && postData.mediaAttachments.length > 0) {
      postData.mediaAttachments.forEach((file, index) => {
        formData.append(`media_${index}`, file as any);
      });
    }

    const response = await this.apiClient.uploadFile<Post>(
      '/posts',
      formData,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Update an existing post
   */
  async updatePost(postId: string, updates: UpdatePostRequest): Promise<Post> {
    const response = await this.apiClient.put<Post>(
      `/posts/${postId}`,
      updates,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await this.apiClient.delete(
      `/posts/${postId}`,
      { requiresAuth: true }
    );
  }

  /**
   * Like/unlike a post
   */
  async toggleLike(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const response = await this.apiClient.post<{ isLiked: boolean; likesCount: number }>(
      `/posts/${postId}/like`,
      {},
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Bookmark/unbookmark a post
   */
  async toggleBookmark(postId: string): Promise<{ isBookmarked: boolean }> {
    const response = await this.apiClient.post<{ isBookmarked: boolean }>(
      `/posts/${postId}/bookmark`,
      {},
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Share a post
   */
  async sharePost(postId: string, shareData: ShareData): Promise<void> {
    await this.apiClient.post(
      `/posts/${postId}/share`,
      shareData,
      { requiresAuth: true }
    );
  }

  /**
   * Get post categories
   */
  async getCategories(): Promise<PostCategory[]> {
    const response = await this.apiClient.get<PostCategoriesResponse>(
      '/posts/categories',
      undefined,
      { requiresAuth: true }
    );

    return response.data.categories;
  }

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Comment>> {
    const response = await this.apiClient.getPaginated<Comment>(
      `/posts/${postId}/comments`,
      { page, limit },
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Add a comment to a post
   */
  async addComment(postId: string, commentData: CommentFormData): Promise<Comment> {
    const response = await this.apiClient.post<Comment>(
      `/posts/${postId}/comments`,
      commentData,
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Update a comment
   */
  async updateComment(
    postId: string,
    commentId: string,
    content: string
  ): Promise<Comment> {
    const response = await this.apiClient.put<Comment>(
      `/posts/${postId}/comments/${commentId}`,
      { content },
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Delete a comment
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    await this.apiClient.delete(
      `/posts/${postId}/comments/${commentId}`,
      { requiresAuth: true }
    );
  }

  /**
   * Like/unlike a comment
   */
  async toggleCommentLike(
    postId: string,
    commentId: string
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const response = await this.apiClient.post<{ isLiked: boolean; likesCount: number }>(
      `/posts/${postId}/comments/${commentId}/like`,
      {},
      { requiresAuth: true }
    );

    return response.data;
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    const response = await this.apiClient.get<{ posts: Post[] }>(
      '/posts/trending',
      { limit },
      { requiresAuth: true }
    );

    return response.data.posts;
  }

  /**
   * Get posts by user
   */
  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Post>> {
    const response = await this.apiClient.getPaginated<Post>(
      `/users/${userId}/posts`,
      { page, limit },
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Get bookmarked posts
   */
  async getBookmarkedPosts(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Post>> {
    const response = await this.apiClient.getPaginated<Post>(
      '/posts/bookmarked',
      { page, limit },
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Search posts
   */
  async searchPosts(
    query: string,
    filters?: PostFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Post>> {
    const params = {
      q: query,
      page,
      limit,
      ...filters,
    };

    const response = await this.apiClient.getPaginated<Post>(
      '/posts/search',
      params,
      { requiresAuth: true }
    );

    return response;
  }

  /**
   * Report a post
   */
  async reportPost(
    postId: string,
    reason: string,
    description?: string
  ): Promise<void> {
    await this.apiClient.post(
      `/posts/${postId}/report`,
      { reason, description },
      { requiresAuth: true }
    );
  }
}

// Export singleton instance
export const postsService = PostsService.getInstance();