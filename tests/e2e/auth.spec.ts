import { test, expect, selectors } from './fixtures';

test.describe('Authentication Flow', () => {
  test('signup page loads and shows form fields', async ({ page }) => {
    await page.goto('/auth/signup');

    // Check page title
    await expect(page).toHaveTitle(/signup|register/i);

    // Check form is visible
    const signupForm = page.locator(selectors.signupForm);
    await expect(signupForm).toBeVisible();

    // Check form fields exist
    const emailInput = page.locator(selectors.signupEmailInput);
    const passwordInput = page.locator(selectors.signupPasswordInput);
    const submitButton = page.locator(selectors.signupSubmitButton);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check button text
    await expect(submitButton).toContainText(/sign up|register|create account/i);
  });

  test('signin page loads with email/password fields', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check page title
    await expect(page).toHaveTitle(/sign in|login/i);

    // Check form is visible
    const signInForm = page.locator(selectors.signInForm);
    await expect(signInForm).toBeVisible();

    // Check form fields exist
    const emailInput = page.locator(selectors.signInEmailInput);
    const passwordInput = page.locator(selectors.signInPasswordInput);
    const submitButton = page.locator(selectors.signInSubmitButton);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check button text
    await expect(submitButton).toContainText(/sign in|login|continue/i);
  });

  test('unauthenticated user gets redirected from /dashboard to /auth/signin', async ({ page }) => {
    // Navigate to protected dashboard page without auth
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should be redirected to signin page
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Sign in form should be visible
    const signInForm = page.locator(selectors.signInForm);
    await expect(signInForm).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Check page title
    await expect(page).toHaveTitle(/forgot|reset|password/i);

    // Check form is visible
    const form = page.locator(selectors.forgotPasswordForm);
    await expect(form).toBeVisible();

    // Check email input exists
    const emailInput = page.locator(selectors.forgotPasswordEmailInput);
    const submitButton = page.locator(selectors.forgotPasswordSubmitButton);

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check button text
    await expect(submitButton).toContainText(/reset|send|recover/i);
  });
});
