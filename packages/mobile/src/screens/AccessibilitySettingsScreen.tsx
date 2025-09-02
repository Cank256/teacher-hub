import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useInternationalization } from '@/contexts/InternationalizationContext';
import { AccessibleText, Heading2, BodyText } from '@/components/ui/AccessibleText';
import { AccessibleButton } from '@/components/ui/AccessibleButton';
import { FontSize } from '@/services/accessibility/AccessibilityService';

interface SettingRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  value,
  onValueChange,
  testID,
}) => {
  const { getScaledFontSize, isHighContrastEnabled } = useAccessibility();
  const { t } = useInternationalization();

  const colors = {
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    textSecondary: isHighContrastEnabled ? '#333333' : '#6B7280',
    border: isHighContrastEnabled ? '#000000' : '#E5E7EB',
  };

  return (
    <View
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}${description ? `, ${description}` : ''}, ${value ? t('common.enabled', 'enabled') : t('common.disabled', 'disabled')}`}
      accessibilityHint={t('accessibility.toggleSetting', 'Double tap to toggle this setting')}
    >
      <View style={styles.settingContent}>
        <AccessibleText
          variant="body1"
          weight="medium"
          color="text"
          style={{ fontSize: getScaledFontSize(16), color: colors.text }}
        >
          {title}
        </AccessibleText>
        {description && (
          <AccessibleText
            variant="body2"
            color="textSecondary"
            style={{ fontSize: getScaledFontSize(14), color: colors.textSecondary, marginTop: 4 }}
          >
            {description}
          </AccessibleText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={testID}
        accessible={true}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
      />
    </View>
  );
};

interface FontSizeOptionProps {
  size: FontSize;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

const FontSizeOption: React.FC<FontSizeOptionProps> = ({
  size,
  label,
  isSelected,
  onSelect,
}) => {
  const { getScaledFontSize, isHighContrastEnabled } = useAccessibility();
  const { t } = useInternationalization();

  const colors = {
    primary: isHighContrastEnabled ? '#000000' : '#2563EB',
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    border: isHighContrastEnabled ? '#000000' : '#E5E7EB',
    background: isSelected 
      ? (isHighContrastEnabled ? '#F0F0F0' : '#EBF4FF')
      : 'transparent',
  };

  const getFontSizeMultiplier = (fontSize: FontSize) => {
    switch (fontSize) {
      case FontSize.SMALL: return 0.85;
      case FontSize.MEDIUM: return 1.0;
      case FontSize.LARGE: return 1.15;
      case FontSize.EXTRA_LARGE: return 1.3;
      default: return 1.0;
    }
  };

  const previewSize = 16 * getFontSizeMultiplier(size);

  return (
    <AccessibleButton
      title=""
      onPress={onSelect}
      style={[
        styles.fontSizeOption,
        {
          backgroundColor: colors.background,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      accessibilityLabel={`${label} font size${isSelected ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.fontSizeContent}>
        <AccessibleText
          variant="body1"
          weight="medium"
          style={{ fontSize: getScaledFontSize(14), color: colors.text }}
        >
          {label}
        </AccessibleText>
        <AccessibleText
          variant="body1"
          style={{ fontSize: previewSize, color: colors.text, marginTop: 4 }}
        >
          {t('accessibility.sampleText', 'Sample text')}
        </AccessibleText>
      </View>
    </AccessibleButton>
  );
};

