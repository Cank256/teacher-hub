/**
 * Edit Post Screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Input, Loading } from '../../../components/ui';
import { usePost, useUpdatePost, usePostCategories } from '../../../services/api/hooks/usePosts';
import { PostVisibility, UpdatePostRequest } from '../../../types/posts';
import type { PostsStackScreenProps } from '../../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';
import { HapticService } from '../../../services/haptics';

// Form validation schema
const editPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content is too long'),
  categoryId: z.string().min(1, 'Category is required'),
  visibility: z.nativeEnum(PostVisibility),
});

type EditPostFormData = z.infer<typeof editPostSchema>;

type Props = PostsStackScreenProps<'EditPost'>;

const VISIBILITY_OPTIONS = [
  {
    value: PostVisibility.PUBLIC,
    label: 'Public',
    description: 'Anyone can see this post',
    icon: 'globe-outline',
  },
  {
    value: PostVisibility.COMMUNITY,
    label: 'Community Only',
    description: 'Only community members can see this',
    icon: 'people-outline',
  },
  {
    value: PostVisibility.FOLLOWERS,
    label: 'Followers',
    description: 'Only your followers can see this',
    icon: 'person-outline',
  },
];

export const EditPostScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const contentInputRef = useRef<TextInput>(null);

  // Fetch post data
  const {
    data: postDetail,
    isLoading: postLoading,
    isError: postError,
  } = usePost(postId);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: '',
      content: '',
      categoryId: '',
      visibility: PostVisibility.PUBLIC,
    },
    mode: 'onChange',
  });

  const watchedVisibility = watch('visibility');
  const watchedContent = watch('content');

  // API hooks
  const updatePostMutation = useUpdatePost({
    onSuccess: () => {
      HapticService.success();
      Alert.alert('Success', 'Your post has been updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      HapticService.error();
      Alert.alert('Error', error.message || 'Failed to update post');
    },
  });

  const { data: categories, isLoading: categoriesLoading } = usePostCategories();

  // Initialize form with post data
  useEffect(() => {
    if (postDetail?.post) {
      const post = postDetail.post;
      reset({
        title: post.title,
        content: post.content,
        categoryId: post.category.id,
        visibility: post.visibility,
      });
    }
  }, [postDetail, reset]);

  // Track changes
  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty]);

  // Handlers
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [navigation, hasChanges]);

  const handleVisibilityPress = useCallback(() => {
    setShowVisibilityOptions(!showVisibilityOptions);
  }, [showVisibilityOptions]);

  const handleVisibilitySelect = useCallback((visibility: PostVisibility) => {
    setValue('visibility', visibility, { shouldDirty: true });
    setShowVisibilityOptions(false);
  }, [setValue]);

  const onSubmit = useCallback(async (data: EditPostFormData) => {
    try {
      const updates: UpdatePostRequest = {
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        visibility: data.visibility,
      };

      await updatePostMutation.mutateAsync({ postId, updates });
    } catch (error) {
      console.error('Error updating post:', error);
    }
  }, [postId, updatePostMutation]);

  // Render functions
  const renderVisibilitySelector = () => {
    const selectedOption = VISIBILITY_OPTIONS.find(opt => opt.value === watchedVisibility);

    return (
      <View style={styles.visibilityContainer}>
        <TouchableOpacity
          style={[styles.visibilityButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleVisibilityPress}
          accessibilityRole="button"
          accessibilityLabel="Select post visibility"
        >
          <Icon
            name={selectedOption?.icon || 'globe-outline'}
            size={20}
            color={theme.colors.text}
          />
          <Text style={[styles.visibilityText, { color: theme.colors.text }]}>
            {selectedOption?.label || 'Public'}
          </Text>
          <Icon
            name={showVisibilityOptions ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {showVisibilityOptions && (
          <View style={[styles.visibilityOptions, { backgroundColor: theme.colors.card }]}>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  watchedVisibility === option.value && {
                    backgroundColor: theme.colors.primary + '10',
                  },
                ]}
                onPress={() => handleVisibilitySelect(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Set visibility to ${option.label}`}
              >
                <Icon
                  name={option.icon}
                  size={20}
                  color={
                    watchedVisibility === option.value
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <View style={styles.visibilityOptionText}>
                  <Text
                    style={[
                      styles.visibilityOptionLabel,
                      {
                        color:
                          watchedVisibility === option.value
                            ? theme.colors.primary
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.visibilityOptionDescription, { color: theme.colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

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
          This post may have been deleted or you don't have permission to edit it.
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.headerButtonText, { color: theme.colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edit Post
        </Text>
        
        <Button
          title="Save"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || !hasChanges || updatePostMutation.isPending}
          loading={updatePostMutation.isPending}
          size="small"
          testID="save-post-button"
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="What's your post about?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              style={styles.titleInput}
              maxLength={200}
              returnKeyType="next"
              onSubmitEditing={() => contentInputRef.current?.focus()}
              testID="post-title-input"
            />
          )}
        />

        {/* Content Input */}
        <Controller
          control={control}
          name="content"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.contentContainer}>
              <TextInput
                ref={contentInputRef}
                style={[
                  styles.contentInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Share your thoughts, experiences, or resources..."
                placeholderTextColor={theme.colors.textSecondary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                textAlignVertical="top"
                maxLength={5000}
                testID="post-content-input"
              />
              <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                {value.length}/5000
              </Text>
              {errors.content && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.content.message}
                </Text>
              )}
            </View>
          )}
        />

        {/* Category Selector */}
        <Controller
          control={control}
          name="categoryId"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoryContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                Category
              </Text>
              {categoriesLoading ? (
                <Loading size="small" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categories?.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: value === category.id
                            ? category.color + '20'
                            : theme.colors.surface,
                          borderColor: value === category.id
                            ? category.color
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => onChange(category.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${category.name} category`}
                      accessibilityState={{ selected: value === category.id }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          {
                            color: value === category.id
                              ? category.color
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {errors.categoryId && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.categoryId.message}
                </Text>
              )}
            </View>
          )}
        />

        {/* Visibility Selector */}
        {renderVisibilitySelector()}

        {/* Changes Indicator */}
        {hasChanges && (
          <View style={[styles.changesIndicator, { backgroundColor: theme.colors.primary + '10' }]}>
            <Icon name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.changesText, { color: theme.colors.primary }]}>
              You have unsaved changes
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  titleInput: {
    marginBottom: 16,
  },
  contentContainer: {
    marginBottom: 16,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityContainer: {
    marginBottom: 16,
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  visibilityText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  visibilityOptions: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  visibilityOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  visibilityOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  visibilityOptionDescription: {
    fontSize: 12,
  },
  changesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  changesText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});