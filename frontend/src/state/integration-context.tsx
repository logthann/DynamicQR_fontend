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
    const googleProvider = providers.find((provider) => provider.provider === 'google_calendar');

    return {
      isLoading: integrationsQuery.isLoading,
      isGoogleConnected: Boolean(googleProvider?.connected),
      connectedProviderLabel: googleProvider?.connected ? 'Google Calendar connected' : 'Google Calendar not connected',
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

