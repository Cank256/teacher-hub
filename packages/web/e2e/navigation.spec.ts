import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display brand logo', async ({ page }) => {
    await expect(page.getByText('Teacher Hub')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Test navigation to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Test navigation to Resources
    await page.getByRole('link', { name: 'Resources' }).click();
    await expect(page).toHaveURL('/resources');
    await expect(page.getByRole('heading', { name: 'Educational Resources' })).toBeVisible();

    // Test navigation to Communities
    await page.getByRole('link', { name: 'Communities' }).click();
    await expect(page).toHaveURL('/communities');
    await expect(page.getByRole('heading', { name: 'Communities' })).toBeVisible();

    // Test navigation to Messages
    await page.getByRole('link', { name: 'Messages' }).click();
    await expect(page).toHaveURL('/messages');
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();

    // Test navigation to Profile
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.getByRole('link', { name: 'Resources' }).click();
    
    const activeLink = page.getByRole('link', { name: 'Resources' });
    await expect(activeLink).toHaveClass(/text-primary-600/);
  });

  test('should work on mobile with hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu should be hidden initially
    const mobileMenu = page.locator('.md\\:hidden').filter({ hasText: 'Dashboard' });
    await expect(mobileMenu).toHaveClass(/hidden/);
    
    // Click hamburger menu button
    const menuButton = page.getByRole('button', { name: /open main menu/i });
    await menuButton.click();
    
    // Mobile menu should be visible
    await expect(mobileMenu).toHaveClass(/block/);
    
    // Click a navigation item
    await page.getByRole('link', { name: 'Resources' }).nth(1).click(); // Second instance is in mobile menu
    
    // Should navigate and close menu
    await expect(page).toHaveURL('/resources');
    await expect(mobileMenu).toHaveClass(/hidden/);
  });

  test('should redirect root path to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');
  });
});