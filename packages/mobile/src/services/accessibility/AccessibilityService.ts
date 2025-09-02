import { AccessibilityInfo, Dimensions, Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Storage for accessibility preferences
const storage = new MMKV({ id: 'accessibility-storage' });

export interface AccessibilitySettings {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  fontSize: FontSize;
  isVoiceOverEnabled: boolean;
  isTalkBackEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  prefersCrossFadeTransitions: boolean;
  isInvertColorsEnabled: boolean;
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extraLarge',
}

export interface AccessibilityAnnouncement {
  message: string;
  priority?: 'low' | 'medium' | 'high';
  delay?: number;
}

class AccessibilityService {
  private static instance: AccessibilityService;
  private settings: AccessibilitySettings;
  private listeners: Map<string, (settings: AccessibilitySettings) => void> = new Map();

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeAccessibilitySettings();
  }

  public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  private getDefaultSettings(): AccessibilitySettings {
    return {
      isScreenReaderEnabled: false,
      isReduceMotionEnabled: false,
      isHighContrastEnabled: false,
      fontSize: FontSize.MEDIUM,
      isVoiceOverEnabled: false,
      isTalkBackEnabled: false,
      isBoldTextEnabled: false,
      isGrayscaleEnabled: false,
      prefersCrossFadeTransitions: false,
      isInvertColorsEnabled: false,
    };
  }

  private async initializeAccessibilitySettings(): Promise<void> {
    try {
      // Load saved settings
      const savedSettings = storage.getString('accessibility_settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }

      // Check system accessibility settings
      await this.updateSystemAccessibilitySettings();

      // Listen for accessibility changes
      this.setupAccessibilityListeners();
    } catch (error) {
      console.error('Failed to initialize accessibility settings:', error);
    }
  }

  private async updateSystemAccessibilitySettings(): Promise<void> {
    try {
      const [
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isBoldTextEnabled,
        isGrayscaleEnabled,
        isInvertColorsEnabled,
        prefersCrossFadeTransitions,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isBoldTextEnabled(),
        AccessibilityInfo.isGrayscaleEnabled(),
        AccessibilityInfo.isInvertColorsEnabled(),
        AccessibilityInfo.prefersCrossFadeTransitions(),
      ]);

      this.settings = {
        ...this.settings,
        isScreenReaderEnabled: isScreenReaderEnabled ?? false,
        isReduceMotionEnabled: isReduceMotionEnabled ?? this.settings.isReduceMotionEnabled,
        isBoldTextEnabled: isBoldTextEnabled ?? this.settings.isBoldTextEnabled,
        isGrayscaleEnabled: isGrayscaleEnabled ?? this.settings.isGrayscaleEnabled,
        isInvertColorsEnabled: isInvertColorsEnabled ?? this.settings.isInvertColorsEnabled,
        prefersCrossFadeTransitions: prefersCrossFadeTransitions ?? this.settings.prefersCrossFadeTransitions,
        isVoiceOverEnabled: Platform.OS === 'ios' ? (isScreenReaderEnabled ?? false) : false,
        isTalkBackEnabled: Platform.OS === 'android' ? (isScreenReaderEnabled ?? false) : false,
      };

      this.saveSettings();
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update system accessibility settings:', error);
    }
  }

  private setupAccessibilityListeners(): void {
    // Listen for screen reader changes
    AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled: boolean) => {
      this.settings.isScreenReaderEnabled = isEnabled;
      this.settings.isVoiceOverEnabled = Platform.OS === 'ios' ? isEnabled : false;
      this.settings.isTalkBackEnabled = Platform.OS === 'android' ? isEnabled : false;
      this.saveSettings();
      this.notifyListeners();
    });

    // Listen for reduce motion changes
    AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled: boolean) => {
      this.settings.isReduceMotionEnabled = isEnabled;
      this.saveSettings();
      this.notifyListeners();
    });

    // Listen for bold text changes
    AccessibilityInfo.addEventListener('boldTextChanged', (isEnabled: boolean) => {
      this.settings.isBoldTextEnabled = isEnabled;
      this.saveSettings();
      this.notifyListeners();
    });

    // Listen for grayscale changes
    AccessibilityInfo.addEventListener('grayscaleChanged', (isEnabled: boolean) => {
      this.settings.isGrayscaleEnabled = isEnabled;
      this.saveSettings();
      this.notifyListeners();
    });

    // Listen for invert colors changes
    AccessibilityInfo.addEventListener('invertColorsChanged', (isEnabled: boolean) => {
      this.settings.isInvertColorsEnabled = isEnabled;
      this.saveSettings();
      this.notifyListeners();
    });
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ): void {
    this.settings[key] = value;
    this.saveSettings();
    this.notifyListeners();
  }

  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notifyListeners();
  }

  private saveSettings(): void {
    try {
      storage.set('accessibility_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  public subscribe(id: string, callback: (settings: AccessibilitySettings) => void): void {
    this.listeners.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.settings);
      } catch (error) {
        console.error('Error in accessibility listener:', error);
      }
    });
  }

  // Accessibility announcement methods
  public announceForAccessibility(announcement: AccessibilityAnnouncement): void {
    const { message, delay = 0 } = announcement;
    
    if (delay > 0) {
      setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(message);
      }, delay);
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  public announceForAccessibilityWithOptions(
    message: string,
    options: { queue?: boolean } = {}
  ): void {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, options);
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Focus management
  public setAccessibilityFocus(reactTag: number): void {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }

  // Screen reader detection
  public isScreenReaderEnabled(): boolean {
    return this.settings.isScreenReaderEnabled;
  }

  public isReduceMotionEnabled(): boolean {
    return this.settings.isReduceMotionEnabled;
  }

  public isHighContrastEnabled(): boolean {
    return this.settings.isHighContrastEnabled;
  }

  // Font size helpers
  public getFontSizeMultiplier(): number {
    switch (this.settings.fontSize) {
      case FontSize.SMALL:
        return 0.85;
      case FontSize.MEDIUM:
        return 1.0;
      case FontSize.LARGE:
        return 1.15;
      case FontSize.EXTRA_LARGE:
        return 1.3;
      default:
        return 1.0;
    }
  }

  public getScaledFontSize(baseSize: number): number {
    return Math.round(baseSize * this.getFontSizeMultiplier());
  }

  // Animation duration helpers
  public getAnimationDuration(baseDuration: number): number {
    return this.settings.isReduceMotionEnabled ? 0 : baseDuration;
  }

  // Color contrast helpers
  public getContrastRatio(): number {
    return this.settings.isHighContrastEnabled ? 1.5 : 1.0;
  }

  // Semantic helpers for screen readers
  public getAccessibilityRole(element: string): string {
    const roleMap: Record<string, string> = {
      button: 'button',
      link: 'link',
      image: 'image',
      text: 'text',
      header: 'header',
      search: 'search',
      menu: 'menu',
      menuitem: 'menuitem',
      tab: 'tab',
      tablist: 'tablist',
      list: 'list',
      listitem: 'none', // Use 'none' for list items in React Native
      checkbox: 'checkbox',
      radio: 'radio',
      switch: 'switch',
      slider: 'adjustable',
      progressbar: 'progressbar',
      alert: 'alert',
      dialog: 'none', // Handled by modal presentation
      toolbar: 'toolbar',
    };

    return roleMap[element] || 'none';
  }

  public getAccessibilityState(
    element: string,
    props: {
      selected?: boolean;
      checked?: boolean;
      expanded?: boolean;
      disabled?: boolean;
      busy?: boolean;
    } = {}
  ): object {
    const state: any = {};

    if (props.selected !== undefined) {
      state.selected = props.selected;
    }

    if (props.checked !== undefined) {
      state.checked = props.checked;
    }

    if (props.expanded !== undefined) {
      state.expanded = props.expanded;
    }

    if (props.disabled !== undefined) {
      state.disabled = props.disabled;
    }

    if (props.busy !== undefined) {
      state.busy = props.busy;
    }

    return state;
  }

  // Haptic feedback for accessibility
  public provideAccessibilityFeedback(type: 'selection' | 'impact' | 'notification' = 'selection'): void {
    if (Platform.OS === 'ios') {
      // iOS haptic feedback will be handled by the haptics service
      // This is a placeholder for accessibility-specific feedback
    }
  }

  // Screen size and orientation helpers
  public getAccessibleDimensions(): { width: number; height: number; isLandscape: boolean } {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isLandscape: width > height,
    };
  }

  // Minimum touch target size (44pt on iOS, 48dp on Android)
  public getMinimumTouchTargetSize(): number {
    return Platform.OS === 'ios' ? 44 : 48;
  }

  // Check if touch target meets accessibility guidelines
  public isTouchTargetAccessible(width: number, height: number): boolean {
    const minSize = this.getMinimumTouchTargetSize();
    return width >= minSize && height >= minSize;
  }

  // Generate accessibility hint based on element type and state
  public generateAccessibilityHint(
    element: string,
    action?: string,
    state?: string
  ): string {
    const hints: Record<string, string> = {
      button: action ? `${action}` : 'Double tap to activate',
      link: 'Double tap to open',
      image: 'Image',
      video: 'Double tap to play or pause',
      audio: 'Double tap to play or pause',
      menu: 'Double tap to open menu',
      tab: 'Double tap to switch to this tab',
      checkbox: 'Double tap to toggle',
      radio: 'Double tap to select',
      switch: 'Double tap to toggle',
      slider: 'Swipe up or down to adjust value',
      search: 'Double tap to focus and enter search terms',
    };

    let hint = hints[element] || '';
    
    if (state) {
      hint += state ? `, ${state}` : '';
    }

    return hint;
  }

  // Reset to default settings
  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    this.notifyListeners();
  }

  // Export settings for backup
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings from backup
  public importSettings(settingsJson: string): boolean {
    try {
      const importedSettings = JSON.parse(settingsJson);
      this.updateSettings(importedSettings);
      return true;
    } catch (error) {
      console.error('Failed to import accessibility settings:', error);
      return false;
    }
  }
}

export default AccessibilityService;