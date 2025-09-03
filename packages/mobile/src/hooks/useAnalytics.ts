import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AnalyticsService from '@/services/analytics/AnalyticsService';
import PerformanceMonitor from '@/services/analytics/PerformanceMonitor';
import PrivacyManager from '@/services/analytics/PrivacyManager';
import { 
  AnalyticsHook, 
  PerformanceMetrics, 
  UserProperties, 
  PrivacySettings,
  ANALYTICS_EVENTS 
} from '@/services/analytics/types';

interface UseAnalyticsOptions {
  trackScreenViews?: boolean;
  trackPerformance?: boolean;
  autoTrackAppState?: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}): AnalyticsHook => {
  const {
    trackScreenViews = true,
    trackPerformance = true,
    autoTrackAppState = true,
  } = options;

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    PrivacyManager.getPrivacySettings()
  );

  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState<boolean>(
    privacySettings.analyticsEnabled
  );

  // Update privacy settings when they change
  useEffect(() => {
    const updatePrivacySettings = () => {
      const settings = PrivacyManager.getPrivacySettings();
      setPrivacySettings(settings);
      setIsAnalyticsEnabled(settings.analyticsEnabled);
    };

    // Listen for privacy settings changes
    // In a real implementation, you might use an event emitter or context
    const interval = setInterval(updatePrivacySettings, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Track app state changes
  useEffect(() => {
    if (!autoTrackAppState) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      switch (nextAppState) {
        case 'active':
          AnalyticsService.trackAppStateChange('active');
          if (trackPerformance) {
            PerformanceMonitor.startMonitoring();
          }
          break;
        case 'background':
          AnalyticsService.trackAppStateChange('background');
          if (trackPerformance) {
            PerformanceMonitor.stopMonitoring();
          }
          break;
        case 'inactive':
          AnalyticsService.trackAppStateChange('inactive');
          break;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [autoTrackAppState, trackPerformance]);

  // Track events
  const trackEvent = useCallback((
    eventName: string, 
    properties?: Record<string, any>
  ) => {
    AnalyticsService.trackEvent(eventName, properties);
  }, []);

  // Track screen views
  const trackScreen = useCallback((
    screenName: string, 
    properties?: Record<string, any>
  ) => {
    if (trackScreenViews) {
      AnalyticsService.trackScreen(screenName, properties);
    }
  }, [trackScreenViews]);

  // Track performance metrics
  const trackPerformanceMetric = useCallback((metrics: PerformanceMetrics) => {
    if (trackPerformance) {
      AnalyticsService.trackPerformance(metrics);
    }
  }, [trackPerformance]);

  // Track errors
  const trackError = useCallback((
    error: Error, 
    context?: Record<string, any>
  ) => {
    AnalyticsService.trackError(error, context);
  }, []);

  // Set user properties
  const setUserProperties = useCallback((properties: UserProperties) => {
    AnalyticsService.setUserProperties(properties);
  }, []);

  return {
    trackEvent,
    trackScreen,
    trackPerformance: trackPerformanceMetric,
    trackError,
    setUserProperties,
    isAnalyticsEnabled,
    privacySettings,
  };
};

// Hook for screen-specific analytics
export const useScreenAnalytics = (screenName: string, properties?: Record<string, any>) => {
  const { trackScreen, trackPerformance } = useAnalytics();

  // Track screen view when component mounts or screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const endTTI = PerformanceMonitor.measureTTI(screenName);
      trackScreen(screenName, properties);

      // End TTI measurement after a short delay to ensure screen is fully rendered
      const timer = setTimeout(() => {
        endTTI();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }, [screenName, properties, trackScreen])
  );
};

// Hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const { trackPerformance } = useAnalytics();

  const measureTTI = useCallback((screenName: string) => {
    return PerformanceMonitor.measureTTI(screenName);
  }, []);

  const measureAPICall = useCallback((endpoint: string) => {
    return PerformanceMonitor.measureAPICall(endpoint);
  }, []);

  const measureScreenRender = useCallback((screenName: string) => {
    return PerformanceMonitor.measureScreenRender(screenName);
  }, []);

  const trackCustomMetric = useCallback((metrics: PerformanceMetrics) => {
    trackPerformance(metrics);
  }, [trackPerformance]);

  return {
    measureTTI,
    measureAPICall,
    measureScreenRender,
    trackCustomMetric,
  };
};

// Hook for user engagement tracking
export const useEngagementTracking = () => {
  const { trackEvent } = useAnalytics();
  const [sessionStartTime] = useState(Date.now());

  const trackFeatureUsage = useCallback((featureName: string, properties?: Record<string, any>) => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: featureName,
      ...properties,
    });
  }, [trackEvent]);

  const trackUserAction = useCallback((action: string, properties?: Record<string, any>) => {
    trackEvent('user_action', {
      action,
      session_duration: Date.now() - sessionStartTime,
      ...properties,
    });
  }, [trackEvent, sessionStartTime]);

  const trackSearch = useCallback((query: string, results: number, filters?: Record<string, any>) => {
    trackEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      query: query.length > 50 ? query.substring(0, 50) + '...' : query,
      results_count: results,
      filters,
    });
  }, [trackEvent]);

  const trackContentInteraction = useCallback((
    contentType: string,
    contentId: string,
    action: string,
    properties?: Record<string, any>
  ) => {
    trackEvent('content_interaction', {
      content_type: contentType,
      content_id: contentId,
      action,
      ...properties,
    });
  }, [trackEvent]);

  return {
    trackFeatureUsage,
    trackUserAction,
    trackSearch,
    trackContentInteraction,
  };
};

