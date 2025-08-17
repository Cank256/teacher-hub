import { test, expect } from '@playwright/test';

test.describe('Community Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new community successfully', async ({ page }) => {
    // Navigate to communities page
    await page.click('[data-testid="nav-communities"]');
    await page.waitForURL('/communities');

    // Click create community button
    await page.click('[data-testid="create-community-button"]');

    // Fill community form
    await page.fill('[data-testid="community-name-input"]', 'Advanced Mathematics Teachers');
    await page.fill('[data-testid="community-description-input"]', 'A community for teachers specializing in advanced mathematics topics including calculus, statistics, and discrete mathematics.');
    
    // Select community type
    await page.selectOption('[data-testid="community-type-select"]', 'subject');

    // Set privacy settings
    await page.check('[data-testid="requires-approval-checkbox"]');

    // Add community rules
    await page.click('[data-testid="add-rule-button"]');
    await page.fill('[data-testid="rule-title-input-0"]', 'Be Respectful');
    await page.fill('[data-testid="rule-description-input-0"]', 'Treat all members with respect and professionalism.');

    await page.click('[data-testid="add-rule-button"]');
    await page.fill('[data-testid="rule-title-input-1"]', 'Stay On Topic');
    await page.fill('[data-testid="rule-description-input-1"]', 'Keep discussions focused on mathematics education.');

    // Upload community image
    const fileInput = page.locator('[data-testid="community-image-upload"]');
    await fileInput.setInputFiles('test-fixtures/community-banner.jpg');

    // Submit form
    await page.click('[data-testid="create-community-submit"]');

    // Verify community creation success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Community created successfully');

    // Verify redirect to community page
    await page.waitForURL(/\/communities\/[a-zA-Z0-9-]+/);
    await expect(page.locator('[data-testid="community-name"]')).toContainText('Advanced Mathematics Teachers');
    await expect(page.locator('[data-testid="community-description"]')).toContainText('A community for teachers specializing');
    await expect(page.locator('[data-testid="owner-badge"]')).toBeVisible();
  });

  test('should search and discover communities', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');

    // Search for communities
    await page.fill('[data-testid="community-search-input"]', 'math');
    await page.keyboard('Enter');

    // Verify search results
    await expect(page.locator('[data-testid="search-results-header"]')).toContainText('Communities matching "math"');
    
    const searchResults = page.locator('[data-testid="community-card"]:visible');
    await expect(searchResults).toHaveCountGreaterThan(0);

    // Filter by type
    await page.click('[data-testid="filter-subject"]');
    await expect(page.locator('[data-testid="community-card"][data-type="subject"]:visible')).toHaveCountGreaterThan(0);

    // Filter by privacy
    await page.click('[data-testid="filter-public"]');
    await expect(page.locator('[data-testid="community-card"][data-private="false"]:visible')).toHaveCountGreaterThan(0);
  });

  test('should join a public community', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');

    // Find a public community
    const publicCommunity = page.locator('[data-testid="community-card"][data-private="false"]').first();
    const communityName = await publicCommunity.locator('[data-testid="community-name"]').textContent();

    // Join the community
    await publicCommunity.locator('[data-testid="join-button"]').click();

    // Verify membership
    await expect(publicCommunity.locator('[data-testid="member-badge"]')).toBeVisible();
    await expect(publicCommunity.locator('[data-testid="leave-button"]')).toBeVisible();

    // Verify community appears in user's communities
    await page.click('[data-testid="my-communities-tab"]');
    await expect(page.locator(`[data-testid="community-card"]:has-text("${communityName}")`)).toBeVisible();
  });

  test('should request to join approval-required community', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');

    // Find an approval-required community
    const approvalCommunity = page.locator('[data-testid="community-card"][data-requires-approval="true"]').first();

    // Request to join
    await approvalCommunity.locator('[data-testid="join-button"]').click();

    // Verify pending status
    await expect(approvalCommunity.locator('[data-testid="pending-badge"]')).toBeVisible();
    await expect(approvalCommunity.locator('[data-testid="pending-message"]')).toContainText('Membership pending approval');
  });

  test('should leave a community', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    // Find a community user is member of
    const memberCommunity = page.locator('[data-testid="community-card"][data-membership="member"]').first();
    const communityName = await memberCommunity.locator('[data-testid="community-name"]').textContent();

    // Leave the community
    await memberCommunity.locator('[data-testid="leave-button"]').click();

    // Confirm leave action
    await page.click('[data-testid="confirm-leave-button"]');

    // Verify community is removed from user's communities
    await expect(page.locator(`[data-testid="community-card"]:has-text("${communityName}")`)).not.toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Left community successfully');
  });

  test('should manage community as owner', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    // Find owned community
    const ownedCommunity = page.locator('[data-testid="community-card"][data-role="owner"]').first();
    await ownedCommunity.locator('[data-testid="manage-button"]').click();

    // Navigate to community management page
    await page.waitForURL(/\/communities\/[a-zA-Z0-9-]+\/manage/);

    // Test member management
    await page.click('[data-testid="members-tab"]');
    
    // Approve pending member
    const pendingMember = page.locator('[data-testid="member-item"][data-status="pending"]').first();
    if (await pendingMember.count() > 0) {
      await pendingMember.locator('[data-testid="approve-button"]').click();
      await expect(pendingMember.locator('[data-testid="member-status"]')).toContainText('Active');
    }

    // Promote member to moderator
    const activeMember = page.locator('[data-testid="member-item"][data-status="active"][data-role="member"]').first();
    if (await activeMember.count() > 0) {
      await activeMember.locator('[data-testid="member-options"]').click();
      await page.click('[data-testid="promote-to-moderator"]');
      await page.click('[data-testid="confirm-promote"]');
      await expect(activeMember.locator('[data-testid="member-role"]')).toContainText('Moderator');
    }
  });

  test('should moderate community content', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    // Find community where user is moderator or owner
    const moderatedCommunity = page.locator('[data-testid="community-card"][data-role="moderator"], [data-testid="community-card"][data-role="owner"]').first();
    await moderatedCommunity.click();

    // Navigate to community page
    await page.waitForURL(/\/communities\/[a-zA-Z0-9-]+/);

    // Test post moderation
    const communityPost = page.locator('[data-testid="community-post"]').first();
    await communityPost.locator('[data-testid="post-options"]').click();
    await page.click('[data-testid="moderate-post"]');

    // Pin post
    await page.click('[data-testid="pin-post"]');
    await expect(communityPost.locator('[data-testid="pinned-indicator"]')).toBeVisible();

    // Test comment moderation
    await communityPost.locator('[data-testid="comment-button"]').click();
    const comment = communityPost.locator('[data-testid="comment-item"]').first();
    await comment.locator('[data-testid="comment-options"]').click();
    await page.click('[data-testid="moderate-comment"]');
    await page.click('[data-testid="delete-comment"]');
    await page.click('[data-testid="confirm-delete"]');
  });

  test('should update community settings', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    const ownedCommunity = page.locator('[data-testid="community-card"][data-role="owner"]').first();
    await ownedCommunity.locator('[data-testid="manage-button"]').click();

    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Update community description
    await page.fill('[data-testid="description-input"]', 'Updated community description with new information about our focus areas.');

    // Change privacy settings
    await page.check('[data-testid="private-community-checkbox"]');

    // Update rules
    await page.click('[data-testid="edit-rule-0"]');
    await page.fill('[data-testid="rule-description-input-0"]', 'Updated rule description with more specific guidelines.');

    // Save changes
    await page.click('[data-testid="save-settings"]');

    // Verify changes saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Community settings updated');
  });

  test('should handle community creation validation', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="create-community-button"]');

    // Try to submit empty form
    await page.click('[data-testid="create-community-submit"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Community name is required');
    await expect(page.locator('[data-testid="description-error"]')).toContainText('Description is required');

    // Test name length validation
    const longName = 'a'.repeat(101);
    await page.fill('[data-testid="community-name-input"]', longName);
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name must be less than 100 characters');

    // Test duplicate name validation
    await page.fill('[data-testid="community-name-input"]', 'Existing Community Name');
    await page.fill('[data-testid="community-description-input"]', 'Valid description');
    await page.click('[data-testid="create-community-submit"]');
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Community name already exists');
  });

  test('should display community analytics for owners', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    const ownedCommunity = page.locator('[data-testid="community-card"][data-role="owner"]').first();
    await ownedCommunity.locator('[data-testid="manage-button"]').click();

    // Navigate to analytics
    await page.click('[data-testid="analytics-tab"]');

    // Verify analytics data
    await expect(page.locator('[data-testid="member-growth-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-activity-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="engagement-metrics"]')).toBeVisible();

    // Check specific metrics
    await expect(page.locator('[data-testid="total-members"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="active-members"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="total-posts"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="engagement-rate"]')).toContainText(/%/);
  });

  test('should handle community invitations', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    const ownedCommunity = page.locator('[data-testid="community-card"][data-role="owner"]').first();
    await ownedCommunity.locator('[data-testid="manage-button"]').click();

    // Navigate to members tab
    await page.click('[data-testid="members-tab"]');

    // Send invitation
    await page.click('[data-testid="invite-members-button"]');
    await page.fill('[data-testid="invite-email-input"]', 'newmember@example.com');
    await page.fill('[data-testid="invite-message-input"]', 'Welcome to our mathematics community!');
    await page.click('[data-testid="send-invitation"]');

    // Verify invitation sent
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitation sent successfully');
    await expect(page.locator('[data-testid="pending-invitation"]')).toContainText('newmember@example.com');
  });

  test('should support community search filters', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');

    // Test category filter
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-subject"]');
    
    const subjectCommunities = page.locator('[data-testid="community-card"][data-type="subject"]:visible');
    await expect(subjectCommunities).toHaveCountGreaterThan(0);

    // Test size filter
    await page.click('[data-testid="size-filter"]');
    await page.click('[data-testid="size-large"]'); // >100 members
    
    const largeCommunities = page.locator('[data-testid="community-card"][data-size="large"]:visible');
    await expect(largeCommunities).toHaveCountGreaterThan(0);

    // Test activity filter
    await page.click('[data-testid="activity-filter"]');
    await page.click('[data-testid="activity-active"]');
    
    const activeCommunities = page.locator('[data-testid="community-card"][data-activity="active"]:visible');
    await expect(activeCommunities).toHaveCountGreaterThan(0);

    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="community-card"]:visible')).toHaveCountGreaterThan(0);
  });

  test('should handle community deletion', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="my-communities-tab"]');

    const ownedCommunity = page.locator('[data-testid="community-card"][data-role="owner"]').first();
    const communityName = await ownedCommunity.locator('[data-testid="community-name"]').textContent();
    
    await ownedCommunity.locator('[data-testid="manage-button"]').click();
    await page.click('[data-testid="settings-tab"]');

    // Scroll to danger zone
    await page.locator('[data-testid="danger-zone"]').scrollIntoViewIfNeeded();
    await page.click('[data-testid="delete-community-button"]');

    // Confirm deletion
    await page.fill('[data-testid="delete-confirmation-input"]', communityName || '');
    await page.click('[data-testid="confirm-delete-community"]');

    // Verify deletion
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Community deleted successfully');
    await page.waitForURL('/communities');
    await expect(page.locator(`[data-testid="community-card"]:has-text("${communityName}")`)).not.toBeVisible();
  });

  test('should be accessible for screen readers', async ({ page }) => {
    await page.click('[data-testid="nav-communities"]');

    // Check ARIA labels and roles
    await expect(page.locator('[data-testid="community-card"]').first()).toHaveAttribute('role', 'article');
    await expect(page.locator('[data-testid="join-button"]').first()).toHaveAttribute('aria-label');

    // Check heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();

    // Test keyboard navigation
    await page.keyboard('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test form accessibility
    await page.click('[data-testid="create-community-button"]');
    await expect(page.locator('label[for="community-name"]')).toBeVisible();
    await expect(page.locator('label[for="community-description"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure for community creation
    await page.route('**/api/communities', route => route.abort());

    await page.click('[data-testid="nav-communities"]');
    await page.click('[data-testid="create-community-button"]');

    await page.fill('[data-testid="community-name-input"]', 'Test Community');
    await page.fill('[data-testid="community-description-input"]', 'Test description');
    await page.click('[data-testid="create-community-submit"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to create community');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});