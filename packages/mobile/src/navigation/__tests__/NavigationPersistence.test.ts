import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationPersistence } from '../NavigationPersistence';
import type { NavigationState } from '@react-navigation/native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('NavigationPersistence', () => {
  const mockNavigationState: NavigationState = {
    key: 'root',
    index: 0,
    routeNames: ['Main'],
    routes: [
      {
        key: 'main-key',
        name: 'Main',
      },
    ],
    type: 'stack',
    stale: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveNavigationState', () => {
    it('should save navigation state to AsyncStorage', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await NavigationPersistence.saveNavigationState(mockNavigationState);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@navigation_state',
        JSON.stringify(mockNavigationState)
      );
    });

    it('should handle save errors gracefully', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.setItem.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await NavigationPersistence.saveNavigationState(mockNavigationState);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save navigation state:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('restoreNavigationState', () => {
    it('should restore navigation state from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockNavigationState));

      const result = await NavigationPersistence.restoreNavigationState();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@navigation_state');
      expect(result).toEqual(mockNavigationState);
    });

    it('should return undefined when no state is saved', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await NavigationPersistence.restoreNavigationState();

      expect(result).toBeUndefined();
    });

    it('should handle restore errors gracefully', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.getItem.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await NavigationPersistence.restoreNavigationState();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore navigation state:', error);
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await NavigationPersistence.restoreNavigationState();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore navigation state:', expect.any(Error));
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe('clearNavigationState', () => {
    it('should clear navigation state from AsyncStorage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await NavigationPersistence.clearNavigationState();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@navigation_state');
    });

    it('should handle clear errors gracefully', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.removeItem.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await NavigationPersistence.clearNavigationState();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear navigation state:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('shouldRestoreState', () => {
    it('should return true in development mode', () => {
      // Mock __DEV__ to be true
      (global as any).__DEV__ = true;

      const result = NavigationPersistence.shouldRestoreState();

      expect(result).toBe(true);
    });

    it('should return false in production mode', () => {
      // Mock __DEV__ to be false
      (global as any).__DEV__ = false;

      const result = NavigationPersistence.shouldRestoreState();

      expect(result).toBe(false);
    });
  });
});