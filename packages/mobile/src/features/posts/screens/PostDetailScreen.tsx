/**
 * Post Detail Screen
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Loading, Card, ProfilePicture } from '../../../components/ui';
import PostCard from '../../../components/posts/PostCard';
import {
  usePost,
  usePostComments,
  useAddComment,
  useToggleCommentLike,
  useDeletePost,
} from '../../../services/api/hooks/usePosts';
import { Comment, CommentFormData } from '../../../types/posts';
import type { PostsStackScreenProps } from '../../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';
import { HapticService } from '../../../services/haptics';
import { formatDistanceToNow } from 'date-fns';

// Comment form validation schema
const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
});

type CommentFormData = z.infer<typeof commentSchema>;

type Props = PostsStackScreenProps<'PostDetail'>;

export const PostDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
    },
  });

  // API hooks
  const {
    data: postDetail,
    isLoading: postLoading,
    isError: postError,
    refetch: refetchPost,
    isRefetching: postRefetching,
  } = usePost(postId);

  const {
    data: commentsData,
    isLoading: commentsLoading,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: fetchingMoreComments,
    refetch: refetchComments,
  } = usePostComments(postId);

  const addCommentMutation = useAddComment({
    onSuccess: () => {
      reset();
      setReplyingTo(null);
      HapticService.success();
    },
    onError: (error) => {
      HapticService.error();
      Alert.alert('Error', error.message || 'Failed to add comment');
    },
  });

  const toggleCommentLikeMutation = useToggleCommentLike();
  const deletePostMutation = useDeletePost({
    onSuccess: () => {
      HapticService.success();
      navigation.goBack();
    },
    onError: (error) => {
      HapticService.error();
      Alert.alert('Error', error.message || 'Failed to delete post');
    },
  });

  // Flatten comments from all pages
  const comments = React.useMemo(() => {
    return commentsData?.pages.flatMap(page => page.data) ?? [];
  }, [commentsData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetchPost();
    refetchComments();
  }, [refetchPost, refetchComments]);

  const handleEditPost = useCallback(() => {
    if (postDetail?.post) {
      navigation.navigate('EditPost', { postId: postDetail.post.id });
    }
  }, [navigation, postDetail]);

  const handleDeletePost = useCallback(() => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePostMutation.mutate(postId),
        },
      ]
    );
  }, [deletePostMutation, postId]);

  const handleAuthorPress = useCallback((userId: string) => {
    // Navigate to user profile
    console.log('Navigate to user profile:', userId);
  }, []);

  const handleCategoryPress = useCallback((categoryId: string) => {
    // Navigate to category posts
    console.log('Navigate to category:', categoryId);
  }, []);

  const handleReplyToComment = useCallback((commentId: string) => {
    setReplyingTo(commentId);
    commentInputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleCommentLike = useCallback(async (commentId: string) => {
    try {
      await HapticService.light();
      toggleCommentLikeMutation.mutate({ postId, commentId });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  }, [postId, toggleCommentLikeMutation]);

  const handleLoadMoreComments = useCallback(() => {
    if (hasMoreComments && !fetchingMoreComments) {
      fetchMoreComments();
    }
  }, [hasMoreComments, fetchingMoreComments, fetchMoreComments]);

  const onSubmitComment = useCallback(async (data: CommentFormData) => {
    try {
      const commentData: CommentFormData = {
        content: data.content,
        parentId: replyingTo || undefined,
      };

      await addCommentMutation.mutateAsync({ postId, commentData });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [postId, replyingTo, addCommentMutation]);

  // Render functions
  const renderComment = useCallback(({ item: comment }: { item: Comment }) => (
    <CommentItem
      comment={comment}
      onLike={() => handleCommentLike(comment.id)}
      onReply={() => handleReplyToComment(comment.id)}
      onAuthorPress={() => handleAuthorPress(comment.author.id)}
      isLiking={toggleCommentLikeMutation.isPending}
    />
  ), [handleCommentLike, handleReplyToComment, handleAuthorPress, toggleCommentLikeMutation.isPending]);

  const renderHeader = useCallback(() => {
    if (!postDetail?.post) return null;

    const isOwnPost = true; // TODO: Check if current user owns the post

    return (
      <View style={styles.headerContainer}>
        <PostCard
          post={postDetail.post}
          onAuthorPress={handleAuthorPress}
          onCategoryPress={handleCategoryPress}
          showFullContent={true}
        />
        
        {isOwnPost && (
          <View style={styles.postActions}>
            <Button
              title="Edit"
              variant="outline"
              size="small"
              onPress={handleEditPost}
              style={styles.actionButton}
            />
            <Button
              title="Delete"
              variant="outline"
              size="small"
              onPress={handleDeletePost}
              loading={deletePostMutation.isPending}
              style={[styles.actionButton, { borderColor: theme.colors.error }]}
              textStyle={{ color: theme.colors.error }}
            />
          </View>
        )}

        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
            Comments ({comments.length})
          </Text>
        </View>
      </View>
    );
  }, [
    postDetail,
    handleAuthorPress,
    handleCategoryPress,
    handleEditPost,
    handleDeletePost,
    deletePostMutation.isPending,
    comments.length,
    theme,
  ]);

  const renderFooter = useCallback(() => {
    if (!fetchingMoreComments) return null;
    
    return (
      <View style={styles.footer}>
        <Loading size="small" />
      </View>
    );
  }, [fetchingMoreComments]);

  const renderCommentInput = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.commentInputContainer,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {replyingTo && (
        <View style={[styles.replyIndicator, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.replyText, { color: theme.colors.textSecondary }]}>
            Replying to comment
          </Text>
          <TouchableOpacity onPress={handleCancelReply}>
            <Icon name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.commentInputRow}>
        <Controller
          control={control}
          name="content"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              ref={commentInputRef}
              style={[
                styles.commentInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.colors.textSecondary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              maxLength={1000}
              testID="comment-input"
            />
          )}
        />
        
        <Button
          title="Post"
          onPress={handleSubmit(onSubmitComment)}
          disabled={!isValid || addCommentMutation.isPending}
          loading={addCommentMutation.isPending}
          size="small"
          style={styles.commentSubmitButton}
        />
      </View>
      
      {errors.content && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errors.content.message}
        </Text>
      )}
    </KeyboardAvoidingView>
  );

  if (postLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (postError || !postDetail?.post) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
          Post not found
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
          This post may have been deleted or you don't have permission to view it.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMoreComments}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={postRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        estimatedItemSize={100}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="post-detail-list"
      />
      
      {renderCommentInput()}
    </View>
  );
};

// Comment Item Component
interface CommentItemProps {
  comment: Comment;
  onLike: () => void;
  onReply: () => void;
  onAuthorPress: () => void;
  isLiking: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  onAuthorPress,
  isLiking,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.commentItem, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity onPress={onAuthorPress} style={styles.commentAuthor}>
        <ProfilePicture
          uri={comment.author.profilePicture}
          size={32}
          name={`${comment.author.firstName} ${comment.author.lastName}`}
        />
      </TouchableOpacity>
      
      <View style={styles.commentContent}>
        <TouchableOpacity onPress={onAuthorPress}>
          <Text style={[styles.commentAuthorName, { color: theme.colors.text }]}>
            {comment.author.firstName} {comment.author.lastName}
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.commentText, { color: theme.colors.text }]}>
          {comment.content}
        </Text>
        
        <View style={styles.commentActions}>
          <Text style={[styles.commentTimestamp, { color: theme.colors.textSecondary }]}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </Text>
          
          <TouchableOpacity
            style={styles.commentAction}
            onPress={onLike}
            disabled={isLiking}
          >
            <Icon
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={14}
              color={comment.isLiked ? theme.colors.error : theme.colors.textSecondary}
            />
            <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>
              {comment.likes}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.commentAction} onPress={onReply}>
            <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>
              Reply
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={() => {}} // TODO: Handle reply likes
                onReply={() => {}} // TODO: Handle reply to reply
                onAuthorPress={() => {}} // TODO: Handle reply author press
                isLiking={false}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    paddingHorizontal: 24,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  commentAuthor: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTimestamp: {
    fontSize: 12,
    marginRight: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E5E5',
    paddingLeft: 12,
  },
  commentInputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSubmitButton: {
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});