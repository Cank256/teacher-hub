import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminSidebar } from './AdminSidebar';
import { TopNavigation } from './TopNavigation';
import { AccessibilityPanel } from '../ui/AccessibilityPanel';
import { ScreenReaderAnnouncements } from '../ui/ScreenReaderAnnouncements';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const [isAccessibilityPanelOpen, setIsAccessibilityPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, sidebar should be closed by default
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        // On desktop, restore sidebar state from localStorage or default to open
        const savedState = localStorage.getItem('admin-sidebar-open');
        setIsSidebarOpen(savedState ? JSON.parse(savedState) : true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save sidebar state to localStorage on desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('admin-sidebar-open', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navigation bar with admin indicator */}
        <ErrorBoundary fallback={<div className="h-16 bg-white shadow-sm" />}>
          <div className="bg-red-600 text-white px-4 py-1 text-sm text-center">
            <span className="font-medium">{t('admin.mode.indicator')}</span>
          </div>
          <TopNavigation onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        </ErrorBoundary>

        <main 
          id="main-content" 
          className="flex-1 p-6 overflow-auto"
          role="main"
          aria-label="Admin main content"
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Accessibility button */}
      <button
        onClick={() => setIsAccessibilityPanelOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label={t('accessibility.openSettings')}
        title={t('accessibility.title')}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
          />
        </svg>
      </button>

      <ErrorBoundary fallback={<div />}>
        <AccessibilityPanel
          isOpen={isAccessibilityPanelOpen}
          onClose={() => setIsAccessibilityPanelOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div />}>
        <ScreenReaderAnnouncements />
      </ErrorBoundary>
    </div>
  );
};