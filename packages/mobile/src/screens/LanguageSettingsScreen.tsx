import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useInternationalization } from '@/contexts/InternationalizationContext';
import { AccessibleText, Heading2, BodyText } from '@/components/ui/AccessibleText';
import { AccessibleButton } from '@/components/ui/AccessibleButton';

interface LanguageOptionProps {
  code: string;
  name: string;
  nativeName: string;
  isSelected: boolean;
  onSelect: () => void;
}

const LanguageOption: React.FC<LanguageOptionProps> = ({
  code,
  name,
  nativeName,
  isSelected,
  onSelect,
}) => {
  const { getScaledFontSize, isHighContrastEnabled } = useAccessibility();
  const { t } = useInternationalization();

  const colors = {
    primary: isHighContrastEnabled ? '#000000' : '#2563EB',
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    textSecondary: isHighContrastEnabled ? '#333333' : '#6B7280',
    border: isHighContrastEnabled ? '#000000' : '#E5E7EB',
    background: isSelected 
      ? (isHighContrastEnabled ? '#F0F0F0' : '#EBF4FF')
      : 'transparent',
  };

  return (
    <TouchableOpacity
      style={[
        styles.languageOption,
        {
          backgroundColor: colors.background,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      accessible={true}
      accessibilityRole="radio"
      accessibilityLabel={`${name} (${nativeName})${isSelected ? ', selected' : ''}`}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={t('settings.selectLanguageHint', 'Double tap to select this language')}
    >
      <View style={styles.languageContent}>
        <View style={styles.languageInfo}>
          <AccessibleText
            variant="body1"
            weight="medium"
            style={{ fontSize: getScaledFontSize(16), color: colors.text }}
          >
            {name}
          </AccessibleText>
          <AccessibleText
            variant="body2"
            style={{ fontSize: getScaledFontSize(14), color: colors.textSecondary, marginTop: 2 }}
          >
            {nativeName}
          </AccessibleText>
        </View>
        
        {isSelected && (
          <View
            style={[styles.checkmark, { backgroundColor: colors.primary }]}
            accessible={false}
          >
            <AccessibleText
              variant="body2"
              style={{ color: 'white', fontSize: getScaledFontSize(12) }}
            >
              ✓
            </AccessibleText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface RegionalFormatProps {
  title: string;
  description: string;
  example: string;
}

const RegionalFormat: React.FC<RegionalFormatProps> = ({
  title,
  description,
  example,
}) => {
  const { getScaledFontSize, isHighContrastEnabled } = useAccessibility();

  const colors = {
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    textSecondary: isHighContrastEnabled ? '#333333' : '#6B7280',
    border: isHighContrastEnabled ? '#000000' : '#E5E7EB',
  };

  return (
    <View style={[styles.formatItem, { borderBottomColor: colors.border }]}>
      <View style={styles.formatContent}>
        <AccessibleText
          variant="body1"
          weight="medium"
          style={{ fontSize: getScaledFontSize(16), color: colors.text }}
        >
          {title}
        </AccessibleText>
        <AccessibleText
          variant="body2"
          style={{ fontSize: getScaledFontSize(14), color: colors.textSecondary, marginTop: 2 }}
        >
          {description}
        </AccessibleText>
      </View>
      <AccessibleText
        variant="body2"
        weight="medium"
        style={{ fontSize: getScaledFontSize(14), color: colors.text }}
      >
        {example}
      </AccessibleText>
    </View>
  );
};

export const LanguageSettingsScreen: React.FC = () => {
  const { getScaledFontSize, isHighContrastEnabled, announceForAccessibility } = useAccessibility();
  const {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    formatNumber,
    formatCurrency,
    formatDate,
    formatTime,
    isRTL,
    t,
  } = useInternationalization();

  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const colors = {
    background: isHighContrastEnabled ? '#FFFFFF' : '#F9FAFB',
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    warning: isHighContrastEnabled ? '#000000' : '#F59E0B',
  };

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;

    setIsChangingLanguage(true);

    try {
      await changeLanguage(languageCode);
      
      // Find the selected language for announcement
      const selectedLanguage = supportedLanguages.find(lang => lang.code === languageCode);
      if (selectedLanguage) {
        announceForAccessibility(
          t('settings.languageChanged', 'Language changed to {{language}}', {
            language: selectedLanguage.name,
          })
        );
      }

      // Show success message
      Alert.alert(
        t('settings.languageChangeSuccess', 'Language Changed'),
        t('settings.languageChangeMessage', 'The app language has been changed successfully.'),
        [{ text: t('common.ok', 'OK') }]
      );
    } catch (error) {
      console.error('Failed to change language:', error);
      
      Alert.alert(
        t('common.error', 'Error'),
        t('settings.languageChangeError', 'Failed to change language. Please try again.'),
        [{ text: t('common.ok', 'OK') }]
      );
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Generate example formats
  const now = new Date();
  const sampleNumber = 1234.56;
  const sampleAmount = 50000;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Heading2 color="text" style={{ color: colors.text }}>
            {t('settings.language', 'Language')}
          </Heading2>
          <BodyText color="textSecondary" style={{ marginTop: 8 }}>
            {t('settings.languageDescription', 'Choose your preferred language and regional formats')}
          </BodyText>
        </View>

        {/* RTL Notice */}
        {isRTL && (
          <View style={[styles.rtlNotice, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
            <AccessibleText
              variant="body2"
              style={{ fontSize: getScaledFontSize(14), color: colors.warning }}
              accessibilityRole="alert"
            >
              {t('settings.rtlNotice', 'This language uses right-to-left text direction. Some layouts may appear different.')}
            </AccessibleText>
          </View>
        )}

        {/* Language Selection */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.selectLanguage', 'Select Language')}
          </AccessibleText>

          <View
            style={styles.languageList}
            accessible={true}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.availableLanguages', 'Available languages')}
          >
            {supportedLanguages.map((language) => (
              <LanguageOption
                key={language.code}
                code={language.code}
                name={language.name}
                nativeName={language.nativeName}
                isSelected={language.code === currentLanguage}
                onSelect={() => handleLanguageChange(language.code)}
              />
            ))}
          </View>

          {isChangingLanguage && (
            <View style={styles.loadingContainer}>
              <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
                {t('settings.changingLanguage', 'Changing language...')}
              </BodyText>
            </View>
          )}
        </View>

        {/* Regional Formats */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.regionalFormats', 'Regional Formats')}
          </AccessibleText>

          <BodyText color="textSecondary" style={{ marginBottom: 16 }}>
            {t('settings.regionalFormatsDescription', 'These formats are automatically set based on your device settings')}
          </BodyText>

          <View style={styles.formatsList}>
            <RegionalFormat
              title={t('settings.numberFormat', 'Number Format')}
              description={t('settings.numberFormatDescription', 'How numbers are displayed')}
              example={formatNumber(sampleNumber)}
            />
            
            <RegionalFormat
              title={t('settings.currencyFormat', 'Currency Format')}
              description={t('settings.currencyFormatDescription', 'How currency amounts are displayed')}
              example={formatCurrency(sampleAmount)}
            />
            
            <RegionalFormat
              title={t('settings.dateFormat', 'Date Format')}
              description={t('settings.dateFormatDescription', 'How dates are displayed')}
              example={formatDate(now)}
            />
            
            <RegionalFormat
              title={t('settings.timeFormat', 'Time Format')}
              description={t('settings.timeFormatDescription', 'How times are displayed')}
              example={formatTime(now)}
            />
          </View>
        </View>

        {/* Language Support Info */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.languageSupport', 'Language Support')}
          </AccessibleText>

          <BodyText color="textSecondary" style={{ marginBottom: 16 }}>
            {t('settings.languageSupportDescription', 'Information about language support in the app')}
          </BodyText>

          <View style={styles.supportInfo}>
            <View style={styles.supportItem}>
              <BodyText weight="medium">
                {t('settings.currentLanguage', 'Current Language')}
              </BodyText>
              <BodyText color="textSecondary">
                {supportedLanguages.find(lang => lang.code === currentLanguage)?.name || currentLanguage}
              </BodyText>
            </View>

            <View style={styles.supportItem}>
              <BodyText weight="medium">
                {t('settings.textDirection', 'Text Direction')}
              </BodyText>
              <BodyText color="textSecondary">
                {isRTL ? t('settings.rightToLeft', 'Right to Left') : t('settings.leftToRight', 'Left to Right')}
              </BodyText>
            </View>

            <View style={styles.supportItem}>
              <BodyText weight="medium">
                {t('settings.supportedLanguages', 'Supported Languages')}
              </BodyText>
              <BodyText color="textSecondary">
                {supportedLanguages.length}
              </BodyText>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <BodyText color="textSecondary" style={{ textAlign: 'center', lineHeight: 20 }}>
            {t('settings.languageHelpText', 'If you need help with language settings or want to request support for additional languages, please contact our support team.')}
          </BodyText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  rtlNotice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  languageList: {
    gap: 12,
  },
  languageOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageInfo: {
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    marginTop: 16,
    padding: 16,
  },
  formatsList: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 16,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  formatContent: {
    flex: 1,
    marginRight: 16,
  },
  supportInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 16,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default LanguageSettingsScreen;