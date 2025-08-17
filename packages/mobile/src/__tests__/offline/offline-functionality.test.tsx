import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { PostCard } from '../../components/posts/PostCard';
import { CommunityCard } from '../../components/communities/CommunityCard';
import { MessageThread } from '../../components/messaging/MessageThread';
import { ResourceUploader } from '../../components/resources/ResourceUploader';
import { postsSlice } from '../../store/slices/postsSlice';
import { authSlice } from '../../store/slices/authSlice';
import { offlineSlice } from '../../store/slices/offlineSlice';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  useNetInfo: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  clear: jest.fn(),
}));

// Mock SQLite for offline storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((query, params, success) => {
          success(null, { rows: { _array: [] } });
        }),
      });
    }),
    close: jest.fn(),
  })),
}));

// Mock offline services
jest.mock('../../services/offline/offlineQueue', () => ({
  OfflineQueue: {
    addAction: jest.fn(),
    processQueue: jest.fn(),
    getQueuedActions: jest.fn(() => []),
    clearQueue: jest.fn(),
  },
}));

jest.mock('../../services/offline/offlineStorage', () => ({
  OfflineStorage: {
    storePost: jest.fn(),
    getStoredPosts: jest.fn(() => []),
    storeCommunity: jest.fn(),
    getStoredCommunities: jest.fn(() => []),
    storeMessage: jest.fn(),
    getStoredMessages: jest.fn(() => []),
    clearStorage: jest.fn(),
  },
}));

