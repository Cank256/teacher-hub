import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PostsStackScreenProps } from '@/navigation/types';

type Props = PostsStackScreenProps<'PostsFeed'>;

export const PostsFeedScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Posts Feed</Text>
      <Text style={styles.subtitle}>Posts feature will be implemented here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});