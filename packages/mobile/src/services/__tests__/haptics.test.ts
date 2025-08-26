import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HapticService } from '../haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HapticService.setEnabled(true);
  });

  describe('enable/disable functionality', () => {
    it('should enable haptic feedback by default', () => {
      expect(HapticService.getEnabled()).toBe(true);
    });

    it('should allow disabling haptic feedback', () => {
      HapticService.setEnabled(false);
      expect(HapticService.getEnabled()).toBe(false);
    });

    it('should not trigger haptics when disabled', async () => {
      HapticService.setEnabled(false);
      await HapticService.light();
      
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('impact feedback', () => {
    it('should trigger light impact feedback', async () => {
      await HapticService.light();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger medium impact feedback', async () => {
      await HapticService.medium();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger heavy impact feedback', async () => {
      await HapticService.heavy();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });
  });

  describe('notification feedback', () => {
    it('should trigger success notification feedback', async () => {
      await HapticService.success();
      
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should trigger warning notification feedback', async () => {
      await HapticService.warning();
      
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    it('should trigger error notification feedback', async () => {
      await HapticService.error();
      
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });
  });

  describe('selection feedback', () => {
    it('should trigger selection feedback', async () => {
      await HapticService.selection();
      
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    it('should trigger light feedback for button press', async () => {
      await HapticService.buttonPress();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger selection feedback for toggle', async () => {
      await HapticService.toggle();
      
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('should trigger medium feedback for long press', async () => {
      await HapticService.longPress();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger light feedback for swipe', async () => {
      await HapticService.swipe();
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('generic trigger method', () => {
    it('should trigger correct feedback for each type', async () => {
      await HapticService.trigger('light');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

      await HapticService.trigger('medium');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

      await HapticService.trigger('heavy');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);

      await HapticService.trigger('success');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

      await HapticService.trigger('warning');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);

      await HapticService.trigger('error');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);

      await HapticService.trigger('selection');
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('should default to light feedback for unknown types', async () => {
      // @ts-ignore - testing invalid type
      await HapticService.trigger('unknown');
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('error handling', () => {
    it('should handle haptic errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptics not available'));
      
      await expect(HapticService.light()).resolves.not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Haptic feedback failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('platform support', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should not trigger haptics on unsupported platforms', async () => {
      Platform.OS = 'web' as any;
      
      await HapticService.light();
      
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should trigger haptics on iOS', async () => {
      Platform.OS = 'ios';
      
      await HapticService.light();
      
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should trigger haptics on Android', async () => {
      Platform.OS = 'android';
      
      await HapticService.light();
      
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });
});