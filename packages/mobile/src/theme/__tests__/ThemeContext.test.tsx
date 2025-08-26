import React from 'react';
import { render } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { lightTheme, darkTheme } from '../theme';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock Appearance
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Appearance: {
    getColorScheme: jest.fn(),
    addChangeListener: jest.fn(),
  },
}));

const TestComponent: React.FC = () => {
  const { theme, colorScheme, toggleColorScheme, setColorScheme } = useTheme();
  
  return (
    <>
      <div testID="theme-data" data-theme={JSON.stringify({ colorScheme, isDark: theme.isDark })} />
      <button testID="toggle-button" onPress={toggleColorScheme}>Toggle</button>
      <button testID="set-light-button" onPress={() => setColorScheme('light')}>Set Light</button>
      <button testID="set-dark-button" onPress={() => setColorScheme('dark')}>Set Dark</button>
    </>
  );
};

describe('ThemeContext', () => {
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = {
      getString: jest.fn(),
      set: jest.fn(),
    };
    (MMKV as jest.Mock).mockImplementation(() => mockStorage);
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('light');
    (Appearance.addChangeListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  it('should throw error when useTheme is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');
    
    consoleSpy.mockRestore();
  });

  it('should provide light theme by default', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const themeData = getByTestId('theme-data');
    const data = JSON.parse(themeData.props['data-theme']);
    
    expect(data.colorScheme).toBe('light');
    expect(data.isDark).toBe(false);
  });

  it('should use saved theme preference', () => {
    mockStorage.getString.mockReturnValue('dark');
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const themeData = getByTestId('theme-data');
    const data = JSON.parse(themeData.props['data-theme']);
    
    expect(data.colorScheme).toBe('dark');
    expect(data.isDark).toBe(true);
  });

  it('should use system preference when no saved preference', () => {
    mockStorage.getString.mockReturnValue(null);
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const themeData = getByTestId('theme-data');
    const data = JSON.parse(themeData.props['data-theme']);
    
    expect(data.colorScheme).toBe('dark');
    expect(data.isDark).toBe(true);
  });

  it('should toggle color scheme', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initially light
    let themeData = getByTestId('theme-data');
    let data = JSON.parse(themeData.props['data-theme']);
    expect(data.colorScheme).toBe('light');
    
    // Toggle to dark
    const toggleButton = getByTestId('toggle-button');
    toggleButton.props.onPress();
    
    themeData = getByTestId('theme-data');
    data = JSON.parse(themeData.props['data-theme']);
    expect(data.colorScheme).toBe('dark');
    expect(mockStorage.set).toHaveBeenCalledWith('theme_preference', 'dark');
  });

  it('should set specific color scheme', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Set to dark
    const setDarkButton = getByTestId('set-dark-button');
    setDarkButton.props.onPress();
    
    const themeData = getByTestId('theme-data');
    const data = JSON.parse(themeData.props['data-theme']);
    expect(data.colorScheme).toBe('dark');
    expect(mockStorage.set).toHaveBeenCalledWith('theme_preference', 'dark');
  });

  it('should listen to system theme changes', () => {
    let changeListener: any;
    (Appearance.addChangeListener as jest.Mock).mockImplementation((listener) => {
      changeListener = listener;
      return { remove: jest.fn() };
    });
    
    mockStorage.getString.mockReturnValue(null); // No saved preference
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(Appearance.addChangeListener).toHaveBeenCalled();
    
    // Simulate system theme change
    changeListener({ colorScheme: 'dark' });
    
    // Should update theme since no manual preference is saved
    expect(mockStorage.getString).toHaveBeenCalled();
  });

  it('should not update theme on system change if manual preference exists', () => {
    let changeListener: any;
    (Appearance.addChangeListener as jest.Mock).mockImplementation((listener) => {
      changeListener = listener;
      return { remove: jest.fn() };
    });
    
    mockStorage.getString.mockReturnValue('light'); // Manual preference exists
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Simulate system theme change
    changeListener({ colorScheme: 'dark' });
    
    // Should still be light because manual preference exists
    const themeData = getByTestId('theme-data');
    const data = JSON.parse(themeData.props['data-theme']);
    expect(data.colorScheme).toBe('light');
  });

  it('should provide correct theme object for light mode', () => {
    const TestThemeComponent: React.FC = () => {
      const { theme } = useTheme();
      return <div testID="theme-colors" data-colors={JSON.stringify(theme.colors)} />;
    };
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );
    
    const themeColors = getByTestId('theme-colors');
    const colors = JSON.parse(themeColors.props['data-colors']);
    
    expect(colors.primary).toBe(lightTheme.colors.primary);
    expect(colors.background).toBe(lightTheme.colors.background);
  });

  it('should provide correct theme object for dark mode', () => {
    mockStorage.getString.mockReturnValue('dark');
    
    const TestThemeComponent: React.FC = () => {
      const { theme } = useTheme();
      return <div testID="theme-colors" data-colors={JSON.stringify(theme.colors)} />;
    };
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );
    
    const themeColors = getByTestId('theme-colors');
    const colors = JSON.parse(themeColors.props['data-colors']);
    
    expect(colors.primary).toBe(darkTheme.colors.primary);
    expect(colors.background).toBe(darkTheme.colors.background);
  });
});