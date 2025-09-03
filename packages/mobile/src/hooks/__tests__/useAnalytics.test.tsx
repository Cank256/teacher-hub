import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { jest } from '@jest/globals';
import {
  useAnalytics,
  useScreenAnalytics,
  usePerformanceMonitoring,
  useEngagementTracking,
  usePrivacyManagement,
  useRetentionTracking,
} from '../useAnalytics';

// Mock dependencies
jest.mock('@/services/analytics/AnalyticsService');
jest.mock('@/services/analytics/PerformanceMonitor');
jest.mock('@/services/analytics/PrivacyManager');
jest.mock('@react-navigation/native');

const mockAnalyticsService = {
  trackEvent: jest.fn(),
  trackScreen: jest.fn(),
  trackPerformance: jest.fn(),
  trackError: jest.fn(),
  setUserProperties: jest.fn(),
  trackAppStateChange: jest.fn(),
  trackRetention: jest.fn(),
};

const mockPerformanceMonitor = {
  measureTTI: jest.fn(() => jest.fn()),
  measureAPICall: jest.fn(() => jest.fn()),
  measureScreenRender: jest.fn(() => jest.fn()),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
};

const mockPrivacyManager = {
  getPrivacySettings: jest.fn(() => ({
    analyticsEnabled: true,
    crashReportingEnabled: true,
    performanceMonitoringEnabled: true,
    structuredLoggingEnabled: false,
    dataRetentionDays: 90,
    anonymizeData: true,
  })),
  updatePrivacySettings: jest.fn(),
  recordConsent: jest.fn(),
  withdrawAllConsent: jest.fn(),
  exportUserData: jest.fn(),
  deleteAllUserData: jest.fn(),
  isConsentRequired: jest.fn(() => false),
};

const mockUseFocusEffect = jest.fn();

jest.mock('@/services/analytics/AnalyticsService', () => mockAnalyticsService);
jest.mock('@/services/analytics/PerformanceMonitor', () => mockPerformanceMonitor);
jest.mock('@/services/analytics/PrivacyManager', () => mockPrivacyManager);
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffect,
}));

// Mock AppState
const mockAppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

