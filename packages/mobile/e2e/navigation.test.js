describe('Navigation E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Onboarding Flow', () => {
    it('should complete onboarding flow', async () => {
      // Should show onboarding screen on first launch
      await expect(element(by.text('Welcome to Teacher Hub'))).toBeVisible();
      
      // Tap get started button
      await element(by.text('Get Started')).tap();
      
      // Should navigate to login screen
      await expect(element(by.text('Welcome Back'))).toBeVisible();
    });
  });

  describe('Authentication Flow', () => {
    it('should navigate between auth screens', async () => {
      // Start from login screen
      await element(by.text('Get Started')).tap();
      await expect(element(by.text('Welcome Back'))).toBeVisible();
      
      // Navigate to register
      await element(by.text("Don't have an account? Register")).tap();
      await expect(element(by.text('Register Screen'))).toBeVisible();
      
      // Go back to login
      await element(by.text('Login')).tap();
      await expect(element(by.text('Welcome Back'))).toBeVisible();
    });

    it('should login and access main app', async () => {
      // Navigate to login
      await element(by.text('Get Started')).tap();
      
      // Login (this will use mock authentication)
      await element(by.text('Sign In')).tap();
      
      // Should navigate to main app
      await expect(element(by.text('Posts'))).toBeVisible();
      await expect(element(by.text('Communities'))).toBeVisible();
      await expect(element(by.text('Messages'))).toBeVisible();
      await expect(element(by.text('Resources'))).toBeVisible();
      await expect(element(by.text('Profile'))).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      // Login first
      await element(by.text('Get Started')).tap();
      await element(by.text('Sign In')).tap();
    });

    it('should navigate between tabs', async () => {
      // Should start on Posts tab
      await expect(element(by.text('Posts Feed'))).toBeVisible();
      
      // Navigate to Communities
      await element(by.text('Communities')).tap();
      await expect(element(by.text('Communities'))).toBeVisible();
      
      // Navigate to Messages
      await element(by.text('Messages')).tap();
      await expect(element(by.text('Messages'))).toBeVisible();
      
      // Navigate to Resources
      await element(by.text('Resources')).tap();
      await expect(element(by.text('Resources'))).toBeVisible();
      
      // Navigate to Profile
      await element(by.text('Profile')).tap();
      await expect(element(by.text('Profile'))).toBeVisible();
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep link to posts', async () => {
      // Launch app with deep link
      await device.launchApp({
        url: 'teacherhub://posts/123',
        newInstance: true,
      });
      
      // Should navigate to post detail (when implemented)
      // For now, just verify we're in the posts section
      await expect(element(by.text('Posts'))).toBeVisible();
    });

    it('should handle deep link to communities', async () => {
      await device.launchApp({
        url: 'teacherhub://communities/456',
        newInstance: true,
      });
      
      // Should navigate to community detail (when implemented)
      await expect(element(by.text('Communities'))).toBeVisible();
    });

    it('should handle deep link to messages', async () => {
      await device.launchApp({
        url: 'teacherhub://messages/789',
        newInstance: true,
      });
      
      // Should navigate to chat (when implemented)
      await expect(element(by.text('Messages'))).toBeVisible();
    });

    it('should handle invalid deep links gracefully', async () => {
      await device.launchApp({
        url: 'teacherhub://invalid/route',
        newInstance: true,
      });
      
      // Should fallback to appropriate screen
      // This behavior will depend on the linking configuration
      await expect(element(by.text('Welcome to Teacher Hub'))).toBeVisible();
    });
  });

  describe('Navigation State Persistence', () => {
    it('should restore navigation state after app restart', async () => {
      // Login and navigate to a specific tab
      await element(by.text('Get Started')).tap();
      await element(by.text('Sign In')).tap();
      await element(by.text('Communities')).tap();
      
      // Terminate and relaunch app
      await device.terminateApp();
      await device.launchApp();
      
      // Should restore to Communities tab (in development mode)
      if (__DEV__) {
        await expect(element(by.text('Communities'))).toBeVisible();
      }
    });
  });
});