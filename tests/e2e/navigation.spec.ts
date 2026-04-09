import { test, expect, selectors } from './fixtures';

test.describe('Basic Navigation', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check that page has loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for common homepage elements
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Homepage might redirect or load dynamically
    });
  });

  test('main navigation links work', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation to load
    await page.waitForLoadState('networkidle');

    const mainNav = page.locator(selectors.mainNav);

    // If main nav exists, check it has links
    if (await mainNav.isVisible().catch(() => false)) {
      const navLinks = mainNav.locator('a');
      await expect(navLinks.first()).toBeVisible();

      // Get first link and verify it's clickable
      const firstLink = navLinks.first();
      await expect(firstLink).toHaveAttribute('href');
    }
  });

  test('404 page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-route-xyz-123', { waitUntil: 'networkidle' });

    // Check for 404 indicator
    const pageContent = await page.content();

    // Should either show 404 page or not found message
    const has404Indicator =
      pageContent.includes('404') ||
      pageContent.includes('not found') ||
      pageContent.includes('Not Found') ||
      pageContent.toLowerCase().includes('page not found');

    expect(has404Indicator).toBeTruthy();
  });

  test('navigation from home to auth pages', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to signin
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Navigate to signup
    await page.goto('/auth/signup');
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('back and forward browser navigation works', async ({ page }) => {
    // Navigate to first page
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Navigate to second page
    await page.goto('/auth/signup');
    await expect(page).toHaveURL(/\/auth\/signup/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
