import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Layout } from './components/layout/Layout';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { Communities } from './pages/Communities';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { AccessibilityPage } from './pages/AccessibilityPage';
import { CommunityPage } from './pages/CommunityPage';
import { BlogPage } from './pages/BlogPage';
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
      <Router>
        <PWAStatus />
        <Routes>
          {/* Public routes with public layout */}
          <Route path="/" element={
            <PublicLayout>
              <LandingPage />
            </PublicLayout>
          } />
          <Route path="/contact" element={
            <PublicLayout>
              <ContactPage />
            </PublicLayout>
          } />
          <Route path="/help" element={
            <PublicLayout>
              <HelpPage />
            </PublicLayout>
          } />
          <Route path="/privacy" element={
            <PublicLayout>
              <PrivacyPolicyPage />
            </PublicLayout>
          } />
          <Route path="/terms" element={
            <PublicLayout>
              <TermsOfServicePage />
            </PublicLayout>
          } />
          <Route path="/cookies" element={
            <PublicLayout>
              <CookiePolicyPage />
            </PublicLayout>
          } />
          <Route path="/status" element={
            <PublicLayout>
              <SystemStatusPage />
            </PublicLayout>
          } />
          <Route path="/accessibility" element={
            <PublicLayout>
              <AccessibilityPage />
            </PublicLayout>
          } />
          <Route path="/community" element={
            <PublicLayout>
              <CommunityPage />
            </PublicLayout>
          } />
          <Route path="/blog" element={
            <PublicLayout>
              <BlogPage />
            </PublicLayout>
          } />

          {/* Authentication routes with public layout */}
          <Route path="/auth/login" element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          } />
          <Route path="/auth/register" element={
            <PublicLayout>
              <RegisterPage />
            </PublicLayout>
          } />
          <Route path="/auth/forgot-password" element={
            <PublicLayout>
              <ForgotPasswordPage />
            </PublicLayout>
          } />
          
          {/* Protected routes with authenticated layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/resources" element={
            <ProtectedRoute>
              <Layout>
                <Resources />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/communities" element={
            <ProtectedRoute>
              <Layout>
                <Communities />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Layout>
                <Messages />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        <PWAInstallPrompt />
      </Router>
    </Provider>
  );
}

export default App;