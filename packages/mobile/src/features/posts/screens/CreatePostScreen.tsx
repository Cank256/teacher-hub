/**
 * Create Post Screen
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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FastImage from 'react-native-fast-image';
import DocumentPicker from 'react-native-document-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { Button, Input, Card, Loading } from '../../../components/ui';
import { useCreatePost, usePostCategories } from '../../../services/api/hooks/usePosts';
import { PostVisibility, CreatePostRequest } from '../../../types/posts';
import type { PostsStackScreenProps } from '../../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';
import { HapticService } from '../../../services/haptics';

const { width: screenWidth } = Dimensions.get('window');

// Form validation schema
const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content is too long'),
  categoryId: z.string().min(1, 'Category is required'),
  visibility: z.nativeEnum(PostVisibility),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

type Props = PostsStackScreenProps<'CreatePost'>;

interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size: number;
}

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

export const CreatePostScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const contentInputRef = useRef<TextInput>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
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
  const createPostMutation = useCreatePost({
    onSuccess: () => {
      HapticService.success();
      Alert.alert('Success', 'Your post has been created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      HapticService.error();
      Alert.alert('Error', error.message || 'Failed to create post');
    },
  });

  const { data: categories, isLoading: categoriesLoading } = usePostCategories();

  // Handlers
  const handleCancel = useCallback(() => {
    if (watchedContent.length > 0 || mediaFiles.length > 0) {
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post? Your changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [navigation, watchedContent, mediaFiles]);

  const handleAddImage = useCallback(async () => {
    try {
      await HapticService.light();
      
      Alert.alert(
        'Add Image',
        'Choose how you want to add an image',
        [
          { text: 'Camera', onPress: () => openCamera() },
          { text: 'Photo Library', onPress: () => openImagePicker() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error adding image:', error);
    }
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 1080,
        height: 1080,
        cropping: true,
        mediaType: 'photo',
        quality: 0.8,
      });

      const mediaFile: MediaFile = {
        uri: image.path,
        type: image.mime,
        name: `image_${Date.now()}.jpg`,
        size: image.size,
      };

      setMediaFiles(prev => [...prev, mediaFile]);
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  }, []);

  const openImagePicker = useCallback(async () => {
    try {
      const images = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 5 - mediaFiles.length,
        mediaType: 'photo',
        quality: 0.8,
      });

      const newMediaFiles: MediaFile[] = images.map((image, index) => ({
        uri: image.path,
        type: image.mime,
        name: `image_${Date.now()}_${index}.jpg`,
        size: image.size,
      }));

      setMediaFiles(prev => [...prev, ...newMediaFiles]);
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to select images');
      }
    }
  }, [mediaFiles.length]);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleVisibilityPress = useCallback(() => {
    setShowVisibilityOptions(!showVisibilityOptions);
  }, [showVisibilityOptions]);

  const handleVisibilitySelect = useCallback((visibility: PostVisibility) => {
    setValue('visibility', visibility);
    setShowVisibilityOptions(false);
  }, [setValue]);

  const onSubmit = useCallback(async (data: CreatePostFormData) => {
    try {
      const postData: CreatePostRequest = {
        ...data,
        mediaAttachments: mediaFiles as any[], // Convert to File objects in real implementation
      };

      await createPostMutation.mutateAsync(postData);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  }, [mediaFiles, createPostMutation]);

  // Render functions
  const renderMediaPreview = () => {
    if (mediaFiles.length === 0) return null;

    return (
      <View style={styles.mediaPreview}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mediaFiles.map((file, index) => (
            <View key={index} style={styles.mediaItem}>
              <FastImage
                source={{ uri: file.uri }}
                style={styles.mediaImage}
                resizeMode={FastImage.resizeMode.cover}
              />
              <TouchableOpacity
                style={[styles.removeMediaButton, { backgroundColor: theme.colors.error }]}
                onPress={() => handleRemoveMedia(index)}
                accessibilityRole="button"
                accessibilityLabel="Remove image"
              >
                <Icon name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

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
          <Card style={styles.visibilityOptions}>
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
          </Card>
        )}
      </View>
    );
  };

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
          Create Post
        </Text>
        
        <Button
          title="Post"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || createPostMutation.isPending}
          loading={createPostMutation.isPending}
          size="small"
          testID="submit-post-button"
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

        {/* Media Preview */}
        {renderMediaPreview()}

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

        {/* Media Actions */}
        <View style={styles.mediaActions}>
          <TouchableOpacity
            style={[styles.mediaActionButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleAddImage}
            disabled={mediaFiles.length >= 5}
            accessibilityRole="button"
            accessibilityLabel="Add image"
          >
            <Icon name="image-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.mediaActionText, { color: theme.colors.text }]}>
              Add Image ({mediaFiles.length}/5)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  mediaPreview: {
    marginBottom: 16,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 0,
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
  mediaActions: {
    marginBottom: 16,
  },
  mediaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  mediaActionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});