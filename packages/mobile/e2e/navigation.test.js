const {device, expect, element, by, waitFor} = require('detox');

describe('Mobile Navigation', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Tab Navigation', () => {
    it('should display all main tabs', async () => {
      // Wait for the app to load and authenticate (mock)
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Check all tabs are visible
      await expect(element(by.id('dashboard-tab'))).toBeVisible();
      await expect(element(by.id('resources-tab'))).toBeVisible();
      await expect(element(by.id('messages-tab'))).toBeVisible();
      await expect(element(by.id('communities-tab'))).toBeVisible();
      await expect(element(by.id('profile-tab'))).toBeVisible();
    });

    it('should navigate between tabs', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Navigate to Resources tab
      await element(by.id('resources-tab')).tap();
      await waitFor(element(by.text('Resources')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to Messages tab
      await element(by.id('messages-tab')).tap();
      await waitFor(element(by.text('Messages')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to Communities tab
      await element(by.id('communities-tab')).tap();
      await waitFor(element(by.text('Communities')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to Profile tab
      await element(by.id('profile-tab')).tap();
      await waitFor(element(by.text('Profile')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate back to Dashboard
      await element(by.id('dashboard-tab')).tap();
      await waitFor(element(by.text('Dashboard')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should maintain tab state when switching', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Go to Resources tab
      await element(by.id('resources-tab')).tap();
      
      // Switch to another tab and back
      await element(by.id('messages-tab')).tap();
      await element(by.id('resources-tab')).tap();
      
      // Resources screen should still be visible
      await expect(element(by.text('Resources'))).toBeVisible();
    });
  });

  describe('Touch Interactions', () => {
    it('should respond to touch interactions on cards', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Look for touchable cards
      const cards = element(by.id('card-touchable'));
      await waitFor(cards).toBeVisible().withTimeout(5000);
      
      // Tap on a card
      await cards.tap();
      
      // Card should respond to touch (this would depend on implementation)
    });

    it('should handle swipe gestures', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Test swipe gesture on scrollable content
      const scrollView = element(by.id('dashboard-scroll'));
      if (await scrollView.exists()) {
        await scrollView.swipe('up', 'slow');
        await scrollView.swipe('down', 'slow');
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to device orientation', async () => {
      await waitFor(element(by.id('dashboard-tab')))
        .toBeVisible()
        .withTimeout(10000);

      // Rotate device to landscape
      await device.setOrientation('landscape');
      
      // Check that tabs are still visible and functional
      await expect(element(by.id('dashboard-tab'))).toBeVisible();
      await expect(element(by.id('resources-tab'))).toBeVisible();
      
      // Rotate back to portrait
      await device.setOrientation('portrait');
      
      // Check that layout is restored
      await expect(element(by.id('dashboard-tab'))).toBeVisible();
    });
  });
});