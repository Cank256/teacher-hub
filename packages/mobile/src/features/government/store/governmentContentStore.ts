/**
 * Government Content Store
 * Manages local state for government content features
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvService } from '../../../services/storage';
import { GovernmentContentState } from '../types';
import { GovernmentContentFilters } from '../../../types';

interface GovernmentContentStore extends GovernmentContentState {
  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: GovernmentContentFilters) => void;
  updateFilters: (partialFilters: Partial<GovernmentContentFilters>) => void;
  clearFilters: () => void;
  
  // Bookmarks
  addBookmark: (contentId: string) => void;
  removeBookmark: (contentId: string) => void;
  isBookmarked: (contentId: string) => boolean;
  
  // Offline content
  addOfflineContent: (contentId: string) => void;
  removeOfflineContent: (contentId: string) => void;
  isOfflineAvailable: (contentId: string) => boolean;
  
  // Notification settings
  updateNotificationSettings: (settings: Partial<GovernmentContentState['notificationSettings']>) => void;
  toggleNotifications: () => void;
  
  // Reset
  reset: () => void;
}

const initialState: GovernmentContentState = {
  selectedFilters: {},
  searchQuery: '',
  bookmarkedContent: new Set(),
  offlineContent: new Set(),
  notificationSettings: {
    enabled: true,
    subjects: [],
    gradeLevels: [],
    contentTypes: [],
    sources: [],
  },
};

export const useGovernmentContentStore = create<GovernmentContentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Search and filters
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setFilters: (filters: GovernmentContentFilters) => {
        set({ selectedFilters: filters });
      },

      updateFilters: (partialFilters: Partial<GovernmentContentFilters>) => {
        set((state) => ({
          selectedFilters: {
            ...state.selectedFilters,
            ...partialFilters,
          },
        }));
      },

      clearFilters: () => {
        set({ selectedFilters: {} });
      },

      // Bookmarks management
      addBookmark: (contentId: string) => {
        set((state) => ({
          bookmarkedContent: new Set([...state.bookmarkedContent, contentId]),
        }));
      },

      removeBookmark: (contentId: string) => {
        set((state) => {
          const newBookmarks = new Set(state.bookmarkedContent);
          newBookmarks.delete(contentId);
          return { bookmarkedContent: newBookmarks };
        });
      },

      isBookmarked: (contentId: string) => {
        return get().bookmarkedContent.has(contentId);
      },

      // Offline content management
      addOfflineContent: (contentId: string) => {
        set((state) => ({
          offlineContent: new Set([...state.offlineContent, contentId]),
        }));
      },

      removeOfflineContent: (contentId: string) => {
        set((state) => {
          const newOfflineContent = new Set(state.offlineContent);
          newOfflineContent.delete(contentId);
          return { offlineContent: newOfflineContent };
        });
      },

      isOfflineAvailable: (contentId: string) => {
        return get().offlineContent.has(contentId);
      },

      // Notification settings
      updateNotificationSettings: (settings) => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        }));
      },

      toggleNotifications: () => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            enabled: !state.notificationSettings.enabled,
          },
        }));
      },

      // Reset all state
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'government-content-store',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await mmkvService.getItem(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsedValue = JSON.parse(value);
          // Convert Sets to Arrays for storage
          if (parsedValue.bookmarkedContent) {
            parsedValue.bookmarkedContent = Array.from(parsedValue.bookmarkedContent);
          }
          if (parsedValue.offlineContent) {
            parsedValue.offlineContent = Array.from(parsedValue.offlineContent);
          }
          await mmkvService.setItem(name, parsedValue);
        },
        removeItem: async (name: string) => {
          await mmkvService.removeItem(name);
        },
      })),
      partialize: (state) => ({
        selectedFilters: state.selectedFilters,
        searchQuery: state.searchQuery,
        bookmarkedContent: Array.from(state.bookmarkedContent),
        offlineContent: Array.from(state.offlineContent),
        notificationSettings: state.notificationSettings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert Arrays back to Sets after rehydration
          if (Array.isArray(state.bookmarkedContent)) {
            state.bookmarkedContent = new Set(state.bookmarkedContent);
          }
          if (Array.isArray(state.offlineContent)) {
            state.offlineContent = new Set(state.offlineContent);
          }
        }
      },
    }
  )
);

// Selectors for common use cases
export const useGovernmentContentSelectors = () => {
  const store = useGovernmentContentStore();
  
  return {
    // Filter selectors
    hasActiveFilters: Object.keys(store.selectedFilters).length > 0,
    filterCount: Object.values(store.selectedFilters).filter(value => 
      Array.isArray(value) ? value.length > 0 : value !== undefined
    ).length,
    
    // Bookmark selectors
    bookmarkCount: store.bookmarkedContent.size,
    bookmarkedIds: Array.from(store.bookmarkedContent),
    
    // Offline content selectors
    offlineContentCount: store.offlineContent.size,
    offlineContentIds: Array.from(store.offlineContent),
    
    // Notification selectors
    notificationsEnabled: store.notificationSettings.enabled,
    hasNotificationPreferences: (
      store.notificationSettings.subjects.length > 0 ||
      store.notificationSettings.gradeLevels.length > 0 ||
      store.notificationSettings.contentTypes.length > 0 ||
      store.notificationSettings.sources.length > 0
    ),
  };
};