import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/api/profileService';
import { HapticService } from '@/services/haptics';
import type { ProfileStackScreenProps } from '@/navigation/types';
import type { Subject, GradeLevel, Location } from '@/types';
import {
  Text,
  Card,
  Button,
  Input,
  MultiSelect,
  Loading,
} from '@/components/ui';

type Props = ProfileStackScreenProps<'EditProfile'>;

// Validation schema
const editProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject'),
  gradeLevels: z.array(z.string()).min(1, 'Please select at least one grade level'),
  schoolLocationId: z.string().min(1, 'Please select your school location'),
  yearsOfExperience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience seems too high'),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Form setup
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      subjects: user?.subjects?.map(s => s.id) || [],
      gradeLevels: user?.gradeLevels?.map(g => g.id) || [],
      schoolLocationId: user?.schoolLocation?.id || '',
      yearsOfExperience: user?.yearsOfExperience || 0,
    },
  });

  // Fetch reference data
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: profileService.getSubjects,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: gradeLevels, isLoading: gradeLevelsLoading } = useQuery({
    queryKey: ['gradeLevels'],
    queryFn: profileService.getGradeLevels,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: profileService.getLocations,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: (updatedProfile) => {
      // Update profile cache
      queryClient.setQueryData(['profile'], updatedProfile);
      
      // Refresh auth context
      refreshUser();
      
      HapticService.notificationSuccess();
      
      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      console.error('Failed to update profile:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      
      Alert.alert('Update Failed', errorMessage, [{ text: 'OK' }]);
      HapticService.notificationError();
    },
  });

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      setIsSaving(true);
      await updateProfileMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled in the mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Convert data for MultiSelect components
  const subjectOptions = subjects?.map(subject => ({
    id: subject.id,
    label: subject.name,
    value: subject.id,
  })) || [];

  const gradeLevelOptions = gradeLevels?.map(gradeLevel => ({
    id: gradeLevel.id,
    label: gradeLevel.name,
    value: gradeLevel.id,
  })) || [];

  const locationOptions = locations?.map(location => ({
    id: location.id,
    label: `${location.name}, ${location.district}`,
    value: location.id,
  })) || [];

  const isLoading = subjectsLoading || gradeLevelsLoading || locationsLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading form data...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: theme.typography.fontSize.lg,
                fontFamily: theme.typography.fontFamily.semibold,
                color: theme.colors.text,
              },
            ]}
          >
            Personal Information
          </Text>

          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First Name"
                placeholder="Enter your first name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
                required
                autoCapitalize="words"
                testID="first-name-input"
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.lastName?.message}
                required
                autoCapitalize="words"
                testID="last-name-input"
                containerStyle={styles.inputSpacing}
              />
            )}
          />

          <Controller
            control={control}
            name="yearsOfExperience"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Years of Experience"
                placeholder="0"
                value={value.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  onChange(num);
                }}
                error={errors.yearsOfExperience?.message}
                keyboardType="numeric"
                testID="experience-input"
                containerStyle={styles.inputSpacing}
              />
            )}
          />
        </Card>

        <Card style={styles.formCard}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: theme.typography.fontSize.lg,
                fontFamily: theme.typography.fontFamily.semibold,
                color: theme.colors.text,
              },
            ]}
          >
            Teaching Details
          </Text>

          <Controller
            control={control}
            name="subjects"
            render={({ field: { onChange, value } }) => (
              <MultiSelect
                label="Subjects"
                placeholder="Select subjects you teach"
                options={subjectOptions}
                selectedValues={value}
                onSelectionChange={onChange}
                error={errors.subjects?.message}
                maxSelections={10}
                testID="subjects-select"
              />
            )}
          />

          <Controller
            control={control}
            name="gradeLevels"
            render={({ field: { onChange, value } }) => (
              <MultiSelect
                label="Grade Levels"
                placeholder="Select grade levels you teach"
                options={gradeLevelOptions}
                selectedValues={value}
                onSelectionChange={onChange}
                error={errors.gradeLevels?.message}
                maxSelections={15}
                testID="grade-levels-select"
                containerStyle={styles.inputSpacing}
              />
            )}
          />

          <Controller
            control={control}
            name="schoolLocationId"
            render={({ field: { onChange, value } }) => (
              <MultiSelect
                label="School Location"
                placeholder="Select your school location"
                options={locationOptions}
                selectedValues={value ? [value] : []}
                onSelectionChange={(values) => onChange(values[0] || '')}
                error={errors.schoolLocationId?.message}
                maxSelections={1}
                searchable
                testID="location-select"
                containerStyle={styles.inputSpacing}
              />
            )}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
            testID="cancel-button"
          />
          
          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={!isDirty || isSaving}
            style={styles.saveButton}
            testID="save-button"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  inputSpacing: {
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});