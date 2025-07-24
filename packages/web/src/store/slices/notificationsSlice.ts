import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'resource' | 'message' | 'community' | 'system';
  category: 'resource' | 'message' | 'community' | 'system' | 'achievement' | 'event';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    resourceId?: string;
    messageId?: string;
    communityId?: string;
    userId?: string;
    eventId?: string;
  };
}

export interface NotificationPreferences {
  email: {
    newResources: boolean;
    newMessages: boolean;
    communityUpdates: boolean;
    systemNotifications: boolean;
    weeklyDigest: boolean;
  };
  push: {
    newResources: boolean;
    newMessages: boolean;
    communityUpdates: boolean;
    systemNotifications: boolean;
  };
  inApp: {
    newResources: boolean;
    newMessages: boolean;
    communityUpdates: boolean;
    systemNotifications: boolean;
    achievements: boolean;
    events: boolean;
  };
}

export interface NotificationsState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  filters: {
    category: string | null;
    read: boolean | null;
  };
  sortBy: 'timestamp' | 'type';
  sortOrder: 'asc' | 'desc';
}

const defaultPreferences: NotificationPreferences = {
  email: {
    newResources: true,
    newMessages: true,
    communityUpdates: true,
    systemNotifications: true,
    weeklyDigest: true,
  },
  push: {
    newResources: true,
    newMessages: true,
    communityUpdates: false,
    systemNotifications: true,
  },
  inApp: {
    newResources: true,
    newMessages: true,
    communityUpdates: true,
    systemNotifications: true,
    achievements: true,
    events: true,
  },
};

const initialState: NotificationsState = {
  notifications: [],
  preferences: defaultPreferences,
  isLoading: false,
  error: null,
  unreadCount: 0,
  filters: {
    category: null,
    read: null,
  },
  sortBy: 'timestamp',
  sortOrder: 'desc',
};

// Async thunks for notification actions
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: { page?: number; limit?: number; category?: string; read?: boolean }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.category) queryParams.append('category', params.category);
      if (params.read !== undefined) queryParams.append('read', params.read.toString());

      const response = await fetch(`/api/notifications?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to fetch notifications');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to mark notification as read');
      }

      return { notificationId };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const markNotificationAsUnread = createAsyncThunk(
  'notifications/markAsUnread',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/unread`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to mark notification as unread');
      }

      return { notificationId };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to mark all notifications as read');
      }

      return {};
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to delete notification');
      }

      return { notificationId };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateNotificationPreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences: Partial<NotificationPreferences>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to update notification preferences');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchNotificationPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to fetch notification preferences');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount -= 1;
        }
        state.notifications.splice(index, 1);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<{ category?: string | null; read?: boolean | null }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: 'timestamp' | 'type'; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Mark as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload.notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount -= 1;
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Mark as unread
      .addCase(markNotificationAsUnread.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload.notificationId);
        if (notification && notification.read) {
          notification.read = false;
          state.unreadCount += 1;
        }
      })
      .addCase(markNotificationAsUnread.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Mark all as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload.notificationId);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.read) {
            state.unreadCount -= 1;
          }
          state.notifications.splice(index, 1);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Update preferences
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preferences = { ...state.preferences, ...action.payload };
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch preferences
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  addNotification,
  removeNotification,
  clearError,
  setFilters,
  setSorting,
  clearNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;