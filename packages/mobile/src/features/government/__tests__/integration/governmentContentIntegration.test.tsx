/**
 * Government Content Integration Tests
 * Tests the complete flow of government content features
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GovernmentContentList } from '../components/GovernmentContentList';
import { GovernmentContentDetail } from '../components/GovernmentContentDetail';
import { GovernmentNotificationsList } from '../components/GovernmentNotificationsList';
import { governmentService } from '../../../services/api/governmentService';
import { governmentNotificationService } from '../../../services/notifications/governmentNotificationService';
import {
  GovernmentContent,
  GovernmentNotification,
  GovernmentContentType,
  ContentPriority,
  NotificationType,
} from '../../../types';

// Mock services
jest.mock('../../../services/api/governmentService');
jest.mock('../../../services/notifications/governmentNotificationService');
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#ffffff',
      primary: '#1976d2',
      error: '#f44336',
      warning: '#ff9800',
      neutral: { light: '#f5f5f5', medium: '#9e9e9e' },
      text: { primary: '#212121', secondary: '#757575', tertiary: '#9e9e9e' },
      white: '#ffffff',
    },
    typography: {},
    spacing: {},
  }),
}));

const mockGovernmentService = governmentService as jest.Mocked<typeof governmentService>;
const mockNotificationService = governmentNotificationService as jest.Mocked<typeof governmentNotificationService>;

const mockContent: GovernmentContent = {
  id: 'content-1',
  title: 'New Mathematics Curriculum',
  description: 'Updated mathematics curriculum for primary schools',
  content: 'Detailed curriculum content...',
  type: GovernmentContentType.CURRICULUM_UPDATE,
  category: 'curriculum' as any,
  source: 'ncdc' as any,
  priority: ContentPriority.HIGH,
  isOfficial: true,
  verificationBadge: {
    isVerified: true,
    verifiedBy: 'ncdc' as any,
    verificationDate: new Date(),
    badgeType: 'official' as any,
    description: 'Official NCDC content',
  },
  publishedAt: new Date(),
  updatedAt: new Date(),
  tags: ['mathematics', 'curriculum'],
  subjects: ['Mathematics'],
  gradeLevels: ['Primary 1'],
  attachments: [],
  metadata: {
    version: '1.0',
    language: 'en',
    targetAudience: ['teachers'],
    keywords: ['mathematics'],
    accessLevel: 'teachers_only' as any,
  },
};

const mockNotification: GovernmentNotification = {
  id: 'notif-1',
  contentId: 'content-1',
  title: 'New Curriculum Available',
  message: 'A new mathematics curriculum has been published',
  type: NotificationType.CURRICULUM_UPDATE,
  priority: ContentPriority.HIGH,
  targetAudience: {
    subjects: ['Mathematics'],
  },
  scheduledAt: new Date(),
  actionRequired: false,
};

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Government Content Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content List and Search Flow', () => {
    it('should load and display government content', async () => {
      mockGovernmentService.getGovernmentContent.mockResolvedValue({
        data: [mockContent],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      render(
        <TestWrapper>
          <GovernmentContentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
      });

      expect(mockGovernmentService.getGovernmentContent).toHaveBeenCalledWith(
        {},
        1,
        20
      );
    });

    it('should handle search functionality', async () => {
      mockGovernmentService.searchGovernmentContent.mockResolvedValue({
        content: [mockContent],
        totalCount: 1,
        facets: {
          types: [],
          categories: [],
          sources: [],
          subjects: [],
          gradeLevels: [],
        },
        suggestions: [],
      });

      const onSearch = jest.fn();

      render(
        <TestWrapper>
          <GovernmentContentList onFilterChange={onSearch} />
        </TestWrapper>
      );

      // Simulate search
      const searchInput = screen.getByPlaceholderText('Search government content...');
      fireEvent.changeText(searchInput, 'mathematics');
      fireEvent(searchInput, 'submitEditing');

      await waitFor(() => {
        expect(mockGovernmentService.searchGovernmentContent).toHaveBeenCalledWith(
          'mathematics',
          expect.any(Object),
          1,
          20
        );
      });
    });

    it('should handle content press and navigation', async () => {
      mockGovernmentService.getGovernmentContent.mockResolvedValue({
        data: [mockContent],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const onContentPress = jest.fn();

      render(
        <TestWrapper>
          <GovernmentContentList onContentPress={onContentPress} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('New Mathematics Curriculum'));
      expect(onContentPress).toHaveBeenCalledWith(mockContent);
    });
  });

  describe('Content Detail Flow', () => {
    it('should load and display content details', async () => {
      mockGovernmentService.getGovernmentContentById.mockResolvedValue(mockContent);

      render(
        <TestWrapper>
          <GovernmentContentDetail contentId="content-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
        expect(screen.getByText('Updated mathematics curriculum for primary schools')).toBeTruthy();
      });

      expect(mockGovernmentService.getGovernmentContentById).toHaveBeenCalledWith('content-1');
    });

    it('should handle bookmark functionality', async () => {
      mockGovernmentService.getGovernmentContentById.mockResolvedValue(mockContent);
      mockGovernmentService.bookmarkContent.mockResolvedValue();

      const onBookmark = jest.fn();

      render(
        <TestWrapper>
          <GovernmentContentDetail
            contentId="content-1"
            onBookmark={onBookmark}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('🔖 Bookmark')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('🔖 Bookmark'));

      await waitFor(() => {
        expect(mockGovernmentService.bookmarkContent).toHaveBeenCalledWith('content-1');
        expect(onBookmark).toHaveBeenCalledWith('content-1');
      });
    });

    it('should handle share functionality', async () => {
      mockGovernmentService.getGovernmentContentById.mockResolvedValue(mockContent);
      mockGovernmentService.shareContent.mockResolvedValue();

      const onShare = jest.fn();

      render(
        <TestWrapper>
          <GovernmentContentDetail
            contentId="content-1"
            onShare={onShare}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('📤 Share')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('📤 Share'));
      
      // Should show share options alert
      expect(onShare).toHaveBeenCalledWith('content-1');
    });
  });

  describe('Notifications Flow', () => {
    it('should load and display government notifications', async () => {
      mockGovernmentService.getGovernmentNotifications.mockResolvedValue({
        data: [mockNotification],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      render(
        <TestWrapper>
          <GovernmentNotificationsList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Curriculum Available')).toBeTruthy();
        expect(screen.getByText('A new mathematics curriculum has been published')).toBeTruthy();
      });

      expect(mockGovernmentService.getGovernmentNotifications).toHaveBeenCalledWith(
        1,
        20,
        false
      );
    });

    it('should handle mark as read functionality', async () => {
      const unreadNotification = {
        ...mockNotification,
        readAt: undefined,
      };

      mockGovernmentService.getGovernmentNotifications.mockResolvedValue({
        data: [unreadNotification],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      mockGovernmentService.markNotificationAsRead.mockResolvedValue();

      const onMarkAsRead = jest.fn();

      render(
        <TestWrapper>
          <GovernmentNotificationsList onMarkAsRead={onMarkAsRead} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Mark as Read')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Mark as Read'));

      await waitFor(() => {
        expect(mockGovernmentService.markNotificationAsRead).toHaveBeenCalledWith('notif-1');
        expect(onMarkAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should handle notification press', async () => {
      mockGovernmentService.getGovernmentNotifications.mockResolvedValue({
        data: [mockNotification],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const onNotificationPress = jest.fn();

      render(
        <TestWrapper>
          <GovernmentNotificationsList onNotificationPress={onNotificationPress} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Curriculum Available')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('New Curriculum Available'));
      expect(onNotificationPress).toHaveBeenCalledWith(mockNotification);
    });
  });

  describe('Offline Content Management', () => {
    it('should handle content download for offline access', async () => {
      const contentWithAttachments = {
        ...mockContent,
        attachments: [
          {
            id: 'att-1',
            filename: 'curriculum.pdf',
            fileType: 'application/pdf',
            fileSize: 1024000,
            downloadUrl: 'https://example.com/file.pdf',
            isOfflineAvailable: false,
            checksum: 'abc123',
          },
        ],
      };

      mockGovernmentService.getGovernmentContentById.mockResolvedValue(contentWithAttachments);
      mockGovernmentService.downloadContentForOffline.mockResolvedValue(new Blob());

      const onDownload = jest.fn();

      render(
        <TestWrapper>
          <GovernmentContentDetail
            contentId="content-1"
            onDownload={onDownload}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('📥 Download')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('📥 Download'));

      await waitFor(() => {
        expect(mockGovernmentService.downloadContentForOffline).toHaveBeenCalledWith('content-1');
        expect(onDownload).toHaveBeenCalledWith('content-1');
      });
    });
  });

  describe('Push Notification Integration', () => {
    it('should initialize notification service', async () => {
      mockNotificationService.initialize.mockResolvedValue();

      await governmentNotificationService.initialize();

      expect(mockNotificationService.initialize).toHaveBeenCalled();
    });

    it('should subscribe to government notifications', async () => {
      mockNotificationService.subscribeToGovernmentNotifications.mockResolvedValue();

      const subjects = ['Mathematics'];
      const contentTypes = ['curriculum_update'];

      await governmentNotificationService.subscribeToGovernmentNotifications(
        subjects,
        undefined,
        contentTypes,
        undefined
      );

      expect(mockNotificationService.subscribeToGovernmentNotifications).toHaveBeenCalledWith(
        subjects,
        undefined,
        contentTypes,
        undefined
      );
    });

    it('should handle notification actions', async () => {
      mockNotificationService.handleNotificationAction.mockResolvedValue();

      const notification = {
        data: {
          contentId: 'content-1',
          notificationId: 'notif-1',
        },
      };

      await governmentNotificationService.handleNotificationAction('view', notification);

      expect(mockNotificationService.handleNotificationAction).toHaveBeenCalledWith(
        'view',
        notification
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGovernmentService.getGovernmentContent.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <GovernmentContentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Content')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('should handle content not found', async () => {
      mockGovernmentService.getGovernmentContentById.mockRejectedValue(
        new Error('Content not found')
      );

      render(
        <TestWrapper>
          <GovernmentContentDetail contentId="invalid-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Content')).toBeTruthy();
        expect(screen.getByText('Content not found')).toBeTruthy();
      });
    });

    it('should handle notification service errors', async () => {
      mockNotificationService.subscribeToGovernmentNotifications.mockRejectedValue(
        new Error('Subscription failed')
      );

      await expect(
        governmentNotificationService.subscribeToGovernmentNotifications(['Mathematics'])
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache content data between renders', async () => {
      mockGovernmentService.getGovernmentContent.mockResolvedValue({
        data: [mockContent],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const { rerender } = render(
        <TestWrapper>
          <GovernmentContentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
      });

      // Rerender should use cached data
      rerender(
        <TestWrapper>
          <GovernmentContentList />
        </TestWrapper>
      );

      // Should still show content without additional API call
      expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
      expect(mockGovernmentService.getGovernmentContent).toHaveBeenCalledTimes(1);
    });

    it('should handle infinite scroll loading', async () => {
      const page1Data = {
        data: [mockContent],
        pagination: { page: 1, limit: 1, total: 2, totalPages: 2 },
      };

      const page2Data = {
        data: [{ ...mockContent, id: 'content-2', title: 'Second Content' }],
        pagination: { page: 2, limit: 1, total: 2, totalPages: 2 },
      };

      mockGovernmentService.getGovernmentContent
        .mockResolvedValueOnce(page1Data)
        .mockResolvedValueOnce(page2Data);

      render(
        <TestWrapper>
          <GovernmentContentList limit={1} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Mathematics Curriculum')).toBeTruthy();
      });

      // Simulate scroll to end to trigger next page load
      const flatList = screen.getByTestId('content-list');
      fireEvent(flatList, 'onEndReached');

      await waitFor(() => {
        expect(screen.getByText('Second Content')).toBeTruthy();
      });

      expect(mockGovernmentService.getGovernmentContent).toHaveBeenCalledTimes(2);
    });
  });
});