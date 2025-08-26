import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticFeedbackType = 
  | 'light'
  | 'medium' 
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export class HapticService {
  private static isEnabled = true;

  /**
   * Enable or disable haptic feedback globally
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptic feedback is enabled
   */
  static getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Trigger haptic feedback
   */
  static async trigger(type: HapticFeedbackType): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Only trigger haptics on supported platforms
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Silently fail if haptics are not available
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Convenience methods for common haptic patterns
   */
  static async light(): Promise<void> {
    return this.trigger('light');
  }

  static async medium(): Promise<void> {
    return this.trigger('medium');
  }

  static async heavy(): Promise<void> {
    return this.trigger('heavy');
  }

  static async success(): Promise<void> {
    return this.trigger('success');
  }

  static async warning(): Promise<void> {
    return this.trigger('warning');
  }

  static async error(): Promise<void> {
    return this.trigger('error');
  }

  static async selection(): Promise<void> {
    return this.trigger('selection');
  }

  /**
   * Trigger haptic feedback for button press
   */
  static async buttonPress(): Promise<void> {
    return this.trigger('light');
  }

  /**
   * Trigger haptic feedback for toggle/switch
   */
  static async toggle(): Promise<void> {
    return this.trigger('selection');
  }

  /**
   * Trigger haptic feedback for long press
   */
  static async longPress(): Promise<void> {
    return this.trigger('medium');
  }

  /**
   * Trigger haptic feedback for swipe action
   */
  static async swipe(): Promise<void> {
    return this.trigger('light');
  }
}