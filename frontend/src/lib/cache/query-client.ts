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
      refetchOnReconnect: 'stale', // Refetch stale queries when reconnecting
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
export const queryKeys = {
  all: ['app'] as const,

  // Auth
  auth: {
    all: [...queryKeys.all, 'auth'] as const,
    me: [...queryKeys.auth.all, 'me'] as const,
  },

  // Campaigns
  campaigns: {
    all: [...queryKeys.all, 'campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.campaigns.lists(), { filters }] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.campaigns.details(), id] as const,
  },

  // QR Codes
  qr: {
    all: [...queryKeys.all, 'qr'] as const,
    lists: () => [...queryKeys.qr.all, 'list'] as const,
    list: () => [...queryKeys.qr.lists()] as const,
    details: () => [...queryKeys.qr.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.qr.details(), id] as const,
  },

  // Analytics
  analytics: {
    all: [...queryKeys.all, 'analytics'] as const,
    lists: () => [...queryKeys.analytics.all, 'list'] as const,
    list: (qrId: string, filters?: any) =>
      [...queryKeys.analytics.lists(), { qrId, filters }] as const,
    summaries: () => [...queryKeys.analytics.all, 'summary'] as const,
    summary: (qrId: string, startDate?: string, endDate?: string) =>
      [...queryKeys.analytics.summaries(), { qrId, startDate, endDate }] as const,
  },

  // Integrations
  integrations: {
    all: [...queryKeys.all, 'integrations'] as const,
    calendar: {
      all: [...queryKeys.integrations.all, 'calendar'] as const,
      events: (year: number, month?: number) =>
        [...queryKeys.integrations.calendar.all, 'events', { year, month }] as const,
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

  // Calendar sync mutations invalidate calendar events + campaigns
  syncCampaignToCalendar: (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
  },
  unlinkCampaignFromCalendar: (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(campaignId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
  },
  importCampaignsFromCalendar: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.calendar.all });
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

