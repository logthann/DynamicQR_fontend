/**
 * Integrations API Module
 *
 * Endpoints:
 * - GET /api/v1/integrations
 * - POST /api/v1/integrations/connect
 * - POST /api/v1/integrations/callback
 * - POST /api/v1/integrations/{provider_name}/refresh
 * - DELETE /api/v1/integrations/{provider_name}
 */

import { getAPIClient, UnknownRecord } from './base-client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';
import * as Types from './generated/types';

export interface IntegrationSessionSyncProvider {
  provider: Types.IntegrationProvider;
  connected: boolean;
  requiresReauth: boolean;
  accountEmail?: string;
  message?: string;
}

export interface IntegrationSessionSyncResponse {
  providers: IntegrationSessionSyncProvider[];
}

export async function getIntegrations(): Promise<Types.GetIntegrationsResponse> {
  try {
    let response;
    try {
      response = await getAPIClient().get('/integrations');
    } catch (firstError: any) {
      const status = firstError?.status;
      if (status === 401) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[API] /integrations returned 401; treating as disconnected providers.');
        }
        return { integrations: [] };
      }
      if (status !== 404 && status !== 405) {
        throw firstError;
      }
      response = await getAPIClient().get('/integrations/');
    }
    const body = response.data as unknown;
    const data = (body ?? {}) as {
      integrations?: Array<Record<string, unknown>>;
      providers?: Array<Record<string, unknown>>;
    };
    const source =
      Array.isArray(data.integrations)
        ? data.integrations
        : Array.isArray(data.providers)
          ? data.providers
          : Array.isArray(body)
            ? (body as Array<Record<string, unknown>>)
            : [];

    return {
      integrations: source.map((item) => ({
        provider: String(item.provider ?? item.provider_name ?? 'google_calendar') as Types.IntegrationProvider,
        connected: Boolean(item.connected),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : typeof item.updated_at === 'string' ? item.updated_at : undefined,
        accountEmail: typeof item.accountEmail === 'string' ? item.accountEmail : typeof item.account_email === 'string' ? item.account_email : typeof item.email === 'string' ? item.email : undefined,
        grantedScopes: (() => {
          const fromArray = Array.isArray(item.grantedScopes)
            ? item.grantedScopes
            : Array.isArray(item.granted_scopes)
              ? item.granted_scopes
              : Array.isArray(item.scopes)
                ? item.scopes
                : null;

          if (fromArray) {
            return fromArray.filter((scope): scope is string => typeof scope === 'string');
          }

          const fromString =
            typeof item.grantedScopes === 'string'
              ? item.grantedScopes
              : typeof item.granted_scopes === 'string'
                ? item.granted_scopes
                : typeof item.scopes === 'string'
                  ? item.scopes
                  : undefined;

          if (!fromString) return undefined;

          return fromString
            .split(/[\s,]+/)
            .map((scope) => scope.trim())
            .filter(Boolean);
        })(),
      })),
    };
  } catch (error) {
    throw error;
  }
}

export async function sessionSyncIntegrations(): Promise<IntegrationSessionSyncResponse> {
  const response = await getAPIClient().get('/integrations/session-sync');
  const body = (response.data ?? {}) as Record<string, unknown>;
  const source = Array.isArray(body.providers)
    ? body.providers
    : Array.isArray(body.integrations)
      ? body.integrations
      : [];

  return {
    providers: source.map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        provider: String(record.provider ?? record.provider_name ?? 'google_calendar') as Types.IntegrationProvider,
        connected: Boolean(record.connected),
        requiresReauth: Boolean(record.requires_reauth ?? record.requiresReauth),
        accountEmail:
          typeof record.account_email === 'string'
            ? record.account_email
            : typeof record.accountEmail === 'string'
              ? record.accountEmail
              : undefined,
        message: typeof record.message === 'string' ? record.message : undefined,
      };
    }),
  };
}

export async function startIntegrationConnect(req: Types.StartIntegrationConnectRequest): Promise<Types.StartIntegrationConnectResponse> {
  const resolvedRedirectUri = req.redirectUri || getGoogleOAuthRedirectUri();
  const response = await getAPIClient().post('/integrations/connect', {
    provider_name: req.provider,
    ...(resolvedRedirectUri ? { redirect_uri: resolvedRedirectUri } : {}),
  });
  const data = (response.data ?? {}) as Record<string, unknown>;
  return {
    authorizationUrl: String(data.authorization_url ?? data.authorizationUrl ?? ''),
    state: String(data.state ?? ''),
  };
}

export async function handleIntegrationCallback(req: Types.IntegrationCallbackRequest): Promise<Types.IntegrationCallbackResponse> {
  const resolvedRedirectUri = req.redirectUri || getGoogleOAuthRedirectUri();
  const response = await getAPIClient().post('/integrations/callback', {
    provider_name: req.provider,
    code: req.code,
    state: req.state,
    ...(resolvedRedirectUri ? { redirect_uri: resolvedRedirectUri } : {}),
  });
  const data = (response.data ?? {}) as Record<string, unknown>;
  return {
    status: data.status === 'error' ? 'error' : 'success',
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export async function refreshIntegrationToken(req: Types.RefreshIntegrationRequest): Promise<Types.RefreshIntegrationResponse> {
  const response = await getAPIClient().post(`/integrations/${req.providerName}/refresh`);
  return response.data;
}

export async function disconnectIntegration(req: Types.DisconnectIntegrationRequest): Promise<void> {
  await getAPIClient().delete(`/integrations/${req.providerName}`);
}
