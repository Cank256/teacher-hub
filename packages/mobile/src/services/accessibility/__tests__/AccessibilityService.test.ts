import { AccessibilityInfo } from 'react-native';
import AccessibilityService, { FontSize } from '../AccessibilityService';

// Mock React Native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    isBoldTextEnabled: jest.fn(),
    isGrayscaleEnabled: jest.fn(),
    isInvertColorsEnabled: jest.fn(),
    prefersCrossFadeTransitions: jest.fn(),
    announceForAccessibility: jest.fn(),
    announceForAccessibilityWithOptions: jest.fn(),
    setAccessibilityFocus: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('AccessibilityService', () => {
  let accessibilityService: AccessibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (AccessibilityService as any).instance = undefined;
    accessibilityService = AccessibilityService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AccessibilityService.getInstance();
      const instance2 = AccessibilityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Settings Management', () => {
    it('should return default settings initially', () => {
      const settings = accessibilityService.getSettings();
      expect(settings).toEqual({
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
      });
    });

    it('should update individual settings', () => {
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      const settings = accessibilityService.getSettings();
      expect(settings.fontSize).toBe(FontSize.LARGE);
    });

    it('should update multiple settings', () => {
      const newSettings = {
        isHighContrastEnabled: true,
        fontSize: FontSize.EXTRA_LARGE,
      };
      
      accessibilityService.updateSettings(newSettings);
      const settings = accessibilityService.getSettings();
      
      expect(settings.isHighContrastEnabled).toBe(true);
      expect(settings.fontSize).toBe(FontSize.EXTRA_LARGE);
    });
  });

  describe('Font Size Scaling', () => {
    it('should return correct multiplier for small font size', () => {
      accessibilityService.updateSetting('fontSize', FontSize.SMALL);
      expect(accessibilityService.getFontSizeMultiplier()).toBe(0.85);
    });

    it('should return correct multiplier for medium font size', () => {
      accessibilityService.updateSetting('fontSize', FontSize.MEDIUM);
      expect(accessibilityService.getFontSizeMultiplier()).toBe(1.0);
    });

    it('should return correct multiplier for large font size', () => {
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      expect(accessibilityService.getFontSizeMultiplier()).toBe(1.15);
    });

    it('should return correct multiplier for extra large font size', () => {
      accessibilityService.updateSetting('fontSize', FontSize.EXTRA_LARGE);
      expect(accessibilityService.getFontSizeMultiplier()).toBe(1.3);
    });

    it('should scale font size correctly', () => {
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      const scaledSize = accessibilityService.getScaledFontSize(16);
      expect(scaledSize).toBe(Math.round(16 * 1.15));
    });
  });

  describe('Animation Duration', () => {
    it('should return 0 duration when reduce motion is enabled', () => {
      accessibilityService.updateSetting('isReduceMotionEnabled', true);
      const duration = accessibilityService.getAnimationDuration(300);
      expect(duration).toBe(0);
    });

    it('should return original duration when reduce motion is disabled', () => {
      accessibilityService.updateSetting('isReduceMotionEnabled', false);
      const duration = accessibilityService.getAnimationDuration(300);
      expect(duration).toBe(300);
    });
  });

  describe('Contrast Ratio', () => {
    it('should return 1.5 when high contrast is enabled', () => {
      accessibilityService.updateSetting('isHighContrastEnabled', true);
      const ratio = accessibilityService.getContrastRatio();
      expect(ratio).toBe(1.5);
    });

    it('should return 1.0 when high contrast is disabled', () => {
      accessibilityService.updateSetting('isHighContrastEnabled', false);
      const ratio = accessibilityService.getContrastRatio();
      expect(ratio).toBe(1.0);
    });
  });

  describe('Accessibility Announcements', () => {
    it('should announce message immediately', () => {
      const message = 'Test announcement';
      accessibilityService.announceForAccessibility({ message });
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(message);
    });

    it('should announce message with delay', (done) => {
      const message = 'Delayed announcement';
      const delay = 100;
      
      accessibilityService.announceForAccessibility({ message, delay });
      
      // Should not be called immediately
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
      
      setTimeout(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(message);
        done();
      }, delay + 10);
    });
  });

  describe('Touch Target Size', () => {
    it('should return correct minimum touch target size for iOS', () => {
      const minSize = accessibilityService.getMinimumTouchTargetSize();
      expect(minSize).toBe(44);
    });

    it('should validate touch target accessibility', () => {
      expect(accessibilityService.isTouchTargetAccessible(44, 44)).toBe(true);
      expect(accessibilityService.isTouchTargetAccessible(40, 40)).toBe(false);
      expect(accessibilityService.isTouchTargetAccessible(50, 30)).toBe(false);
    });
  });

  describe('Accessibility Roles and States', () => {
    it('should return correct accessibility role', () => {
      expect(accessibilityService.getAccessibilityRole('button')).toBe('button');
      expect(accessibilityService.getAccessibilityRole('link')).toBe('link');
      expect(accessibilityService.getAccessibilityRole('unknown')).toBe('none');
    });

    it('should generate correct accessibility state', () => {
      const state = accessibilityService.getAccessibilityState('button', {
        selected: true,
        disabled: false,
      });
      
      expect(state).toEqual({
        selected: true,
        disabled: false,
      });
    });
  });

  describe('Accessibility Hints', () => {
    it('should generate appropriate hint for button', () => {
      const hint = accessibilityService.generateAccessibilityHint('button', 'Save');
      expect(hint).toBe('Save');
    });

    it('should generate default hint for button without action', () => {
      const hint = accessibilityService.generateAccessibilityHint('button');
      expect(hint).toBe('Double tap to activate');
    });

    it('should generate hint with state', () => {
      const hint = accessibilityService.generateAccessibilityHint('checkbox', 'Toggle', 'checked');
      expect(hint).toBe('Double tap to toggle, checked');
    });
  });

  describe('Listener Management', () => {
    it('should subscribe and notify listeners', () => {
      const mockCallback = jest.fn();
      accessibilityService.subscribe('test', mockCallback);
      
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: FontSize.LARGE })
      );
    });

    it('should unsubscribe listeners', () => {
      const mockCallback = jest.fn();
      accessibilityService.subscribe('test', mockCallback);
      accessibilityService.unsubscribe('test');
      
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Settings Persistence', () => {
    it('should export settings as JSON', () => {
      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      const exported = accessibilityService.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed.fontSize).toBe(FontSize.LARGE);
    });

    it('should import settings from JSON', () => {
      const settings = { fontSize: FontSize.EXTRA_LARGE, isHighContrastEnabled: true };
      const success = accessibilityService.importSettings(JSON.stringify(settings));
      
      expect(success).toBe(true);
      expect(accessibilityService.getSettings().fontSize).toBe(FontSize.EXTRA_LARGE);
      expect(accessibilityService.getSettings().isHighContrastEnabled).toBe(true);
    });

    it('should handle invalid JSON import', () => {
      const success = accessibilityService.importSettings('invalid json');
      expect(success).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default settings', () => {
      accessibilityService.updateSettings({
        fontSize: FontSize.LARGE,
        isHighContrastEnabled: true,
      });
      
      accessibilityService.resetToDefaults();
      const settings = accessibilityService.getSettings();
      
      expect(settings.fontSize).toBe(FontSize.MEDIUM);
      expect(settings.isHighContrastEnabled).toBe(false);
    });
  });

  describe('System Integration', () => {
    it('should detect screen reader status', () => {
      accessibilityService.updateSetting('isScreenReaderEnabled', true);
      expect(accessibilityService.isScreenReaderEnabled()).toBe(true);
    });

    it('should detect reduce motion status', () => {
      accessibilityService.updateSetting('isReduceMotionEnabled', true);
      expect(accessibilityService.isReduceMotionEnabled()).toBe(true);
    });

    it('should detect high contrast status', () => {
      accessibilityService.updateSetting('isHighContrastEnabled', true);
      expect(accessibilityService.isHighContrastEnabled()).toBe(true);
    });
  });
});