// Hook for privacy management
export const usePrivacyManagement = () => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    PrivacyManager.getPrivacySettings()
  );

  const updatePrivacySettings = useCallback(async (updates: Partial<PrivacySettings>) => {
    await PrivacyManager.updatePrivacySettings(updates);
    setPrivacySettings(PrivacyManager.getPrivacySettings());
  }, []);

  const recordConsent = useCallback(async (
    type: 'analytics' | 'crash_reporting' | 'performance' | 'logging',
    granted: boolean,
    policyVersion?: string
  ) => {
    await PrivacyManager.recordConsent(type, granted, policyVersion);
    setPrivacySettings(PrivacyManager.getPrivacySettings());
  }, []);

  const withdrawAllConsent = useCallback(async () => {
    await PrivacyManager.withdrawAllConsent();
    setPrivacySettings(PrivacyManager.getPrivacySettings());
  }, []);

  const exportUserData = useCallback(async () => {
    return await PrivacyManager.exportUserData();
  }, []);

  const deleteAllUserData = useCallback(async () => {
    await PrivacyManager.deleteAllUserData();
    setPrivacySettings(PrivacyManager.getPrivacySettings());
  }, []);

  const isConsentRequired = useCallback(() => {
    return PrivacyManager.isConsentRequired();
  }, []);

  return {
    privacySettings,
    updatePrivacySettings,
    recordConsent,
    withdrawAllConsent,
    exportUserData,
    deleteAllUserData,
    isConsentRequired,
  };
};

// Hook for retention tracking
export const useRetentionTracking = () => {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track retention on app start
    AnalyticsService.trackRetention();
  }, []);

  const trackMilestone = useCallback((milestone: string, properties?: Record<string, any>) => {
    trackEvent('milestone_reached', {
      milestone,
      ...properties,
    });
  }, [trackEvent]);

  const trackOnboarding = useCallback((step: string, completed: boolean) => {
    trackEvent('onboarding_step', {
      step,
      completed,
    });
  }, [trackEvent]);

  const trackFirstTimeAction = useCallback((action: string, properties?: Record<string, any>) => {
    trackEvent('first_time_action', {
      action,
      ...properties,
    });
  }, [trackEvent]);

  return {
    trackMilestone,
    trackOnboarding,
    trackFirstTimeAction,
  };
};