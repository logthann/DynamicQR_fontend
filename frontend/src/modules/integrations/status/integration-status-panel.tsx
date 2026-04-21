/**
 * Integration status panel
 *
 * Endpoints:
 * - GET /api/v1/integrations
 * - POST /api/v1/integrations/{provider_name}/refresh
 * - DELETE /api/v1/integrations/{provider_name}
 */

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import { getAuthToken } from '@/lib/api/auth-fetch';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';

const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';
const PROVIDER = 'google_calendar' as const;

export default function IntegrationStatusPanel() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => apiClient.getIntegrations(),
    staleTime: staleTimes.calendarEvents,
    enabled: Boolean(getAuthToken()),
  });

  const connectMutation = useMutation({
    mutationFn: apiClient.startIntegrationConnect,
    onSuccess: (result) => {
      setErrorMessage(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, '/dashboard?tab=integrations&google=connected');
        window.location.assign(result.authorizationUrl);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to start Google connect.');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: apiClient.refreshIntegrationToken,
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to refresh provider token.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: apiClient.disconnectIntegration,
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to disconnect provider.');
    },
  });

  const googleProvider = useMemo(() => {
    const providers = integrationsQuery.data?.integrations || [];
    return (
      providers.find((provider) => provider.provider === 'google_calendar') ||
      providers.find((provider) => provider.provider === 'google_analytics') ||
      null
    );
  }, [integrationsQuery.data?.integrations]);

  const accountEmail =
    typeof (googleProvider as { accountEmail?: unknown } | null)?.accountEmail === 'string'
      ? ((googleProvider as { accountEmail?: string }).accountEmail as string)
      : undefined;

  const grantedScopes: string[] = Array.isArray(
    (googleProvider as { grantedScopes?: unknown } | null)?.grantedScopes
  )
    ? ((googleProvider as { grantedScopes?: unknown[] }).grantedScopes ?? []).filter(
        (scope): scope is string => typeof scope === 'string'
      )
    : [];

  const hasCalendarScope = grantedScopes.some((scope: string) => scope.includes('calendar'));
  const hasAnalyticsScope = grantedScopes.some(
    (scope: string) => scope.includes('analytics.readonly') || scope.includes('analytics')
  );
  const isConnected = Boolean(googleProvider?.connected);
  const redirectUri = getGoogleOAuthRedirectUri();
  const isBusy =
    connectMutation.isPending ||
    refreshMutation.isPending ||
    disconnectMutation.isPending;

  const connectLabel = !isConnected
    ? 'Connect Google'
    : connectMutation.isPending
      ? 'Opening OAuth...'
      : 'Reconnect Consent';

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Google Integration</h2>
        <p className="text-sm text-muted-foreground">
          One connection for Google Calendar and Google Analytics permissions.
        </p>
      </div>

      {integrationsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading integration status...</p>
      )}

      {integrationsQuery.isError && (
        <p className="text-sm text-destructive">Failed to load integration status.</p>
      )}

      {!integrationsQuery.isLoading && !integrationsQuery.isError && (
        <article className="rounded-md border border-muted p-4" data-testid="integration-provider-google">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">google_calendar</p>
              <p className="text-xs text-muted-foreground">
                Status: {isConnected ? 'connected' : 'disconnected'}
              </p>
              {accountEmail && (
                <p className="text-xs text-muted-foreground">Account: {accountEmail}</p>
              )}
              {googleProvider?.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(googleProvider.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                data-testid="integration-connect-google"
                type="button"
                disabled={isBusy}
                onClick={() =>
                  connectMutation.mutate({
                    provider: PROVIDER,
                    redirectUri,
                  })
                }
                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {connectLabel}
              </button>

              <button
                data-testid="integration-refresh-google"
                type="button"
                disabled={isBusy || !isConnected}
                onClick={() => refreshMutation.mutate({ providerName: PROVIDER })}
                className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                Refresh Connection
              </button>

              <button
                data-testid="integration-switch-google"
                type="button"
                disabled={isBusy}
                onClick={() =>
                  connectMutation.mutate({
                    provider: PROVIDER,
                    redirectUri,
                  })
                }
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Switch Account
              </button>

              <button
                data-testid="integration-disconnect-google"
                type="button"
                disabled={isBusy || !isConnected}
                onClick={() => {
                  if (!window.confirm('Disconnect Google integration?')) {
                    return;
                  }
                  disconnectMutation.mutate({ providerName: PROVIDER });
                }}
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded px-2 py-1 text-xs ${hasCalendarScope ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
              Calendar Scope: {hasCalendarScope ? 'granted' : 'missing'}
            </span>
            <span className={`rounded px-2 py-1 text-xs ${hasAnalyticsScope ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
              Analytics Scope: {hasAnalyticsScope ? 'granted' : 'missing'}
            </span>
          </div>
        </article>
      )}

      {errorMessage && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
