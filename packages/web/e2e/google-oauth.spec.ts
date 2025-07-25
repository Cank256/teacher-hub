import { test, expect } from '@playwright/test';

test.describe('Google OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
  });

  test('should display Google Sign-In button on login page', async ({ page }) => {
    // Check if Google Sign-In button is present
    const googleButton = page.locator('[aria-label="Sign in with Google"]');
    await expect(googleButton).toBeVisible();
  });

  test('should display Google Sign-In button on registration page', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Check if Google Sign-In button is present
    const googleButton = page.locator('[aria-label="Sign up with Google"]');
    await expect(googleButton).toBeVisible();
  });

  test('should show error message when Google OAuth is not configured', async ({ page }) => {
    // Mock the Google Identity Services to not be available
    await page.addInitScript(() => {
      // Remove Google object to simulate unavailable service
      delete (window as any).google;
    });

    await page.goto('/auth/login');
    
    // The fallback button should be displayed
    const fallbackButton = page.locator('button:has-text("Google Sign-In unavailable")');
    await expect(fallbackButton).toBeVisible();
    await expect(fallbackButton).toBeDisabled();
  });

  test('should handle Google OAuth initialization error gracefully', async ({ page }) => {
    // Mock Google Identity Services to throw an error
    await page.addInitScript(() => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initCodeClient: () => {
              throw new Error('Google OAuth initialization failed');
            }
          }
        }
      };
    });

    await page.goto('/auth/login');
    
    // Should show fallback button
    const fallbackButton = page.locator('button:has-text("Google Sign-In unavailable")');
    await expect(fallbackButton).toBeVisible();
  });

  test('should navigate to Google registration page when registration is required', async ({ page }) => {
    // Mock successful Google OAuth but requiring registration
    await page.route('**/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'REGISTRATION_REQUIRED',
            message: 'User registration required. Please complete your profile.'
          },
          requiresRegistration: true
        })
      });
    });

    // Mock Google Identity Services
    await page.addInitScript(() => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initCodeClient: (config: any) => ({
              requestCode: () => {
                // Simulate successful authorization
                config.callback({ code: 'mock_auth_code' });
              }
            })
          }
        }
      };
    });

    await page.goto('/auth/login');
    
    // Click Google Sign-In button
    const googleButton = page.locator('[aria-label="Sign in with Google"]');
    await googleButton.click();
    
    // Should navigate to Google registration page
    await expect(page).toHaveURL('/auth/google/register');
  });

  test('should show error message on Google OAuth failure', async ({ page }) => {
    // Mock failed Google OAuth
    await page.route('**/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'GOOGLE_AUTH_FAILED',
            message: 'Google authentication failed'
          }
        })
      });
    });

    // Mock Google Identity Services
    await page.addInitScript(() => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initCodeClient: (config: any) => ({
              requestCode: () => {
                config.callback({ code: 'mock_auth_code' });
              }
            })
          }
        }
      };
    });

    await page.goto('/auth/login');
    
    // Click Google Sign-In button
    const googleButton = page.locator('[aria-label="Sign in with Google"]');
    await googleButton.click();
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"]:has-text("Google authentication failed")');
    await expect(errorMessage).toBeVisible();
  });

  test('should redirect to dashboard on successful Google OAuth login', async ({ page }) => {
    // Mock successful Google OAuth login
    await page.route('**/auth/google/callback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Google OAuth login successful',
          data: {
            user: {
              id: 'user123',
              email: 'teacher@example.com',
              fullName: 'John Teacher',
              subjects: ['Mathematics'],
              gradeLevels: ['Primary'],
              verificationStatus: 'verified'
            },
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token'
          }
        })
      });
    });

    // Mock Google Identity Services
    await page.addInitScript(() => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initCodeClient: (config: any) => ({
              requestCode: () => {
                config.callback({ code: 'mock_auth_code' });
              }
            })
          }
        }
      };
    });

    await page.goto('/auth/login');
    
    // Click Google Sign-In button
    const googleButton = page.locator('[aria-label="Sign in with Google"]');
    await googleButton.click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Google Registration Page', () => {
  test('should display Google registration form with required fields', async ({ page }) => {
    // Navigate directly to Google registration page with mock auth code
    await page.goto('/auth/google/register', {
      state: { authCode: 'mock_auth_code' }
    });

    // Check if all required form fields are present
    await expect(page.locator('select[multiple]').first()).toBeVisible(); // Subjects
    await expect(page.locator('select[multiple]').nth(1)).toBeVisible(); // Grade levels
    await expect(page.locator('select').nth(2)).toBeVisible(); // Region
    await expect(page.locator('input[type="number"]')).toBeVisible(); // Years of experience
    await expect(page.locator('input[type="file"]')).toBeVisible(); // Credential files
    await expect(page.locator('input[type="checkbox"]')).toBeVisible(); // Terms agreement
  });

  test('should validate required fields on form submission', async ({ page }) => {
    await page.goto('/auth/google/register', {
      state: { authCode: 'mock_auth_code' }
    });

    // Try to submit form without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=This field is required')).toHaveCount(5); // 5 required fields
  });

  test('should enable district selection after region is selected', async ({ page }) => {
    await page.goto('/auth/google/register', {
      state: { authCode: 'mock_auth_code' }
    });

    // District select should be disabled initially
    const districtSelect = page.locator('select').nth(3);
    await expect(districtSelect).toBeDisabled();

    // Select a region
    await page.selectOption(page.locator('select').nth(2), 'Central');

    // District select should now be enabled
    await expect(districtSelect).toBeEnabled();
    
    // Should have district options for Central region
    const options = districtSelect.locator('option');
    await expect(options).toContainText('Kampala');
    await expect(options).toContainText('Wakiso');
  });

  test('should redirect to login if no auth code is provided', async ({ page }) => {
    // Navigate to Google registration page without auth code
    await page.goto('/auth/google/register');

    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login');
  });
});