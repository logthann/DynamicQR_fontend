import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

interface OpenAPISpec {
  paths?: Record<string, Record<string, unknown>>;
}

const repoRoot = path.resolve(__dirname, '../../..');
const canonicalOpenApiPath = path.join(repoRoot, 'backend_infomation/contracts/openapi.yaml');
const clientPath = path.join(repoRoot, 'frontend/src/lib/api/client.ts');

const endpointToClientMethod: Record<string, string> = {
  'POST /api/v1/auth/register': 'register',
  'POST /api/v1/auth/login': 'login',
  'GET /api/v1/campaigns': 'getCampaigns',
  'POST /api/v1/campaigns': 'createCampaign',
  'POST /api/v1/qr': 'createQR',
  'GET /api/v1/analytics/{qr_id}': 'getAnalytics',
  'GET /api/v1/integrations/google-calendar/events': 'getCalendarEvents',
  'POST /api/v1/integrations/google-calendar/import-campaigns': 'importCampaigns',
  'POST /api/v1/campaigns/{campaign_id}/calendar/sync': 'syncCampaign',
  'DELETE /api/v1/campaigns/{campaign_id}/calendar/link': 'unlinkCampaign',
};

describe('OpenAPI typed boundary contract', () => {
  it('contains all endpoint paths required by frontend modules', () => {
    const parsed = yaml.load(fs.readFileSync(canonicalOpenApiPath, 'utf-8')) as OpenAPISpec;
    const paths = parsed.paths || {};

    const requiredPaths = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/campaigns',
      '/api/v1/qr',
      '/q/{short_code}',
      '/api/v1/analytics/{qr_id}',
      '/api/v1/integrations/google-calendar/events',
      '/api/v1/integrations/google-calendar/import-campaigns',
      '/api/v1/campaigns/{campaign_id}/calendar/sync',
      '/api/v1/campaigns/{campaign_id}/calendar/link',
    ];

    for (const requiredPath of requiredPaths) {
      expect(paths[requiredPath], `Missing path ${requiredPath}`).toBeDefined();
    }
  });

  it('keeps api client method coverage aligned to OpenAPI operations', () => {
    const parsed = yaml.load(fs.readFileSync(canonicalOpenApiPath, 'utf-8')) as OpenAPISpec;
    const paths = parsed.paths || {};
    const clientSource = fs.readFileSync(clientPath, 'utf-8');

    for (const [operation, methodName] of Object.entries(endpointToClientMethod)) {
      const [method, route] = operation.split(' ');
      const routeMethods = paths[route] || {};

      expect(routeMethods[method.toLowerCase()], `Operation missing in OpenAPI: ${operation}`).toBeDefined();
      expect(
        clientSource.includes(`async ${methodName}(`),
        `Method missing in client for ${operation}: ${methodName}`
      ).toBe(true);
    }
  });
});

