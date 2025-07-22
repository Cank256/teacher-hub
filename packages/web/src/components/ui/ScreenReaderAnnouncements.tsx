import React from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Component for announcing messages to screen readers
 * Uses aria-live regions to communicate dynamic content changes
 */
export const ScreenReaderAnnouncements: React.FC = () => {
  const { state } = useAccessibility();

  return (
    <>
      {/* Polite announcements - won't interrupt current speech */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {state.screenReaderAnnouncements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
      
      {/* Assertive announcements for urgent messages */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
    </>
  );
};