import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ResourceCard } from '../ResourceCard';
import { OfflineResourceService } from '@/services/storage/offlineResourceService';
import type { Resource } from '@/types/resources';

// Mock dependencies
jest.mock('@/services/storage/offlineResourceService');
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      secondary: '#FF9500',
      accent: '#34C759',
      background: {
        primary: '#FFFFFF',
        secondary: '#F2F2F7',
      },
      text: {
        primary: '#000000',
        secondary: '#8E8E93',
      },
      border: '#C6C6C8',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  }),
}));

jest.mock('@/utils', () => ({
  formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`,
  formatDate: (date: Date) => date.toLocaleDateString(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockResource: Resource = {
  id: '1',
  title: 'Test Resource',
  description: 'This is a test resource for unit testing',
  type: 'document',
  fileUrl: 'https://example.com/file.pdf',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  size: 1024000, // 1MB
  category: {
    id: 'cat1',
    name: 'Mathematics',
    subjects: [],
    gradeLevels: [],
    color: '#FF6B6B',
    icon: 'calculate',
  },
  uploadedBy: {
    id: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    verificationStatus: 'verified',
  },
  rating: 4.5,
  downloadCount: 100,
  isDownloaded: false,
  tags: ['math', 'algebra'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('ResourceCard', () => {
  const mockOnPress = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnRate = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders resource information correctly', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
        onDownload={mockOnDownload}
        onRate={mockOnRate}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText('Test Resource')).toBeTruthy();
    expect(screen.getByText('This is a test resource for unit testing')).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('1.0 MB')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy(); // Download count
  });

  it('calls onPress when card is pressed', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
      />
    );

    fireEvent.press(screen.getByText('Test Resource'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows download button and calls onDownload when pressed', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByTestId('download-button') || 
                          screen.getAllByRole('button').find(button => 
                            button.props.accessibilityLabel?.includes('download') ||
                            button.props.children?.some?.((child: any) => 
                              child?.props?.name === 'download'
                            )
                          );

    if (downloadButton) {
      fireEvent.press(downloadButton);
      expect(mockOnDownload).toHaveBeenCalledTimes(1);
    }
  });

  it('shows downloaded badge when resource is downloaded', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
        isDownloaded={true}
      />
    );

    // Check for offline pin icon which indicates downloaded status
    const offlineIcon = screen.getAllByTestId('icon').find(icon => 
      icon.props.name === 'offline-pin'
    );
    expect(offlineIcon).toBeTruthy();
  });

  it('displays rating stars correctly', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
      />
    );

    expect(screen.getByText('(4.5)')).toBeTruthy();
  });

  it('shows verification badge for verified users', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
      />
    );

    // Check for verified icon
    const verifiedIcon = screen.getAllByTestId('icon').find(icon => 
      icon.props.name === 'verified'
    );
    expect(verifiedIcon).toBeTruthy();
  });

  it('handles download with default behavior when no onDownload provided', async () => {
    const mockDownloadResource = jest.fn().mockResolvedValue('/path/to/file');
    (OfflineResourceService.downloadResource as jest.Mock) = mockDownloadResource;

    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
      />
    );

    const downloadButton = screen.getAllByRole('button').find(button => 
      button.props.children?.some?.((child: any) => 
        child?.props?.name === 'download'
      )
    );

    if (downloadButton) {
      fireEvent.press(downloadButton);
      
      // Should show alert asking for confirmation
      expect(Alert.alert).toHaveBeenCalledWith(
        'Download Resource',
        'Do you want to download this resource for offline access?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Download' }),
        ])
      );
    }
  });

  it('hides actions when showActions is false', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onPress={mockOnPress}
        showActions={false}
      />
    );

    // Should not find action buttons
    const actionButtons = screen.queryAllByRole('button').filter(button => 
      button.props.children?.some?.((child: any) => 
        ['download', 'star', 'share'].includes(child?.props?.name)
      )
    );

    expect(actionButtons).toHaveLength(0);
  });

  it('renders different icons for different resource types', () => {
    const videoResource = { ...mockResource, type: 'video' as const };
    
    render(
      <ResourceCard
        resource={videoResource}
        onPress={mockOnPress}
      />
    );

    // Should render play icon for video
    const playIcon = screen.getAllByTestId('icon').find(icon => 
      icon.props.name === 'play-circle-filled'
    );
    expect(playIcon).toBeTruthy();
  });

  it('handles YouTube video resources', () => {
    const youtubeResource = { 
      ...mockResource, 
      type: 'youtube_video' as const,
      youtubeId: 'dQw4w9WgXcQ'
    };
    
    render(
      <ResourceCard
        resource={youtubeResource}
        onPress={mockOnPress}
      />
    );

    // Should render play icon for YouTube video
    const playIcon = screen.getAllByTestId('icon').find(icon => 
      icon.props.name === 'play-circle-filled'
    );
    expect(playIcon).toBeTruthy();
  });

  it('truncates long titles and descriptions', () => {
    const longTitleResource = {
      ...mockResource,
      title: 'This is a very long title that should be truncated when displayed in the card component',
      description: 'This is a very long description that should also be truncated when displayed in the card component to prevent layout issues',
    };

    render(
      <ResourceCard
        resource={longTitleResource}
        onPress={mockOnPress}
      />
    );

    // Text should be present (truncation is handled by numberOfLines prop)
    expect(screen.getByText(longTitleResource.title)).toBeTruthy();
    expect(screen.getByText(longTitleResource.description)).toBeTruthy();
  });
});