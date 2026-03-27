/**
 * End-to-End Auth and Protected Routes Test
 *
 * Playwright test suite for:
 * - Register flow
 * - Login flow
 * - Protected route access enforcement
 * - Unauthenticated redirect behavior
 * - Session persistence via HttpOnly cookies
 *
 * Acceptance Criteria:
 * - AC-001: Register flow uses POST /api/v1/auth/register and returns success UX
 * - AC-002: Login/auth boundary uses POST /api/v1/auth/login; protected routes block unauthenticated access
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Auth E2E Tests - US1', () => {
  /**
   * AC-001: Register flow
   */
  test('should register a new user successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Verify register page loads
    await expect(page.locator('h1')).toContainText('Create Account');

    // Fill form
    const email = `test-${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    await page.fill('input[placeholder="you@example.com"]', email);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.fill('input#confirmPassword', password);
    await page.fill('input[placeholder="John Doe"]', 'Test User');

    // Submit form
    await page.click('button:has-text("Create Account")');

    // Should redirect to login with registered=true param
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });
    expect(page.url()).toContain('registered=true');

    // Verify success message appears
    await expect(page.locator('text=Account created successfully')).toBeVisible();
  });

  /**
   * AC-002: Login flow
   */
  test('should login with valid credentials', async ({ page, context }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Verify login page loads
    await expect(page.locator('h1')).toContainText('Sign In');

    // Fill form with test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';

    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Should redirect to protected route (campaigns)
    await page.waitForURL(`${BASE_URL}/campaigns`, { timeout: 5000 });
    expect(page.url()).toContain('/campaigns');

    // Verify auth token is stored in HttpOnly cookie
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'auth_token');
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true); // Verify HttpOnly flag
  });

  /**
   * AC-002: Unauthenticated access to protected routes redirects to login
   */
  test('should redirect unauthenticated users to login', async ({ page, context }) => {
    // Clear cookies to ensure no auth
    await context.clearCookies();

    // Try to access protected route directly
    await page.goto(`${BASE_URL}/campaigns`);

    // Should redirect to login with redirect param
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('redirect=%2Fcampaigns');
  });

  /**
   * AC-002: Protected routes enforce authentication
   */
  test('should block access to protected routes without token', async ({ page, request }) => {
    // Try API request without auth token
    const response = await request.get(`${BASE_URL}/api/v1/campaigns`, {
      headers: {
        Cookie: '', // No auth cookie
      },
    });

    // Should return 401 or redirect (depending on API setup)
    expect([401, 302, 307]).toContain(response.status());
  });

  /**
   * Full auth flow: Register -> Login -> Access Protected Route
   */
  test('should complete full auth flow', async ({ page, context }) => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'StrongPassword123!';

    // Step 1: Register
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[placeholder="you@example.com"]', email);
    await page.fill('input#password', password);
    await page.fill('input#confirmPassword', password);
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to login
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });

    // Step 2: Login with new credentials
    await page.fill('input[placeholder="you@example.com"]', email);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to protected route
    await page.waitForURL(`${BASE_URL}/campaigns`, { timeout: 5000 });

    // Verify we're on protected route
    expect(page.url()).toContain('/campaigns');

    // Verify auth cookie is present
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'auth_token');
    expect(authCookie).toBeDefined();
  });

  /**
   * Session persistence: Auth token persists across page reloads
   */
  test('should persist session across page reloads', async ({ page, context }) => {
    // Assume user is already logged in (via previous test or test setup)
    const testEmail = 'test@example.com';
    const testPassword = 'password123';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    await page.click('button:has-text("Sign In")');

    // Wait for protected route
    await page.waitForURL(`${BASE_URL}/campaigns`, { timeout: 5000 });
    const firstPageTitle = await page.title();

    // Reload page
    await page.reload();

    // Should still be on protected route (not redirected to login)
    expect(page.url()).toContain('/campaigns');
    expect(await page.title()).toBe(firstPageTitle);
  });

  /**
   * Error handling: Invalid credentials show error message
   */
  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[placeholder="you@example.com"]', 'invalid@example.com');
    await page.fill('input[placeholder="••••••••"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    const errorMessage = page.locator('text=/Login failed|Invalid|Incorrect/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should NOT redirect
    expect(page.url()).toContain('/login');
  });

  /**
   * Validation: Form validation errors before submit
   */
  test('should validate form before submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try to submit empty form
    await page.click('button:has-text("Sign In")');

    // Should show validation errors
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=required')).toBeVisible();

    // Should NOT submit
    expect(page.url()).toContain('/login');
  });
});

test.describe('Protected Routes - US1', () => {
  /**
   * AC-002: Middleware enforcement
   */
  test('should not access /qr without auth', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/qr`);

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should not access /analytics without auth', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/analytics`);

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should not access /integrations without auth', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/integrations`);

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login*`, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  /**
   * AC-002: Public routes allow unauthenticated access
   */
  test('should allow unauthenticated access to /login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`);

    // Should load without redirect
    expect(page.url()).toContain('/login');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should allow unauthenticated access to /register', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/register`);

    // Should load without redirect
    expect(page.url()).toContain('/register');
    await expect(page.locator('h1')).toContainText('Create Account');
  });
});

