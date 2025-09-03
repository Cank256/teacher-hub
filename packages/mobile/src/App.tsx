import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { InternationalizationProvider } from '@/contexts/InternationalizationContext';
import { NavigationContainer } from '@/navigation';
import { usePerformanceInit } from '@/hooks/usePerformanceInit';
import { initializeAnalytics } from '@/services/analytics';
import '@/i18n'; // Initialize i18n

// Main App Component with Navigation
const AppContent: React.FC = () => {
  const { isAuthenticated, isFirstLaunch, isLoading } = useAuth();
  
  // Initialize performance monitoring and optimization
  const { trackScreenLoad } = usePerformanceInit({
    enableAutoOptimization: true,
    memoryThreshold: 150 * 1024 * 1024, // 150MB
    cacheSize: 100 * 1024 * 1024, // 100MB
    monitoringEnabled: true,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer
      isAuthenticated={isAuthenticated}
      isFirstLaunch={isFirstLaunch}
    />
  );
};

// Root App Component with Providers
export default function App() {
  // Initialize analytics system on app start
  useEffect(() => {
    const initAnalytics = async () => {
      await initializeAnalytics({
        enableCrashReporting: true,
        enablePerformanceMonitoring: true,
        enableUserAnalytics: false, // Requires user consent
        enableStructuredLogging: false, // Requires user consent
      });
    };

    initAnalytics();
  }, []);

  return (
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
