/**
 * Integration provider lifecycle smoke coverage (T030-T032)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

async function authenticate(page: Page) {
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: 'test-token',
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    },
  ]);
}

test.describe('Integration provider lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);

    await page.route('**/api/v1/integrations/google-calendar/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ events: [] }),
      });
    });

    await page.route('**/api/v1/integrations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          integrations: [
            {
              provider: 'google_calendar',
              connected: true,
              updatedAt: '2026-03-30T10:00:00.000Z',
            },
            {
              provider: 'google_analytics',
              connected: false,
              updatedAt: '2026-03-30T10:00:00.000Z',
            },
          ],
        }),
      });
    });
  });

  test('connect and callback flows surface success state', async ({ page }) => {
    await page.route('**/api/v1/integrations/connect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorizationUrl: 'https://example.com/oauth/authorize',
          state: 'state-123',
        }),
      });
    });

    await page.route('**/api/v1/integrations/callback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Provider connected',
        }),
      });
    });

    await page.goto(`${BASE_URL}/integrations`);

    await page.getByTestId('integration-provider-select').selectOption('google_calendar');
    await page.getByTestId('integration-connect-trigger').click();

    await expect(page.getByTestId('integration-authorization-url')).toHaveAttribute(
      'href',
      'https://example.com/oauth/authorize'
    );

    await page.getByTestId('integration-callback-code').fill('oauth-code-abc');
    await page.getByTestId('integration-callback-state').fill('state-123');
    await page.getByTestId('integration-callback-trigger').click();

    await expect(page.getByTestId('integration-connect-message')).toContainText('Provider connected');
  });

  test('refresh and disconnect provider actions trigger expected requests', async ({ page }) => {
    await page.route('**/api/v1/integrations/google_calendar/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', message: 'Refreshed' }),
      });
    });

    await page.route('**/api/v1/integrations/google_calendar', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.fallback();
    });

    await page.goto(`${BASE_URL}/integrations`);

    await page.getByTestId('integration-refresh-google_calendar').click();
    await expect(page.getByTestId('integration-provider-google_calendar')).toContainText('connected');

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByTestId('integration-disconnect-google_calendar').click();

    await expect(page.getByTestId('integration-provider-google_calendar')).toBeVisible();
  });
});

