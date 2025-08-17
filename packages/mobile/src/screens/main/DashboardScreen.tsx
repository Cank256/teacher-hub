import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';

import {TouchableCard} from '../../components/ui/TouchableCard';
import {FloatingActionButton} from '../../components/ui/FloatingActionButton';
import {PostCreator} from '../../components/posts/PostCreator';
import {theme} from '../../styles/theme';
import {RootState} from '../../store';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const {posts} = useSelector((state: RootState) => state.posts);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handleStatsPress = () => {
    // Navigate to detailed stats
    console.log('Stats card pressed');
  };

  const handleActivityPress = () => {
    // Navigate to activity history
    console.log('Activity card pressed');
  };

  const handlePostsPress = () => {
    // Navigate to posts screen
    (navigation as any).navigate('Posts');
  };

  const handleCreatePostPress = () => {
    setShowCreatePost(true);
  };

  const handleAddPress = () => {
    Alert.alert(
      'Create Content',
      'What would you like to create?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Post', onPress: handleCreatePostPress},
        {text: 'Resource', onPress: () => (navigation as any).navigate('Resources')},
        {text: 'Community', onPress: () => (navigation as any).navigate('Communities')},
      ]
    );
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
          {/* Quick Post Creation */}
          <TouchableCard onPress={handleCreatePostPress}>
            <View style={styles.quickPostContainer}>
              <Icon name="edit" size={24} color={theme.colors.primary} />
              <View style={styles.quickPostContent}>
                <Text style={styles.quickPostTitle}>Share something</Text>
                <Text style={styles.quickPostSubtitle}>What's on your mind?</Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </View>
          </TouchableCard>

          {/* Posts Overview */}
          <TouchableCard onPress={handlePostsPress}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Posts</Text>
              <TouchableOpacity onPress={handlePostsPress}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardText}>
              {posts.length > 0 
                ? `${posts.length} posts in your feed`
                : 'No posts yet - start following people or join communities!'
              }
            </Text>
          </TouchableCard>

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

      {/* Create Post Modal */}
      {showCreatePost && (
        <View style={styles.modalContainer}>
          <PostCreator
            onClose={() => setShowCreatePost(false)}
            onPostCreated={() => setShowCreatePost(false)}
          />
        </View>
      )}
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
  quickPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPostContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  quickPostTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickPostSubtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
  },
  viewAllText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 2000,
  },
});