jest.mock('react-native', () => ({
  AppState: mockAppState,
  Platform: { OS: 'ios' },
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should provide analytics functions', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current).toEqual({
      trackEvent: expect.any(Function),
      trackScreen: expect.any(Function),
      trackPerformance: expect.any(Function),
      trackError: expect.any(Function),
      setUserProperties: expect.any(Function),
      isAnalyticsEnabled: true,
      privacySettings: expect.any(Object),
    });
  });

  it('should track events', () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.trackEvent('test_event', { key: 'value' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('test_event', { key: 'value' });
  });

  it('should track screens when enabled', () => {
    const { result } = renderHook(() => useAnalytics({ trackScreenViews: true }));

    act(() => {
      result.current.trackScreen('TestScreen', { tab: 'posts' });
    });

    expect(mockAnalyticsService.trackScreen).toHaveBeenCalledWith('TestScreen', { tab: 'posts' });
  });

  it('should not track screens when disabled', () => {
    const { result } = renderHook(() => useAnalytics({ trackScreenViews: false }));

    act(() => {
      result.current.trackScreen('TestScreen');
    });

    expect(mockAnalyticsService.trackScreen).not.toHaveBeenCalled();
  });

  it('should track performance metrics when enabled', () => {
    const { result } = renderHook(() => useAnalytics({ trackPerformance: true }));

    const metrics = {
      metric_name: 'test_metric',
      value: 100,
      unit: 'ms',
    };

    act(() => {
      result.current.trackPerformance(metrics);
    });

    expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith(metrics);
  });

  it('should not track performance when disabled', () => {
    const { result } = renderHook(() => useAnalytics({ trackPerformance: false }));

    const metrics = {
      metric_name: 'test_metric',
      value: 100,
      unit: 'ms',
    };

    act(() => {
      result.current.trackPerformance(metrics);
    });

    expect(mockAnalyticsService.trackPerformance).not.toHaveBeenCalled();
  });

  it('should track errors', () => {
    const { result } = renderHook(() => useAnalytics());

    const error = new Error('Test error');
    const context = { screen: 'TestScreen' };

    act(() => {
      result.current.trackError(error, context);
    });

    expect(mockAnalyticsService.trackError).toHaveBeenCalledWith(error, context);
  });

  it('should set user properties', () => {
    const { result } = renderHook(() => useAnalytics());

    const properties = {
      firstName: 'John',
      subjects: ['Math'],
    };

    act(() => {
      result.current.setUserProperties(properties);
    });

    expect(mockAnalyticsService.setUserProperties).toHaveBeenCalledWith(properties);
  });

  it('should handle app state changes when enabled', () => {
    renderHook(() => useAnalytics({ autoTrackAppState: true }));

    expect(mockAppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should not handle app state changes when disabled', () => {
    renderHook(() => useAnalytics({ autoTrackAppState: false }));

    expect(mockAppState.addEventListener).not.toHaveBeenCalled();
  });

  it('should start performance monitoring on app active', () => {
    renderHook(() => useAnalytics({ autoTrackAppState: true, trackPerformance: true }));

    const stateChangeHandler = mockAppState.addEventListener.mock.calls[0][1];

    act(() => {
      stateChangeHandler('active');
    });

    expect(mockAnalyticsService.trackAppStateChange).toHaveBeenCalledWith('active');
    expect(mockPerformanceMonitor.startMonitoring).toHaveBeenCalled();
  });

  it('should stop performance monitoring on app background', () => {
    renderHook(() => useAnalytics({ autoTrackAppState: true, trackPerformance: true }));

    const stateChangeHandler = mockAppState.addEventListener.mock.calls[0][1];

    act(() => {
      stateChangeHandler('background');
    });

    expect(mockAnalyticsService.trackAppStateChange).toHaveBeenCalledWith('background');
    expect(mockPerformanceMonitor.stopMonitoring).toHaveBeenCalled();
  });
});

describe('useScreenAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track screen view on focus', () => {
    const screenName = 'TestScreen';
    const properties = { tab: 'posts' };

    renderHook(() => useScreenAnalytics(screenName, properties));

    // Simulate focus effect callback
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    const cleanup = focusCallback();

    expect(mockPerformanceMonitor.measureTTI).toHaveBeenCalledWith(screenName);
    expect(mockAnalyticsService.trackScreen).toHaveBeenCalledWith(screenName, properties);

    // Test cleanup
    if (cleanup) cleanup();
  });
});

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide performance monitoring functions', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    expect(result.current).toEqual({
      measureTTI: expect.any(Function),
      measureAPICall: expect.any(Function),
      measureScreenRender: expect.any(Function),
      trackCustomMetric: expect.any(Function),
    });
  });

  it('should measure TTI', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    act(() => {
      result.current.measureTTI('TestScreen');
    });

    expect(mockPerformanceMonitor.measureTTI).toHaveBeenCalledWith('TestScreen');
  });

  it('should measure API calls', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    act(() => {
      result.current.measureAPICall('/api/posts');
    });

    expect(mockPerformanceMonitor.measureAPICall).toHaveBeenCalledWith('/api/posts');
  });

  it('should track custom metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const metrics = {
      metric_name: 'custom_metric',
      value: 200,
      unit: 'ms',
    };

    act(() => {
      result.current.trackCustomMetric(metrics);
    });

    expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith(metrics);
  });
});