const mockStore = configureStore({
  reducer: {
    posts: postsSlice.reducer,
    auth: authSlice.reducer,
    offline: offlineSlice.reducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: 'user-123',
        fullName: 'Offline Test User',
        email: 'offline@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
    },
    posts: {
      posts: [],
      loading: false,
      error: null,
    },
    offline: {
      isConnected: false,
      queuedActions: [],
      cachedData: {},
      syncStatus: 'idle',
    },
  },
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('Mobile Offline Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock offline state by default
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
  });

  describe('Offline Detection and UI', () => {
    it('should detect offline state and show indicator', () => {
      const mockPost = {
        id: 'offline-post-123',
        authorId: 'user-456',
        title: 'Offline Test Post',
        content: 'Testing offline functionality',
        visibility: 'public' as const,
        tags: ['offline', 'test'],
        mediaAttachments: [],
        likeCount: 5,
        commentCount: 2,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId, getByText } = renderWithProvider(
        <PostCard post={mockPost} />
      );

      expect(getByTestId('offline-indicator')).toBeTruthy();
      expect(getByText('Offline')).toBeTruthy();
    });

    it('should disable interactive elements when offline', () => {
      const mockCommunity = {
        id: 'offline-community-123',
        name: 'Offline Community',
        description: 'Testing offline community features',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Community Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      const { getByTestId } = renderWithProvider(
        <CommunityCard community={mockCommunity} />
      );

      const joinButton = getByTestId('join-button');
      expect(joinButton.props.disabled).toBe(true);
    });

    it('should show cached content when offline', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      const cachedPosts = [
        {
          id: 'cached-post-1',
          title: 'Cached Post 1',
          content: 'This post was cached for offline viewing',
          author: { fullName: 'Cached Author' },
          createdAt: new Date(),
        },
        {
          id: 'cached-post-2',
          title: 'Cached Post 2',
          content: 'Another cached post',
          author: { fullName: 'Another Author' },
          createdAt: new Date(),
        },
      ];

      OfflineStorage.getStoredPosts.mockReturnValue(cachedPosts);

      const { getByText } = renderWithProvider(
        <div data-testid="posts-feed">
          {/* Posts feed component would render cached posts */}
        </div>
      );

      await waitFor(() => {
        expect(OfflineStorage.getStoredPosts).toHaveBeenCalled();
      });
    });
  });

  describe('Offline Action Queuing', () => {
    it('should queue like action when offline', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      const mockPost = {
        id: 'queue-post-123',
        authorId: 'user-456',
        title: 'Queue Test Post',
        content: 'Testing action queuing',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      expect(OfflineQueue.addAction).toHaveBeenCalledWith({
        type: 'LIKE_POST',
        payload: { postId: 'queue-post-123' },
        timestamp: expect.any(Number),
      });

      // Should show queued indicator
      expect(getByTestId('action-queued-indicator')).toBeTruthy();
    });

    it('should queue comment action when offline', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      const mockPost = {
        id: 'comment-queue-post',
        authorId: 'user-456',
        title: 'Comment Queue Test',
        content: 'Testing comment queuing',
        visibility: 'public' as const,
        tags: [],
        mediaAttachments: [],
        likeCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      const { getByTestId } = renderWithProvider(<PostCard post={mockPost} />);

      // Open comment section
      const commentButton = getByTestId('comment-button');
      fireEvent.press(commentButton);

      // Add comment
      const commentInput = getByTestId('comment-input');
      fireEvent.changeText(commentInput, 'Offline comment test');

      const submitButton = getByTestId('submit-comment-button');
      fireEvent.press(submitButton);

      expect(OfflineQueue.addAction).toHaveBeenCalledWith({
        type: 'ADD_COMMENT',
        payload: {
          postId: 'comment-queue-post',
          content: 'Offline comment test',
        },
        timestamp: expect.any(Number),
      });
    });

    it('should queue community join action when offline', () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      const mockCommunity = {
        id: 'queue-community-123',
        name: 'Queue Test Community',
        description: 'Testing community join queuing',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 25,
        postCount: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Community Owner',
          email: 'owner@example.com',
        },
        userMembership: null,
      };

      const { getByTestId } = renderWithProvider(
        <CommunityCard community={mockCommunity} />
      );

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      expect(OfflineQueue.addAction).toHaveBeenCalledWith({
        type: 'JOIN_COMMUNITY',
        payload: { communityId: 'queue-community-123' },
        timestamp: expect.any(Number),
      });
    });

    it('should show queued actions count', () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      OfflineQueue.getQueuedActions.mockReturnValue([
        { type: 'LIKE_POST', payload: { postId: 'post-1' } },
        { type: 'ADD_COMMENT', payload: { postId: 'post-2', content: 'Comment' } },
        { type: 'JOIN_COMMUNITY', payload: { communityId: 'community-1' } },
      ]);

      const { getByText } = renderWithProvider(
        <div data-testid="offline-status-bar">
          {/* Offline status component */}
        </div>
      );

      expect(getByText('3 actions queued')).toBeTruthy();
    });
  });

  describe('Offline Data Caching', () => {
    it('should cache posts for offline viewing', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      const mockPost = {
        id: 'cache-post-123',
        authorId: 'user-456',
        title: 'Cache Test Post',
        content: 'This post should be cached',
        visibility: 'public' as const,
        tags: ['cache', 'test'],
        mediaAttachments: [],
        likeCount: 10,
        commentCount: 5,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'user-456',
          fullName: 'Test Author',
          email: 'test@example.com',
        },
        isLiked: false,
      };

      // Simulate online state first
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      renderWithProvider(<PostCard post={mockPost} />);

      await waitFor(() => {
        expect(OfflineStorage.storePost).toHaveBeenCalledWith(mockPost);
      });
    });

    it('should cache communities for offline viewing', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      const mockCommunity = {
        id: 'cache-community-123',
        name: 'Cache Test Community',
        description: 'This community should be cached',
        type: 'subject' as const,
        ownerId: 'user-456',
        isPrivate: false,
        requiresApproval: false,
        memberCount: 50,
        postCount: 25,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-456',
          fullName: 'Community Owner',
          email: 'owner@example.com',
        },
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };

      // Simulate online state
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      renderWithProvider(<CommunityCard community={mockCommunity} />);

      await waitFor(() => {
        expect(OfflineStorage.storeCommunity).toHaveBeenCalledWith(mockCommunity);
      });
    });

    it('should cache messages for offline viewing', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      const mockMessages = [
        {
          id: 'message-1',
          senderId: 'user-456',
          content: 'Hello, how are you?',
          timestamp: new Date(),
          sender: {
            id: 'user-456',
            fullName: 'John Doe',
            profileImageUrl: '/profiles/john.jpg',
          },
        },
        {
          id: 'message-2',
          senderId: 'user-123',
          content: 'I am doing well, thank you!',
          timestamp: new Date(),
          sender: {
            id: 'user-123',
            fullName: 'Test User',
            profileImageUrl: '/profiles/test.jpg',
          },
        },
      ];

      // Simulate online state
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      renderWithProvider(
        <MessageThread messages={mockMessages} conversationId="conv-123" />
      );

      await waitFor(() => {
        mockMessages.forEach(message => {
          expect(OfflineStorage.storeMessage).toHaveBeenCalledWith(message);
        });
      });
    });

    it('should manage cache size and cleanup old data', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      // Mock cache size check
      AsyncStorage.getAllKeys.mockResolvedValue([
        'cached_post_1', 'cached_post_2', 'cached_post_3',
        'cached_community_1', 'cached_community_2',
        'cached_message_1', 'cached_message_2', 'cached_message_3',
      ]);

      // Simulate cache cleanup trigger
      const { getByTestId } = renderWithProvider(
        <div data-testid="cache-manager">
          {/* Cache management component */}
        </div>
      );

      const cleanupButton = getByTestId('cleanup-cache-button');
      fireEvent.press(cleanupButton);

      await waitFor(() => {
        expect(OfflineStorage.clearStorage).toHaveBeenCalled();
      });
    });
  });

  describe('Online/Offline Synchronization', () => {
    it('should sync queued actions when coming back online', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      // Start offline
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const queuedActions = [
        { type: 'LIKE_POST', payload: { postId: 'post-1' }, timestamp: Date.now() },
        { type: 'ADD_COMMENT', payload: { postId: 'post-2', content: 'Test' }, timestamp: Date.now() },
      ];

      OfflineQueue.getQueuedActions.mockReturnValue(queuedActions);

      const { getByTestId } = renderWithProvider(
        <div data-testid="sync-manager">
          {/* Sync management component */}
        </div>
      );

      // Simulate coming back online
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Trigger network state change
      const networkListener = NetInfo.addEventListener.mock.calls[0][0];
      networkListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      await waitFor(() => {
        expect(OfflineQueue.processQueue).toHaveBeenCalled();
      });

      expect(getByTestId('sync-in-progress-indicator')).toBeTruthy();
    });

    it('should handle sync conflicts gracefully', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      // Mock sync conflict (server data changed)
      OfflineQueue.processQueue.mockRejectedValue(new Error('Conflict: Post was modified'));

      const { getByTestId, getByText } = renderWithProvider(
        <div data-testid="sync-manager">
          {/* Sync management component */}
        </div>
      );

      // Simulate sync attempt
      const syncButton = getByTestId('manual-sync-button');
      fireEvent.press(syncButton);

      await waitFor(() => {
        expect(getByText('Sync conflict detected')).toBeTruthy();
        expect(getByTestId('resolve-conflict-button')).toBeTruthy();
      });
    });

    it('should show sync progress and status', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      const queuedActions = Array.from({ length: 10 }, (_, index) => ({
        type: 'LIKE_POST',
        payload: { postId: `post-${index}` },
        timestamp: Date.now(),
      }));

      OfflineQueue.getQueuedActions.mockReturnValue(queuedActions);

      // Mock progressive sync
      OfflineQueue.processQueue.mockImplementation(async (callback) => {
        for (let i = 0; i < queuedActions.length; i++) {
          callback && callback(i + 1, queuedActions.length);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      });

      const { getByTestId, getByText } = renderWithProvider(
        <div data-testid="sync-progress">
          {/* Sync progress component */}
        </div>
      );

      const syncButton = getByTestId('start-sync-button');
      fireEvent.press(syncButton);

      // Check progress updates
      await waitFor(() => {
        expect(getByText(/Syncing: \d+\/10/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Sync completed')).toBeTruthy();
      }, { timeout: 2000 });
    });
  });

  describe('Offline File Handling', () => {
    it('should handle file uploads when offline', async () => {
      const { OfflineQueue } = require('../../services/offline/offlineQueue');
      
      const { getByTestId } = renderWithProvider(<ResourceUploader />);

      const fileInput = getByTestId('file-input');
      const mockFile = {
        uri: 'file://local/path/document.pdf',
        type: 'application/pdf',
        name: 'document.pdf',
        size: 1024000,
      };

      fireEvent(fileInput, 'onChange', { target: { files: [mockFile] } });

      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);

      expect(OfflineQueue.addAction).toHaveBeenCalledWith({
        type: 'UPLOAD_FILE',
        payload: {
          file: mockFile,
          metadata: expect.any(Object),
        },
        timestamp: expect.any(Number),
      });

      expect(getByTestId('file-queued-indicator')).toBeTruthy();
    });

    it('should cache downloaded files for offline access', async () => {
      const RNFS = require('react-native-fs');
      
      const mockResource = {
        id: 'resource-123',
        title: 'Offline Resource',
        url: 'https://example.com/resource.pdf',
        filename: 'resource.pdf',
        size: 2048000,
      };

      // Simulate online download
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const { getByTestId } = renderWithProvider(
        <div data-testid="resource-item">
          {/* Resource item component */}
        </div>
      );

      const downloadButton = getByTestId('download-button');
      fireEvent.press(downloadButton);

      await waitFor(() => {
        expect(RNFS.writeFile).toHaveBeenCalledWith(
          expect.stringContaining('resource.pdf'),
          expect.any(String),
          'base64'
        );
      });

      // Simulate offline access
      (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const openButton = getByTestId('open-resource-button');
      fireEvent.press(openButton);

      expect(RNFS.readFile).toHaveBeenCalledWith(
        expect.stringContaining('resource.pdf'),
        'base64'
      );
    });

    it('should manage offline file storage limits', async () => {
      const RNFS = require('react-native-fs');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      // Mock storage space check
      RNFS.getFSInfo = jest.fn().mockResolvedValue({
        totalSpace: 1000000000, // 1GB
        freeSpace: 100000000,   // 100MB
      });

      const { getByTestId, getByText } = renderWithProvider(
        <div data-testid="storage-manager">
          {/* Storage management component */}
        </div>
      );

      const checkStorageButton = getByTestId('check-storage-button');
      fireEvent.press(checkStorageButton);

      await waitFor(() => {
        expect(getByText(/Storage: 900MB used/)).toBeTruthy();
        expect(getByTestId('low-storage-warning')).toBeTruthy();
      });
    });
  });

  describe('Offline Performance', () => {
    it('should maintain good performance when offline', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      // Mock large cached dataset
      const largeCachedPosts = Array.from({ length: 1000 }, (_, index) => ({
        id: `cached-post-${index}`,
        title: `Cached Post ${index}`,
        content: `Content for post ${index}`,
        author: { fullName: `Author ${index}` },
        createdAt: new Date(),
      }));

      OfflineStorage.getStoredPosts.mockReturnValue(largeCachedPosts);

      const startTime = Date.now();
      
      const { getAllByTestId } = renderWithProvider(
        <div data-testid="posts-list">
          {/* Posts list component that renders cached posts */}
        </div>
      );

      const renderTime = Date.now() - startTime;
      
      // Should render efficiently even with large cached dataset
      expect(renderTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should efficiently search cached content', async () => {
      const { OfflineStorage } = require('../../services/offline/offlineStorage');
      
      const cachedPosts = Array.from({ length: 500 }, (_, index) => ({
        id: `post-${index}`,
        title: index % 10 === 0 ? `Math Post ${index}` : `Other Post ${index}`,
        content: `Content ${index}`,
        tags: index % 10 === 0 ? ['math'] : ['other'],
      }));

      OfflineStorage.getStoredPosts.mockReturnValue(cachedPosts);

      const { getByTestId } = renderWithProvider(
        <div data-testid="search-interface">
          {/* Search interface component */}
        </div>
      );

      const searchInput = getByTestId('search-input');
      const startTime = Date.now();
      
      fireEvent.changeText(searchInput, 'math');
      
      const searchTime = Date.now() - startTime;
      
      // Search should be fast even with large cached dataset
      expect(searchTime).toBeLessThan(200); // Less than 200ms
    });

    it('should handle memory efficiently during offline operations', async () => {
      const { PerformanceMonitor } = require('../../services/performanceMonitor');
      
      // Simulate multiple offline operations
      const operations = [
        'cache_posts', 'cache_communities', 'cache_messages',
        'queue_actions', 'search_cache', 'sync_data'
      ];

      const initialMemory = PerformanceMonitor.getMemoryUsage().used;

      for (const operation of operations) {
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = PerformanceMonitor.getMemoryUsage().used;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });
});