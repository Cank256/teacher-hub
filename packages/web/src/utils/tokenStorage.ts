/**
 * Utility functions for token storage management
 */

export const tokenStorage = {
  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
  },

  /**
   * Store tokens
   */
  setTokens(accessToken: string, refreshToken: string, remember: boolean = false): void {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('auth_token', accessToken);
    storage.setItem('refresh_token', refreshToken);
  },

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
  },

  /**
   * Check if tokens exist
   */
  hasTokens(): boolean {
    return !!(this.getToken() && this.getRefreshToken());
  }
};