import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  communityId?: string;
  communityName?: string;
  title: string;
  content: string;
  mediaAttachments: MediaAttachment[];
  tags: string[];
  visibility: 'public' | 'community' | 'followers';
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  parentCommentId?: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  communityId?: string;
  visibility: 'public' | 'community' | 'followers';
  tags: string[];
  mediaAttachments: File[];
}

export interface PostsState {
  posts: Post[];
  userPosts: Post[];
  communityPosts: {[communityId: string]: Post[]};
  postComments: {[postId: string]: PostComment[]};
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  feedPage: number;
  hasMorePosts: boolean;
  refreshing: boolean;
}

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  communityPosts: {},
  postComments: {},
  isLoading: false,
  isCreating: false,
  error: null,
  feedPage: 1,
  hasMorePosts: true,
  refreshing: false,
};

// Async thunks
export const fetchFeedPosts = createAsyncThunk(
  'posts/fetchFeedPosts',
  async (params: {page?: number; refresh?: boolean} = {}) => {
    const {page = 1, refresh = false} = params;
    // This would call the actual API
    // For now, return mock data
    const mockPosts: Post[] = [
      {
        id: '1',
        authorId: 'user1',
        authorName: 'John Teacher',
        authorAvatar: 'https://example.com/avatar1.jpg',
        title: 'Great Math Resources',
        content: 'Just found some amazing math worksheets that my students love!',
        mediaAttachments: [],
        tags: ['math', 'worksheets'],
        visibility: 'public',
        likeCount: 15,
        commentCount: 3,
        isLiked: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    return {posts: mockPosts, page, hasMore: page < 3};
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: CreatePostRequest) => {
    // This would call the actual API
    const newPost: Post = {
      id: Date.now().toString(),
      authorId: 'current-user',
      authorName: 'Current User',
      title: postData.title,
      content: postData.content,
      communityId: postData.communityId,
      mediaAttachments: [], // Would be processed from files
      tags: postData.tags,
      visibility: postData.visibility,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return newPost;
  }
);

export const likePost = createAsyncThunk(
  'posts/likePost',
  async (postId: string) => {
    // This would call the actual API
    return {postId, liked: true};
  }
);

export const unlikePost = createAsyncThunk(
  'posts/unlikePost',
  async (postId: string) => {
    // This would call the actual API
    return {postId, liked: false};
  }
);

export const addComment = createAsyncThunk(
  'posts/addComment',
  async (commentData: {postId: string; content: string; parentCommentId?: string}) => {
    // This would call the actual API
    const newComment: PostComment = {
      id: Date.now().toString(),
      postId: commentData.postId,
      authorId: 'current-user',
      authorName: 'Current User',
      parentCommentId: commentData.parentCommentId,
      content: commentData.content,
      likeCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return newComment;
  }
);

export const fetchPostComments = createAsyncThunk(
  'posts/fetchPostComments',
  async (postId: string) => {
    // This would call the actual API
    return {postId, comments: []};
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    resetFeed: (state) => {
      state.posts = [];
      state.feedPage = 1;
      state.hasMorePosts = true;
    },
    updatePostInFeed: (state, action: PayloadAction<Post>) => {
      const index = state.posts.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch feed posts
      .addCase(fetchFeedPosts.pending, (state, action) => {
        if (action.meta.arg.refresh) {
          state.refreshing = true;
        } else {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        const {posts, page, hasMore} = action.payload;
        state.isLoading = false;
        state.refreshing = false;
        
        if (page === 1) {
          state.posts = posts;
        } else {
          state.posts = [...state.posts, ...posts];
        }
        
        state.feedPage = page;
        state.hasMorePosts = hasMore;
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.refreshing = false;
        state.error = action.error.message || 'Failed to fetch posts';
      })
      
      // Create post
      .addCase(createPost.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.isCreating = false;
        state.posts.unshift(action.payload);
        state.userPosts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || 'Failed to create post';
      })
      
      // Like/unlike post
      .addCase(likePost.fulfilled, (state, action) => {
        const {postId} = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.isLiked = true;
          post.likeCount += 1;
        }
      })
      .addCase(unlikePost.fulfilled, (state, action) => {
        const {postId} = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.isLiked = false;
          post.likeCount -= 1;
        }
      })
      
      // Comments
      .addCase(fetchPostComments.fulfilled, (state, action) => {
        const {postId, comments} = action.payload;
        state.postComments[postId] = comments;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const comment = action.payload;
        if (!state.postComments[comment.postId]) {
          state.postComments[comment.postId] = [];
        }
        state.postComments[comment.postId].push(comment);
        
        // Update comment count in post
        const post = state.posts.find(p => p.id === comment.postId);
        if (post) {
          post.commentCount += 1;
        }
      });
  },
});

export const {clearError, setRefreshing, resetFeed, updatePostInFeed} = postsSlice.actions;
export default postsSlice.reducer;