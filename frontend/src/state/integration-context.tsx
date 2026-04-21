'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/api/auth-fetch';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';

type IntegrationContextValue = {
  isLoading: boolean;
  isGoogleConnected: boolean;
  connectedProviderLabel: string;
  connectedAccountEmail: string | null;
  grantedScopes: string[];
  hasCalendarScope: boolean;
  hasAnalyticsScope: boolean;
  isDualScopeReady: boolean;
  refetchIntegrations: () => Promise<unknown>;
};

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => apiClient.getIntegrations(),
    staleTime: staleTimes.calendarEvents,
    enabled: Boolean(getAuthToken()),
  });

  const value = useMemo<IntegrationContextValue>(() => {
    const providers = integrationsQuery.data?.integrations ?? [];

    const googleProvider =
      providers.find((provider) => provider.provider === 'google_calendar') ??
      providers.find((provider) => provider.provider === 'google_analytics');

    const grantedScopes = Array.from(
      new Set(
        providers
          .filter((provider) => provider.connected)
          .flatMap((provider) => {
            const scopes = (provider as { grantedScopes?: unknown }).grantedScopes;
            return Array.isArray(scopes)
              ? scopes.filter((scope): scope is string => typeof scope === 'string')
              : [];
          })
      )
    );

    const hasCalendarScope = grantedScopes.some((scope) =>
      scope.includes('calendar')
    );

    const hasAnalyticsScope = grantedScopes.some((scope) =>
      scope.includes('analytics.readonly') || scope.includes('analytics')
    );

    const isGoogleConnected = Boolean(googleProvider?.connected);
    const rawAccountEmail = (googleProvider as { accountEmail?: unknown } | undefined)?.accountEmail;
    const connectedAccountEmail = typeof rawAccountEmail === 'string' ? rawAccountEmail : null;

    return {
      isLoading: integrationsQuery.isLoading,
      isGoogleConnected,
      connectedProviderLabel: isGoogleConnected
        ? connectedAccountEmail
          ? `Google connected (${connectedAccountEmail})`
          : 'Google connected'
        : 'Google not connected',
      connectedAccountEmail,
      grantedScopes,
      hasCalendarScope,
      hasAnalyticsScope,
      isDualScopeReady: isGoogleConnected && hasCalendarScope && hasAnalyticsScope,
      refetchIntegrations: async () => integrationsQuery.refetch(),
    };
  }, [integrationsQuery]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationContext(): IntegrationContextValue {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrationContext must be used within IntegrationProvider');
  }
  return context;
}
