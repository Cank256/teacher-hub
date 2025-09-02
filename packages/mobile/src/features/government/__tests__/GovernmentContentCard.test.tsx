/**
 * Government Content Card Component Tests
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { GovernmentContentCard } from '../components/GovernmentContentCard';
import {
  GovernmentContent,
  GovernmentContentType,
  GovernmentContentCategory,
  GovernmentSource,
  ContentPriority,
  BadgeType,
} from '../../../types';

// Mock theme hook
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#ffffff',
      primary: '#1976d2',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3',
      success: '#4caf50',
      neutral: {
        light: '#f5f5f5',
        medium: '#9e9e9e',
      },
      text: {
        primary: '#212121',
        secondary: '#757575',
        tertiary: '#9e9e9e',
      },
      white: '#ffffff',
    },
    typography: {},
    spacing: {},
  }),
}));

const mockContent: GovernmentContent = {
  id: 'content-1',
  title: 'New Mathematics Curriculum Guidelines',
  description: 'Updated guidelines for teaching mathematics in primary schools',
  content: 'Detailed content here...',
  type: GovernmentContentType.CURRICULUM_UPDATE,
  category: GovernmentContentCategory.CURRICULUM,
  source: GovernmentSource.NCDC,
  priority: ContentPriority.HIGH,
  isOfficial: true,
  verificationBadge: {
    isVerified: true,
    verifiedBy: GovernmentSource.NCDC,
    verificationDate: new Date('2024-01-15'),
    badgeType: BadgeType.OFFICIAL,
    description: 'Officially verified by NCDC',
  },
  publishedAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-15'),
  tags: ['mathematics', 'primary', 'curriculum'],
  subjects: ['Mathematics'],
  gradeLevels: ['Primary 1', 'Primary 2'],
  attachments: [
    {
      id: 'att-1',
      filename: 'curriculum-guide.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      downloadUrl: 'https://example.com/file.pdf',
      isOfflineAvailable: false,
      checksum: 'abc123',
    },
  ],
  metadata: {
    version: '1.0',
    language: 'en',
    targetAudience: ['teachers'],
    keywords: ['mathematics', 'curriculum'],
    accessLevel: 'teachers_only' as any,
  },
};

describe('GovernmentContentCard', () => {
  const defaultProps = {
    content: mockContent,
    onPress: jest.fn(),
    onBookmark: jest.fn(),
    onShare: jest.fn(),
    onDownload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content information correctly', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    expect(screen.getByText('New Mathematics Curriculum Guidelines')).toBeTruthy();
    expect(screen.getByText('Updated guidelines for teaching mathematics in primary schools')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('📎 1')).toBeTruthy();
  });

  it('displays verification badge', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    // The verification badge should be rendered
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('shows priority indicator for high priority content', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    // High priority content should have warning color indicator
    const priorityIndicator = screen.getByTestId('priority-indicator');
    expect(priorityIndicator).toBeTruthy();
  });

  it('shows urgent badge for critical priority content', () => {
    const criticalContent = {
      ...mockContent,
      priority: ContentPriority.CRITICAL,
    };

    render(
      <GovernmentContentCard
        {...defaultProps}
        content={criticalContent}
      />
    );

    expect(screen.getByText('URGENT')).toBeTruthy();
  });

  it('handles press events correctly', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    fireEvent.press(screen.getByText('New Mathematics Curriculum Guidelines'));
    expect(defaultProps.onPress).toHaveBeenCalledWith(mockContent);
  });

  it('handles bookmark action', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    fireEvent.press(screen.getByText('🔖 Bookmark'));
    expect(defaultProps.onBookmark).toHaveBeenCalledWith('content-1');
  });

  it('handles share action', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    fireEvent.press(screen.getByText('📤 Share'));
    expect(defaultProps.onShare).toHaveBeenCalledWith('content-1');
  });

  it('handles download action when attachments exist', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    fireEvent.press(screen.getByText('📥 Download'));
    expect(defaultProps.onDownload).toHaveBeenCalledWith('content-1');
  });

  it('does not show download button when no attachments', () => {
    const contentWithoutAttachments = {
      ...mockContent,
      attachments: [],
    };

    render(
      <GovernmentContentCard
        {...defaultProps}
        content={contentWithoutAttachments}
      />
    );

    expect(screen.queryByText('📥 Download')).toBeNull();
  });

  it('renders in compact mode', () => {
    render(<GovernmentContentCard {...defaultProps} compact={true} />);

    // In compact mode, description and actions should not be shown
    expect(screen.queryByText('Updated guidelines for teaching mathematics in primary schools')).toBeNull();
    expect(screen.queryByText('🔖 Bookmark')).toBeNull();
  });

  it('hides actions when showActions is false', () => {
    render(<GovernmentContentCard {...defaultProps} showActions={false} />);

    expect(screen.queryByText('🔖 Bookmark')).toBeNull();
    expect(screen.queryByText('📤 Share')).toBeNull();
    expect(screen.queryByText('📥 Download')).toBeNull();
  });

  it('displays correct type icon', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    // Curriculum update should show book icon
    expect(screen.getByText('📚')).toBeTruthy();
  });

  it('formats date correctly', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    // Should show formatted date
    expect(screen.getByText('Jan 10, 2024')).toBeTruthy();
  });

  it('displays tags correctly', () => {
    render(<GovernmentContentCard {...defaultProps} />);

    expect(screen.getByText('mathematics')).toBeTruthy();
    expect(screen.getByText('primary')).toBeTruthy();
    expect(screen.getByText('curriculum')).toBeTruthy();
  });

  it('shows more tags indicator when there are many tags', () => {
    const contentWithManyTags = {
      ...mockContent,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };

    render(
      <GovernmentContentCard
        {...defaultProps}
        content={contentWithManyTags}
      />
    );

    expect(screen.getByText('+2 more')).toBeTruthy();
  });

  it('displays multiple subjects correctly', () => {
    const contentWithMultipleSubjects = {
      ...mockContent,
      subjects: ['Mathematics', 'Science', 'English'],
    };

    render(
      <GovernmentContentCard
        {...defaultProps}
        content={contentWithMultipleSubjects}
      />
    );

    expect(screen.getByText('Mathematics, Science +1')).toBeTruthy();
  });
});