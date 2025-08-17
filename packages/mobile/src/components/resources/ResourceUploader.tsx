import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useDispatch, useSelector} from 'react-redux';

import {VideoPlayer} from './VideoPlayer';
import {cameraService, MediaFile} from '../../services/camera/cameraService';
import {videoRecordingService, VideoRecording} from '../../services/video/videoRecordingService';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface ResourceUploaderProps {
  visible: boolean;
  onClose: () => void;
  onResourceUploaded?: () => void;
  initialType?: 'document' | 'image' | 'video';
}

const resourceTypes = [
  {value: 'document', label: 'Document', icon: 'description', description: 'PDF, DOC, PPT files'},
  {value: 'image', label: 'Image', icon: 'image', description: 'Photos and graphics'},
  {value: 'video', label: 'Video', icon: 'videocam', description: 'Educational videos'},
] as const;

const subjects = [
  'Mathematics', 'Science', 'English', 'History', 'Geography',
  'Physics', 'Chemistry', 'Biology', 'Art', 'Music', 'PE',
];

const gradeLevels = [
  'Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th',
  '7th', '8th', '9th', '10th', '11th', '12th', 'College',
];

export const ResourceUploader: React.FC<ResourceUploaderProps> = ({
  visible,
  onClose,
  onResourceUploaded,
  initialType = 'document',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<'document' | 'image' | 'video'>(initialType);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [videoRecordings, setVideoRecordings] = useState<VideoRecording[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const tagInputRef = useRef<TextInput>(null);
  
  const submitScale = useSharedValue(1);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: submitScale.value}],
  }));

  const canSubmit = title.trim().length > 0 && 
                   description.trim().length > 0 && 
                   selectedSubjects.length > 0 &&
                   (uploadedFiles.length > 0 || videoRecordings.length > 0);

  const handleAddFiles = async () => {
    try {
      let files: MediaFile[] = [];
      
      if (resourceType === 'video') {
        files = await cameraService.captureVideo({
          quality: 'medium',
          durationLimit: 600, // 10 minutes
        });
      } else if (resourceType === 'image') {
        files = await cameraService.showMediaPicker({
          mediaType: 'photo',
          quality: 'high',
        });
      } else {
        // For documents, show file picker
        Alert.alert('Document Upload', 'Document picker would be implemented here');
        return;
      }

      if (files.length > 0) {
        // Validate files
        const validFiles: MediaFile[] = [];
        for (const file of files) {
          const validation = cameraService.validateMediaFile(file, 100); // 100MB limit
          if (validation.valid) {
            validFiles.push(file);
          } else {
            Alert.alert('Invalid File', validation.error);
          }
        }

        if (validFiles.length > 0) {
          setUploadedFiles(prev => [...prev, ...validFiles]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add files');
    }
  };

  const handleRecordVideo = () => {
    setShowVideoRecorder(true);
  };

  const handleVideoRecordingComplete = (recording: VideoRecording) => {
    const validation = videoRecordingService.validateVideoRecording(recording, 100);
    if (validation.valid) {
      setVideoRecordings(prev => [...prev, recording]);
      setShowVideoRecorder(false);
    } else {
      Alert.alert('Invalid Recording', validation.error);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideoRecording = (index: number) => {
    setVideoRecordings(prev => prev.filter((_, i) => i !== index));
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

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleGradeLevel = (grade: string) => {
    setSelectedGradeLevels(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsUploading(true);
      submitScale.value = withSpring(0.95, {damping: 15, stiffness: 300});
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // In a real implementation, you would:
      // 1. Upload files to server/cloud storage
      // 2. Process videos (compression, thumbnail generation)
      // 3. Run security scans
      // 4. Create resource record in database
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      
      Alert.alert('Success', 'Resource uploaded successfully!', [
        {text: 'OK', onPress: () => {
          onResourceUploaded?.();
          onClose();
        }}
      ]);
    } catch (error) {
      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      Alert.alert('Error', 'Failed to upload resource');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const renderTypeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Resource Type</Text>
      <View style={styles.typeGrid}>
        {resourceTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeOption,
              resourceType === type.value && styles.typeOptionSelected,
            ]}
            onPress={() => setResourceType(type.value)}
            activeOpacity={0.7}>
            <Icon
              name={type.icon}
              size={24}
              color={resourceType === type.value ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.typeOptionLabel,
                resourceType === type.value && styles.typeOptionLabelSelected,
              ]}>
              {type.label}
            </Text>
            <Text style={styles.typeOptionDescription}>
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFileUpload = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Files</Text>
      
      <View style={styles.uploadActions}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleAddFiles}
          activeOpacity={0.7}>
          <Icon name="cloud-upload" size={20} color={theme.colors.primary} />
          <Text style={styles.uploadButtonText}>
            {resourceType === 'video' ? 'Record/Select Video' : 
             resourceType === 'image' ? 'Take/Select Photo' : 'Select Document'}
          </Text>
        </TouchableOpacity>
        
        {resourceType === 'video' && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordVideo}
            activeOpacity={0.7}>
            <Icon name="videocam" size={20} color={theme.colors.error} />
            <Text style={styles.recordButtonText}>Record Video</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <View style={styles.filesContainer}>
          {uploadedFiles.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              {file.type.startsWith('image') ? (
                <Image source={{uri: file.uri}} style={styles.filePreview} />
              ) : (
                <View style={styles.fileIcon}>
                  <Icon name="insert-drive-file" size={24} color={theme.colors.primary} />
                </View>
              )}
              
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.fileName}
                </Text>
                <Text style={styles.fileSize}>
                  {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => handleRemoveFile(index)}
                activeOpacity={0.7}>
                <Icon name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Video Recordings */}
      {videoRecordings.length > 0 && (
        <View style={styles.videosContainer}>
          {videoRecordings.map((recording, index) => (
            <View key={index} style={styles.videoItem}>
              <VideoPlayer
                videoUri={recording.uri}
                thumbnailUri={recording.thumbnailUri}
                duration={recording.duration}
                style={styles.videoPreview}
              />
              
              <View style={styles.videoInfo}>
                <Text style={styles.videoDuration}>
                  {videoRecordingService.formatDuration(recording.duration)}
                </Text>
                <Text style={styles.videoSize}>
                  {videoRecordingService.formatFileSize(recording.size)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.removeVideoButton}
                onPress={() => handleRemoveVideoRecording(index)}
                activeOpacity={0.7}>
                <Icon name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSubjectSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Subjects *</Text>
      <View style={styles.chipContainer}>
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.chip,
              selectedSubjects.includes(subject) && styles.chipSelected,
            ]}
            onPress={() => toggleSubject(subject)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.chipText,
                selectedSubjects.includes(subject) && styles.chipTextSelected,
              ]}>
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGradeLevelSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Grade Levels</Text>
      <View style={styles.chipContainer}>
        {gradeLevels.map((grade) => (
          <TouchableOpacity
            key={grade}
            style={[
              styles.chip,
              selectedGradeLevels.includes(grade) && styles.chipSelected,
            ]}
            onPress={() => toggleGradeLevel(grade)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.chipText,
                selectedGradeLevels.includes(grade) && styles.chipTextSelected,
              ]}>
              {grade}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTags = () => (
    <View style={styles.sectionContainer}>
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

      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
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
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Upload Resource</Text>
          
          <Animated.View style={submitAnimatedStyle}>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || isUploading}
              activeOpacity={0.7}>
              <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${uploadProgress}%`}]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              ref={titleInputRef}
              style={styles.textInput}
              placeholder="Enter resource title"
              placeholderTextColor={theme.colors.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              ref={descriptionInputRef}
              style={styles.textAreaInput}
              placeholder="Describe your resource..."
              placeholderTextColor={theme.colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>

          {/* Resource Type */}
          {renderTypeSelector()}

          {/* File Upload */}
          {renderFileUpload()}

          {/* Subjects */}
          {renderSubjectSelector()}

          {/* Grade Levels */}
          {renderGradeLevelSelector()}

          {/* Tags */}
          {renderTags()}
        </ScrollView>
      </View>
    </Modal>
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
  headerTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 50,
  },
  textAreaInput: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
    maxHeight: 150,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  typeOption: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.borderLight,
  },
  typeOptionLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  typeOptionLabelSelected: {
    color: theme.colors.primary,
  },
  typeOptionDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  uploadActions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  uploadButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  recordButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.error,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  filesContainer: {
    marginTop: theme.spacing.md,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filePreview: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  fileIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeFileButton: {
    padding: theme.spacing.xs,
  },
  videosContainer: {
    marginTop: theme.spacing.md,
  },
  videoItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  videoPreview: {
    height: 120,
    marginBottom: theme.spacing.sm,
  },
  videoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoDuration: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  videoSize: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  removeVideoButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});