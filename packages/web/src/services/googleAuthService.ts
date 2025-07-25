declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { code: string; error?: string }) => void;
            ux_mode?: 'popup' | 'redirect';
            redirect_uri?: string;
            state?: string;
          }) => {
            requestCode: () => void;
          };
        };
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri?: string;
}

export interface GoogleAuthResponse {
  code: string;
  state?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
}

class GoogleAuthService {
  private config: GoogleAuthConfig;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`
    };

    if (!this.config.clientId) {
      console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID environment variable.');
    }
  }

  /**
   * Initialize Google Identity Services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadGoogleScript();
    await this.initPromise;
    this.isInitialized = true;
  }

  /**
   * Load Google Identity Services script
   */
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google?.accounts) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait a bit for the Google object to be available
        setTimeout(() => {
          if (window.google?.accounts) {
            resolve();
          } else {
            reject(new Error('Google Identity Services failed to load'));
          }
        }, 100);
      };
      
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Get authorization code for server-side authentication
   */
  async getAuthorizationCode(state?: string): Promise<string> {
    await this.initialize();

    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured');
    }

    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: this.config.clientId,
        scope: 'email profile',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.code);
          }
        },
        ux_mode: 'popup',
        state: state
      });

      client.requestCode();
    });
  }

  /**
   * Initialize One Tap sign-in
   */
  async initializeOneTap(callback: (credential: string) => void): Promise<void> {
    await this.initialize();

    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured');
    }

    window.google.accounts.id.initialize({
      client_id: this.config.clientId,
      callback: (response) => {
        callback(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });
  }

  /**
   * Render Google Sign-In button
   */
  async renderButton(
    element: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: string;
      onClick?: () => void;
    } = {}
  ): Promise<void> {
    await this.initialize();

    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured');
    }

    // Clear any existing content
    element.innerHTML = '';

    // Add click handler if provided
    if (options.onClick) {
      element.addEventListener('click', options.onClick);
    }

    window.google.accounts.id.renderButton(element, {
      theme: options.theme || 'outline',
      size: options.size || 'large',
      text: options.text || 'signin_with',
      shape: options.shape || 'rectangular',
      width: options.width || '100%'
    });
  }

  /**
   * Show One Tap prompt
   */
  async showOneTap(): Promise<void> {
    await this.initialize();

    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured');
    }

    window.google.accounts.id.prompt();
  }

  /**
   * Disable auto-select for One Tap
   */
  async disableAutoSelect(): Promise<void> {
    await this.initialize();

    if (!this.config.clientId) {
      return;
    }

    window.google.accounts.id.disableAutoSelect();
  }

  /**
   * Check if Google Auth is configured
   */
  isConfigured(): boolean {
    return !!this.config.clientId;
  }

  /**
   * Get the configured client ID
   */
  getClientId(): string {
    return this.config.clientId;
  }
}

export const googleAuthService = new GoogleAuthService();