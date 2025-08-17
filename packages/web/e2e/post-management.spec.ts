import { test, expect } from '@playwright/test';

test.describe('Post Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should create a new post successfully', async ({ page }) => {
    // Navigate to posts page
    await page.click('[data-testid="nav-posts"]');
    await page.waitForURL('/posts');

    // Click create post button
    await page.click('[data-testid="create-post-button"]');

    // Fill post form
    await page.fill('[data-testid="post-title-input"]', 'My First Educational Post');
    await page.fill('[data-testid="post-content-input"]', 'This is a comprehensive guide to teaching algebra to high school students. It includes practical examples and interactive exercises.');

    // Add tags
    await page.fill('[data-testid="tag-input"]', 'education');
    await page.keyboard('Enter');
    await page.fill('[data-testid="tag-input"]', 'math');
    await page.keyboard('Enter');
    await page.fill('[data-testid="tag-input"]', 'algebra');
    await page.keyboard('Enter');

    // Select visibility
    await page.selectOption('[data-testid="visibility-select"]', 'public');

    // Submit post
    await page.click('[data-testid="submit-post-button"]');

    // Verify post creation success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Post created successfully');

    // Verify post appears in feed
    await expect(page.locator('[data-testid="post-card"]').first()).toContainText('My First Educational Post');
    await expect(page.locator('[data-testid="post-card"]').first()).toContainText('education');
    await expect(page.locator('[data-testid="post-card"]').first()).toContainText('math');
    await expect(page.locator('[data-testid="post-card"]').first()).toContainText('algebra');
  });

  test('should upload and attach media to post', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');
    await page.click('[data-testid="create-post-button"]');

    // Fill basic post info
    await page.fill('[data-testid="post-title-input"]', 'Post with Image');
    await page.fill('[data-testid="post-content-input"]', 'This post includes an educational diagram.');

    // Upload image
    const fileInput = page.locator('[data-testid="media-upload-input"]');
    await fileInput.setInputFiles('test-fixtures/sample-diagram.jpg');

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

    // Verify image preview
    await expect(page.locator('[data-testid="media-preview"]')).toBeVisible();

    // Submit post
    await page.click('[data-testid="submit-post-button"]');

    // Verify post with media appears
    await expect(page.locator('[data-testid="post-card"]').first()).toContainText('Post with Image');
    await expect(page.locator('[data-testid="post-media"]').first()).toBeVisible();
  });

  test('should like and unlike posts', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Find first post and like it
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const likeButton = firstPost.locator('[data-testid="like-button"]');
    const likeCount = firstPost.locator('[data-testid="like-count"]');

    // Get initial like count
    const initialCount = await likeCount.textContent();
    
    // Like the post
    await likeButton.click();

    // Verify like count increased
    await expect(likeCount).not.toContainText(initialCount || '0');
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true');

    // Unlike the post
    await likeButton.click();

    // Verify like count decreased
    await expect(likeCount).toContainText(initialCount || '0');
    await expect(likeButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should add comments to posts', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    
    // Open comment section
    await firstPost.locator('[data-testid="comment-button"]').click();

    // Add a comment
    const commentInput = firstPost.locator('[data-testid="comment-input"]');
    await commentInput.fill('This is a very helpful post! Thank you for sharing.');
    await firstPost.locator('[data-testid="submit-comment-button"]').click();

    // Verify comment appears
    await expect(firstPost.locator('[data-testid="comment-item"]').first()).toContainText('This is a very helpful post!');

    // Verify comment count updated
    const commentCount = firstPost.locator('[data-testid="comment-count"]');
    await expect(commentCount).not.toContainText('0');
  });

  test('should reply to comments', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.locator('[data-testid="comment-button"]').click();

    // Add initial comment
    await firstPost.locator('[data-testid="comment-input"]').fill('Great post!');
    await firstPost.locator('[data-testid="submit-comment-button"]').click();

    // Reply to the comment
    const firstComment = firstPost.locator('[data-testid="comment-item"]').first();
    await firstComment.locator('[data-testid="reply-button"]').click();

    const replyInput = firstComment.locator('[data-testid="reply-input"]');
    await replyInput.fill('I agree! Very informative.');
    await firstComment.locator('[data-testid="submit-reply-button"]').click();

    // Verify reply appears
    await expect(firstComment.locator('[data-testid="reply-item"]').first()).toContainText('I agree! Very informative.');
  });

  test('should edit own posts', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Find a post by current user
    const ownPost = page.locator('[data-testid="post-card"][data-author="current-user"]').first();
    
    // Open post options
    await ownPost.locator('[data-testid="post-options-button"]').click();
    await page.click('[data-testid="edit-post-option"]');

    // Edit post content
    await page.fill('[data-testid="edit-title-input"]', 'Updated Post Title');
    await page.fill('[data-testid="edit-content-input"]', 'This post has been updated with new information.');

    // Save changes
    await page.click('[data-testid="save-edit-button"]');

    // Verify changes
    await expect(ownPost).toContainText('Updated Post Title');
    await expect(ownPost).toContainText('This post has been updated');
    await expect(ownPost.locator('[data-testid="edited-indicator"]')).toBeVisible();
  });

  test('should delete own posts', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    const ownPost = page.locator('[data-testid="post-card"][data-author="current-user"]').first();
    const postTitle = await ownPost.locator('[data-testid="post-title"]').textContent();

    // Delete post
    await ownPost.locator('[data-testid="post-options-button"]').click();
    await page.click('[data-testid="delete-post-option"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify post is removed
    await expect(page.locator(`[data-testid="post-card"]:has-text("${postTitle}")`)).not.toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Post deleted successfully');
  });

  test('should filter posts by tags', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Click on a tag filter
    await page.click('[data-testid="tag-filter-math"]');

    // Verify only posts with math tag are shown
    const visiblePosts = page.locator('[data-testid="post-card"]:visible');
    await expect(visiblePosts).toHaveCount(await visiblePosts.count());
    
    // Check that all visible posts have the math tag
    const postCount = await visiblePosts.count();
    for (let i = 0; i < postCount; i++) {
      await expect(visiblePosts.nth(i).locator('[data-testid="post-tags"]')).toContainText('math');
    }
  });

  test('should search posts', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Search for posts
    await page.fill('[data-testid="post-search-input"]', 'algebra');
    await page.keyboard('Enter');

    // Verify search results
    await expect(page.locator('[data-testid="search-results-header"]')).toContainText('Search results for "algebra"');
    
    const searchResults = page.locator('[data-testid="post-card"]:visible');
    const resultCount = await searchResults.count();
    
    // Verify all results contain the search term
    for (let i = 0; i < resultCount; i++) {
      const postContent = await searchResults.nth(i).textContent();
      expect(postContent?.toLowerCase()).toContain('algebra');
    }
  });

  test('should handle post creation validation errors', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');
    await page.click('[data-testid="create-post-button"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-post-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
    await expect(page.locator('[data-testid="content-error"]')).toContainText('Content is required');

    // Fill title but leave content empty
    await page.fill('[data-testid="post-title-input"]', 'Test Title');
    await page.click('[data-testid="submit-post-button"]');

    // Verify content error still shows
    await expect(page.locator('[data-testid="content-error"]')).toContainText('Content is required');

    // Test title length validation
    const longTitle = 'a'.repeat(201);
    await page.fill('[data-testid="post-title-input"]', longTitle);
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title must be less than 200 characters');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/posts', route => route.abort());

    await page.click('[data-testid="nav-posts"]');
    await page.click('[data-testid="create-post-button"]');

    await page.fill('[data-testid="post-title-input"]', 'Test Post');
    await page.fill('[data-testid="post-content-input"]', 'Test content');
    await page.click('[data-testid="submit-post-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to create post');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should maintain post draft during session', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');
    await page.click('[data-testid="create-post-button"]');

    // Start writing a post
    await page.fill('[data-testid="post-title-input"]', 'Draft Post');
    await page.fill('[data-testid="post-content-input"]', 'This is a draft that should be saved.');

    // Navigate away
    await page.click('[data-testid="nav-dashboard"]');

    // Come back to posts
    await page.click('[data-testid="nav-posts"]');
    await page.click('[data-testid="create-post-button"]');

    // Verify draft is restored
    await expect(page.locator('[data-testid="post-title-input"]')).toHaveValue('Draft Post');
    await expect(page.locator('[data-testid="post-content-input"]')).toHaveValue('This is a draft that should be saved.');
    await expect(page.locator('[data-testid="draft-indicator"]')).toContainText('Draft restored');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Navigate using keyboard
    await page.keyboard('Tab'); // Focus on first post
    await page.keyboard('Enter'); // Open post details

    // Navigate within post
    await page.keyboard('Tab'); // Focus on like button
    await page.keyboard('Enter'); // Like post

    await page.keyboard('Tab'); // Focus on comment button
    await page.keyboard('Enter'); // Open comments

    // Verify keyboard navigation works
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should be accessible to screen readers', async ({ page }) => {
    await page.click('[data-testid="nav-posts"]');

    // Check ARIA labels and roles
    await expect(page.locator('[data-testid="post-card"]').first()).toHaveAttribute('role', 'article');
    await expect(page.locator('[data-testid="like-button"]').first()).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="comment-button"]').first()).toHaveAttribute('aria-label');

    // Check heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();

    // Check form labels
    await page.click('[data-testid="create-post-button"]');
    await expect(page.locator('label[for="post-title"]')).toBeVisible();
    await expect(page.locator('label[for="post-content"]')).toBeVisible();
  });
});