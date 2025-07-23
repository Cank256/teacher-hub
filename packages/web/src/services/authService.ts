import { store } from '../store';
import { refreshAuthToken, logout } from '../store/slices/authSlice';

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize authentication service
   */
  init() {
    this.startTokenRefreshTimer();
    this.setupActivityTracking();
    this.setupStorageListener();
  }

  /**
   * Start automatic token refresh
   */
  private startTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      const state = store.getState();
      if (state.auth.isAuthenticated && state.auth.refreshToken) {
        store.dispatch(refreshAuthToken());
      }
    }, this.TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Setup activity tracking for session timeout
   */
  private setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => {
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        this.checkSessionTimeout();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
  }

  /**
   * Check if session has timed out
   */
  private checkSessionTimeout() {
    const state = store.getState();
    if (state.auth.lastActivity) {
      const timeSinceLastActivity = Date.now() - state.auth.lastActivity;
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        this.handleSessionTimeout();
      }
    }
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout() {
    store.dispatch(logout());
    
    // Show session timeout notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Session Expired', {
        body: 'Your session has expired. Please log in again.',
        icon: '/favicon.ico',
      });
    }
    
    // Redirect to login page
    window.location.href = '/auth/login?reason=session_timeout';
  }

  /**
   * Setup storage event listener for multi-tab logout
   */
  private setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_token' && event.newValue === null) {
        // Token was removed in another tab, logout this tab too
        store.dispatch(logout());
      }
    });
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    const state = store.getState();
    if (state.auth.token) {
      return { Authorization: `Bearer ${state.auth.token}` };
    }
    return {};
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = store.getState();
    return state.auth.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    const state = store.getState();
    return state.auth.user;
  }

  /**
   * Cleanup service
   */
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const authService = new AuthService();