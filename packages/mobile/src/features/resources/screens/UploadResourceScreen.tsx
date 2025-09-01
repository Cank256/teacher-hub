import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { MultiSelect } from '@/components/ui/MultiSelect/MultiSelect';
import { UploadProgress } from '@/components/resources/UploadProgress/UploadProgress';
import { YouTubePlayer } from '@/components/resources/YouTubePlayer/YouTubePlayer';
import {
  useUploadResource,
  useUploadYouTubeVideo,
  useResourceCategories,
  useFileValidation,
} from '@/services/api/hooks/useResources';
import { YouTubeService } from '@/services/api/youtubeService';
import type { ResourcesStackScreenProps } from '@/navigation/types';
import type {
  ResourceType,
  CreateResourceRequest,
  UploadProgress as UploadProgressType,
} from '@/types/resources';

type Props = ResourcesStackScreenProps<'UploadResource'>;

interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const RESOURCE_TYPES: Array<{ label: string; value: ResourceType; icon: string }> = [
  { label: 'Document', value: 'document', icon: 'description' },
  { label: 'Image', value: 'image', icon: 'image' },
  { label: 'Video', value: 'video', icon: 'videocam' },
  { label: 'YouTube Video', value: 'youtube_video', icon: 'play-circle-filled' },
  { label: 'Audio', value: 'audio', icon: 'audiotrack' },
  { label: 'Presentation', value: 'presentation', icon: 'slideshow' },
  { label: 'Spreadsheet', value: 'spreadsheet', icon: 'grid-on' },
];

