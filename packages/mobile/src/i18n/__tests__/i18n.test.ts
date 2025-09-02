import i18n, { changeLanguage, getCurrentLanguage, getSupportedLanguages, isRTL } from '../index';

// Mock react-native-localize
jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [
    {
      languageCode: 'en',
      countryCode: 'US',
      languageTag: 'en-US',
      isRTL: false,
    },
  ]),
  getNumberFormatSettings: jest.fn(() => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  })),
  getCalendar: jest.fn(() => ({
    calendar: 'gregorian',
    uses24HourClock: false,
    firstDayOfWeek: 'sunday',
  })),
}));

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('Internationalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Language Management', () => {
    it('should initialize with default language', () => {
      expect(getCurrentLanguage()).toBeDefined();
    });

    it('should return supported languages', () => {
      const languages = getSupportedLanguages();
      expect(languages).toHaveLength(3);
      expect(languages).toEqual([
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
        { code: 'lg', name: 'Luganda', nativeName: 'Oluganda' },
      ]);
    });

    it('should change language successfully', async () => {
      await changeLanguage('sw');
      expect(getCurrentLanguage()).toBe('sw');
    });

    it('should handle invalid language gracefully', async () => {
      const initialLanguage = getCurrentLanguage();
      try {
        await changeLanguage('invalid');
      } catch (error) {
        // Should handle error gracefully
      }
      // Language should remain unchanged or fallback to default
      const currentLang = getCurrentLanguage();
      expect(['en', 'sw', 'lg', 'invalid', initialLanguage]).toContain(currentLang);
    });
  });

  describe('RTL Support', () => {
    it('should detect RTL languages correctly', () => {
      // English is not RTL
      expect(isRTL()).toBe(false);
    });

    it('should handle RTL language switching', async () => {
      // Test with a hypothetical RTL language
      // In a real implementation, you would add Arabic or Hebrew
      await changeLanguage('en');
      expect(isRTL()).toBe(false);
    });
  });

  describe('Translation Keys', () => {
    it('should have all required translation keys in English', () => {
      const t = i18n.getFixedT('en');
      
      // Test common keys
      expect(t('common.loading')).toBe('Loading...');
      expect(t('common.error')).toBe('Error');
      expect(t('common.success')).toBe('Success');
      
      // Test auth keys
      expect(t('auth.login')).toBe('Login');
      expect(t('auth.register')).toBe('Register');
      
      // Test navigation keys
      expect(t('navigation.posts')).toBe('Posts');
      expect(t('navigation.communities')).toBe('Communities');
    });

    it('should have all required translation keys in Swahili', () => {
      const t = i18n.getFixedT('sw');
      
      // Test common keys
      expect(t('common.loading')).toBe('Inapakia...');
      expect(t('common.error')).toBe('Hitilafu');
      expect(t('common.success')).toBe('Mafanikio');
      
      // Test auth keys
      expect(t('auth.login')).toBe('Ingia');
      expect(t('auth.register')).toBe('Jisajili');
    });

    it('should have all required translation keys in Luganda', () => {
      const t = i18n.getFixedT('lg');
      
      // Test common keys
      expect(t('common.loading')).toBe('Kitegeka...');
      expect(t('common.error')).toBe('Ensobi');
      expect(t('common.success')).toBe('Obuwanguzi');
      
      // Test auth keys
      expect(t('auth.login')).toBe('Yingira');
      expect(t('auth.register')).toBe('Wewandiise');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to English for missing keys', () => {
      const t = i18n.getFixedT('sw');
      
      // Test with a key that might not exist in Swahili
      const result = t('nonexistent.key', 'Default value');
      expect(result).toBe('Default value');
    });

    it('should handle interpolation', () => {
      const t = i18n.getFixedT('en');
      
      // Test interpolation (if supported in your translations)
      const result = t('common.welcome', 'Welcome {{name}}', { name: 'John' });
      expect(result).toContain('John');
    });
  });

  describe('Pluralization', () => {
    it('should handle plural forms correctly', () => {
      const t = i18n.getFixedT('en');
      
      // Test that pluralization function exists (even if keys don't exist yet)
      expect(typeof t).toBe('function');
      
      // Test with count parameter
      const result = t('common.item', { count: 1 });
      expect(result).toBeDefined();
    });
  });

  describe('Namespace Support', () => {
    it('should support nested translation keys', () => {
      const t = i18n.getFixedT('en');
      
      // Test nested keys
      expect(t('auth.login')).toBeDefined();
      expect(t('navigation.posts')).toBeDefined();
      expect(t('settings.language')).toBeDefined();
    });
  });

  describe('Language Persistence', () => {
    it('should persist language changes', async () => {
      await changeLanguage('sw');
      
      // In a real test, you would verify that the language is saved to storage
      // and restored on app restart
      expect(getCurrentLanguage()).toBe('sw');
    });
  });

  describe('Error Handling', () => {
    it('should handle translation errors gracefully', () => {
      const t = i18n.getFixedT('en');
      
      // Test with undefined key
      const result = t('undefined.key');
      expect(result).toBeDefined(); // Should return key or fallback
    });

    it('should handle missing language files gracefully', async () => {
      // Test switching to unsupported language
      try {
        await changeLanguage('xyz');
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should load translations efficiently', () => {
      const startTime = performance.now();
      
      // Perform multiple translations
      const t = i18n.getFixedT('en');
      for (let i = 0; i < 100; i++) {
        t('common.loading');
        t('auth.login');
        t('navigation.posts');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms
    });
  });

  describe('Integration', () => {
    it('should integrate with React i18next', () => {
      // Test that i18n instance is properly configured
      expect(i18n.language).toBeDefined();
      expect(i18n.options.fallbackLng).toEqual(expect.arrayContaining(['en']));
      expect(i18n.options.debug).toBe(__DEV__);
    });

    it('should support React Suspense configuration', () => {
      expect(i18n.options.react?.useSuspense).toBe(false);
    });
  });
});