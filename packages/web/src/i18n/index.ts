import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enTranslations from './locales/en.json';
import lugTranslations from './locales/lug.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  lug: {
    translation: lugTranslations,
  },
};

i18n
  // Load translation using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Backend options for loading translations
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },

    // React i18next options
    react: {
      useSuspense: false,
    },
  });

export default i18n;