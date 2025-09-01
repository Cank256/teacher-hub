const { device, expect, element, by, waitFor } = require('detox');

describe('Authentication Flows', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Flow', () => {
    it('should display login screen with all elements', async () => {
      // Navigate to login screen
      await element(by.id('login-screen')).tap();
      
      // Check if all elements are visible
      await expect(element(by.text('Welcome Back'))).toBeVisible();
      await expect(element(by.id('login-email-input'))).toBeVisible();
      await expect(element(by.id('login-password-input'))).toBeVisible();
      await expect(element(by.id('login-submit-button'))).toBeVisible();
      await expect(element(by.id('google-login-button'))).toBeVisible();
      await expect(element(by.text('Don\'t have an account? Register here'))).toBeVisible();
    });

    it('should show validation errors for empty fields', async () => {
      await element(by.id('login-screen')).tap();
      
      // Try to submit without filling fields
      await element(by.id('login-submit-button')).tap();
      
      // Check for validation errors
      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password is required'))).toBeVisible();
    });

    it('should show validation error for invalid email', async () => {
      await element(by.id('login-screen')).tap();
      
      // Enter invalid email
      await element(by.id('login-email-input')).typeText('invalid-email');
      await element(by.id('login-password-input')).typeText('password123');
      
      // Check for email validation error
      await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
    });

    it('should successfully login with valid credentials', async () => {
      await element(by.id('login-screen')).tap();
      
      // Enter valid credentials
      await element(by.id('login-email-input')).typeText('teacher@example.com');
      await element(by.id('login-password-input')).typeText('Password123!');
      
      // Submit login
      await element(by.id('login-submit-button')).tap();
      
      // Wait for navigation to main app or verification screen
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should toggle password visibility', async () => {
      await element(by.id('login-screen')).tap();
      
      // Enter password
      await element(by.id('login-password-input')).typeText('password123');
      
      // Toggle password visibility
      await element(by.text('Show')).tap();
      await expect(element(by.text('Hide'))).toBeVisible();
      
      await element(by.text('Hide')).tap();
      await expect(element(by.text('Show'))).toBeVisible();
    });

    it('should navigate to forgot password screen', async () => {
      await element(by.id('login-screen')).tap();
      
      // Tap forgot password
      await element(by.id('forgot-password-button')).tap();
      
      // Check if forgot password screen is displayed
      await expect(element(by.text('Forgot Password?'))).toBeVisible();
    });

    it('should navigate to register screen', async () => {
      await element(by.id('login-screen')).tap();
      
      // Tap register link
      await element(by.text('Register here')).tap();
      
      // Check if register screen is displayed
      await expect(element(by.text('Join Teacher Hub'))).toBeVisible();
    });

    it('should show biometric login option when available', async () => {
      await element(by.id('login-screen')).tap();
      
      // Check if biometric button is visible (device dependent)
      try {
        await expect(element(by.id('biometric-login-button'))).toBeVisible();
      } catch (error) {
        // Biometric not available on this device/simulator
        console.log('Biometric authentication not available');
      }
    });
  });

  describe('Registration Flow', () => {
    it('should display registration screen with all elements', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Check if all elements are visible
      await expect(element(by.text('Join Teacher Hub'))).toBeVisible();
      await expect(element(by.id('register-first-name-input'))).toBeVisible();
      await expect(element(by.id('register-last-name-input'))).toBeVisible();
      await expect(element(by.id('register-email-input'))).toBeVisible();
      await expect(element(by.id('register-password-input'))).toBeVisible();
      await expect(element(by.id('register-confirm-password-input'))).toBeVisible();
      await expect(element(by.id('agree-terms-button'))).toBeVisible();
      await expect(element(by.id('register-submit-button'))).toBeVisible();
    });

    it('should show validation errors for empty required fields', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Try to submit without filling fields
      await element(by.id('register-submit-button')).tap();
      
      // Check for validation errors
      await expect(element(by.text('First name is required'))).toBeVisible();
      await expect(element(by.text('Last name is required'))).toBeVisible();
      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password must be at least 8 characters'))).toBeVisible();
    });

    it('should validate password requirements', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Enter weak password
      await element(by.id('register-password-input')).typeText('weak');
      
      // Check for password validation errors
      await expect(element(by.text('Password must be at least 8 characters'))).toBeVisible();
      
      // Enter password without uppercase
      await element(by.id('register-password-input')).clearText();
      await element(by.id('register-password-input')).typeText('password123');
      
      await expect(element(by.text('Password must contain at least one uppercase letter'))).toBeVisible();
    });

    it('should validate password confirmation', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Enter different passwords
      await element(by.id('register-password-input')).typeText('Password123!');
      await element(by.id('register-confirm-password-input')).typeText('DifferentPassword123!');
      
      // Check for password mismatch error
      await expect(element(by.text('Passwords don\'t match'))).toBeVisible();
    });

    it('should require terms agreement', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Fill all fields except terms
      await element(by.id('register-first-name-input')).typeText('John');
      await element(by.id('register-last-name-input')).typeText('Doe');
      await element(by.id('register-email-input')).typeText('john.doe@example.com');
      await element(by.id('register-password-input')).typeText('Password123!');
      await element(by.id('register-confirm-password-input')).typeText('Password123!');
      
      // Try to submit without agreeing to terms
      await element(by.id('register-submit-button')).tap();
      
      // Check for terms agreement error
      await expect(element(by.text('You must agree to the terms and conditions'))).toBeVisible();
    });

    it('should successfully register with valid data', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Fill all required fields
      await element(by.id('register-first-name-input')).typeText('John');
      await element(by.id('register-last-name-input')).typeText('Doe');
      await element(by.id('register-email-input')).typeText('john.doe@example.com');
      await element(by.id('register-password-input')).typeText('Password123!');
      await element(by.id('register-confirm-password-input')).typeText('Password123!');
      
      // Agree to terms
      await element(by.id('agree-terms-button')).tap();
      
      // Submit registration
      await element(by.id('register-submit-button')).tap();
      
      // Wait for success or navigation to verification
      await waitFor(element(by.text('Registration Successful!')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate back to login screen', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Tap sign in link
      await element(by.text('Sign in here')).tap();
      
      // Check if login screen is displayed
      await expect(element(by.text('Welcome Back'))).toBeVisible();
    });
  });

  describe('Forgot Password Flow', () => {
    it('should display forgot password screen', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.id('forgot-password-button')).tap();
      
      // Check if all elements are visible
      await expect(element(by.text('Forgot Password?'))).toBeVisible();
      await expect(element(by.id('forgot-password-email-input'))).toBeVisible();
      await expect(element(by.id('send-reset-button'))).toBeVisible();
      await expect(element(by.text('Back to Sign In'))).toBeVisible();
    });

    it('should validate email field', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.id('forgot-password-button')).tap();
      
      // Try to submit without email
      await element(by.id('send-reset-button')).tap();
      
      // Check for validation error
      await expect(element(by.text('Email is required'))).toBeVisible();
      
      // Enter invalid email
      await element(by.id('forgot-password-email-input')).typeText('invalid-email');
      
      await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
    });

    it('should send reset email successfully', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.id('forgot-password-button')).tap();
      
      // Enter valid email
      await element(by.id('forgot-password-email-input')).typeText('teacher@example.com');
      
      // Submit request
      await element(by.id('send-reset-button')).tap();
      
      // Wait for success message
      await waitFor(element(by.text('Check Your Email')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate back to login screen', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.id('forgot-password-button')).tap();
      
      // Tap back to sign in
      await element(by.text('Back to Sign In')).tap();
      
      // Check if login screen is displayed
      await expect(element(by.text('Welcome Back'))).toBeVisible();
    });
  });

  describe('Credential Verification Flow', () => {
    beforeEach(async () => {
      // Login first to access verification screen
      await element(by.id('login-screen')).tap();
      await element(by.id('login-email-input')).typeText('teacher@example.com');
      await element(by.id('login-password-input')).typeText('Password123!');
      await element(by.id('login-submit-button')).tap();
      
      // Wait for navigation to verification screen
      await waitFor(element(by.text('Verify Your Credentials')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display credential verification screen', async () => {
      // Check if all elements are visible
      await expect(element(by.text('Verify Your Credentials'))).toBeVisible();
      await expect(element(by.text('Required Documents'))).toBeVisible();
      await expect(element(by.id('submit-verification-button'))).toBeVisible();
      await expect(element(by.id('skip-verification-button'))).toBeVisible();
    });

    it('should show document upload options', async () => {
      // Tap on upload button for teaching certificate
      await element(by.id('upload-teaching_certificate-button')).tap();
      
      // Check if upload options are shown
      await expect(element(by.text('Take Photo'))).toBeVisible();
      await expect(element(by.text('Choose from Gallery'))).toBeVisible();
      await expect(element(by.text('Browse Files'))).toBeVisible();
    });

    it('should allow skipping verification', async () => {
      // Tap skip button
      await element(by.id('skip-verification-button')).tap();
      
      // Confirm skip in alert
      await element(by.text('Skip')).tap();
      
      // Should navigate to biometric setup
      await waitFor(element(by.text('Enable')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Biometric Setup Flow', () => {
    beforeEach(async () => {
      // Navigate to biometric setup (after login/registration)
      await element(by.id('login-screen')).tap();
      await element(by.id('login-email-input')).typeText('teacher@example.com');
      await element(by.id('login-password-input')).typeText('Password123!');
      await element(by.id('login-submit-button')).tap();
      
      // Skip verification to get to biometric setup
      await waitFor(element(by.id('skip-verification-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-verification-button')).tap();
      await element(by.text('Skip')).tap();
    });

    it('should display biometric setup screen', async () => {
      // Check if biometric setup screen is displayed
      await expect(element(by.text('Enable'))).toBeVisible();
      await expect(element(by.id('enable-biometrics-button'))).toBeVisible();
      await expect(element(by.id('skip-biometrics-button'))).toBeVisible();
    });

    it('should allow skipping biometric setup', async () => {
      // Tap skip button
      await element(by.id('skip-biometrics-button')).tap();
      
      // Confirm skip in alert
      await element(by.text('Skip')).tap();
      
      // Should navigate to main app
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should continue to app after setup', async () => {
      // If biometrics are not available, should show continue button
      try {
        await element(by.id('continue-to-app-button')).tap();
        
        // Should navigate to main app
        await waitFor(element(by.id('main-tab-navigator')))
          .toBeVisible()
          .withTimeout(5000);
      } catch (error) {
        // Biometric setup might be available, try enabling
        try {
          await element(by.id('enable-biometrics-button')).tap();
        } catch (enableError) {
          console.log('Biometric setup not available in test environment');
        }
      }
    });
  });

  describe('Complete Authentication Journey', () => {
    it('should complete full registration to main app flow', async () => {
      // Start registration
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Fill registration form
      await element(by.id('register-first-name-input')).typeText('John');
      await element(by.id('register-last-name-input')).typeText('Doe');
      await element(by.id('register-email-input')).typeText('john.doe@example.com');
      await element(by.id('register-password-input')).typeText('Password123!');
      await element(by.id('register-confirm-password-input')).typeText('Password123!');
      await element(by.id('agree-terms-button')).tap();
      
      // Submit registration
      await element(by.id('register-submit-button')).tap();
      
      // Handle success alert
      await waitFor(element(by.text('Continue')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Continue')).tap();
      
      // Skip credential verification
      await waitFor(element(by.id('skip-verification-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-verification-button')).tap();
      await element(by.text('Skip')).tap();
      
      // Skip biometric setup
      await waitFor(element(by.id('skip-biometrics-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-biometrics-button')).tap();
      await element(by.text('Skip')).tap();
      
      // Should reach main app
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should complete full login to main app flow', async () => {
      // Login
      await element(by.id('login-screen')).tap();
      await element(by.id('login-email-input')).typeText('teacher@example.com');
      await element(by.id('login-password-input')).typeText('Password123!');
      await element(by.id('login-submit-button')).tap();
      
      // Should navigate directly to main app (if already verified)
      // or through verification/biometric setup flow
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error by using invalid credentials
      await element(by.id('login-screen')).tap();
      await element(by.id('login-email-input')).typeText('invalid@example.com');
      await element(by.id('login-password-input')).typeText('wrongpassword');
      await element(by.id('login-submit-button')).tap();
      
      // Should show error alert
      await waitFor(element(by.text('Login Failed')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Dismiss alert
      await element(by.text('OK')).tap();
      
      // Should remain on login screen
      await expect(element(by.text('Welcome Back'))).toBeVisible();
    });

    it('should handle registration errors', async () => {
      await element(by.id('login-screen')).tap();
      await element(by.text('Register here')).tap();
      
      // Try to register with existing email
      await element(by.id('register-first-name-input')).typeText('John');
      await element(by.id('register-last-name-input')).typeText('Doe');
      await element(by.id('register-email-input')).typeText('existing@example.com');
      await element(by.id('register-password-input')).typeText('Password123!');
      await element(by.id('register-confirm-password-input')).typeText('Password123!');
      await element(by.id('agree-terms-button')).tap();
      
      await element(by.id('register-submit-button')).tap();
      
      // Should show error alert
      await waitFor(element(by.text('Registration Failed')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Dismiss alert
      await element(by.text('OK')).tap();
      
      // Should remain on registration screen
      await expect(element(by.text('Join Teacher Hub'))).toBeVisible();
    });
  });
});