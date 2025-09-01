import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { ProfileStackScreenProps } from '@/navigation/types';
import {
  Text,
  Card,
  Button,
} from '@/components/ui';

type Props = ProfileStackScreenProps<'OfflineContent'>;

export const OfflineContentScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card}>
        <Text
          style={[
            styles.title,
            {
              fontSize: theme.typography.fontSize.xl,
              fontFamily: theme.typography.fontFamily.bold,
              color: theme.colors.text,
              textAlign: 'center',
            },
          ]}
        >
          Offline Content Management
        </Text>

        <Text
          style={[
            styles.description,
            {
              fontSize: theme.typography.fontSize.md,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            },
          ]}
        >
          This feature will allow you to manage downloaded content for offline access, 
          including posts, resources, and community discussions.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.colors.primary }]}>
              📱
            </Text>
            <Text
              style={[
                styles.featureText,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Download posts and resources for offline reading
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.colors.primary }]}>
              💾
            </Text>
            <Text
              style={[
                styles.featureText,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Manage storage space and content priorities
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.colors.primary }]}>
              🔄
            </Text>
            <Text
              style={[
                styles.featureText,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              Automatic sync when connection is restored
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.colors.primary }]}>
              📊
            </Text>
            <Text
              style={[
                styles.featureText,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.text,
                },
              ]}
            >
              View storage usage and download statistics
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.comingSoon,
            {
              fontSize: theme.typography.fontSize.lg,
              fontFamily: theme.typography.fontFamily.semibold,
              color: theme.colors.primary,
              textAlign: 'center',
            },
          ]}
        >
          Coming Soon!
        </Text>

        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backButton}
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
  card: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 32,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    lineHeight: 22,
  },
  comingSoon: {
    marginBottom: 24,
  },
  backButton: {
    alignSelf: 'stretch',
  },
});