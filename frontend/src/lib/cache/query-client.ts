/**
 * React Query (TanStack Query) Client-Cache Configuration
 *
 * Provides centralized cache management for interactive views with:
 * - Base query/mutation utilities
 * - Stale time policies per endpoint
 * - Automatic error handling and retry logic
 * - Cache invalidation rules
 *
 * Stale Time Policies:
 * - Campaigns/Calendar: 30 seconds (frequent user interactions)
 * - Analytics: 60 seconds (complex calculations, less frequent queries)
 */

import { QueryClient, QueryClientConfig, MutationCache, QueryCache } from '@tanstack/react-query';

/**
 * Query client configuration
 */
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 60 seconds default stale time
      gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
      retry: 1, // Retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
      refetchOnReconnect: true, // Refetch stale queries when reconnecting
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`[QUERY] Error for ${query.queryKey}:`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error(`[MUTATION] Error:`, error);
    },
    onSuccess: (data, variables, context, mutation) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MUTATION] Success`);
      }
    },
  }),
};

/**
 * Create query client instance
 */
export const queryClient = new QueryClient(queryClientConfig);

/**
 * Query Keys Factory - Typed query key generation
 *
 * Follows TanStack Query best practices for query key structure
 */
const APP_QUERY_KEY = ['app'] as const;

export const queryKeys = {
  all: APP_QUERY_KEY,

  // Auth
  auth: {
    all: [...APP_QUERY_KEY, 'auth'] as const,
    me: [...APP_QUERY_KEY, 'auth', 'me'] as const,
  },

  // Campaigns
  campaigns: {
    all: [...APP_QUERY_KEY, 'campaigns'] as const,
    lists: () => [...APP_QUERY_KEY, 'campaigns', 'list'] as const,
    list: (filters?: any) => [...APP_QUERY_KEY, 'campaigns', 'list', { filters }] as const,
    details: () => [...APP_QUERY_KEY, 'campaigns', 'detail'] as const,
    detail: (id: string) => [...APP_QUERY_KEY, 'campaigns', 'detail', id] as const,
  },

  // QR Codes
  qr: {
    all: [...APP_QUERY_KEY, 'qr'] as const,
    lists: () => [...APP_QUERY_KEY, 'qr', 'list'] as const,
    list: (filters?: { campaignId?: string }) =>
      [...APP_QUERY_KEY, 'qr', 'list', { filters }] as const,
    details: () => [...APP_QUERY_KEY, 'qr', 'detail'] as const,
    detail: (id: string) => [...APP_QUERY_KEY, 'qr', 'detail', id] as const,
  },

  // Analytics
  analytics: {
    all: [...APP_QUERY_KEY, 'analytics'] as const,
    lists: () => [...APP_QUERY_KEY, 'analytics', 'list'] as const,
    list: (qrId: string, filters?: any) =>
      [...APP_QUERY_KEY, 'analytics', 'list', { qrId, filters }] as const,
    summaries: () => [...APP_QUERY_KEY, 'analytics', 'summary'] as const,
    summary: (qrId: string, startDate?: string, endDate?: string) =>
      [...APP_QUERY_KEY, 'analytics', 'summary', { qrId, startDate, endDate }] as const,
  },

  // Integrations
  integrations: {
    all: [...APP_QUERY_KEY, 'integrations'] as const,
    status: () => [...APP_QUERY_KEY, 'integrations', 'status'] as const,
    calendar: {
      all: [...APP_QUERY_KEY, 'integrations', 'calendar'] as const,
      events: (year: number, month?: number) =>
        [...APP_QUERY_KEY, 'integrations', 'calendar', 'events', { year, month }] as const,
    },
  },
};

/**
 * Cache Invalidation Rules
 *
 * Mutations that should trigger cache invalidations
 */
export const cacheInvalidations = {
  // Campaign mutations invalidate campaign list + detail
  createCampaign: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
  },
  updateCampaign: (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
  },
  deleteCampaign: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
  },

  // QR mutations invalidate QR list
  createQR: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.lists() });
  },
  updateQR: (qrId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.detail(qrId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.lists() });
  },
  updateQRStatus: (qrId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.detail(qrId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.lists() });
  },
  deleteQR: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.qr.lists() });
  },

  // Calendar sync mutations invalidate calendar events + campaigns
  syncCampaignToCalendar: (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
  },
  unlinkCampaignFromCalendar: (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
  },
  importCampaignsFromCalendar: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
  },

  // Integration provider mutations invalidate integration status
  connectIntegrationProvider: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.status() });
  },
  callbackIntegrationProvider: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.status() });
  },
  refreshIntegrationProvider: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.status() });
  },
  disconnectIntegrationProvider: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.status() });
  },
};

/**
 * Configured stale times by endpoint
 */
export const staleTimes = {
  // Fast-changing data: interactive user selections
  campaigns: 1000 * 30, // 30 seconds
  calendarEvents: 1000 * 30, // 30 seconds

  // Slower-changing data: analytics/metrics
  analytics: 1000 * 60, // 60 seconds

  // Static data
  staticContent: 1000 * 60 * 60, // 1 hour
};

export default queryClient;

