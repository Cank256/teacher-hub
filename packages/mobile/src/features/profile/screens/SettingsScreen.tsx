import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileService, ProfilePreferences } from '@/services/api/profileService';
import { HapticService } from '@/services/haptics';
import type { ProfileStackScreenProps } from '@/navigation/types';
import {
  Text,
  Card,
  Switch,
  Button,
  Loading,
} from '@/components/ui';

type Props = ProfileStackScreenProps<'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['preferences'],
    queryFn: profileService.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: profileService.updatePreferences,
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['preferences'], updatedPreferences);
      HapticService.selectionChanged();
    },
    onError: (error: any) => {
      console.error('Failed to update preferences:', error);
      Alert.alert(
        'Update Failed',
        'Failed to update preferences. Please try again.',
        [{ text: 'OK' }]
      );
      HapticService.notificationError();
    },
  });

  const handleNotificationToggle = (key: keyof ProfilePreferences['notifications'], value: boolean) => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value,
      },
    };

    updatePreferencesMutation.mutate(updatedPreferences);
  };

  const handlePrivacyToggle = (key: keyof ProfilePreferences['privacy'], value: boolean) => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      privacy: {
        ...preferences.privacy,
        [key]: value,
      },
    };

    updatePreferencesMutation.mutate(updatedPreferences);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      theme,
    };

    updatePreferencesMutation.mutate(updatedPreferences);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              HapticService.notificationSuccess();
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert(
              'Feature Coming Soon',
              'Account deletion will be available in a future update.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading settings...
        </Text>
      </View>
    );
  }

  if (error || !preferences) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load settings
        </Text>
        <Button
          title="Retry"
          onPress={() => queryClient.invalidateQueries({ queryKey: ['preferences'] })}
          variant="outline"
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Notifications */}
      <Card style={styles.card}>
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
          Notifications
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Posts & Updates
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Get notified about new posts and updates
            </Text>
          </View>
          <Switch
            value={preferences.notifications.posts}
            onValueChange={(value) => handleNotificationToggle('posts', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Communities
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Get notified about community activities
            </Text>
          </View>
          <Switch
            value={preferences.notifications.communities}
            onValueChange={(value) => handleNotificationToggle('communities', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Messages
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Get notified about new messages
            </Text>
          </View>
          <Switch
            value={preferences.notifications.messages}
            onValueChange={(value) => handleNotificationToggle('messages', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Government Updates
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Get notified about official curriculum updates
            </Text>
          </View>
          <Switch
            value={preferences.notifications.government}
            onValueChange={(value) => handleNotificationToggle('government', value)}
          />
        </View>
      </Card>

      {/* Privacy */}
      <Card style={styles.card}>
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
          Privacy
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Show Email
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Allow others to see your email address
            </Text>
          </View>
          <Switch
            value={preferences.privacy.showEmail}
            onValueChange={(value) => handlePrivacyToggle('showEmail', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Show Location
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Allow others to see your school location
            </Text>
          </View>
          <Switch
            value={preferences.privacy.showLocation}
            onValueChange={(value) => handlePrivacyToggle('showLocation', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Show Experience
            </Text>
            <Text
              style={[
                styles.settingDescription,
                {
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Allow others to see your years of experience
            </Text>
          </View>
          <Switch
            value={preferences.privacy.showExperience}
            onValueChange={(value) => handlePrivacyToggle('showExperience', value)}
          />
        </View>
      </Card>

      {/* Appearance */}
      <Card style={styles.card}>
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
          Appearance
        </Text>

        <TouchableOpacity
          style={[
            styles.themeOption,
            {
              backgroundColor: preferences.theme === 'light' 
                ? theme.colors.highlight 
                : 'transparent',
            },
          ]}
          onPress={() => handleThemeChange('light')}
        >
          <Text
            style={[
              styles.themeLabel,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            Light Theme
          </Text>
          {preferences.theme === 'light' && (
            <Text style={[styles.checkmark, { color: theme.colors.primary }]}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeOption,
            {
              backgroundColor: preferences.theme === 'dark' 
                ? theme.colors.highlight 
                : 'transparent',
            },
          ]}
          onPress={() => handleThemeChange('dark')}
        >
          <Text
            style={[
              styles.themeLabel,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            Dark Theme
          </Text>
          {preferences.theme === 'dark' && (
            <Text style={[styles.checkmark, { color: theme.colors.primary }]}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeOption,
            {
              backgroundColor: preferences.theme === 'system' 
                ? theme.colors.highlight 
                : 'transparent',
            },
          ]}
          onPress={() => handleThemeChange('system')}
        >
          <Text
            style={[
              styles.themeLabel,
              {
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.text,
              },
            ]}
          >
            System Default
          </Text>
          {preferences.theme === 'system' && (
            <Text style={[styles.checkmark, { color: theme.colors.primary }]}>
              ✓
            </Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Account Actions */}
      <Card style={styles.card}>
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
          Account
        </Text>

        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          style={styles.actionButton}
        />

        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="outline"
          style={[styles.actionButton, { borderColor: theme.colors.error }]}
          textStyle={{ color: theme.colors.error }}
        />
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
  card: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    marginBottom: 2,
  },
  settingDescription: {
    lineHeight: 18,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  themeLabel: {
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    marginBottom: 12,
  },
});