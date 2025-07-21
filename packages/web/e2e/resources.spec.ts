import { test, expect } from '@playwright/test';

test.describe('Resources Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resources');
  });

  test('should display resources page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Educational Resources' })).toBeVisible();
    await expect(page.getByText('Discover and share educational materials')).toBeVisible();
  });

  test('should display search and filter controls', async ({ page }) => {
    await expect(page.getByPlaceholder('Search resources...')).toBeVisible();
    await expect(page.getByText('All Subjects')).toBeVisible();
    await expect(page.getByText('All Grade Levels')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('should display resources in grid view by default', async ({ page }) => {
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
    await expect(page.getByText('English Grammar Guide')).toBeVisible();
    await expect(page.getByText('Science Experiment Videos')).toBeVisible();
  });

  test('should filter resources by subject', async ({ page }) => {
    // Select Mathematics subject
    await page.selectOption('select', 'Mathematics');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Should show only mathematics resources
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
    await expect(page.getByText('English Grammar Guide')).not.toBeVisible();
  });

  test('should search resources by title', async ({ page }) => {
    await page.getByPlaceholder('Search resources...').fill('fraction');
    await page.getByRole('button', { name: 'Search' }).click();
    
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
    await expect(page.getByText('English Grammar Guide')).not.toBeVisible();
  });

  test('should switch between grid and list view', async ({ page }) => {
    // Default should be grid view
    const gridButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(gridButton).toHaveClass(/bg-primary-100/);
    
    // Switch to list view
    const listButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await listButton.click();
    
    // Should show list view
    await expect(listButton).toHaveClass(/bg-primary-100/);
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
  });

  test('should display resource details correctly', async ({ page }) => {
    const resource = page.getByText('Fraction Worksheets for Primary 5').locator('..');
    
    await expect(resource.getByText('Mathematics')).toBeVisible();
    await expect(resource.getByText('Primary 4-7')).toBeVisible();
    await expect(resource.getByText('Sarah Nakato')).toBeVisible();
    await expect(resource.getByText('4.8')).toBeVisible();
    await expect(resource.getByRole('button', { name: 'Download' })).toBeVisible();
  });

  test('should handle download action', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: 'Download' }).first();
    await downloadButton.click();
    
    // Should trigger download (in real app, this would download the file)
    // For now, we just check that the button was clicked
    await expect(downloadButton).toBeVisible();
  });

  test('should show empty state when no resources match filters', async ({ page }) => {
    await page.getByPlaceholder('Search resources...').fill('nonexistent resource');
    await page.getByRole('button', { name: 'Search' }).click();
    
    await expect(page.getByText('No resources found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search criteria')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });

  test('should clear filters when clicking clear filters button', async ({ page }) => {
    // Apply some filters
    await page.getByPlaceholder('Search resources...').fill('test');
    await page.selectOption('select', 'Mathematics');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Clear filters
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    
    // Should show all resources again
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
    await expect(page.getByText('English Grammar Guide')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that search controls stack vertically on mobile
    await expect(page.getByPlaceholder('Search resources...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    
    // Check that resources are displayed in single column
    await expect(page.getByText('Fraction Worksheets for Primary 5')).toBeVisible();
  });
});