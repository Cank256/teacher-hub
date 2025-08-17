import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useDispatch, useSelector} from 'react-redux';

import {createCommunity, CreateCommunityRequest} from '../../store/slices/communitiesSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

interface CommunityCreatorProps {
  onClose: () => void;
  onCommunityCreated?: () => void;
}

const communityTypes = [
  {value: 'subject', label: 'Subject', icon: 'school', description: 'For specific academic subjects'},
  {value: 'region', label: 'Region', icon: 'location-on', description: 'For teachers in a specific area'},
  {value: 'grade', label: 'Grade Level', icon: 'grade', description: 'For specific grade levels'},
  {value: 'general', label: 'General', icon: 'group', description: 'For general discussions'},
] as const;

export const CommunityCreator: React.FC<CommunityCreatorProps> = ({
  onClose,
  onCommunityCreated,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {isCreating} = useSelector((state: RootState) => state.communities);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'subject' | 'region' | 'grade' | 'general'>('subject');
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  
  const nameInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  
  const submitScale = useSharedValue(1);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: submitScale.value}],
  }));

  const canSubmit = name.trim().length >= 3 && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      submitScale.value = withSpring(0.95, {damping: 15, stiffness: 300});
      
      const communityData: CreateCommunityRequest = {
        name: name.trim(),
        description: description.trim(),
        type,
        isPrivate,
        requiresApproval,
      };

      await dispatch(createCommunity(communityData)).unwrap();
      
      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      
      Alert.alert('Success', 'Community created successfully!', [
        {text: 'OK', onPress: () => {
          onCommunityCreated?.();
          onClose();
        }}
      ]);
    } catch (error) {
      submitScale.value = withSpring(1, {damping: 15, stiffness: 300});
      Alert.alert('Error', 'Failed to create community');
    }
  };

  const renderTypeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Community Type</Text>
      <View style={styles.typeGrid}>
        {communityTypes.map((communityType) => (
          <TouchableOpacity
            key={communityType.value}
            style={[
              styles.typeOption,
              type === communityType.value && styles.typeOptionSelected,
            ]}
            onPress={() => setType(communityType.value)}
            activeOpacity={0.7}>
            <Icon
              name={communityType.icon}
              size={24}
              color={type === communityType.value ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.typeOptionLabel,
                type === communityType.value && styles.typeOptionLabelSelected,
              ]}>
              {communityType.label}
            </Text>
            <Text style={styles.typeOptionDescription}>
              {communityType.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>Community Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Private Community</Text>
          <Text style={styles.settingDescription}>
            Only members can see posts and content
          </Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          trackColor={{false: theme.colors.border, true: theme.colors.primary}}
          thumbColor={theme.colors.surface}
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Require Approval</Text>
          <Text style={styles.settingDescription}>
            New members must be approved by moderators
          </Text>
        </View>
        <Switch
          value={requiresApproval}
          onValueChange={setRequiresApproval}
          trackColor={{false: theme.colors.border, true: theme.colors.primary}}
          thumbColor={theme.colors.surface}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Icon name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Community</Text>
        
        <Animated.View style={submitAnimatedStyle}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isCreating}
            activeOpacity={0.7}>
            <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Community Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Community Name *</Text>
          <TextInput
            ref={nameInputRef}
            style={styles.textInput}
            placeholder="Enter community name"
            placeholderTextColor={theme.colors.textLight}
            value={name}
            onChangeText={setName}
            maxLength={50}
            returnKeyType="next"
            onSubmitEditing={() => descriptionInputRef.current?.focus()}
          />
          <Text style={styles.characterCount}>{name.length}/50</Text>
          {name.length > 0 && name.length < 3 && (
            <Text style={styles.validationError}>
              Name must be at least 3 characters
            </Text>
          )}
        </View>

        {/* Community Description */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            ref={descriptionInputRef}
            style={styles.textAreaInput}
            placeholder="Describe what your community is about..."
            placeholderTextColor={theme.colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{description.length}/500</Text>
          {description.length > 0 && description.length < 10 && (
            <Text style={styles.validationError}>
              Description must be at least 10 characters
            </Text>
          )}
        </View>

        {/* Community Type */}
        {renderTypeSelector()}

        {/* Community Settings */}
        {renderSettings()}

        {/* Guidelines */}
        <View style={styles.guidelinesContainer}>
          <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
          <Text style={styles.guidelinesText}>
            • Keep discussions respectful and professional{'\n'}
            • Share resources that are relevant to the community{'\n'}
            • Help other teachers by answering questions{'\n'}
            • Follow platform rules and policies
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
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
  characterCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  validationError: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  typeOption: {
    width: '48%',
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
  },
  guidelinesContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  guidelinesTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  guidelinesText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});