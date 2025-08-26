// Simple unit tests for NavigationService logic without React Native dependencies

interface MockNavigationRef {
  isReady: jest.Mock;
  navigate: jest.Mock;
  goBack: jest.Mock;
  canGoBack: jest.Mock;
  reset: jest.Mock;
  getCurrentRoute: jest.Mock;
  getState: jest.Mock;
  dispatch: jest.Mock;
}

class TestNavigationService {
  constructor(private navigationRef: MockNavigationRef) {}

  navigate<T extends string>(screen: T, params?: any): void {
    if (this.navigationRef.isReady()) {
      this.navigationRef.navigate(screen, params);
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  goBack(): void {
    if (this.navigationRef.isReady() && this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
    } else {
      console.warn('Cannot go back - no previous screen or navigation not ready');
    }
  }

  reset(routeName: string): void {
    if (this.navigationRef.isReady()) {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: routeName }],
      });
    } else {
      console.warn('Navigation is not ready yet');
    }
  }

  canGoBack(): boolean {
    return this.navigationRef.isReady() ? this.navigationRef.canGoBack() : false;
  }

  getCurrentRoute(): string | undefined {
    if (this.navigationRef.isReady()) {
      const route = this.navigationRef.getCurrentRoute();
      return route?.name;
    }
    return undefined;
  }

  getState(): any {
    if (this.navigationRef.isReady()) {
      return this.navigationRef.getState();
    }
    return null;
  }

  isReady(): boolean {
    return this.navigationRef.isReady();
  }
}

describe('NavigationService Unit Tests', () => {
  let navigationService: TestNavigationService;
  let mockNavigationRef: MockNavigationRef;

  beforeEach(() => {
    mockNavigationRef = {
      isReady: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(),
      reset: jest.fn(),
      getCurrentRoute: jest.fn(),
      getState: jest.fn(),
      dispatch: jest.fn(),
    };
    navigationService = new TestNavigationService(mockNavigationRef);
    jest.clearAllMocks();
  });

  describe('navigate', () => {
    it('should navigate to screen when navigation is ready', () => {
      mockNavigationRef.isReady.mockReturnValue(true);

      navigationService.navigate('Main');

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Main', undefined);
    });

    it('should navigate to screen with params when navigation is ready', () => {
      mockNavigationRef.isReady.mockReturnValue(true);

      navigationService.navigate('Auth', { screen: 'Login' });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Auth', { screen: 'Login' });
    });

    it('should not navigate when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      navigationService.navigate('Main');

      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      
      consoleSpy.mockRestore();
    });
  });

  describe('goBack', () => {
    it('should go back when navigation is ready and can go back', () => {
      mockNavigationRef.isReady.mockReturnValue(true);
      mockNavigationRef.canGoBack.mockReturnValue(true);

      navigationService.goBack();

      expect(mockNavigationRef.goBack).toHaveBeenCalled();
    });

    it('should not go back when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      navigationService.goBack();

      expect(mockNavigationRef.goBack).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Cannot go back - no previous screen or navigation not ready');
      
      consoleSpy.mockRestore();
    });

    it('should not go back when cannot go back', () => {
      mockNavigationRef.isReady.mockReturnValue(true);
      mockNavigationRef.canGoBack.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      navigationService.goBack();

      expect(mockNavigationRef.goBack).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Cannot go back - no previous screen or navigation not ready');
      
      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('should reset navigation when ready', () => {
      mockNavigationRef.isReady.mockReturnValue(true);

      navigationService.reset('Main');

      expect(mockNavigationRef.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    });

    it('should not reset when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      navigationService.reset('Main');

      expect(mockNavigationRef.reset).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Navigation is not ready yet');
      
      consoleSpy.mockRestore();
    });
  });

  describe('canGoBack', () => {
    it('should return true when navigation is ready and can go back', () => {
      mockNavigationRef.isReady.mockReturnValue(true);
      mockNavigationRef.canGoBack.mockReturnValue(true);

      const result = navigationService.canGoBack();

      expect(result).toBe(true);
    });

    it('should return false when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);

      const result = navigationService.canGoBack();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentRoute', () => {
    it('should return current route name when navigation is ready', () => {
      mockNavigationRef.isReady.mockReturnValue(true);
      mockNavigationRef.getCurrentRoute.mockReturnValue({ name: 'Main', key: 'main-key' });

      const result = navigationService.getCurrentRoute();

      expect(result).toBe('Main');
    });

    it('should return undefined when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);

      const result = navigationService.getCurrentRoute();

      expect(result).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('should return navigation state when ready', () => {
      const mockState = { index: 0, routes: [{ name: 'Main', key: 'main-key' }] };
      mockNavigationRef.isReady.mockReturnValue(true);
      mockNavigationRef.getState.mockReturnValue(mockState);

      const result = navigationService.getState();

      expect(result).toBe(mockState);
    });

    it('should return null when navigation is not ready', () => {
      mockNavigationRef.isReady.mockReturnValue(false);

      const result = navigationService.getState();

      expect(result).toBeNull();
    });
  });

  describe('isReady', () => {
    it('should return navigation ready state', () => {
      mockNavigationRef.isReady.mockReturnValue(true);

      const result = navigationService.isReady();

      expect(result).toBe(true);
    });
  });
});