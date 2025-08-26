describe('Teacher Hub App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen on launch', async () => {
    await expect(element(by.text('Teacher Hub'))).toBeVisible();
  });

  it('should navigate to login screen', async () => {
    await element(by.text('Get Started')).tap();
    await expect(element(by.text('Login'))).toBeVisible();
  });

  it('should show registration form', async () => {
    await element(by.text('Get Started')).tap();
    await element(by.text('Register')).tap();
    await expect(element(by.text('Create Account'))).toBeVisible();
  });
});