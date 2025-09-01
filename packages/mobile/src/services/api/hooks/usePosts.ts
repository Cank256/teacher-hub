/**
 * React Query hooks for Posts
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { postsService } from '../postsService';
import {
  Post,
  PostCategory,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
  PostDetailResponse,
  ShareData,
  CommentFormData,
} from '../../../types/posts';
import { PaginatedResponse } from '../types';

// Query Keys
export const postsKeys = {
  all: ['posts'] as const,
  lists: () => [...postsKeys.all, 'list'] as const,
  list: (filters?: PostFilters) => [...postsKeys.lists(), filters] as const,
  details: () => [...postsKeys.all, 'detail'] as const,
  detail: (id: string) => [...postsKeys.details(), id] as const,
  categories: () => [...postsKeys.all, 'categories'] as const,
  comments: (postId: string) => [...postsKeys.all, 'comments', postId] as const,
  trending: () => [...postsKeys.all, 'trending'] as const,
  bookmarked: () => [...postsKeys.all, 'bookmarked'] as const,
  userPosts: (userId: string) => [...postsKeys.all, 'user', userId] as const,
  search: (query: string, filters?: PostFilters) => 
    [...postsKeys.all, 'search', query, filters] as const,
};

// Hooks

/**
 * Hook to fetch posts with infinite scrolling
 */
export function useInfinitePosts(
  filters?: PostFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Post>,
      Error,
      PaginatedResponse<Post>,
      PaginatedResponse<Post>,
      string[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery({
    queryKey: postsKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      postsService.getPosts(pageParam as number, 20, filters),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    ...options,
  });
}

/**
 * Hook to fetch a single post with details
 */
export function usePost(
  postId: string,
  options?: UseQueryOptions<PostDetailResponse, Error>
) {
  return useQuery({
    queryKey: postsKeys.detail(postId),
    queryFn: () => postsService.getPostById(postId),
    enabled: !!postId,
    ...options,
  });
}

/**
 * Hook to fetch post categories
 */
export function usePostCategories(
  options?: UseQueryOptions<PostCategory[], Error>
) {
  return useQuery({
    queryKey: postsKeys.categories(),
    queryFn: () => postsService.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch comments for a post
 */
export function usePostComments(
  postId: string,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Comment>,
      Error,
      PaginatedResponse<Comment>,
      PaginatedResponse<Comment>,
      string[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery({
    queryKey: postsKeys.comments(postId),
    queryFn: ({ pageParam = 1 }) =>
      postsService.getComments(postId, pageParam as number, 20),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!postId,
    ...options,
  });
}

/**
 * Hook to fetch trending posts
 */
export function useTrendingPosts(
  limit: number = 10,
  options?: UseQueryOptions<Post[], Error>
) {
  return useQuery({
    queryKey: postsKeys.trending(),
    queryFn: () => postsService.getTrendingPosts(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Hook to fetch bookmarked posts
 */
export function useBookmarkedPosts(
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Post>,
      Error,
      PaginatedResponse<Post>,
      PaginatedResponse<Post>,
      string[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery({
    queryKey: postsKeys.bookmarked(),
    queryFn: ({ pageParam = 1 }) =>
      postsService.getBookmarkedPosts(pageParam as number, 20),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    ...options,
  });
}

/**
 * Hook to search posts
 */
export function useSearchPosts(
  query: string,
  filters?: PostFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Post>,
      Error,
      PaginatedResponse<Post>,
      PaginatedResponse<Post>,
      string[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery({
    queryKey: postsKeys.search(query, filters),
    queryFn: ({ pageParam = 1 }) =>
      postsService.searchPosts(query, filters, pageParam as number, 20),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!query && query.length > 2,
    ...options,
  });
}

// Mutations

/**
 * Hook to create a new post
 */
export function useCreatePost(
  options?: UseMutationOptions<Post, Error, CreatePostRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postData: CreatePostRequest) => postsService.createPost(postData),
    onSuccess: (newPost) => {
      // Invalidate posts lists
      queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
      
      // Add the new post to the cache
      queryClient.setQueryData(postsKeys.detail(newPost.id), {
        post: newPost,
        comments: [],
        relatedPosts: [],
      });
    },
    ...options,
  });
}

/**
 * Hook to update a post
 */
export function useUpdatePost(
  options?: UseMutationOptions<Post, Error, { postId: string; updates: UpdatePostRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, updates }) => postsService.updatePost(postId, updates),
    onSuccess: (updatedPost) => {
      // Update the post in cache
      queryClient.setQueryData(postsKeys.detail(updatedPost.id), (old: PostDetailResponse | undefined) => {
        if (!old) return old;
        return { ...old, post: updatedPost };
      });

      // Invalidate posts lists to refresh
      queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete a post
 */
export function useDeletePost(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postsService.deletePost(postId),
    onSuccess: (_, postId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: postsKeys.detail(postId) });
      
      // Invalidate posts lists
      queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to toggle post like
 */
export function useTogglePostLike(
  options?: UseMutationOptions<
    { isLiked: boolean; likesCount: number },
    Error,
    string
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postsService.toggleLike(postId),
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: postsKeys.detail(postId) });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData<PostDetailResponse>(
        postsKeys.detail(postId)
      );

      // Optimistically update
      if (previousPost) {
        queryClient.setQueryData<PostDetailResponse>(
          postsKeys.detail(postId),
          {
            ...previousPost,
            post: {
              ...previousPost.post,
              isLiked: !previousPost.post.isLiked,
              likes: previousPost.post.isLiked
                ? previousPost.post.likes - 1
                : previousPost.post.likes + 1,
            },
          }
        );
      }

      return { previousPost };
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(postsKeys.detail(postId), context.previousPost);
      }
    },
    onSettled: (_, __, postId) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: postsKeys.detail(postId) });
    },
    ...options,
  });
}

