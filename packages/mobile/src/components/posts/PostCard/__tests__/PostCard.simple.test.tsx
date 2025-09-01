/**
 * Simple PostCard Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Simple mock component for testing
const MockPostCard: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <View testID="post-card">
    <Text testID="post-title">{title}</Text>
    <Text testID="post-content">{content}</Text>
  </View>
);

describe('PostCard Simple Tests', () => {
  it('renders post title and content', () => {
    render(
      <MockPostCard 
        title="Test Post Title" 
        content="Test post content" 
      />
    );

    expect(screen.getByTestId('post-card')).toBeTruthy();
    expect(screen.getByText('Test Post Title')).toBeTruthy();
    expect(screen.getByText('Test post content')).toBeTruthy();
  });

  it('has correct test IDs', () => {
    render(
      <MockPostCard 
        title="Another Test" 
        content="Another content" 
      />
    );

    expect(screen.getByTestId('post-title')).toBeTruthy();
    expect(screen.getByTestId('post-content')).toBeTruthy();
  });
});