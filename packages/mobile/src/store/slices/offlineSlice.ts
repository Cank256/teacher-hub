import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'message' | 'resource' | 'profile';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineState {
  isOnline: boolean;
  pendingOperations: OfflineOperation[];
  syncInProgress: boolean;
  lastSyncTime: string | null;
  storageUsage: {
    total: number;
    used: number;
    available: number;
  };
}

const initialState: OfflineState = {
  isOnline: true,
  pendingOperations: [],
  syncInProgress: false,
  lastSyncTime: null,
  storageUsage: {
    total: 0,
    used: 0,
    available: 0,
  },
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addPendingOperation: (state, action: PayloadAction<Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>>) => {
      const operation: OfflineOperation = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.pendingOperations.push(operation);
    },
    removePendingOperation: (state, action: PayloadAction<string>) => {
      state.pendingOperations = state.pendingOperations.filter(op => op.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const operation = state.pendingOperations.find(op => op.id === action.payload);
      if (operation) {
        operation.retryCount += 1;
      }
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },
    updateStorageUsage: (state, action: PayloadAction<OfflineState['storageUsage']>) => {
      state.storageUsage = action.payload;
    },
    clearFailedOperations: (state) => {
      state.pendingOperations = state.pendingOperations.filter(
        op => op.retryCount < op.maxRetries
      );
    },
  },
});

export const {
  setOnlineStatus,
  addPendingOperation,
  removePendingOperation,
  incrementRetryCount,
  setSyncInProgress,
  setLastSyncTime,
  updateStorageUsage,
  clearFailedOperations,
} = offlineSlice.actions;
export default offlineSlice.reducer;