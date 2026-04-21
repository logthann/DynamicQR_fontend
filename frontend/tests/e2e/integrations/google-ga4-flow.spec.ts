import { expect, test, type Page } from '@playwright/test';

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

test.describe('Unified Google + GA4 flow', () => {
  test('connects Google OAuth then saves GA4 property in QR and campaign forms', async ({ page }) => {
    await authenticate(page);

    let isConnected = false;
    let createdQRPayload: Record<string, unknown> | null = null;
    let updatedCampaignPayload: Record<string, unknown> | null = null;

    await page.route('**/api/v1/integrations/connect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorizationUrl: `${BASE_URL}/integrations/google/callback?code=test-code&state=test-state`,
          state: 'test-state',
        }),
      });
    });

    await page.route('**/api/v1/integrations/callback', async (route) => {
      isConnected = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Provider connected',
        }),
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
              connected: isConnected,
              accountEmail: isConnected ? 'qa.user@example.com' : undefined,
              grantedScopes: isConnected
                ? [
                    'https://www.googleapis.com/auth/calendar',
                    'https://www.googleapis.com/auth/analytics.readonly',
                  ]
                : [],
              updatedAt: '2026-04-03T12:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/ga4/properties', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          properties: [
            {
              property_id: 'properties/1001',
              display_name: 'Main Property',
              ga_measurement_id: 'G-TEST12345',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/campaigns', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            campaigns: [
              {
                id: 6,
                name: 'Campaign 6',
                status: 'active',
                start_date: '2026-04-01',
                end_date: '2026-04-30',
                startDate: '2026-04-01',
                endDate: '2026-04-30',
              },
            ],
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.route('**/api/v1/campaigns/6', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 6,
            name: 'Campaign 6',
            status: 'active',
            description: 'Demo campaign',
            start_date: '2026-04-01',
            end_date: '2026-04-30',
            startDate: '2026-04-01',
            endDate: '2026-04-30',
            calendarSyncStatus: 'not_linked',
          }),
        });
        return;
      }

      if (request.method() === 'PATCH') {
        updatedCampaignPayload = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 6,
            name: 'Campaign 6',
            status: 'active',
            description: 'Demo campaign',
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.route('**/api/v1/qr**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (request.method() === 'POST') {
        createdQRPayload = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            short_code: 'ga4qr001',
            shortCode: 'ga4qr001',
            destination_url: 'https://example.com/landing',
            status: 'active',
          }),
        });
        return;
      }

      await route.fallback();
    });

    // Step 1: unified connect flow
    await page.goto(`${BASE_URL}/integrations`);
    await page.getByTestId('integration-connect-google').click();
    await expect(page).toHaveURL(/dashboard\?tab=integrations&google=connected/);

    // Step 2: QR form GA4 OAuth selection -> save
    await page.goto(`${BASE_URL}/qr/create`);
    await page.getByLabel('QR Name').fill('GA4 QR');
    await page.getByLabel('Campaign').selectOption('6');
    await page.getByLabel('Destination URL').fill('https://example.com/landing');
    await page.getByText('Use connected Google account (Recommended)').click();
    await page.locator('select').filter({ hasText: 'Select GA4 property...' }).selectOption('properties/1001');
    await page.getByRole('button', { name: 'Create QR Code' }).click();

    expect(createdQRPayload).not.toBeNull();
    const qrPayload = createdQRPayload!;
    expect(qrPayload.ga_mode).toBe('OAUTH');
    expect(qrPayload.ga_property_id).toBe('properties/1001');
    expect(qrPayload.ga_measurement_id).toBe('G-TEST12345');

    // Step 3: Campaign detail GA4 OAuth selection -> save
    await page.goto(`${BASE_URL}/campaign-detail/6`);
    await page.getByRole('button', { name: 'Edit Campaign' }).click();
    await page.getByText('Use connected Google account (Recommended)').click();
    await page.locator('select').filter({ hasText: 'Select GA4 property...' }).selectOption('properties/1001');
    await page.getByRole('button', { name: 'Save changes' }).click();

    expect(updatedCampaignPayload).not.toBeNull();
    const campaignPayload = updatedCampaignPayload!;
    expect(campaignPayload.ga_mode).toBe('OAUTH');
    expect(campaignPayload.ga_property_id).toBe('properties/1001');
    expect(campaignPayload.ga_measurement_id).toBe('G-TEST12345');
  });
});

