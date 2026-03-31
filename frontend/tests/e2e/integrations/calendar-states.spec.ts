/**
 * User Story 3 integration UX state transition coverage (T020)
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

test.describe('US3 - Calendar Integration State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('import flow transitions idle -> pending -> success', async ({ page }) => {
    await page.route('**/api/v1/integrations/google-calendar/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt-1',
              title: 'Launch Campaign Event',
              startTime: '2026-03-27T09:00:00.000Z',
              endTime: '2026-03-27T10:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/integrations/google-calendar/import-campaigns', async (route) => {
      await page.waitForTimeout(250);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ created: 1, updated: 0, skipped: 0 }),
      });
    });

    await page.goto(`${BASE_URL}/integrations`);
    await page.getByTestId('calendar-event-evt-1').check();
    await page.getByTestId('import-trigger').click();

    await expect(page.getByTestId('import-state')).toContainText('pending');
    await expect(page.getByTestId('import-state')).toContainText('success');
  });

  test('import permission block and sync recoverable error states are surfaced', async ({ page }) => {
    await page.route('**/api/v1/integrations/google-calendar/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt-2',
              title: 'Calendar Sync Event',
              startTime: '2026-03-27T09:00:00.000Z',
              endTime: '2026-03-27T10:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/integrations/google-calendar/import-campaigns', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Forbidden' }),
      });
    });

    await page.route('**/api/v1/campaigns/*/calendar/sync', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Temporary failure' }),
      });
    });

    await page.route('**/api/v1/campaigns/*/calendar/link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', message: 'Link removed' }),
      });
    });

    await page.goto(`${BASE_URL}/integrations`);

    await page.getByTestId('calendar-event-evt-2').check();
    await page.getByTestId('import-trigger').click();
    await expect(page.getByTestId('import-state')).toContainText('permission_blocked');

    await page.getByTestId('campaign-id-input').fill('cmp-1');
    await page.getByTestId('sync-trigger').click();
    await expect(page.getByTestId('sync-state')).toContainText('recoverable_error');

    await page.getByTestId('unlink-trigger').click();
    await expect(page.getByTestId('sync-state')).toContainText('success');
  });
});