describe('useEngagementTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide engagement tracking functions', () => {
    const { result } = renderHook(() => useEngagementTracking());

    expect(result.current).toEqual({
      trackFeatureUsage: expect.any(Function),
      trackUserAction: expect.any(Function),
      trackSearch: expect.any(Function),
      trackContentInteraction: expect.any(Function),
    });
  });

  it('should track feature usage', () => {
    const { result } = renderHook(() => useEngagementTracking());

    act(() => {
      result.current.trackFeatureUsage('posts_creation', { category: 'content' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('feature_used', {
      feature: 'posts_creation',
      category: 'content',
    });
  });

  it('should track user actions with session duration', () => {
    const { result } = renderHook(() => useEngagementTracking());

    act(() => {
      result.current.trackUserAction('button_click', { button: 'submit' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('user_action', {
      action: 'button_click',
      session_duration: expect.any(Number),
      button: 'submit',
    });
  });

  it('should track search with truncated query', () => {
    const { result } = renderHook(() => useEngagementTracking());

    const longQuery = 'a'.repeat(100);
    const expectedQuery = 'a'.repeat(50) + '...';

    act(() => {
      result.current.trackSearch(longQuery, 5, { category: 'posts' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('search_performed', {
      query: expectedQuery,
      results_count: 5,
      filters: { category: 'posts' },
    });
  });

  it('should track content interactions', () => {
    const { result } = renderHook(() => useEngagementTracking());

    act(() => {
      result.current.trackContentInteraction('post', 'post_123', 'like', { author: 'user_456' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('content_interaction', {
      content_type: 'post',
      content_id: 'post_123',
      action: 'like',
      author: 'user_456',
    });
  });
});

describe('usePrivacyManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide privacy management functions', () => {
    const { result } = renderHook(() => usePrivacyManagement());

    expect(result.current).toEqual({
      privacySettings: expect.any(Object),
      updatePrivacySettings: expect.any(Function),
      recordConsent: expect.any(Function),
      withdrawAllConsent: expect.any(Function),
      exportUserData: expect.any(Function),
      deleteAllUserData: expect.any(Function),
      isConsentRequired: expect.any(Function),
    });
  });

  it('should update privacy settings', async () => {
    const { result } = renderHook(() => usePrivacyManagement());

    const updates = { analyticsEnabled: false };

    await act(async () => {
      await result.current.updatePrivacySettings(updates);
    });

    expect(mockPrivacyManager.updatePrivacySettings).toHaveBeenCalledWith(updates);
  });

  it('should record consent', async () => {
    const { result } = renderHook(() => usePrivacyManagement());

    await act(async () => {
      await result.current.recordConsent('analytics', true, '1.0');
    });

    expect(mockPrivacyManager.recordConsent).toHaveBeenCalledWith('analytics', true, '1.0');
  });

  it('should withdraw all consent', async () => {
    const { result } = renderHook(() => usePrivacyManagement());

    await act(async () => {
      await result.current.withdrawAllConsent();
    });

    expect(mockPrivacyManager.withdrawAllConsent).toHaveBeenCalled();
  });
});

describe('useRetentionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track retention on mount', () => {
    renderHook(() => useRetentionTracking());

    expect(mockAnalyticsService.trackRetention).toHaveBeenCalled();
  });

  it('should provide retention tracking functions', () => {
    const { result } = renderHook(() => useRetentionTracking());

    expect(result.current).toEqual({
      trackMilestone: expect.any(Function),
      trackOnboarding: expect.any(Function),
      trackFirstTimeAction: expect.any(Function),
    });
  });

  it('should track milestones', () => {
    const { result } = renderHook(() => useRetentionTracking());

    act(() => {
      result.current.trackMilestone('first_post_created', { category: 'content' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('milestone_reached', {
      milestone: 'first_post_created',
      category: 'content',
    });
  });

  it('should track onboarding steps', () => {
    const { result } = renderHook(() => useRetentionTracking());

    act(() => {
      result.current.trackOnboarding('profile_setup', true);
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('onboarding_step', {
      step: 'profile_setup',
      completed: true,
    });
  });

  it('should track first time actions', () => {
    const { result } = renderHook(() => useRetentionTracking());

    act(() => {
      result.current.trackFirstTimeAction('join_community', { community_id: 'comm_123' });
    });

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('first_time_action', {
      action: 'join_community',
      community_id: 'comm_123',
    });
  });
});