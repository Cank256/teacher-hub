import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLocales, getNumberFormatSettings, getCalendar, uses24HourClock, getCountry } from 'react-native-localize';
import i18n, { changeLanguage, getCurrentLanguage, getSupportedLanguages, isRTL } from '@/i18n';

interface LocaleInfo {
    languageCode: string;
    countryCode: string;
    languageTag: string;
    isRTL: boolean;
}

interface NumberFormatSettings {
    decimalSeparator: string;
    groupingSeparator: string;
}

interface DateFormatSettings {
    calendar: string;
    uses24HourClock: boolean;
    firstDayOfWeek: string;
}

interface InternationalizationContextType {
    // Language management
    currentLanguage: string;
    supportedLanguages: Array<{ code: string; name: string; nativeName: string }>;
    changeLanguage: (language: string) => Promise<void>;

    // Locale information
    deviceLocale: LocaleInfo;
    isRTL: boolean;

    // Formatting
    formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
    formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
    formatRelativeTime: (date: Date) => string;

    // Pluralization
    getPlural: (count: number, key: string) => string;

    // Text direction
    getTextAlign: () => 'left' | 'right' | 'center';
    getFlexDirection: () => 'row' | 'row-reverse';

    // Translation function
    t: (key: string, options?: any) => string;
}

const InternationalizationContext = createContext<InternationalizationContextType | undefined>(undefined);

interface InternationalizationProviderProps {
    children: ReactNode;
}

export const InternationalizationProvider: React.FC<InternationalizationProviderProps> = ({ children }) => {
    const { t } = useTranslation();
    const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
    const [deviceLocale, setDeviceLocale] = useState<LocaleInfo>(() => {
        const locales = getLocales();
        const primaryLocale = locales && locales.length > 0 ? locales[0] : null;

        // Fallback to default locale if no device locale is available
        if (!primaryLocale) {
            return {
                languageCode: 'en',
                countryCode: 'UG',
                languageTag: 'en-US',
                isRTL: false,
            };
        }

        return {
            languageCode: primaryLocale.languageCode,
            countryCode: primaryLocale.countryCode,
            languageTag: primaryLocale.languageTag,
            isRTL: primaryLocale.isRTL,
        };
    });

    const [numberFormatSettings, setNumberFormatSettings] = useState<NumberFormatSettings>(() => {
        const settings = getNumberFormatSettings();
        return {
            decimalSeparator: settings.decimalSeparator,
            groupingSeparator: settings.groupingSeparator,
        };
    });

    const [dateFormatSettings, setDateFormatSettings] = useState<DateFormatSettings>(() => {
        const calendar = getCalendar();
        const is24Hour = uses24HourClock();

        return {
            calendar: calendar || 'gregorian',
            uses24HourClock: is24Hour,
            firstDayOfWeek: 'sunday', // Default to Sunday, as react-native-localize doesn't provide this
        };
    });

    useEffect(() => {
        // Update RTL layout when language changes
        const rtl = isRTL();
        if (I18nManager.isRTL !== rtl) {
            I18nManager.allowRTL(rtl);
            I18nManager.forceRTL(rtl);
            // Note: In a real app, you might want to restart the app here
            // as RTL changes require a restart to take full effect
        }
    }, [currentLanguage]);

    const handleChangeLanguage = async (language: string): Promise<void> => {
        try {
            await changeLanguage(language);
            setCurrentLanguage(language);
        } catch (error) {
            console.error('Failed to change language:', error);
            throw error;
        }
    };

    // Number formatting
    const formatNumber = (number: number, options: Intl.NumberFormatOptions = {}): string => {
        try {
            return new Intl.NumberFormat(deviceLocale.languageTag, options).format(number);
        } catch (error) {
            // Fallback to basic formatting
            return number.toLocaleString();
        }
    };

    const formatCurrency = (amount: number, currency = 'UGX'): string => {
        try {
            return new Intl.NumberFormat(deviceLocale.languageTag, {
                style: 'currency',
                currency,
            }).format(amount);
        } catch (error) {
            // Fallback formatting
            return `${currency} ${amount.toLocaleString()}`;
        }
    };

    // Date formatting
    const formatDate = (date: Date, options: Intl.DateTimeFormatOptions = {}): string => {
        try {
            const defaultOptions: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...options,
            };
            return new Intl.DateTimeFormat(deviceLocale.languageTag, defaultOptions).format(date);
        } catch (error) {
            // Fallback formatting
            return date.toLocaleDateString();
        }
    };

    const formatTime = (date: Date, options: Intl.DateTimeFormatOptions = {}): string => {
        try {
            const defaultOptions: Intl.DateTimeFormatOptions = {
                hour: 'numeric',
                minute: 'numeric',
                hour12: !dateFormatSettings.uses24HourClock,
                ...options,
            };
            return new Intl.DateTimeFormat(deviceLocale.languageTag, defaultOptions).format(date);
        } catch (error) {
            // Fallback formatting
            return date.toLocaleTimeString();
        }
    };

    const formatRelativeTime = (date: Date): string => {
        try {
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) {
                return t('common.justNow', 'Just now');
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return t('common.minutesAgo', '{{count}} minutes ago', { count: minutes });
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return t('common.hoursAgo', '{{count}} hours ago', { count: hours });
            } else if (diffInSeconds < 604800) {
                const days = Math.floor(diffInSeconds / 86400);
                return t('common.daysAgo', '{{count}} days ago', { count: days });
            } else {
                return formatDate(date, { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            return formatDate(date);
        }
    };

    // Pluralization
    const getPlural = (count: number, key: string): string => {
        return t(key, { count });
    };

    // Text direction helpers
    const getTextAlign = (): 'left' | 'right' | 'center' => {
        return isRTL() ? 'right' : 'left';
    };

    const getFlexDirection = (): 'row' | 'row-reverse' => {
        return isRTL() ? 'row-reverse' : 'row';
    };

    const contextValue: InternationalizationContextType = {
        currentLanguage,
        supportedLanguages: getSupportedLanguages(),
        changeLanguage: handleChangeLanguage,
        deviceLocale,
        isRTL: isRTL(),
        formatNumber,
        formatCurrency,
        formatDate,
        formatTime,
        formatRelativeTime,
        getPlural,
        getTextAlign,
        getFlexDirection,
        t,
    };

    return (
        <InternationalizationContext.Provider value={contextValue}>
            {children}
        </InternationalizationContext.Provider>
    );
};

export const useInternationalization = (): InternationalizationContextType => {
    const context = useContext(InternationalizationContext);
    if (context === undefined) {
        throw new Error('useInternationalization must be used within an InternationalizationProvider');
    }
    return context;
};

// Convenience hooks
export const useTranslationWithRTL = () => {
    const { t, isRTL, getTextAlign, getFlexDirection } = useInternationalization();

    return {
        t,
        isRTL,
        getTextAlign,
        getFlexDirection,
        textAlign: getTextAlign(),
        flexDirection: getFlexDirection(),
    };
};

export const useLocalizedFormatting = () => {
    const { formatNumber, formatCurrency, formatDate, formatTime, formatRelativeTime } = useInternationalization();

    return {
        formatNumber,
        formatCurrency,
        formatDate,
        formatTime,
        formatRelativeTime,
    };
};

export default InternationalizationContext;