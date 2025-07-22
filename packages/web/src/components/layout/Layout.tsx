import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from './Navigation';
import { AccessibilityPanel } from '../ui/AccessibilityPanel';
import { ScreenReaderAnnouncements } from '../ui/ScreenReaderAnnouncements';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const [isAccessibilityPanelOpen, setIsAccessibilityPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
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

      <main 
        id="main-content" 
        className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>

      <AccessibilityPanel
        isOpen={isAccessibilityPanelOpen}
        onClose={() => setIsAccessibilityPanelOpen(false)}
      />

      <ScreenReaderAnnouncements />
    </div>
  );
};