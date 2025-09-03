import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList, NavigationServiceInterface } from './types';

// Create navigation reference
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

class NavigationService implements NavigationServiceInterface {
  /**
   * Navigate to a specific screen with optional parameters
   */
  navigate<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      // Use spread operator to handle React Navigation's complex conditional types
      const args = params !== undefined ? [screen, params] : [screen];
      (navigationRef.navigate as any)(...args);
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  /**
   * Go back to the previous screen
   */
  goBack(): void {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    } else {
      console.warn('Cannot go back - no previous screen or navigation not ready');
    }
  }

  /**
   * Reset navigation stack to a specific route
   */
  reset(routeName: keyof RootStackParamList): void {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: routeName }],
      });
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  /**
   * Check if we can go back
   */
  canGoBack(): boolean {
    return navigationRef.isReady() ? navigationRef.canGoBack() : false;
  }

  /**
   * Get current route name
   */
  getCurrentRoute(): string | undefined {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return undefined;
  }

  /**
   * Get current navigation state
   */
  getState(): any {
    if (navigationRef.isReady()) {
      return navigationRef.getState();
    }
    return null;
  }

  /**
   * Push a new screen onto the stack
   */
  push<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.push(screen, params));
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  /**
   * Replace current screen with a new one
   */
  replace<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.replace(screen, params));
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  /**
   * Pop to the top of the stack
   */
  popToTop(): void {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.popToTop());
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  /**
   * Check if navigation is ready
   */
  isReady(): boolean {
    return navigationRef.isReady();
  }

  /**
   * Get route params for current route
   */
  getCurrentParams(): any {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.params;
    }
    return null;
  }
}

// Export singleton instance
export const navigationService = new NavigationService();

// Export class for testing
export { NavigationService };