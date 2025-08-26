// App constants and configuration

export const APP_CONFIG = {
  NAME: 'Teacher Hub',
  VERSION: '1.0.0',
  BUILD_NUMBER: 1,
} as const;

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:3000/api'
    : 'https://api.teacherhub.ug/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@teacher_hub/auth_token',
  REFRESH_TOKEN: '@teacher_hub/refresh_token',
  USER_DATA: '@teacher_hub/user_data',
  THEME_PREFERENCE: '@teacher_hub/theme',
  OFFLINE_QUEUE: '@teacher_hub/offline_queue',
  LAST_SYNC: '@teacher_hub/last_sync',
} as const;

export const COLORS = {
  PRIMARY: '#2563EB',
  SECONDARY: '#7C3AED',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  LIGHT: '#F8FAFC',
  DARK: '#1E293B',
  GRAY: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

export const TYPOGRAPHY = {
  FONT_SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },
  FONT_WEIGHTS: {
    LIGHT: '300' as const,
    REGULAR: '400' as const,
    MEDIUM: '500' as const,
    SEMIBOLD: '600' as const,
    BOLD: '700' as const,
  },
} as const;

export const DIMENSIONS = {
  SCREEN_PADDING: 16,
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 48,
} as const;

export const ANIMATION = {
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
  },
} as const;