/**
 * Hook to toggle post bookmark
 */
export function useTogglePostBookmark(
  options?: UseMutationOptions<{ isBookmarked: boolean }, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postsService.toggleBookmark(postId),
    onSuccess: (result, postId) => {
      // Update post in cache
      queryClient.setQueryData<PostDetailResponse>(
        postsKeys.detail(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            post: { ...old.post, isBookmarked: result.isBookmarked },
          };
        }
      );

      // Invalidate bookmarked posts if unbookmarked
      if (!result.isBookmarked) {
        queryClient.invalidateQueries({ queryKey: postsKeys.bookmarked() });
      }
    },
    ...options,
  });
}

/**
 * Hook to share a post
 */
export function useSharePost(
  options?: UseMutationOptions<void, Error, { postId: string; shareData: ShareData }>
) {
  return useMutation({
    mutationFn: ({ postId, shareData }) => postsService.sharePost(postId, shareData),
    ...options,
  });
}

/**
 * Hook to add a comment
 */
export function useAddComment(
  options?: UseMutationOptions<Comment, Error, { postId: string; commentData: CommentFormData }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, commentData }) => postsService.addComment(postId, commentData),
    onSuccess: (newComment, { postId }) => {
      // Invalidate comments
      queryClient.invalidateQueries({ queryKey: postsKeys.comments(postId) });
      
      // Update post comments count
      queryClient.setQueryData<PostDetailResponse>(
        postsKeys.detail(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            post: { ...old.post, comments: old.post.comments + 1 },
          };
        }
      );
    },
    ...options,
  });
}

/**
 * Hook to toggle comment like
 */
export function useToggleCommentLike(
  options?: UseMutationOptions<
    { isLiked: boolean; likesCount: number },
    Error,
    { postId: string; commentId: string }
  >
) {
  return useMutation({
    mutationFn: ({ postId, commentId }) => 
      postsService.toggleCommentLike(postId, commentId),
    ...options,
  });
}