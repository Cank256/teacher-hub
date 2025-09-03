import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { InternationalizationProvider } from '@/contexts/InternationalizationContext';
import { NavigationContainer } from '@/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NetworkFallback } from '@/components/common/NetworkFallback';
import { usePerformanceInit } from '@/hooks/usePerformanceInit';
import { initializeAnalytics } from '@/services/analytics';
import { appRatingService } from '@/services/appRating';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import { useGlobalStore } from '@/store/globalStore';
import '@/i18n'; // Initialize i18n

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Main App Component with Navigation
const AppContent: React.FC = () => {
  const { isAuthenticated, isFirstLaunch, isLoading } = useAuth();
  const { setOnlineStatus } = useGlobalStore();
  
  // Initialize performance monitoring and optimization
  const { trackScreenLoad } = usePerformanceInit({
    enableAutoOptimization: true,
    memoryThreshold: 150 * 1024 * 1024, // 150MB
    cacheSize: 100 * 1024 * 1024, // 100MB
    monitoringEnabled: true,
  });

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active
        await appRatingService.incrementSessionCount();
        
        // Check if we should show rating prompt
        const shouldShow = await appRatingService.shouldShowRatingPrompt();
        if (shouldShow) {
          setTimeout(() => {
            appRatingService.showRatingPrompt();
          }, 2000); // Show after 2 seconds
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NetworkFallback>
      <NavigationContainer
        isAuthenticated={isAuthenticated}
        isFirstLaunch={isFirstLaunch}
      />
    </NetworkFallback>
  );
};

// Root App Component with Providers
export default function App() {
  // Initialize analytics system on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize analytics
        await initializeAnalytics({
          enableCrashReporting: true,
          enablePerformanceMonitoring: true,
          enableUserAnalytics: false, // Requires user consent
          enableStructuredLogging: false, // Requires user consent
        });

        // Initialize performance optimizer
        performanceOptimizer.runAfterInteractions(() => {
          console.log('App initialization complete');
        });
      } catch (error) {
        console.warn('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <SafeAreaProvider>
            <AccessibilityProvider>
              <InternationalizationProvider>
                <AuthProvider>
                  <AppContent />
                  <StatusBar style="auto" />
                </AuthProvider>
              </InternationalizationProvider>
            </AccessibilityProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
