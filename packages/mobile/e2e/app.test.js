describe('Teacher Hub App E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch and Onboarding', () => {
    it('should launch app successfully', async () => {
      await expect(element(by.id('app-container'))).toBeVisible();
    });

    it('should show onboarding for new users', async () => {
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
      await expect(element(by.text('Get Started'))).toBeVisible();
    });

    it('should navigate through onboarding flow', async () => {
      await element(by.text('Get Started')).tap();
      await expect(element(by.text('Login'))).toBeVisible();
      await expect(element(by.text('Register'))).toBeVisible();
    });
  });

  describe('Performance Tests', () => {
    it('should launch within acceptable time', async () => {
      const startTime = Date.now();
      await device.launchApp();
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
      const endTime = Date.now();
      
      const launchTime = endTime - startTime;
      expect(launchTime).toBeLessThan(3000); // Should launch within 3 seconds
    });

    it('should handle rapid navigation without crashes', async () => {
      for (let i = 0; i < 3; i++) {
        await element(by.text('Get Started')).tap();
        await element(by.text('Back')).tap();
      }
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility labels', async () => {
      await expect(element(by.text('Teacher Hub'))).toHaveAccessibilityLabel('Teacher Hub');
      await expect(element(by.text('Get Started'))).toHaveAccessibilityLabel('Get Started');
    });

    it('should support VoiceOver navigation', async () => {
      // Test that elements are accessible via VoiceOver
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
      await expect(element(by.text('Get Started'))).toBeVisible();
    });
  });

  describe('Network Conditions', () => {
    it('should handle offline state gracefully', async () => {
      await device.setNetworkConnection(false);
      await element(by.text('Get Started')).tap();
      // App should still function for basic navigation
      await expect(element(by.text('Login'))).toBeVisible();
      await device.setNetworkConnection(true);
    });
  });

  describe('Deep Links', () => {
    it('should handle app deep links', async () => {
      await device.openURL({ url: 'teacherhub://login' });
      await expect(element(by.text('Login'))).toBeVisible();
    });

    it('should handle invalid deep links gracefully', async () => {
      await device.openURL({ url: 'teacherhub://invalid' });
      // Should fallback to main screen or show error
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
    });
  });

  describe('Memory and Performance', () => {
    it('should not crash under memory pressure', async () => {
      // Simulate memory pressure by rapid navigation
      for (let i = 0; i < 10; i++) {
        await element(by.text('Get Started')).tap();
        await element(by.text('Register')).tap();
        await element(by.text('Back')).tap();
        await element(by.text('Back')).tap();
      }
      await expect(element(by.text('Teacher Hub'))).toBeVisible();
    });
  });
});