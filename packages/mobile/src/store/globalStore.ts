import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  biometricsEnabled: boolean;
  offlineMode: boolean;
  dataUsageOptimization: boolean;
}

interface AppState {
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
  lastSyncTime: Date | null;
  pendingOperations: number;
}

interface AppActions {
  setOnlineStatus: (isOnline: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setSyncTime: (time: Date) => void;
  setPendingOperations: (count: number) => void;
  resetState: () => void;
}

type GlobalStore = AppState & AppActions;

const initialState: AppState = {
  isOnline: true,
  isLoading: false,
  error: null,
  settings: {
    theme: 'system',
    language: 'en',
    notificationsEnabled: true,
    biometricsEnabled: false,
    offlineMode: false,
    dataUsageOptimization: true,
  },
  lastSyncTime: null,
  pendingOperations: 0,
};

export const useGlobalStore = create<GlobalStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnlineStatus: (isOnline: boolean) =>
        set({ isOnline }),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }),

      setError: (error: string | null) =>
        set({ error }),

      updateSettings: (newSettings: Partial<AppSettings>) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setSyncTime: (time: Date) =>
        set({ lastSyncTime: time }),

      setPendingOperations: (count: number) =>
        set({ pendingOperations: count }),

      resetState: () =>
        set(initialState),
    }),
    {
      name: 'global-app-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);