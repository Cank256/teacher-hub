// Basic theme tests to verify theme structure
describe('Theme System', () => {
  it('should export theme types', () => {
    const types = require('../types');
    expect(types).toBeDefined();
  });

  it('should export light and dark colors', () => {
    const { lightColors, darkColors } = require('../colors');
    
    expect(lightColors).toBeDefined();
    expect(darkColors).toBeDefined();
    
    // Check required color properties
    expect(lightColors.primary).toBeDefined();
    expect(lightColors.background).toBeDefined();
    expect(lightColors.text).toBeDefined();
    
    expect(darkColors.primary).toBeDefined();
    expect(darkColors.background).toBeDefined();
    expect(darkColors.text).toBeDefined();
  });

  it('should export light and dark themes', () => {
    const { lightTheme, darkTheme } = require('../theme');
    
    expect(lightTheme).toBeDefined();
    expect(darkTheme).toBeDefined();
    
    // Check theme structure
    expect(lightTheme.colors).toBeDefined();
    expect(lightTheme.typography).toBeDefined();
    expect(lightTheme.spacing).toBeDefined();
    expect(lightTheme.borderRadius).toBeDefined();
    expect(lightTheme.shadows).toBeDefined();
    expect(lightTheme.isDark).toBe(false);
    
    expect(darkTheme.colors).toBeDefined();
    expect(darkTheme.typography).toBeDefined();
    expect(darkTheme.spacing).toBeDefined();
    expect(darkTheme.borderRadius).toBeDefined();
    expect(darkTheme.shadows).toBeDefined();
    expect(darkTheme.isDark).toBe(true);
  });

  it('should export theme context utilities', () => {
    const { ThemeProvider, useTheme } = require('../ThemeContext');
    
    expect(ThemeProvider).toBeDefined();
    expect(useTheme).toBeDefined();
    expect(typeof ThemeProvider).toBe('function');
    expect(typeof useTheme).toBe('function');
  });

  it('should export all theme utilities from index', () => {
    const theme = require('../index');
    
    expect(theme.ThemeProvider).toBeDefined();
    expect(theme.useTheme).toBeDefined();
    expect(theme.lightTheme).toBeDefined();
    expect(theme.darkTheme).toBeDefined();
    expect(theme.lightColors).toBeDefined();
    expect(theme.darkColors).toBeDefined();
  });
});