export const UploadResourceScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceType>('document');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'completed' | 'error'>('uploading');

  const { data: categories = [] } = useResourceCategories();
  const uploadMutation = useUploadResource();
  const uploadYouTubeMutation = useUploadYouTubeVideo();
  const { validateFile } = useFileValidation();

  const handleTypeSelect = (type: ResourceType) => {
    setSelectedType(type);
    setSelectedFile(null);
    setYoutubeUrl('');
    setYoutubeVideoId(null);
  };

  const handleFilePicker = async () => {
    if (selectedType === 'image') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: getDocumentPickerType(selectedType),
          multiple: false,
        });

        if (!result.canceled && result.assets[0]) {
          const file = result.assets[0];
          setSelectedFile({
            uri: file.uri,
            name: file.name || 'file',
            type: file.mimeType || 'application/octet-stream',
            size: file.size || 0,
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const getDocumentPickerType = (type: ResourceType): string => {
    switch (type) {
      case 'document':
        return 'application/pdf';
      case 'video':
        return 'video/*';
      case 'audio':
        return 'audio/*';
      case 'presentation':
        return 'application/vnd.ms-powerpoint';
      case 'spreadsheet':
        return 'application/vnd.ms-excel';
      default:
        return '*/*';
    }
  };

  const handleYouTubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const videoId = YouTubeService.extractVideoId(url);
    setYoutubeVideoId(videoId);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!description.trim()) return 'Description is required';
    if (!selectedCategory) return 'Category is required';
    
    if (selectedType === 'youtube_video') {
      if (!youtubeUrl.trim()) return 'YouTube URL is required';
      if (!youtubeVideoId) return 'Invalid YouTube URL';
    } else {
      if (!selectedFile) return 'File is required';
      
      const validation = validateFile(selectedFile as any, selectedType);
      if (!validation.valid) return validation.error || 'Invalid file';
    }
    
    return null;
  };

  const handleUpload = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setShowUploadProgress(true);
    setUploadStatus('uploading');

    try {
      const request: CreateResourceRequest = {
        title: title.trim(),
        description: description.trim(),
        type: selectedType,
        categoryId: selectedCategory,
        tags,
      };

      if (selectedType === 'youtube_video') {
        request.youtubeUrl = youtubeUrl;
      } else if (selectedFile) {
        request.file = selectedFile as any;
      }

      if (selectedType === 'video' && selectedFile) {
        // Upload video to YouTube first
        await uploadYouTubeMutation.mutateAsync({
          file: selectedFile as any,
          metadata: {
            title: title.trim(),
            description: description.trim(),
            categoryId: selectedCategory,
            tags,
          },
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });
      } else {
        await uploadMutation.mutateAsync({
          request,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });
      }

      setUploadStatus('completed');
      setTimeout(() => {
        setShowUploadProgress(false);
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      console.error('Upload failed:', error);
    }
  };

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        Resource Type
      </Text>
      <View style={styles.typeGrid}>
        {RESOURCE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              {
                backgroundColor: selectedType === type.value
                  ? colors.primary
                  : colors.background.secondary,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleTypeSelect(type.value)}
          >
            <Icon
              name={type.icon}
              size={24}
              color={selectedType === type.value ? colors.background.primary : colors.text.primary}
            />
            <Text
              style={[
                styles.typeCardText,
                {
                  color: selectedType === type.value
                    ? colors.background.primary
                    : colors.text.primary,
                },
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFileSelector = () => {
    if (selectedType === 'youtube_video') {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            YouTube Video URL
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor={colors.text.secondary}
            value={youtubeUrl}
            onChangeText={handleYouTubeUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {youtubeVideoId && (
            <View style={styles.youtubePreview}>
              <YouTubePlayer
                videoId={youtubeVideoId}
                autoplay={false}
                controls={true}
                style={styles.youtubePlayer}
              />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Select File
        </Text>
        {selectedFile ? (
          <View style={[styles.selectedFile, { backgroundColor: colors.background.secondary }]}>
            <Icon name="attach-file" size={24} color={colors.text.primary} />
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: colors.text.primary }]}>
                {selectedFile.name}
              </Text>
              <Text style={[styles.fileSize, { color: colors.text.secondary }]}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.filePicker, { backgroundColor: colors.background.secondary, borderColor: colors.border }]}
            onPress={handleFilePicker}
          >
            <Icon name="cloud-upload" size={32} color={colors.text.secondary} />
            <Text style={[styles.filePickerText, { color: colors.text.secondary }]}>
              Tap to select file
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTagsInput = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        Tags
      </Text>
      <View style={styles.tagsInputContainer}>
        <TextInput
          style={[styles.tagInput, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
          placeholder="Add a tag..."
          placeholderTextColor={colors.text.secondary}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addTagButton, { backgroundColor: colors.primary }]}
          onPress={handleAddTag}
        >
          <Icon name="add" size={20} color={colors.background.primary} />
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag, index) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: colors.primary, opacity: 0.1 }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>
                #{tag}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                <Icon name="close" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Title
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
            placeholder="Enter resource title..."
            placeholderTextColor={colors.text.secondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Description
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
            placeholder="Describe your resource..."
            placeholderTextColor={colors.text.secondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {renderTypeSelector()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Category
          </Text>
          <MultiSelect
            data={categories.map(cat => ({ label: cat.name, value: cat.id }))}
            selectedValues={selectedCategory ? [selectedCategory] : []}
            onSelectionChange={(values) => setSelectedCategory(values[0] || '')}
            placeholder="Select category"
            single
          />
        </View>

        {renderFileSelector()}
        {renderTagsInput()}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background.primary, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={handleUpload}
          disabled={uploadMutation.isPending || uploadYouTubeMutation.isPending}
        >
          <Text style={[styles.uploadButtonText, { color: colors.background.primary }]}>
            Upload Resource
          </Text>
        </TouchableOpacity>
      </View>

      <UploadProgress
        visible={showUploadProgress}
        progress={uploadProgress}
        fileName={selectedFile?.name || title}
        status={uploadStatus}
        onClose={() => setShowUploadProgress(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeCardText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  filePickerText: {
    marginTop: 8,
    fontSize: 14,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  youtubePreview: {
    marginTop: 12,
  },
  youtubePlayer: {
    height: 200,
  },
  tagsInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addTagButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  uploadButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});