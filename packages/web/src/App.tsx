import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { Communities } from './pages/Communities';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { PWAInstallPrompt } from './components/ui/PWAInstallPrompt';
import { PWAStatus } from './components/ui/PWAStatus';
import { notificationService } from './services/notificationService';

function App() {
  useEffect(() => {
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
  }, []);

  return (
    <Router>
      <PWAStatus />
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
      <PWAInstallPrompt />
    </Router>
  );
}

export default App;