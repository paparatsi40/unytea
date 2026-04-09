import { test as base, type Page } from '@playwright/test';

export const test = base.extend({});

export { expect } from '@playwright/test';

// Common selectors and helpers
export const selectors = {
  // Auth pages
  signupForm: '[data-testid="signup-form"]',
  signupEmailInput: 'input[name="email"]',
  signupPasswordInput: 'input[name="password"]',
  signupSubmitButton: 'button[type="submit"]',

  signInForm: '[data-testid="signin-form"]',
  signInEmailInput: 'input[name="email"]',
  signInPasswordInput: 'input[name="password"]',
  signInSubmitButton: 'button[type="submit"]',

  forgotPasswordForm: '[data-testid="forgot-password-form"]',
  forgotPasswordEmailInput: 'input[name="email"]',
  forgotPasswordSubmitButton: 'button[type="submit"]',

  // Navigation
  mainNav: '[data-testid="main-nav"]',
  navHomeLink: 'a[href="/"]',
  navDashboardLink: 'a[href="/dashboard"]',
  navExploreLink: 'a[href="/explore"]',

  // Dashboard
  dashboardContainer: '[data-testid="dashboard-container"]',
  communityCard: '[data-testid="community-card"]',

  // Community
  communityExplore: '[data-testid="community-explore"]',
  communitySection: '[data-testid="community-section"]',
};

// Helper functions
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
}

export async function expectToBeOnPage(page: Page, path: string) {
  await page.waitForURL(path);
}

export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
}
