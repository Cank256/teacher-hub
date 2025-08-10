import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AccessibilityState {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  screenReaderAnnouncements: string[];
}

interface AccessibilityContextType {
  state: AccessibilityState;
  toggleHighContrast: () => void;
  setFontSize: (size: AccessibilityState['fontSize']) => void;
  toggleReducedMotion: () => void;
  announceToScreenReader: (message: string) => void;
  clearAnnouncements: () => void;
}

type AccessibilityAction =
  | { type: 'TOGGLE_HIGH_CONTRAST' }
  | { type: 'SET_FONT_SIZE'; payload: AccessibilityState['fontSize'] }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'ADD_ANNOUNCEMENT'; payload: string }
  | { type: 'CLEAR_ANNOUNCEMENTS' }
  | { type: 'LOAD_PREFERENCES'; payload: Partial<AccessibilityState> };

const initialState: AccessibilityState = {
  highContrast: false,
  fontSize: 'medium',
  reducedMotion: false,
  screenReaderAnnouncements: [],
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

function accessibilityReducer(state: AccessibilityState, action: AccessibilityAction): AccessibilityState {
  switch (action.type) {
    case 'TOGGLE_HIGH_CONTRAST':
      return { ...state, highContrast: !state.highContrast };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.payload };
    case 'TOGGLE_REDUCED_MOTION':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'ADD_ANNOUNCEMENT':
      return { 
        ...state, 
        screenReaderAnnouncements: [...state.screenReaderAnnouncements, action.payload] 
      };
    case 'CLEAR_ANNOUNCEMENTS':
      return { ...state, screenReaderAnnouncements: [] };
    case 'LOAD_PREFERENCES':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('accessibility-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'LOAD_PREFERENCES', payload: preferences });
      } catch (error) {
        console.error('Failed to load accessibility preferences:', error);
      }
    }

    // Check for system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      dispatch({ type: 'TOGGLE_REDUCED_MOTION' });
    }
  }, []);

  // Save preferences to localStorage whenever state changes
  useEffect(() => {
    const preferences = {
      highContrast: state.highContrast,
      fontSize: state.fontSize,
      reducedMotion: state.reducedMotion,
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [state.highContrast, state.fontSize, state.reducedMotion]);

  // Apply CSS classes to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${state.fontSize}`);

    // Reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [state.highContrast, state.fontSize, state.reducedMotion]);

  const toggleHighContrast = () => {
    dispatch({ type: 'TOGGLE_HIGH_CONTRAST' });
  };

  const setFontSize = (size: AccessibilityState['fontSize']) => {
    dispatch({ type: 'SET_FONT_SIZE', payload: size });
  };

  const toggleReducedMotion = () => {
    dispatch({ type: 'TOGGLE_REDUCED_MOTION' });
  };

  const announceToScreenReader = (message: string) => {
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: message });
    // Clear the announcement after a short delay
    setTimeout(() => {
      dispatch({ type: 'CLEAR_ANNOUNCEMENTS' });
    }, 1000);
  };

  const clearAnnouncements = () => {
    dispatch({ type: 'CLEAR_ANNOUNCEMENTS' });
  };

  const value: AccessibilityContextType = {
    state,
    toggleHighContrast,
    setFontSize,
    toggleReducedMotion,
    announceToScreenReader,
    clearAnnouncements,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    console.warn('useAccessibility must be used within an AccessibilityProvider. Using fallback values.');
    
    // Return fallback context with no-op functions
    return {
      state: initialState,
      toggleHighContrast: () => {},
      setFontSize: () => {},
      toggleReducedMotion: () => {},
      announceToScreenReader: () => {},
      clearAnnouncements: () => {},
    };
  }
  return context;
};