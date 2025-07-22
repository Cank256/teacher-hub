import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { Button } from './Button';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { state, toggleHighContrast, setFontSize, toggleReducedMotion, announceToScreenReader } = useAccessibility();

  const handleFontSizeChange = (size: typeof state.fontSize) => {
    setFontSize(size);
    announceToScreenReader(t('accessibility.fontSizeChanged', { size: t(`accessibility.fontSizes.${size}`) }));
  };

  const handleHighContrastToggle = () => {
    toggleHighContrast();
    announceToScreenReader(t(!state.highContrast ? 'accessibility.highContrastEnabled' : 'accessibility.highContrastDisabled'));
  };

  const handleReducedMotionToggle = () => {
    toggleReducedMotion();
    announceToScreenReader(t(!state.reducedMotion ? 'accessibility.reducedMotionEnabled' : 'accessibility.reducedMotionDisabled'));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-panel-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 id="accessibility-panel-title" className="text-lg font-semibold text-gray-900">
              {t('accessibility.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-1"
              aria-label={t('accessibility.closeSettings')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            {/* Font Size */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-900 mb-3">{t('accessibility.fontSize')}</legend>
              <div className="space-y-2">
                {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                  <label key={size} className="flex items-center">
                    <input
                      type="radio"
                      name="fontSize"
                      value={size}
                      checked={state.fontSize === size}
                      onChange={() => handleFontSizeChange(size)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {t(`accessibility.fontSizes.${size}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="high-contrast" className="text-sm font-medium text-gray-900">
                  {t('accessibility.highContrast')}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {t('accessibility.highContrastDescription')}
                </p>
              </div>
              <button
                id="high-contrast"
                role="switch"
                aria-checked={state.highContrast}
                onClick={handleHighContrastToggle}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${state.highContrast ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              >
                <span className="sr-only">{t('accessibility.toggleHighContrast')}</span>
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${state.highContrast ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-900">
                  {t('accessibility.reducedMotion')}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {t('accessibility.reducedMotionDescription')}
                </p>
              </div>
              <button
                id="reduced-motion"
                role="switch"
                aria-checked={state.reducedMotion}
                onClick={handleReducedMotionToggle}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${state.reducedMotion ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              >
                <span className="sr-only">{t('accessibility.toggleReducedMotion')}</span>
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${state.reducedMotion ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="primary">
              {t('common.done')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};