export const AccessibilitySettingsScreen: React.FC = () => {
  const {
    settings,
    updateSetting,
    resetToDefaults,
    announceForAccessibility,
    isHighContrastEnabled,
    getScaledFontSize,
  } = useAccessibility();

  const { t } = useInternationalization();

  const colors = {
    background: isHighContrastEnabled ? '#FFFFFF' : '#F9FAFB',
    text: isHighContrastEnabled ? '#000000' : '#1F2937',
    danger: isHighContrastEnabled ? '#000000' : '#EF4444',
  };

  const handleToggleSetting = (key: keyof typeof settings, value: boolean) => {
    updateSetting(key, value);
    
    // Announce change to screen readers
    const settingName = t(`settings.${key}`, key);
    const status = value ? t('common.enabled', 'enabled') : t('common.disabled', 'disabled');
    announceForAccessibility(`${settingName} ${status}`);
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    updateSetting('fontSize', fontSize);
    
    // Announce change to screen readers
    const sizeLabel = t(`settings.fontSize.${fontSize}`, fontSize);
    announceForAccessibility(t('accessibility.fontSizeChanged', 'Font size changed to {{size}}', { size: sizeLabel }));
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      t('settings.resetToDefaults', 'Reset to Defaults'),
      t('settings.resetConfirmation', 'Are you sure you want to reset all accessibility settings to their default values?'),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('common.reset', 'Reset'),
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
            announceForAccessibility(t('accessibility.settingsReset', 'Accessibility settings have been reset to defaults'));
          },
        },
      ]
    );
  };

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
            {t('settings.accessibility', 'Accessibility')}
          </Heading2>
          <BodyText color="textSecondary" style={{ marginTop: 8 }}>
            {t('settings.accessibilityDescription', 'Customize the app to meet your accessibility needs')}
          </BodyText>
        </View>

        {/* Visual Settings */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.visualSettings', 'Visual Settings')}
          </AccessibleText>

          <SettingRow
            title={t('settings.highContrast', 'High Contrast')}
            description={t('settings.highContrastDescription', 'Increase color contrast for better visibility')}
            value={settings.isHighContrastEnabled}
            onValueChange={(value) => handleToggleSetting('isHighContrastEnabled', value)}
            testID="high-contrast-toggle"
          />

          <SettingRow
            title={t('settings.reduceMotion', 'Reduce Motion')}
            description={t('settings.reduceMotionDescription', 'Minimize animations and transitions')}
            value={settings.isReduceMotionEnabled}
            onValueChange={(value) => handleToggleSetting('isReduceMotionEnabled', value)}
            testID="reduce-motion-toggle"
          />
        </View>

        {/* Font Size Settings */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.fontSize', 'Font Size')}
          </AccessibleText>

          <BodyText color="textSecondary" style={{ marginBottom: 16 }}>
            {t('settings.fontSizeDescription', 'Choose the text size that works best for you')}
          </BodyText>

          <View
            style={styles.fontSizeGrid}
            accessible={true}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.fontSizeOptions', 'Font size options')}
          >
            <FontSizeOption
              size={FontSize.SMALL}
              label={t('settings.fontSize.small', 'Small')}
              isSelected={settings.fontSize === FontSize.SMALL}
              onSelect={() => handleFontSizeChange(FontSize.SMALL)}
            />
            <FontSizeOption
              size={FontSize.MEDIUM}
              label={t('settings.fontSize.medium', 'Medium')}
              isSelected={settings.fontSize === FontSize.MEDIUM}
              onSelect={() => handleFontSizeChange(FontSize.MEDIUM)}
            />
            <FontSizeOption
              size={FontSize.LARGE}
              label={t('settings.fontSize.large', 'Large')}
              isSelected={settings.fontSize === FontSize.LARGE}
              onSelect={() => handleFontSizeChange(FontSize.LARGE)}
            />
            <FontSizeOption
              size={FontSize.EXTRA_LARGE}
              label={t('settings.fontSize.extraLarge', 'Extra Large')}
              isSelected={settings.fontSize === FontSize.EXTRA_LARGE}
              onSelect={() => handleFontSizeChange(FontSize.EXTRA_LARGE)}
            />
          </View>
        </View>

        {/* System Settings Info */}
        <View style={styles.section}>
          <AccessibleText
            variant="h5"
            weight="semibold"
            color="text"
            style={{ fontSize: getScaledFontSize(18), color: colors.text, marginBottom: 16 }}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {t('settings.systemSettings', 'System Settings')}
          </AccessibleText>

          <BodyText color="textSecondary" style={{ marginBottom: 16 }}>
            {t('settings.systemSettingsDescription', 'These settings are automatically detected from your device')}
          </BodyText>

          <View style={styles.systemSettingsInfo}>
            <View style={styles.systemSettingItem}>
              <BodyText weight="medium">
                {t('settings.screenReader', 'Screen Reader')}
              </BodyText>
              <BodyText color="textSecondary">
                {settings.isScreenReaderEnabled 
                  ? t('common.enabled', 'Enabled') 
                  : t('common.disabled', 'Disabled')
                }
              </BodyText>
            </View>

            <View style={styles.systemSettingItem}>
              <BodyText weight="medium">
                {t('settings.boldText', 'Bold Text')}
              </BodyText>
              <BodyText color="textSecondary">
                {settings.isBoldTextEnabled 
                  ? t('common.enabled', 'Enabled') 
                  : t('common.disabled', 'Disabled')
                }
              </BodyText>
            </View>

            <View style={styles.systemSettingItem}>
              <BodyText weight="medium">
                {t('settings.grayscale', 'Grayscale')}
              </BodyText>
              <BodyText color="textSecondary">
                {settings.isGrayscaleEnabled 
                  ? t('common.enabled', 'Enabled') 
                  : t('common.disabled', 'Disabled')
                }
              </BodyText>
            </View>
          </View>
        </View>

        {/* Reset Button */}
        <View style={styles.section}>
          <AccessibleButton
            title={t('settings.resetToDefaults', 'Reset to Defaults')}
            onPress={handleResetToDefaults}
            variant="outline"
            style={{ borderColor: colors.danger }}
            textStyle={{ color: colors.danger }}
            accessibilityHint={t('settings.resetHint', 'This will reset all accessibility settings to their default values')}
            testID="reset-defaults-button"
          />
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
  section: {
    marginBottom: 32,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  fontSizeGrid: {
    gap: 12,
  },
  fontSizeOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  fontSizeContent: {
    alignItems: 'flex-start',
  },
  systemSettingsInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 16,
  },
  systemSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default AccessibilitySettingsScreen;