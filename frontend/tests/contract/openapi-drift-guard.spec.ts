import { describe, expect, it } from 'vitest';
import { compareSpecs } from '../../src/lib/drift-guard/check-openapi-drift';

describe('OpenAPI drift guard behavior', () => {
  it('fails for breaking path removals', () => {
    const baseline = {
      info: { version: '1.0.0' },
      paths: {
        '/api/v1/campaigns': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    };

    const current = {
      info: { version: '1.0.1' },
      paths: {},
    };

    const report = compareSpecs(baseline, current);
    expect(report.status).toBe('FAIL');
    expect(report.breakingChanges.some((line) => line.includes('Endpoint removed or renamed'))).toBe(true);
  });

  it('warns for additive endpoint changes', () => {
    const baseline = {
      info: { version: '1.0.0' },
      paths: {
        '/api/v1/campaigns': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    };

    const current = {
      info: { version: '1.1.0' },
      paths: {
        '/api/v1/campaigns': {
          get: { responses: { '200': { description: 'ok' } } },
        },
        '/api/v1/new-resource': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    };

    const report = compareSpecs(baseline, current);
    expect(report.status).toBe('WARN');
    expect(report.warnings.some((line) => line.includes('Endpoint added'))).toBe(true);
  });

  it('passes for unchanged contract surfaces', () => {
    const baseline = {
      info: { version: '1.0.0' },
      paths: {
        '/api/v1/auth/login': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const current = {
      info: { version: '1.0.0' },
      paths: {
        '/api/v1/auth/login': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const report = compareSpecs(baseline, current);
    expect(report.status).toBe('PASS');
    expect(report.breakingChanges).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
  });
});

