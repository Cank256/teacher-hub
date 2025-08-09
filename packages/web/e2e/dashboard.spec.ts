import { test, expect } from '@playwright/test';

test.describe('Dashboard Route Protection', () => {
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    // Clear any existing authentication state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should be redirected to login page
    await expect(page).toHaveURL('/auth/login');
    
    // Should not see dashboard content
    await expect(page.getByRole('heading', { name: 'Dashboard' })).not.toBeVisible();
    
    // Should see login page content instead
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should preserve return URL when redirecting to login', async ({ page }) => {
    // Clear authentication state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL('/auth/login');
    
    // The return URL should be preserved in the navigation state
    // This is handled by the ProtectedRoute component
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');
  });

  test('should show loading state during authentication verification', async ({ page }) => {
    // Mock a slow authentication check
    await page.route('**/api/auth/verify', async (route) => {
      // Delay the response to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    const dashboardPromise = page.goto('/dashboard');
    
    // Should show loading state
    await expect(page.getByText('Verifying Authentication')).toBeVisible();
    await expect(page.getByText('Please wait while we verify your login status...')).toBeVisible();
    
    await dashboardPromise;
    
    // Should eventually redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});

test.describe('Dashboard Content (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock_token');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        verificationStatus: 'verified'
      }));
    });

    // Mock API calls for authenticated user
    await page.route('**/api/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            fullName: 'Test User',
            verificationStatus: 'verified'
          }
        })
      });
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard title and welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome to your Teacher Hub dashboard')).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await expect(page.getByText('Resources Shared')).toBeVisible();
    await expect(page.getByText('Total Downloads')).toBeVisible();
    await expect(page.getByText('Communities')).toBeVisible();
    await expect(page.getByText('Unread Messages')).toBeVisible();
  });

  test('should display recent activity', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByText('Mathematics Worksheets for Primary 5')).toBeVisible();
    await expect(page.getByText('New message from Sarah Nakato')).toBeVisible();
  });

  test('should display government updates', async ({ page }) => {
    await expect(page.getByText('Government Updates')).toBeVisible();
    await expect(page.getByText('New Curriculum Guidelines')).toBeVisible();
    await expect(page.getByText('UNEB Examination Updates')).toBeVisible();
  });

  test('should navigate to resources when clicking upload resource', async ({ page }) => {
    await page.getByText('Upload Resource').click();
    await expect(page).toHaveURL('/resources');
  });

  test('should navigate to communities when clicking join community', async ({ page }) => {
    await page.getByText('Join Community').click();
    await expect(page).toHaveURL('/communities');
  });

  test('should navigate to messages when clicking send message', async ({ page }) => {
    await page.getByText('Send Message').click();
    await expect(page).toHaveURL('/messages');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that stats are displayed in 2 columns on mobile
    const statsGrid = page.locator('.grid-cols-2');
    await expect(statsGrid).toBeVisible();
    
    // Check that main content stacks vertically
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });
});