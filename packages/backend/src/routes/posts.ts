import express from 'express';
import { PostService } from '../services/postService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const postService = new PostService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { title, content, communityId, mediaAttachments = [], tags = [], visibility = 'public' } = req.body;
    const authorId = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title and content are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['public', 'community', 'followers'].includes(visibility)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Visibility must be one of: public, community, followers',
          timestamp: new Date().toISOString()
        }
      });
    }

    const post = await postService.createPost(authorId, {
      title,
      content,
      communityId,
      mediaAttachments,
      tags,
      visibility
    });

    res.status(201).json({ post });
  } catch (error) {
    logger.error('Error creating post:', error);
    const statusCode = error.message.includes('not a member') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'COMMUNITY_ACCESS_DENIED' : 'CREATE_POST_ERROR',
        message: error.message || 'Failed to create post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get post by ID
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.userId;

    const post = await postService.getPost(postId, viewerId);

    if (!post) {
      return res.status(404).json({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or access denied',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ post });
  } catch (error) {
    logger.error('Error fetching post:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_POST_ERROR',
        message: 'Failed to fetch post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Update post
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const authorId = req.user.userId;
    const { title, content, tags, visibility } = req.body;

    const post = await postService.updatePost(postId, authorId, {
      title,
      content,
      tags,
      visibility
    });

    res.json({ post });
  } catch (error) {
    logger.error('Error updating post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'UPDATE_POST_ERROR',
        message: error.message || 'Failed to update post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Delete post
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const authorId = req.user.userId;

    await postService.deletePost(postId, authorId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'DELETE_POST_ERROR',
        message: error.message || 'Failed to delete post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user feed
router.get('/feed/user', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc',
      includeFollowing = 'true',
      includeCommunities = 'true',
      visibility
    } = req.query;

    const visibilityArray = visibility ? 
      (Array.isArray(visibility) ? visibility : [visibility]) as ('public' | 'community' | 'followers')[] : 
      undefined;

    const result = await postService.getFeedPosts({
      userId,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      includeFollowing: includeFollowing === 'true',
      includeCommunities: includeCommunities === 'true',
      visibility: visibilityArray
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user feed:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_FEED_ERROR',
        message: 'Failed to fetch user feed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get community posts
router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const viewerId = req.user.userId;
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const result = await postService.getCommunityPosts(communityId, viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching community posts:', error);
    const statusCode = error.message.includes('Access denied') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'ACCESS_DENIED' : 
              statusCode === 404 ? 'COMMUNITY_NOT_FOUND' : 'FETCH_COMMUNITY_POSTS_ERROR',
        message: error.message || 'Failed to fetch community posts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user posts
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.userId;
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const result = await postService.getUserPosts(userId, viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user posts:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_USER_POSTS_ERROR',
        message: 'Failed to fetch user posts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Search posts
router.get('/search/posts', async (req, res) => {
  try {
    const viewerId = req.user.userId;
    const {
      q = '',
      authorId,
      communityId,
      visibility,
      tags,
      hasMedia,
      isPinned,
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      authorId: authorId as string | undefined,
      communityId: communityId as string | undefined,
      visibility: visibility as 'public' | 'community' | 'followers' | undefined,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
      hasMedia: hasMedia === 'true' ? true : hasMedia === 'false' ? false : undefined,
      isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined
    };

    const result = await postService.searchPosts(q as string, filters, viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
  } catch (error) {
    logger.error('Error searching posts:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_POSTS_ERROR',
        message: 'Failed to search posts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get trending posts
router.get('/trending/posts', async (req, res) => {
  try {
    const viewerId = req.user.userId;
    const {
      page = '1',
      limit = '20'
    } = req.query;

    const result = await postService.getTrendingPosts(viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching trending posts:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_TRENDING_POSTS_ERROR',
        message: 'Failed to fetch trending posts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Like post
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    await postService.likePost(postId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error liking post:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Access denied') ? 403 :
                      error.message.includes('already liked') ? 409 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'POST_NOT_FOUND' : 
              statusCode === 403 ? 'ACCESS_DENIED' :
              statusCode === 409 ? 'ALREADY_LIKED' : 'LIKE_POST_ERROR',
        message: error.message || 'Failed to like post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Unlike post
router.delete('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    await postService.unlikePost(postId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error unliking post:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'LIKE_NOT_FOUND' : 'UNLIKE_POST_ERROR',
        message: error.message || 'Failed to unlike post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Add comment to post
router.post('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const authorId = req.user.userId;
    const { content, parentCommentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Comment content is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const comment = await postService.addComment(postId, authorId, content, parentCommentId);

    res.status(201).json({ comment });
  } catch (error) {
    logger.error('Error adding comment:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'POST_NOT_FOUND' : 
              statusCode === 403 ? 'ACCESS_DENIED' : 'ADD_COMMENT_ERROR',
        message: error.message || 'Failed to add comment',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get post comments
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.userId;
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'asc'
    } = req.query;

    const result = await postService.getPostComments(postId, viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching post comments:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'POST_NOT_FOUND' : 
              statusCode === 403 ? 'ACCESS_DENIED' : 'FETCH_COMMENTS_ERROR',
        message: error.message || 'Failed to fetch comments',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Update comment
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const authorId = req.user.userId;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Comment content is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const comment = await postService.updateComment(commentId, authorId, content);

    res.json({ comment });
  } catch (error) {
    logger.error('Error updating comment:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'COMMENT_NOT_FOUND' : 'UPDATE_COMMENT_ERROR',
        message: error.message || 'Failed to update comment',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Delete comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const authorId = req.user.userId;

    await postService.deleteComment(commentId, authorId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting comment:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'COMMENT_NOT_FOUND' : 'DELETE_COMMENT_ERROR',
        message: error.message || 'Failed to delete comment',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Share post
router.post('/:postId/share', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { content, communityId, visibility = 'public' } = req.body;

    if (!['public', 'community', 'followers'].includes(visibility)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Visibility must be one of: public, community, followers',
          timestamp: new Date().toISOString()
        }
      });
    }

    const sharedPost = await postService.sharePost(postId, userId, {
      content,
      communityId,
      visibility
    });

    res.status(201).json({ post: sharedPost });
  } catch (error) {
    logger.error('Error sharing post:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'POST_NOT_FOUND' : 
              statusCode === 403 ? 'ACCESS_DENIED' : 'SHARE_POST_ERROR',
        message: error.message || 'Failed to share post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Pin post
router.post('/:postId/pin', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { communityId } = req.body;

    await postService.pinPost(postId, userId, communityId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error pinning post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'PIN_POST_ERROR',
        message: error.message || 'Failed to pin post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Unpin post
router.delete('/:postId/pin', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { communityId } = req.body;

    await postService.unpinPost(postId, userId, communityId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error unpinning post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'UNPIN_POST_ERROR',
        message: error.message || 'Failed to unpin post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Add tags to post
router.post('/:postId/tags', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tags must be a non-empty array',
          timestamp: new Date().toISOString()
        }
      });
    }

    const post = await postService.addTagsToPost(postId, userId, tags);

    res.json({ post });
  } catch (error) {
    logger.error('Error adding tags to post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'ADD_TAGS_ERROR',
        message: error.message || 'Failed to add tags to post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Remove tags from post
router.delete('/:postId/tags', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tags must be a non-empty array',
          timestamp: new Date().toISOString()
        }
      });
    }

    const post = await postService.removeTagsFromPost(postId, userId, tags);

    res.json({ post });
  } catch (error) {
    logger.error('Error removing tags from post:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'POST_NOT_FOUND' : 'REMOVE_TAGS_ERROR',
        message: error.message || 'Failed to remove tags from post',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get popular tags
router.get('/tags/popular', async (req, res) => {
  try {
    const { limit = '20' } = req.query;

    const tags = await postService.getPopularTags(parseInt(limit as string));

    res.json({ tags });
  } catch (error) {
    logger.error('Error fetching popular tags:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_POPULAR_TAGS_ERROR',
        message: 'Failed to fetch popular tags',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get posts by tag
router.get('/tags/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const viewerId = req.user.userId;
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const result = await postService.getPostsByTag(tag, viewerId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching posts by tag:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_POSTS_BY_TAG_ERROR',
        message: 'Failed to fetch posts by tag',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Moderate comment (for moderators/admins)
router.post('/comments/:commentId/moderate', async (req, res) => {
  try {
    const { commentId } = req.params;
    const moderatorId = req.user.userId;
    const { action, reason } = req.body;

    if (!action || !['approve', 'delete'].includes(action)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Action must be either approve or delete',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reason is required for moderation actions',
          timestamp: new Date().toISOString()
        }
      });
    }

    await postService.moderateComment(commentId, moderatorId, action, reason);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error moderating comment:', error);
    const statusCode = error.message.includes('not authorized') ? 403 : 
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 
              statusCode === 404 ? 'COMMENT_NOT_FOUND' : 'MODERATE_COMMENT_ERROR',
        message: error.message || 'Failed to moderate comment',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;