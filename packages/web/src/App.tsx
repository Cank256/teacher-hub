import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { Communities } from './pages/Communities';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { PWAInstallPrompt } from './components/ui/PWAInstallPrompt';
import { PWAStatus } from './components/ui/PWAStatus';
import { notificationService } from './services/notificationService';
import { authService } from './services/authService';
import './i18n';

function App() {
  useEffect(() => {
    // Initialize authentication service
    authService.init();

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully:', registration);
          
          // Request notification permission and subscribe to push notifications
          const hasPermission = await notificationService.requestPermission();
          if (hasPermission) {
            await notificationService.subscribeToPushNotifications();
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      authService.cleanup();
    };
  }, []);

  return (
    <Provider store={store}>
      <AccessibilityProvider>
        <Router>
          <PWAStatus />
          <Routes>
            {/* Authentication routes - no layout */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected routes with layout */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/communities" element={<Communities />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/profile" element={<Profile />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <PWAInstallPrompt />
        </Router>
      </AccessibilityProvider>
    </Provider>
  );
}

export default App;