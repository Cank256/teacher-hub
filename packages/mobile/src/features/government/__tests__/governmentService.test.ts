/**
 * Government Service Tests
 */

import { governmentService } from '../../../services/api/governmentService';
import { ApiClient } from '../../../services/api/apiClient';
import {
  GovernmentContentType,
  GovernmentContentCategory,
  GovernmentSource,
  ContentPriority,
  TrackingEventType,
} from '../../../types';

// Mock the API client
jest.mock('../../../services/api/apiClient');
const mockApiClient = ApiClient.getInstance() as jest.Mocked<ApiClient>;

describe('GovernmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGovernmentContent', () => {
    it('should fetch government content with filters', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'New Curriculum Update',
            type: GovernmentContentType.CURRICULUM_UPDATE,
            priority: ContentPriority.HIGH,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const filters = {
        type: [GovernmentContentType.CURRICULUM_UPDATE],
        priority: [ContentPriority.HIGH],
      };

      const result = await governmentService.getGovernmentContent(filters, 1, 20);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/government/content',
        {
          page: 1,
          limit: 20,
          type: [GovernmentContentType.CURRICULUM_UPDATE],
          priority: [ContentPriority.HIGH],
          dateFrom: undefined,
          dateTo: undefined,
        },
        { requiresAuth: true }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle date filters correctly', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const filters = { dateFrom, dateTo };

      await governmentService.getGovernmentContent(filters);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/government/content',
        expect.objectContaining({
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        }),
        { requiresAuth: true }
      );
    });
  });

  describe('getGovernmentContentById', () => {
    it('should fetch specific content and track view event', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Content',
        type: GovernmentContentType.POLICY_DOCUMENT,
        priority: ContentPriority.MEDIUM,
      };

      mockApiClient.get.mockResolvedValue({ data: mockContent });
      mockApiClient.post.mockResolvedValue({ data: {} });

      const result = await governmentService.getGovernmentContentById('1');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/government/content/1',
        undefined,
        { requiresAuth: true }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/track',
        expect.objectContaining({
          contentId: '1',
          eventType: TrackingEventType.VIEW,
        }),
        { requiresAuth: true }
      );

      expect(result).toEqual(mockContent);
    });
  });

  describe('searchGovernmentContent', () => {
    it('should search content and track search event', async () => {
      const mockSearchResult = {
        content: [],
        totalCount: 0,
        facets: {
          types: [],
          categories: [],
          sources: [],
          subjects: [],
          gradeLevels: [],
        },
        suggestions: [],
      };

      mockApiClient.get.mockResolvedValue({ data: mockSearchResult });
      mockApiClient.post.mockResolvedValue({ data: {} });

      const query = 'mathematics curriculum';
      const filters = { subjects: ['Mathematics'] };

      const result = await governmentService.searchGovernmentContent(
        query,
        filters,
        1,
        20
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/government/content/search',
        {
          q: query,
          page: 1,
          limit: 20,
          subjects: ['Mathematics'],
          dateFrom: undefined,
          dateTo: undefined,
        },
        { requiresAuth: true }
      );

      expect(result).toEqual(mockSearchResult);
    });
  });

  describe('getGovernmentNotifications', () => {
    it('should fetch notifications with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'New Policy Update',
            message: 'Important policy changes announced',
            priority: ContentPriority.HIGH,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await governmentService.getGovernmentNotifications(1, 20, true);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/government/notifications',
        {
          page: 1,
          limit: 20,
          unreadOnly: true,
        },
        { requiresAuth: true }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockApiClient.patch.mockResolvedValue({ data: {} });

      await governmentService.markNotificationAsRead('notification-1');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/government/notifications/notification-1/read',
        {},
        { requiresAuth: true }
      );
    });
  });

  describe('subscribeToNotifications', () => {
    it('should subscribe to notifications with preferences', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      const subjects = ['Mathematics', 'Science'];
      const gradeLevels = ['Primary 1', 'Primary 2'];
      const contentTypes = [GovernmentContentType.CURRICULUM_UPDATE];
      const sources = [GovernmentSource.NCDC];

      await governmentService.subscribeToNotifications(
        subjects,
        gradeLevels,
        contentTypes,
        sources
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/notifications/subscribe',
        {
          subjects,
          gradeLevels,
          contentTypes,
          sources,
        },
        { requiresAuth: true }
      );
    });
  });

  describe('downloadContentForOffline', () => {
    it('should download content and track download event', async () => {
      const mockBlob = new Blob(['test content']);
      mockApiClient.downloadFile.mockResolvedValue(mockBlob);
      mockApiClient.post.mockResolvedValue({ data: {} });

      const result = await governmentService.downloadContentForOffline('content-1');

      expect(mockApiClient.downloadFile).toHaveBeenCalledWith(
        '/government/content/content-1/download',
        { requiresAuth: true }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/track',
        expect.objectContaining({
          contentId: 'content-1',
          eventType: TrackingEventType.DOWNLOAD,
        }),
        { requiresAuth: true }
      );

      expect(result).toEqual(mockBlob);
    });
  });

  describe('syncOfflineContent', () => {
    it('should sync offline content', async () => {
      const mockSyncStatus = {
        isEnabled: true,
        lastSyncAt: new Date(),
        pendingDownloads: 0,
        totalOfflineContent: 5,
        storageUsed: 1024000,
        storageLimit: 10240000,
        syncInProgress: false,
        errors: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockSyncStatus });

      const contentIds = ['content-1', 'content-2'];
      const result = await governmentService.syncOfflineContent(contentIds);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/offline/sync',
        { contentIds },
        { requiresAuth: true }
      );

      expect(result).toEqual(mockSyncStatus);
    });
  });

  describe('trackContentEvent', () => {
    it('should track content events', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      const metadata = { sessionId: 'session-123' };
      await governmentService.trackContentEvent(
        'content-1',
        TrackingEventType.SHARE,
        metadata
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/track',
        expect.objectContaining({
          contentId: 'content-1',
          eventType: TrackingEventType.SHARE,
          metadata,
        }),
        { requiresAuth: true }
      );
    });

    it('should handle tracking errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        governmentService.trackContentEvent('content-1', TrackingEventType.VIEW)
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track content event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('shareContent', () => {
    it('should share content and track share event', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await governmentService.shareContent(
        'content-1',
        'whatsapp',
        ['user1@example.com']
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/share',
        {
          contentId: 'content-1',
          shareMethod: 'whatsapp',
          recipients: ['user1@example.com'],
        },
        { requiresAuth: true }
      );

      // Should also track the share event
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/track',
        expect.objectContaining({
          contentId: 'content-1',
          eventType: TrackingEventType.SHARE,
          metadata: {
            shareMethod: 'whatsapp',
            recipientCount: 1,
          },
        }),
        { requiresAuth: true }
      );
    });
  });

  describe('bookmarkContent', () => {
    it('should bookmark content and track bookmark event', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await governmentService.bookmarkContent('content-1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/content-1/bookmark',
        {},
        { requiresAuth: true }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/track',
        expect.objectContaining({
          contentId: 'content-1',
          eventType: TrackingEventType.BOOKMARK,
        }),
        { requiresAuth: true }
      );
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark', async () => {
      mockApiClient.delete.mockResolvedValue({ data: {} });

      await governmentService.removeBookmark('content-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/government/content/content-1/bookmark',
        { requiresAuth: true }
      );
    });
  });

  describe('getBookmarkedContent', () => {
    it('should fetch bookmarked content', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockApiClient.getPaginated.mockResolvedValue(mockResponse);

      const result = await governmentService.getBookmarkedContent(1, 20);

      expect(mockApiClient.getPaginated).toHaveBeenCalledWith(
        '/government/content/bookmarks',
        { page: 1, limit: 20 },
        { requiresAuth: true }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('reportContentIssue', () => {
    it('should report content issue', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} });

      await governmentService.reportContentIssue(
        'content-1',
        'incorrect_information',
        'The content contains outdated information'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/government/content/report',
        {
          contentId: 'content-1',
          issueType: 'incorrect_information',
          description: 'The content contains outdated information',
        },
        { requiresAuth: true }
      );
    });
  });
});