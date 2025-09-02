import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import { MMKV } from 'react-native-mmkv';

// Import translations
import en from './locales/en.json';
import sw from './locales/sw.json';
import lg from './locales/lg.json';

// Storage for persisting language preference
const storage = new MMKV({ id: 'i18n-storage' });

// Get device locale safely
const getDeviceLocale = () => {
    const locales = getLocales();
    return locales && locales.length > 0 ? locales[0] : null;
};

const fallbackLanguage = 'en';

// Get stored language preference or use device locale
const getStoredLanguage = (): string => {
    const stored = storage.getString('language');
    if (stored) return stored;

    // Check if device locale is supported
    const supportedLanguages = ['en', 'sw', 'lg'];
    const deviceLocale = getDeviceLocale();

    if (deviceLocale) {
        const deviceLang = deviceLocale.languageCode;
        return supportedLanguages.includes(deviceLang) ? deviceLang : fallbackLanguage;
    }

    return fallbackLanguage;
};

// Initialize i18n
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            sw: { translation: sw },
            lg: { translation: lg },
        },
        lng: getStoredLanguage(),
        fallbackLng: fallbackLanguage,
        debug: __DEV__,

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        react: {
            useSuspense: false, // Disable suspense for React Native
        },

        // Namespace configuration
        defaultNS: 'translation',
        ns: ['translation'],

        // Detection options
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

// Save language preference when changed
i18n.on('languageChanged', (lng: string) => {
    storage.set('language', lng);
});

export default i18n;

// Export utility functions
export const changeLanguage = async (language: string): Promise<void> => {
    await i18n.changeLanguage(language);
};

export const getCurrentLanguage = (): string => {
    return i18n.language;
};

export const getSupportedLanguages = () => [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'lg', name: 'Luganda', nativeName: 'Oluganda' },
];

export const isRTL = (): boolean => {
    // Add RTL language codes here when supported
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(i18n.language);
};