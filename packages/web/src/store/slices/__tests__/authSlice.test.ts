import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  AuthState,
  loginUser,
  registerUser,
  refreshAuthToken,
  forgotPassword,
  loadUserFromStorage,
  logout,
  clearError,
  updateLastActivity,
  updateUser,
} from '../authSlice';

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: '1',
  email: 'test@example.com',
  fullName: 'Test User',
  subjects: ['Mathematics'],
  gradeLevels: ['Primary 1-3'],
  school: 'Test School',
  location: 'Kampala',
  yearsExperience: 5,
  verificationStatus: 'verified' as const,
};

const createTestStore = (initialState?: Partial<AuthState>) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastActivity: null,
        ...initialState,
      },
    },
  });
};

describe('authSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().auth;

      expect(state).toEqual({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastActivity: null,
      });
    });
  });

  describe('synchronous actions', () => {
    it('should handle logout', () => {
      const store = createTestStore({
        user: mockUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

      // Set up localStorage
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh-token');

      store.dispatch(logout());
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastActivity).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should handle clearError', () => {
      const store = createTestStore({
        error: 'Test error',
      });

      store.dispatch(clearError());
      const state = store.getState().auth;

      expect(state.error).toBeNull();
    });

    it('should handle updateLastActivity', () => {
      const store = createTestStore();
      const beforeTime = Date.now();

      store.dispatch(updateLastActivity());
      const state = store.getState().auth;

      expect(state.lastActivity).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should handle updateUser', () => {
      const store = createTestStore({
        user: mockUser,
      });

      const updates = { fullName: 'Updated Name', school: 'New School' };
      store.dispatch(updateUser(updates));
      const state = store.getState().auth;

      expect(state.user).toEqual({
        ...mockUser,
        ...updates,
      });
    });

    it('should not update user if user is null', () => {
      const store = createTestStore();

      const updates = { fullName: 'Updated Name' };
      store.dispatch(updateUser(updates));
      const state = store.getState().auth;

      expect(state.user).toBeNull();
    });
  });

  describe('loginUser async thunk', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        user: mockUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const store = createTestStore();
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      await store.dispatch(loginUser(credentials));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token');
      expect(state.refreshToken).toBe('test-refresh-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.lastActivity).toBeTruthy();
      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token');
    });

    it('should store tokens in sessionStorage when rememberMe is false', async () => {
      const mockResponse = {
        user: mockUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const store = createTestStore();
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      await store.dispatch(loginUser(credentials));

      expect(sessionStorage.getItem('auth_token')).toBe('test-token');
      expect(sessionStorage.getItem('refresh_token')).toBe('test-refresh-token');
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      const store = createTestStore();
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      await store.dispatch(loginUser(credentials));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const store = createTestStore();
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      await store.dispatch(loginUser(credentials));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error. Please try again.');
    });
  });

  describe('registerUser async thunk', () => {
    it('should handle successful registration', async () => {
      const mockResponse = {
        user: mockUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const store = createTestStore();
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        subjects: ['Mathematics'],
        gradeLevels: ['Primary 1-3'],
        school: 'Test School',
        location: 'Kampala',
        yearsExperience: 5,
        credentialFile: new File(['test'], 'certificate.pdf', { type: 'application/pdf' }),
      };

      await store.dispatch(registerUser(userData));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle registration without immediate authentication', async () => {
      const mockResponse = {
        message: 'Registration successful. Please wait for verification.',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const store = createTestStore();
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        subjects: ['Mathematics'],
        gradeLevels: ['Primary 1-3'],
        school: 'Test School',
        location: 'Kampala',
        yearsExperience: 5,
        credentialFile: new File(['test'], 'certificate.pdf', { type: 'application/pdf' }),
      };

      await store.dispatch(registerUser(userData));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('forgotPassword async thunk', () => {
    it('should handle successful forgot password request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const store = createTestStore();
      const email = 'test@example.com';

      await store.dispatch(forgotPassword(email));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle forgot password failure', async () => {
      const errorMessage = 'Email not found';
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      const store = createTestStore();
      const email = 'nonexistent@example.com';

      await store.dispatch(forgotPassword(email));
      const state = store.getState().auth;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('refreshAuthToken async thunk', () => {
    it('should handle successful token refresh', async () => {
      const mockResponse = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('auth_token', 'old-token');
      localStorage.setItem('refresh_token', 'old-refresh-token');

      const store = createTestStore({
        refreshToken: 'old-refresh-token',
        isAuthenticated: true,
      });

      await store.dispatch(refreshAuthToken());
      const state = store.getState().auth;

      expect(state.token).toBe('new-token');
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.lastActivity).toBeTruthy();
      expect(localStorage.getItem('auth_token')).toBe('new-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    });

    it('should handle token refresh failure and logout user', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const store = createTestStore({
        user: mockUser,
        token: 'old-token',
        refreshToken: 'old-refresh-token',
        isAuthenticated: true,
      });

      await store.dispatch(refreshAuthToken());
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.lastActivity).toBeNull();
    });
  });

  describe('loadUserFromStorage async thunk', () => {
    it('should load user from localStorage', async () => {
      const mockResponse = mockUser;

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('refresh_token', 'stored-refresh-token');

      const store = createTestStore();

      await store.dispatch(loadUserFromStorage());
      const state = store.getState().auth;

      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('stored-token');
      expect(state.refreshToken).toBe('stored-refresh-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.lastActivity).toBeTruthy();
    });

    it('should load user from sessionStorage if localStorage is empty', async () => {
      const mockResponse = mockUser;

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      sessionStorage.setItem('auth_token', 'session-token');
      sessionStorage.setItem('refresh_token', 'session-refresh-token');

      const store = createTestStore();

      await store.dispatch(loadUserFromStorage());
      const state = store.getState().auth;

      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('session-token');
      expect(state.refreshToken).toBe('session-refresh-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle invalid stored token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      localStorage.setItem('auth_token', 'invalid-token');
      localStorage.setItem('refresh_token', 'invalid-refresh-token');

      const store = createTestStore();

      await store.dispatch(loadUserFromStorage());
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should handle no stored token', async () => {
      const store = createTestStore();

      await store.dispatch(loadUserFromStorage());
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});