import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AccessibilityService, { AccessibilitySettings, FontSize } from '@/services/accessibility/AccessibilityService';

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  announceForAccessibility: (message: string, delay?: number) => void;
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  getFontSizeMultiplier: () => number;
  getScaledFontSize: (baseSize: number) => number;
  getAnimationDuration: (baseDuration: number) => number;
  getContrastRatio: () => number;
  resetToDefaults: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    AccessibilityService.getInstance().getSettings()
  );

  useEffect(() => {
    const accessibilityService = AccessibilityService.getInstance();
    
    // Subscribe to accessibility changes
    const handleSettingsChange = (newSettings: AccessibilitySettings) => {
      setSettings(newSettings);
    };

    accessibilityService.subscribe('AccessibilityProvider', handleSettingsChange);

    // Cleanup subscription
    return () => {
      accessibilityService.unsubscribe('AccessibilityProvider');
    };
  }, []);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    AccessibilityService.getInstance().updateSetting(key, value);
  };

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    AccessibilityService.getInstance().updateSettings(newSettings);
  };

  const announceForAccessibility = (message: string, delay = 0) => {
    AccessibilityService.getInstance().announceForAccessibility({ message, delay });
  };

  const getFontSizeMultiplier = () => {
    return AccessibilityService.getInstance().getFontSizeMultiplier();
  };

  const getScaledFontSize = (baseSize: number) => {
    return AccessibilityService.getInstance().getScaledFontSize(baseSize);
  };

  const getAnimationDuration = (baseDuration: number) => {
    return AccessibilityService.getInstance().getAnimationDuration(baseDuration);
  };

  const getContrastRatio = () => {
    return AccessibilityService.getInstance().getContrastRatio();
  };

  const resetToDefaults = () => {
    AccessibilityService.getInstance().resetToDefaults();
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    updateSettings,
    announceForAccessibility,
    isScreenReaderEnabled: settings.isScreenReaderEnabled,
    isReduceMotionEnabled: settings.isReduceMotionEnabled,
    isHighContrastEnabled: settings.isHighContrastEnabled,
    getFontSizeMultiplier,
    getScaledFontSize,
    getAnimationDuration,
    getContrastRatio,
    resetToDefaults,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Custom hook for accessibility-aware animations
export const useAccessibleAnimation = (baseDuration: number) => {
  const { getAnimationDuration } = useAccessibility();
  return getAnimationDuration(baseDuration);
};

// Custom hook for accessibility-aware font sizes
export const useAccessibleFontSize = (baseSize: number) => {
  const { getScaledFontSize } = useAccessibility();
  return getScaledFontSize(baseSize);
};

// Custom hook for accessibility-aware colors
export const useAccessibleColors = () => {
  const { getContrastRatio, isHighContrastEnabled } = useAccessibility();
  
  return {
    getContrastRatio,
    isHighContrastEnabled,
    adjustColorForContrast: (color: string, factor?: number) => {
      // This would need a color manipulation library in a real implementation
      // For now, return the original color
      return color;
    },
  };
};

export default AccessibilityContext;