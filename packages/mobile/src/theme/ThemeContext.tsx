import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { Theme, ColorScheme, ThemeContextType } from './types';
import { lightTheme, darkTheme } from './theme';

const storage = new MMKV();
const THEME_STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    // Try to get saved preference first
    const savedScheme = storage.getString(THEME_STORAGE_KEY) as ColorScheme;
    if (savedScheme) {
      return savedScheme;
    }
    
    // Fall back to system preference
    const systemScheme = Appearance.getColorScheme();
    return systemScheme === 'dark' ? 'dark' : 'light';
  });

  const theme: Theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const toggleColorScheme = () => {
    const newScheme: ColorScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    storage.set(THEME_STORAGE_KEY, scheme);
  };

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: systemScheme }) => {
      // Only update if user hasn't set a manual preference
      const savedScheme = storage.getString(THEME_STORAGE_KEY);
      if (!savedScheme) {
        setColorSchemeState(systemScheme === 'dark' ? 'dark' : 'light');
      }
    });

    return () => subscription?.remove();
  }, []);

  const contextValue: ThemeContextType = {
    theme,
    colorScheme,
    toggleColorScheme,
    setColorScheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};