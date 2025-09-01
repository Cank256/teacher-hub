import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/api/profileService';
import { HapticService } from '@/services/haptics';
import type { ProfileStackScreenProps } from '@/navigation/types';
import {
  Text,
  Card,
  Button,
  Loading,
  ProfilePicture,
  VerificationStatus,
} from '@/components/ui';

type Props = ProfileStackScreenProps<'ProfileView'>;

export const ProfileViewScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Upload profile picture mutation
  const uploadPictureMutation = useMutation({
    mutationFn: profileService.uploadProfilePicture,
    onSuccess: (data) => {
      // Update the profile cache
      queryClient.setQueryData(['profile'], (oldData: any) => ({
        ...oldData,
        profilePicture: data.profilePictureUrl,
      }));
      
      // Refresh auth context
      refreshUser();
      
      HapticService.notificationSuccess();
    },
    onError: (error) => {
      console.error('Failed to upload profile picture:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to upload profile picture. Please try again.',
        [{ text: 'OK' }]
      );
      HapticService.notificationError();
    },
  });

  // Delete profile picture mutation
  const deletePictureMutation = useMutation({
    mutationFn: profileService.deleteProfilePicture,
    onSuccess: () => {
      // Update the profile cache
      queryClient.setQueryData(['profile'], (oldData: any) => ({
        ...oldData,
        profilePicture: undefined,
      }));
      
      // Refresh auth context
      refreshUser();
      
      HapticService.notificationSuccess();
    },
    onError: (error) => {
      console.error('Failed to delete profile picture:', error);
      Alert.alert(
        'Delete Failed',
        'Failed to delete profile picture. Please try again.',
        [{ text: 'OK' }]
      );
      HapticService.notificationError();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refreshUser(),
      ]);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleVerificationStatus = () => {
    navigation.navigate('VerificationStatus');
  };

  const handleOfflineContent = () => {
    navigation.navigate('OfflineContent');
  };

  const handleProfilePictureChange = (imageUri: string) => {
    uploadPictureMutation.mutate(imageUri);
  };

  const handleProfilePictureRemove = () => {
    deletePictureMutation.mutate();
  };

  const formatExperience = (years: number) => {
    if (years === 0) return 'New teacher';
    if (years === 1) return '1 year';
    return `${years} years`;
  };

  const formatSubjects = (subjects: any[]) => {
    if (!subjects || subjects.length === 0) return 'No subjects selected';
    if (subjects.length === 1) return subjects[0].name;
    if (subjects.length <= 3) return subjects.map(s => s.name).join(', ');
    return `${subjects.slice(0, 2).map(s => s.name).join(', ')} +${subjects.length - 2} more`;
  };

  const formatGradeLevels = (gradeLevels: any[]) => {
    if (!gradeLevels || gradeLevels.length === 0) return 'No grade levels selected';
    const sorted = [...gradeLevels].sort((a, b) => a.order - b.order);
    if (sorted.length <= 3) return sorted.map(g => g.name).join(', ');
    return `${sorted.slice(0, 2).map(g => g.name).join(', ')} +${sorted.length - 2} more`;
  };

  if (isLoading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load profile
        </Text>
        <Button
          title="Retry"
          onPress={() => refetch()}
          variant="outline"
          style={styles.retryButton}
        />
      </View>
    );
  }

  const currentProfile = profile || user;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <Card style={styles.headerCard}>
        <View style={styles.profileHeader}>
          <ProfilePicture
            imageUri={currentProfile?.profilePicture}
            size={120}
            editable
            onImageChange={handleProfilePictureChange}
            onImageRemove={handleProfilePictureRemove}
            loading={uploadPictureMutation.isPending || deletePictureMutation.isPending}
          />
          
          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.name,
                {
                  fontSize: theme.typography.fontSize.xl,
                  fontFamily: theme.typography.fontFamily.bold,
                  color: theme.colors.text,
                },
              ]}
            >
              {currentProfile?.firstName} {currentProfile?.lastName}
            </Text>
            
            <Text
              style={[
                styles.email,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {currentProfile?.email}
            </Text>

            <View style={styles.experienceContainer}>
              <Text
                style={[
                  styles.experience,
                  {
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                {formatExperience(currentProfile?.yearsOfExperience || 0)} of experience
              </Text>
            </View>
          </View>
        </View>

        <Button
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="outline"
          style={styles.editButton}
        />
      </Card>

      {/* Verification Status */}
      <VerificationStatus
        status={currentProfile?.verificationStatus}
        onViewDetails={handleVerificationStatus}
        compact
      />

      {/* Profile Details */}
      <Card style={styles.detailsCard}>
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

        <View style={styles.detailItem}>
          <Text
            style={[
              styles.detailLabel,
              {
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            Subjects
          </Text>
          <Text
            style={[
              styles.detailValue,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            {formatSubjects(currentProfile?.subjects || [])}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text
            style={[
              styles.detailLabel,
              {
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            Grade Levels
          </Text>
          <Text
            style={[
              styles.detailValue,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            {formatGradeLevels(currentProfile?.gradeLevels || [])}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text
            style={[
              styles.detailLabel,
              {
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            School Location
          </Text>
          <Text
            style={[
              styles.detailValue,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            {currentProfile?.schoolLocation?.name || 'Not specified'}
          </Text>
        </View>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
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
          Quick Actions
        </Text>

        <TouchableOpacity
          style={[
            styles.actionItem,
            { borderBottomColor: theme.colors.borderLight },
          ]}
          onPress={handleVerificationStatus}
        >
          <Text
            style={[
              styles.actionText,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            Verification Status
          </Text>
          <Text style={[styles.actionArrow, { color: theme.colors.textSecondary }]}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionItem,
            { borderBottomColor: theme.colors.borderLight },
          ]}
          onPress={handleOfflineContent}
        >
          <Text
            style={[
              styles.actionText,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            Offline Content
          </Text>
          <Text style={[styles.actionArrow, { color: theme.colors.textSecondary }]}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleSettings}
        >
          <Text
            style={[
              styles.actionText,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            Settings & Preferences
          </Text>
          <Text style={[styles.actionArrow, { color: theme.colors.textSecondary }]}>
            ›
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
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
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  headerCard: {
    marginBottom: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    marginBottom: 4,
  },
  email: {
    marginBottom: 8,
  },
  experienceContainer: {
    marginTop: 4,
  },
  experience: {
    fontStyle: 'italic',
  },
  editButton: {
    alignSelf: 'stretch',
  },
  detailsCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    lineHeight: 22,
  },
  actionsCard: {
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionText: {
    flex: 1,
  },
  actionArrow: {
    fontSize: 18,
    marginLeft: 8,
  },
});