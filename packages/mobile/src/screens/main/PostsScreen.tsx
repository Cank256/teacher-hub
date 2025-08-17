import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';

import {PostFeed} from '../../components/posts/PostFeed';
import {Post} from '../../store/slices/postsSlice';
import {theme} from '../../styles/theme';

export const PostsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');

  const handlePostPress = (post: Post) => {
    // Navigate to post detail screen
    console.log('Post pressed:', post.id);
    // navigation.navigate('PostDetail', {postId: post.id});
  };

  const handleCommentPress = (post: Post) => {
    // Navigate to post detail with comments focused
    console.log('Comment pressed for post:', post.id);
    // navigation.navigate('PostDetail', {postId: post.id, focusComments: true});
  };

  const handleSharePress = (post: Post) => {
    Alert.alert(
      'Share Post',
      'Choose how you want to share this post',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Copy Link', onPress: () => console.log('Copy link')},
        {text: 'Share to Community', onPress: () => console.log('Share to community')},
        {text: 'Share Externally', onPress: () => console.log('Share externally')},
      ]
    );
  };

  const handleAuthorPress = (authorId: string) => {
    // Navigate to author profile
    console.log('Author pressed:', authorId);
    // navigation.navigate('Profile', {userId: authorId});
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Posts</Text>
      
      <View style={styles.feedToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            feedType === 'all' && styles.toggleButtonActive,
          ]}
          onPress={() => setFeedType('all')}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.toggleButtonText,
              feedType === 'all' && styles.toggleButtonTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            feedType === 'following' && styles.toggleButtonActive,
          ]}
          onPress={() => setFeedType('following')}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.toggleButtonText,
              feedType === 'following' && styles.toggleButtonTextActive,
            ]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <PostFeed
        showCreateButton={true}
        onPostPress={handlePostPress}
        onCommentPress={handleCommentPress}
        onSharePress={handleSharePress}
        onAuthorPress={handleAuthorPress}
      />
    </SafeAreaView>
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
  },
  feedToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  toggleButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});