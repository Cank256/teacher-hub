import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
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