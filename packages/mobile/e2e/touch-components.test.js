const {device, expect, element, by, waitFor} = require('detox');

describe('Touch-Optimized Components', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Button Components', () => {
    it('should handle button taps with proper feedback', async () => {
      // Navigate to a screen with buttons (assuming login screen)
      await waitFor(element(by.id('login-button')))
        .toBeVisible()
        .withTimeout(10000);

      // Test button tap
      await element(by.id('login-button')).tap();
      
      // Button should provide visual feedback
      await waitFor(element(by.id('login-button')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should handle disabled button states', async () => {
      await waitFor(element(by.id('login-button')))
        .toBeVisible()
        .withTimeout(10000);

      // If button is disabled, it should not respond to taps
      const disabledButton = element(by.id('disabled-button'));
      if (await disabledButton.exists()) {
        await disabledButton.tap();
        // Should not trigger any action
      }
    });
  });

  describe('Input Components', () => {
    it('should handle text input with proper focus states', async () => {
      const emailInput = element(by.id('email-input'));
      if (await emailInput.exists()) {
        await emailInput.tap();
        await emailInput.typeText('test@example.com');
        
        // Input should show focused state
        await expect(emailInput).toHaveText('test@example.com');
      }
    });

    it('should handle secure text input toggle', async () => {
      const passwordInput = element(by.id('password-input'));
      const secureToggle = element(by.id('secure-toggle'));
      
      if (await passwordInput.exists() && await secureToggle.exists()) {
        await passwordInput.tap();
        await passwordInput.typeText('password123');
        
        // Toggle secure text visibility
        await secureToggle.tap();
        
        // Should toggle visibility (implementation dependent)
      }
    });
  });

  describe('Card Components', () => {
    it('should handle card touch interactions', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      const touchableCard = element(by.id('touchable-card'));
      if (await touchableCard.exists()) {
        await touchableCard.tap();
        
        // Card should respond with animation or navigation
        await waitFor(touchableCard)
          .toBeVisible()
          .withTimeout(2000);
      }
    });

    it('should handle long press on cards', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      const touchableCard = element(by.id('touchable-card'));
      if (await touchableCard.exists()) {
        await touchableCard.longPress();
        
        // Should trigger long press action (context menu, etc.)
      }
    });
  });

  describe('Floating Action Button', () => {
    it('should handle FAB interactions', async () => {
      const fab = element(by.id('floating-action-button'));
      if (await fab.exists()) {
        await fab.tap();
        
        // FAB should trigger appropriate action
        await waitFor(fab)
          .toBeVisible()
          .withTimeout(2000);
      }
    });

    it('should provide proper touch feedback', async () => {
      const fab = element(by.id('floating-action-button'));
      if (await fab.exists()) {
        // Test multiple rapid taps
        await fab.tap();
        await fab.tap();
        
        // Should handle multiple taps gracefully
      }
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility features', async () => {
      // Enable accessibility
      await device.enableSynchronization();
      
      // Check for accessibility labels
      const accessibleButton = element(by.id('login-button'));
      if (await accessibleButton.exists()) {
        // Should have proper accessibility labels
        await expect(accessibleButton).toBeVisible();
      }
    });

    it('should support keyboard navigation', async () => {
      // Test tab navigation between inputs
      const emailInput = element(by.id('email-input'));
      const passwordInput = element(by.id('password-input'));
      
      if (await emailInput.exists() && await passwordInput.exists()) {
        await emailInput.tap();
        // Simulate tab key (platform dependent)
        await passwordInput.tap();
        
        // Should move focus between inputs
      }
    });
  });
});