import AccessibilityService, { FontSize } from '@/services/accessibility/AccessibilityService';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock React Native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
    isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
    isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
    prefersCrossFadeTransitions: jest.fn(() => Promise.resolve(false)),
    announceForAccessibility: jest.fn(),
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

describe('AccessibleButton Logic', () => {
  let accessibilityService: AccessibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (AccessibilityService as any).instance = undefined;
    accessibilityService = AccessibilityService.getInstance();
  });

  describe('Accessibility Features', () => {
    it('should provide correct minimum touch target size', () => {
      const minSize = accessibilityService.getMinimumTouchTargetSize();
      expect(minSize).toBe(44); // iOS minimum
    });

    it('should validate touch target accessibility', () => {
      expect(accessibilityService.isTouchTargetAccessible(44, 44)).toBe(true);
      expect(accessibilityService.isTouchTargetAccessible(40, 40)).toBe(false);
    });

    it('should generate appropriate accessibility hints', () => {
      const hint = accessibilityService.generateAccessibilityHint('button', 'Save');
      expect(hint).toBe('Save');
      
      const defaultHint = accessibilityService.generateAccessibilityHint('button');
      expect(defaultHint).toBe('Double tap to activate');
    });

    it('should return correct accessibility roles', () => {
      expect(accessibilityService.getAccessibilityRole('button')).toBe('button');
      expect(accessibilityService.getAccessibilityRole('link')).toBe('link');
      expect(accessibilityService.getAccessibilityRole('unknown')).toBe('none');
    });

    it('should generate accessibility state correctly', () => {
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

  describe('Font Scaling', () => {
    it('should scale fonts correctly for different sizes', () => {
      accessibilityService.updateSetting('fontSize', FontSize.SMALL);
      expect(accessibilityService.getScaledFontSize(16)).toBe(Math.round(16 * 0.85));

      accessibilityService.updateSetting('fontSize', FontSize.LARGE);
      expect(accessibilityService.getScaledFontSize(16)).toBe(Math.round(16 * 1.15));

      accessibilityService.updateSetting('fontSize', FontSize.EXTRA_LARGE);
      expect(accessibilityService.getScaledFontSize(16)).toBe(Math.round(16 * 1.3));
    });
  });

  describe('Animation Duration', () => {
    it('should respect reduce motion preference', () => {
      accessibilityService.updateSetting('isReduceMotionEnabled', false);
      expect(accessibilityService.getAnimationDuration(300)).toBe(300);

      accessibilityService.updateSetting('isReduceMotionEnabled', true);
      expect(accessibilityService.getAnimationDuration(300)).toBe(0);
    });
  });

  describe('High Contrast', () => {
    it('should adjust contrast ratio when high contrast is enabled', () => {
      accessibilityService.updateSetting('isHighContrastEnabled', false);
      expect(accessibilityService.getContrastRatio()).toBe(1.0);

      accessibilityService.updateSetting('isHighContrastEnabled', true);
      expect(accessibilityService.getContrastRatio()).toBe(1.5);
    });
  });
});