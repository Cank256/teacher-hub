import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useDispatch, useSelector} from 'react-redux';

import {createPost} from '../../store/slices/postsSlice';
import {cameraService, MediaFile} from '../../services/camera/cameraService';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface PostCreatorProps {
  onClose: () => void;
  onPostCreated?: () => void;
  communityId?: string;
  communityName?: string;
}

const {width: screenWidth} = Dimensions.get('window');

export const PostCreator: React.FC<PostCreatorProps> = ({
  onClose,
  onPostCreated,
  communityId,
  communityName,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {isCreating} = useSelector((state: RootState) => state.posts);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'community' | 'followers'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  const tagInputRef = useRef<TextInput>(null);
  
  const submitScale = useSharedValue(1);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: submitScale.value}],
  }));

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const handleAddMedia = async () => {
    try {
      const files = await cameraService.showMediaPicker({
        mediaType: 'mixed',
        quality: 'medium',
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (files.length > 0) {
        // Validate files
        const validFiles: MediaFile[] = [];
        for (const file of files) {
          const validation = cameraService.validateMediaFile(file, 10);
          if (validation.valid) {
            validFiles.push(file);
          } else {
            Alert.alert('Invalid File', validation.error);
          }
        }

        if (validFiles.length > 0) {
          setMediaFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      submitScale.value = withSpring(0.95, {damping: 15, stiffness: 300});
      
      await dispatch(createPost({
        title: title.trim(),
        content: content.trim(),
        communityId,
        visibility: communityId ? 'community' : visibility,
        tags,
        mediaAttachments: mediaFiles as any, // Would be processed properly in real implementation
      })).unwrap();

      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      
      Alert.alert('Success', 'Post created successfully!', [
        {text: 'OK', onPress: () => {
          onPostCreated?.();
          onClose();
        }}
      ]);
    } catch (error) {
      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const renderMediaPreview = () => {
    if (mediaFiles.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaPreview}
        contentContainerStyle={styles.mediaPreviewContent}>
        {mediaFiles.map((file, index) => (
          <View key={index} style={styles.mediaItem}>
            <Image
              source={{uri: file.uri}}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {file.type.startsWith('video') && (
              <View style={styles.videoIndicator}>
                <Icon name="play-arrow" size={16} color={theme.colors.surface} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeMediaButton}
              onPress={() => handleRemoveMedia(index)}
              activeOpacity={0.7}>
              <Icon name="close" size={16} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderTags = () => {
    if (tags.length === 0) return null;

    return (
      <View style={styles.tagsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContent}>
          {tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                style={styles.removeTagButton}
                activeOpacity={0.7}>
                <Icon name="close" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderVisibilitySelector = () => {
    if (communityId) return null; // Community posts are always community-visible

    const options = [
      {value: 'public', label: 'Public', icon: 'public'},
      {value: 'followers', label: 'Followers', icon: 'people'},
    ] as const;

    return (
      <View style={styles.visibilityContainer}>
        <Text style={styles.sectionLabel}>Visibility</Text>
        <View style={styles.visibilityOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityOption,
                visibility === option.value && styles.visibilityOptionSelected,
              ]}
              onPress={() => setVisibility(option.value)}
              activeOpacity={0.7}>
              <Icon
                name={option.icon}
                size={16}
                color={visibility === option.value ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.visibilityOptionText,
                  visibility === option.value && styles.visibilityOptionTextSelected,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Icon name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Post</Text>
          {communityName && (
            <Text style={styles.headerSubtitle}>in {communityName}</Text>
          )}
        </View>
        
        <Animated.View style={submitAnimatedStyle}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isCreating}
            activeOpacity={0.7}>
            <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
              {isCreating ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            placeholder="What's your post about?"
            placeholderTextColor={theme.colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => contentInputRef.current?.focus()}
          />
          <Text style={styles.characterCount}>{title.length}/100</Text>
        </View>

        {/* Content Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={contentInputRef}
            style={styles.contentInput}
            placeholder="Share your thoughts, resources, or ask a question..."
            placeholderTextColor={theme.colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{content.length}/2000</Text>
        </View>

        {/* Media Preview */}
        {renderMediaPreview()}

        {/* Tags */}
        {renderTags()}

        {/* Tag Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              ref={tagInputRef}
              style={styles.tagInput}
              placeholder="Add tags (press space or enter to add)"
              placeholderTextColor={theme.colors.textLight}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
              maxLength={20}
            />
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={handleAddTag}
              disabled={!tagInput.trim()}
              activeOpacity={0.7}>
              <Icon name="add" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Visibility Selector */}
        {renderVisibilitySelector()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddMedia}
          activeOpacity={0.7}>
          <Icon name="photo-camera" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Media</Text>
        </TouchableOpacity>
        
        <View style={styles.actionsSpacer} />
        
        <Text style={styles.mediaCount}>
          {mediaFiles.length}/5 media files
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.borderLight,
  },
  submitButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: theme.colors.textLight,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  titleInput: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 50,
  },
  contentInput: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
  },
  addTagButton: {
    padding: theme.spacing.md,
  },
  tagsContainer: {
    marginBottom: theme.spacing.lg,
  },
  tagsContent: {
    paddingRight: theme.spacing.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  removeTagButton: {
    marginLeft: theme.spacing.xs,
  },
  visibilityContainer: {
    marginBottom: theme.spacing.lg,
  },
  visibilityOptions: {
    flexDirection: 'row',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  visibilityOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.borderLight,
  },
  visibilityOptionText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  visibilityOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  mediaPreview: {
    marginBottom: theme.spacing.lg,
  },
  mediaPreviewContent: {
    paddingRight: theme.spacing.lg,
  },
  mediaItem: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.sm,
    padding: 2,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  actionsSpacer: {
    flex: 1,
  },
  mediaCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
  },
});