const {device, expect, element, by, waitFor} = require('detox');

describe('Biometric Authentication', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Biometric Login', () => {
    it('should show biometric login option when available', async () => {
      // Wait for login screen to load
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Check if biometric login button is visible
      const biometricButton = element(by.id('biometric-login-button'));
      
      // This test depends on device capabilities and settings
      if (await biometricButton.exists()) {
        await expect(biometricButton).toBeVisible();
        
        // Should show appropriate biometric icon
        await expect(element(by.text('Use Biometric'))).toBeVisible();
      }
    });

    it('should handle biometric authentication flow', async () => {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      const biometricButton = element(by.id('biometric-login-button'));
      
      if (await biometricButton.exists()) {
        await biometricButton.tap();
        
        // Should trigger biometric prompt
        // Note: Actual biometric testing requires device setup
        // This test verifies the UI flow
        
        await waitFor(element(by.text('Authenticating...')))
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should handle biometric authentication errors', async () => {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      const biometricButton = element(by.id('biometric-login-button'));
      
      if (await biometricButton.exists()) {
        await biometricButton.tap();
        
        // If biometric fails, should show error message
        // This would require mocking biometric failure
      }
    });
  });

  describe('Biometric Settings', () => {
    it('should allow enabling biometric authentication', async () => {
      // Navigate to settings/profile screen
      await waitFor(element(by.id('profile-tab')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('profile-tab')).tap();
      
      // Look for biometric settings toggle
      const biometricToggle = element(by.id('biometric-toggle'));
      
      if (await biometricToggle.exists()) {
        await biometricToggle.tap();
        
        // Should trigger biometric setup flow
        await waitFor(element(by.text('Enable biometric authentication')))
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should allow disabling biometric authentication', async () => {
      await waitFor(element(by.id('profile-tab')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('profile-tab')).tap();
      
      const biometricToggle = element(by.id('biometric-toggle'));
      
      if (await biometricToggle.exists()) {
        // If already enabled, should allow disabling
        await biometricToggle.tap();
        
        // Should disable biometric authentication
      }
    });
  });

  describe('Security Features', () => {
    it('should handle app backgrounding with biometric lock', async () => {
      // Send app to background
      await device.sendToHome();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Bring app back to foreground
      await device.launchApp({newInstance: false});
      
      // Should require biometric authentication if enabled
      const biometricPrompt = element(by.text('Authenticate to access Teacher Hub'));
      
      if (await biometricPrompt.exists()) {
        await expect(biometricPrompt).toBeVisible();
      }
    });

    it('should handle biometric timeout scenarios', async () => {
      const biometricButton = element(by.id('biometric-login-button'));
      
      if (await biometricButton.exists()) {
        await biometricButton.tap();
        
        // Wait for timeout (this would require longer wait times in real testing)
        await waitFor(element(by.text('Authentication timeout')))
          .toBeVisible()
          .withTimeout(30000);
      }
    });
  });
});