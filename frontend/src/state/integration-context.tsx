'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIntegrations } from '@/apis/integrations-api';
import { getAuthToken } from '@/apis/auth-fetch';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';

type IntegrationContextValue = {
  isLoading: boolean;
  isGoogleConnected: boolean;
  isTokenValid: boolean;
  connectedProviderLabel: string;
  connectedAccountEmail: string | null;
  grantedScopes: string[];
  hasCalendarScope: boolean;
  hasAnalyticsScope: boolean;
  isDualScopeReady: boolean;
  refetchIntegrations: () => Promise<unknown>;
  invalidateToken: () => void;
};

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const [isTokenValid, setIsTokenValid] = useState(true);

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => getIntegrations(),
    staleTime: staleTimes.calendarEvents,
    enabled: Boolean(getAuthToken()),
  });

  const invalidateToken = useCallback(() => {
    setIsTokenValid(false);
  }, []);

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

    // Token is considered invalid if API calls fail, even if DB says connected
    const effectiveIsGoogleConnected = isGoogleConnected && isTokenValid;

    return {
      isLoading: integrationsQuery.isLoading,
      isGoogleConnected: effectiveIsGoogleConnected,
      isTokenValid,
      connectedProviderLabel: effectiveIsGoogleConnected
        ? connectedAccountEmail
          ? `Google connected (${connectedAccountEmail})`
          : 'Google connected'
        : isGoogleConnected && !isTokenValid
          ? 'Google token expired - please reconnect'
          : 'Google not connected',
      connectedAccountEmail,
      grantedScopes,
      hasCalendarScope,
      hasAnalyticsScope,
      isDualScopeReady: effectiveIsGoogleConnected && hasCalendarScope && hasAnalyticsScope,
      refetchIntegrations: async () => {
        setIsTokenValid(true); // Reset token validity on refetch
        return integrationsQuery.refetch();
      },
      invalidateToken,
    };
  }, [integrationsQuery, isTokenValid, invalidateToken]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationContext(): IntegrationContextValue {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrationContext must be used within IntegrationProvider');
  }
  return context;
}
