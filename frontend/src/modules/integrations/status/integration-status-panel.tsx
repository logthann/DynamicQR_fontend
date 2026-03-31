/**
 * Integration status panel
 *
 * Endpoints:
 * - GET /api/v1/integrations
 * - POST /api/v1/integrations/{provider_name}/refresh
 * - DELETE /api/v1/integrations/{provider_name}
 */

'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { IntegrationProvider } from '@/lib/api/generated/types';

export default function IntegrationStatusPanel() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => apiClient.getIntegrations(),
    staleTime: staleTimes.calendarEvents,
  });

  const refreshMutation = useMutation({
    mutationFn: apiClient.refreshIntegrationToken,
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to refresh provider token.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: apiClient.disconnectIntegration,
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to disconnect provider.');
    },
  });

  const providers = integrationsQuery.data?.integrations || [];

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integration Status</h2>
        <p className="text-sm text-muted-foreground">
          View provider connection states and manage token lifecycle.
        </p>
      </div>

      {integrationsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading integration status...</p>
      )}

      {integrationsQuery.isError && (
        <p className="text-sm text-destructive">Failed to load integration status.</p>
      )}

      {!integrationsQuery.isLoading && !integrationsQuery.isError && providers.length === 0 && (
        <p className="text-sm text-muted-foreground">No integration providers available.</p>
      )}

      {!integrationsQuery.isLoading && !integrationsQuery.isError && providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((provider) => {
            const providerName = provider.provider as IntegrationProvider;
            const isBusy = refreshMutation.isPending || disconnectMutation.isPending;

            return (
              <article
                key={provider.provider}
                data-testid={`integration-provider-${provider.provider}`}
                className="rounded-md border border-muted p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{provider.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {provider.connected ? 'connected' : 'disconnected'}
                    </p>
                    {provider.updatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(provider.updatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      data-testid={`integration-refresh-${provider.provider}`}
                      type="button"
                      disabled={isBusy}
                      onClick={() => refreshMutation.mutate({ providerName })}
                      className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      Refresh Token
                    </button>

                    <button
                      data-testid={`integration-disconnect-${provider.provider}`}
                      type="button"
                      disabled={isBusy || !provider.connected}
                      onClick={() => {
                        if (!window.confirm(`Disconnect ${provider.provider}?`)) {
                          return;
                        }
                        disconnectMutation.mutate({ providerName });
                      }}
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </section>
  );
}

