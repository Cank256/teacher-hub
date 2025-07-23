import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';
import { ScreenReaderAnnouncements } from '../ui/ScreenReaderAnnouncements';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <AccessibilityProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <PublicHeader />
        
        <main 
          id="main-content" 
          className="flex-1"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>

        <PublicFooter />
        <ScreenReaderAnnouncements />
      </div>
    </AccessibilityProvider>
  );
};