import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {TouchableCard} from '../../components/ui/TouchableCard';
import {FloatingActionButton} from '../../components/ui/FloatingActionButton';
import {theme} from '../../styles/theme';

export const DashboardScreen: React.FC = () => {
  const handleStatsPress = () => {
    // Navigate to detailed stats
    console.log('Stats card pressed');
  };

  const handleActivityPress = () => {
    // Navigate to activity history
    console.log('Activity card pressed');
  };

  const handleAddPress = () => {
    // Show add menu or navigate to create content
    console.log('Add button pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        testID="dashboard-scroll"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back to Teacher Hub</Text>
        </View>

        <View style={styles.content}>
          <TouchableCard onPress={handleStatsPress}>
            <Text style={styles.cardTitle}>Quick Stats</Text>
            <Text style={styles.cardText}>Resources Downloaded: 0</Text>
            <Text style={styles.cardText}>Messages: 0</Text>
            <Text style={styles.cardText}>Communities: 0</Text>
          </TouchableCard>

          <TouchableCard onPress={handleActivityPress}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <Text style={styles.cardText}>No recent activity</Text>
          </TouchableCard>
        </View>
      </ScrollView>

      <FloatingActionButton
        icon="add"
        onPress={handleAddPress}
        style={styles.fab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  cardText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
  },
});