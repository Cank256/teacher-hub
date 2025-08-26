import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState } from '@react-navigation/native';

const NAVIGATION_STATE_KEY = '@navigation_state';

export class NavigationPersistence {
  /**
   * Save navigation state to persistent storage
   */
  static async saveNavigationState(state: NavigationState): Promise<void> {
    try {
      const stateString = JSON.stringify(state);
      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, stateString);
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }

  /**
   * Restore navigation state from persistent storage
   */
  static async restoreNavigationState(): Promise<NavigationState | undefined> {
    try {
      const stateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
      
      if (stateString) {
        const state = JSON.parse(stateString);
        return state;
      }
    } catch (error) {
      console.warn('Failed to restore navigation state:', error);
    }
    
    return undefined;
  }

  /**
   * Clear saved navigation state
   */
  static async clearNavigationState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation state:', error);
    }
  }

  /**
   * Check if navigation state should be restored
   * This can be used to conditionally restore state based on app version, etc.
   */
  static shouldRestoreState(): boolean {
    // In development, we might want to always restore state
    // In production, we might want to check app version or other conditions
    return __DEV__;
  }
}